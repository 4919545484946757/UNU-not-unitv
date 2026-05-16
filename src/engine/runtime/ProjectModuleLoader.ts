import * as ts from 'typescript'
import type { ScriptHooks, ScriptRuntimeError } from './ScriptRuntimeCore'

interface ProjectRuntimeModule {
  scripts?: Record<string, ScriptHooks>
  [key: string]: unknown
}

export function parseProjectRuntimeRegistry(
  sourceCode: string | null,
  scriptPath: string,
  onError?: (error: ScriptRuntimeError) => void
) {
  const raw = String(sourceCode || '').trim()
  if (!raw) return {}
  try {
    const transpiled = ts.transpileModule(raw, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.Preserve
      },
      fileName: scriptPath || 'ScriptRuntime.ts',
      reportDiagnostics: true
    })
    const diagnostic = transpiled.diagnostics?.find((item) => item.category === ts.DiagnosticCategory.Error)
    if (diagnostic) {
      const position = typeof diagnostic.start === 'number'
        ? ts.getLineAndCharacterOfPosition(ts.createSourceFile(scriptPath || 'ScriptRuntime.ts', raw, ts.ScriptTarget.ES2020), diagnostic.start)
        : { line: 0, character: 0 }
      onError?.({
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        scriptPath,
        line: position.line + 1,
        column: position.character + 1,
        phase: 'compile'
      })
      return {}
    }
    const exportsBag: Record<string, unknown> = {}
    const moduleBag: { exports: Record<string, unknown> } = { exports: exportsBag }
    // Security note: project scripts are trusted local project code today. Future work
    // should execute this in a sandboxed renderer/worker with a capability whitelist.
    const evaluator = new Function('module', 'exports', `${transpiled.outputText}\n//# sourceURL=${scriptPath}`)
    evaluator(moduleBag, exportsBag)
    const loaded = ((moduleBag.exports && (moduleBag.exports.default as unknown)) || moduleBag.exports) as ProjectRuntimeModule | null
    if (isScriptHooksLike(loaded)) {
      return {
        [resolveCanonicalScriptPath(scriptPath)]: loaded as ScriptHooks
      }
    }
    const scripts = loaded && typeof loaded === 'object'
      ? (loaded.scripts && typeof loaded.scripts === 'object' ? loaded.scripts : loaded)
      : null
    if (!scripts || typeof scripts !== 'object') return {}
    const result: Record<string, ScriptHooks> = {}
    for (const [key, value] of Object.entries(scripts as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue
      const normalizedKey = resolveCanonicalScriptPath(key)
      result[normalizedKey] = value as ScriptHooks
      const builtin = resolveBuiltinScriptKey(normalizedKey)
      if (builtin) result[builtin] = value as ScriptHooks
    }
    return result
  } catch (error) {
    onError?.(normalizeRuntimeError(error, { scriptPath, phase: 'compile' }))
    if (!onError) console.warn('[UNU][runtime] failed to parse project ScriptRuntime.ts:', error)
    return {}
  }
}

export function normalizeRuntimeError(
  error: unknown,
  fallback: { scriptPath: string; phase: string; entityId?: string; entityName?: string }
): ScriptRuntimeError {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : ''
  const position = extractErrorPosition(stack, fallback.scriptPath)
  return {
    message,
    scriptPath: fallback.scriptPath,
    line: position.line,
    column: position.column,
    phase: fallback.phase,
    entityId: fallback.entityId,
    entityName: fallback.entityName,
    stack
  }
}

function isScriptHooksLike(value: unknown) {
  if (!value || typeof value !== 'object') return false
  const hooks = value as Record<string, unknown>
  return (
    typeof hooks.onInit === 'function' ||
    typeof hooks.onStart === 'function' ||
    typeof hooks.onEnterScene === 'function' ||
    typeof hooks.onExitScene === 'function' ||
    typeof hooks.onUpdate === 'function' ||
    typeof hooks.onPausedUpdate === 'function' ||
    typeof hooks.onInteract === 'function' ||
    typeof hooks.onUiClick === 'function' ||
    typeof hooks.onCollisionEnter === 'function' ||
    typeof hooks.onCollisionStay === 'function' ||
    typeof hooks.onCollisionExit === 'function' ||
    typeof hooks.onTriggerEnter === 'function' ||
    typeof hooks.onTriggerStay === 'function' ||
    typeof hooks.onTriggerExit === 'function' ||
    typeof hooks.onDestroy === 'function'
  )
}

function resolveBuiltinScriptKey(scriptPath: string) {
  const normalized = normalizeScriptPath(scriptPath)
  const aliases: Record<string, string> = {
    'assets/scripts/patrol.js': 'builtin://patrol',
    'assets/scripts/spin.js': 'builtin://spin',
    'assets/scripts/ui-button-click.js': 'builtin://ui-button-click'
  }
  return aliases[normalized] || ''
}

function resolveCanonicalScriptPath(scriptPath: string) {
  const normalized = normalizeScriptPath(scriptPath)
  const aliases: Record<string, string> = {
    'builtin://player-input': 'assets/scripts/player-input.js',
    'builtin://bullet-projectile': 'assets/scripts/bullet-projectile.js',
    'builtin://enemy-chase-respawn': 'assets/scripts/enemy-chase-respawn.js',
    'builtin://patrol': 'assets/scripts/patrol.js',
    'builtin://orbit-around-chest': 'assets/scripts/orbit-around-chest.js',
    'builtin://spin': 'assets/scripts/spin.js',
    'builtin://ui-button-click': 'assets/scripts/ui-button-click.js'
  }
  return aliases[normalized] || normalized
}

function normalizeScriptPath(input: string) {
  return String(input || '').trim().replace(/\\/g, '/')
}

function extractErrorPosition(stack: string | undefined, scriptPath: string) {
  const fallback = { line: 1, column: 1 }
  if (!stack) return fallback
  const escaped = scriptPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const direct = new RegExp(`${escaped}:(\\d+):(\\d+)`).exec(stack)
  if (direct) return { line: Math.max(1, Number(direct[1]) - 2), column: Math.max(1, Number(direct[2])) }
  const anonymous = /<anonymous>:(\d+):(\d+)/.exec(stack)
  if (anonymous) return { line: Math.max(1, Number(anonymous[1]) - 2), column: Math.max(1, Number(anonymous[2])) }
  const any = /:(\d+):(\d+)\)?(?:\n|$)/.exec(stack)
  if (any) return { line: Math.max(1, Number(any[1]) - 2), column: Math.max(1, Number(any[2])) }
  return fallback
}
