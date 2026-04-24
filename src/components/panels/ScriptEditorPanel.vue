<template>
  <div class="editor-panel">
    <div class="title-row">
      <div class="title">Text Editor</div>
      <div class="actions">
        <div class="badge" v-if="mode === 'entity'">{{ script?.scriptPath || '未挂载脚本' }}</div>
        <div class="badge" v-else-if="mode === 'asset'">{{ selectedTextAssetPath }}</div>
        <button v-if="mode === 'asset'" class="save-btn" :disabled="!assetDirty || !canSaveAsset" @click="saveAssetScript">保存脚本</button>
      </div>
    </div>

    <template v-if="mode !== 'none'">
      <div class="code-shell">
        <pre ref="highlightRef" class="highlight-layer" v-html="highlightedHtml"></pre>
        <textarea
          ref="textareaRef"
          v-model="editorText"
          wrap="off"
          spellcheck="false"
          @input="onEditorInput"
          @scroll="syncScroll"
          @keydown.ctrl.s.prevent="saveAssetScript"
          @keydown.meta.s.prevent="saveAssetScript"
        ></textarea>
      </div>
    </template>
    <div v-else class="empty-state">请在场景中选择带 Script 组件的实体，或在资源树中选择一个脚本文件。</div>

    <div class="tips">
      项目级运行时覆盖文件：`assets/scripts/ScriptRuntime.ts`、`assets/scripts/InputState.ts`、`assets/scripts/AudioRuntime.ts`。保存后重新进入播放态即可生效。
      运行时已接入内置脚本：`builtin://player-input`、`builtin://bullet-projectile`、`builtin://orbit-around-chest`、`builtin://patrol`、`builtin://spin`、`builtin://enemy-chase-respawn`。
      `builtin://player-input` 与 `builtin://bullet-projectile` 支持直接填写 JSON 配置（如移动速度、疾跑速度、疾跑动画倍速、子弹速度/寿命/射程）。
      脚本可使用 `ctx.api.input`（含 `getMoveVector` / `wasMousePressed`）、`ctx.api.audio`（`playOneShot` / `playEntity` / `setGroupVolume`）、`ctx.api.isBlockedAt`（Tilemap 碰撞检测）、`ctx.api.findEntityByName`、`ctx.api.removeEntity`、`ctx.api.spawnEntity`、`ctx.api.setBackgroundTexture`、`ctx.api.cycleBackgroundTexture`。
      交互物体支持 JSON 交互脚本（`custom://interaction`）：`switchScene`、`setBackgroundTexture`、`cycleBackgroundTexture`、`setTexture`、`cycleTexture`、`setTint`、`cycleTint`、`toggleVisible`、`setInteractDistance`、`removeEntity`、`sequence`、`randomOne`。
      <span v-if="mode === 'asset' && !canSaveAsset">当前为示例工程（内存资源）或非桌面环境，脚本文件不可直接保存。</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ScriptComponent } from '../../engine/components/ScriptComponent'
import { useAssetStore } from '../../stores/assets'
import { useProjectStore } from '../../stores/project'
import { useSceneStore } from '../../stores/scene'
import { useSelectionStore } from '../../stores/selection'

const assets = useAssetStore()
const project = useProjectStore()
const sceneStore = useSceneStore()
const selection = useSelectionStore()

const entity = computed(() => sceneStore.currentScene?.getEntityById(selection.selectedEntityId) ?? null)
const script = computed(() => entity.value?.getComponent<ScriptComponent>('Script') ?? null)
const selectedTextAssetPath = computed(() => {
  const asset = assets.selectedAsset
  if (!asset) return ''
  if (asset.type === 'script' || asset.type === 'animation' || asset.type === 'atlas' || asset.type === 'scene' || asset.type === 'prefab') {
    return asset.path
  }
  return ''
})
const mode = computed<'entity' | 'asset' | 'none'>(() => {
  if (selectedTextAssetPath.value) return 'asset'
  if (script.value) return 'entity'
  return 'none'
})

const defaultJsTemplate = `export default {
  onInit(ctx) {},
  onStart(ctx) {},
  onUpdate(ctx) {
    const move = ctx.api.input.getMoveVector(true)
    const clicked = ctx.api.input.wasMousePressed(0)
  },
  onDestroy(ctx) {}
}`

const interactionDslTemplate = `{
  "onInteract": [
    {
      "type": "cycleTint",
      "target": "self",
      "values": [16777215, 16762880, 9293460, 7979007]
    }
  ]
}`

const defaultTemplate = computed(() => {
  const path = script.value?.scriptPath || selectedTextAssetPath.value || ''
  if (path.startsWith('custom://interaction') || path.includes('interaction')) {
    return interactionDslTemplate
  }
  if (path.includes('builtin://player-input') || path.endsWith('/player-input.js')) {
    return builtinScriptTemplates['assets/scripts/player-input.js']
  }
  if (path.includes('builtin://bullet-projectile') || path.endsWith('/bullet-projectile.js')) {
    return builtinScriptTemplates['assets/scripts/bullet-projectile.js']
  }
  if (path.endsWith('/ScriptRuntime.ts')) {
    return builtinScriptTemplates['assets/scripts/ScriptRuntime.ts']
  }
  if (path.endsWith('/InputState.ts')) {
    return builtinScriptTemplates['assets/scripts/InputState.ts']
  }
  if (path.endsWith('/AudioRuntime.ts')) {
    return builtinScriptTemplates['assets/scripts/AudioRuntime.ts']
  }
  return defaultJsTemplate
})

const builtinScriptTemplates: Record<string, string> = {
  'assets/scripts/player-input.js': `{
  "moveSpeed": 140,
  "sprintSpeed": 280,
  "runAnimationMultiplierWhenSprint": 2,
  "shootAction": "fire",
  "fireCooldown": 0,
  "bullet": {
    "speed": 420,
    "life": 2,
    "maxDistance": 560,
    "width": 20,
    "height": 8,
    "tint": 15922687
  }
}`,
  'assets/scripts/bullet-projectile.js': `{
  "speed": 420,
  "life": 2,
  "maxDistance": 560
}`,
  'assets/scripts/ScriptRuntime.ts': `export default {
  scripts: {
    // 'assets/scripts/player-input.js': {
    //   onUpdate(ctx) {}
    // }
  }
}`,
  'assets/scripts/patrol.js': `export default {
  onInit(ctx) {
    const state = ctx.api.getState(ctx.entity)
    state.dir = 1
    state.startX = ctx.entity.getTransform()?.x ?? 0
  },
  onUpdate(ctx) {
    const transform = ctx.entity.getTransform()
    if (!transform) return
    const state = ctx.api.getState(ctx.entity)
    const startX = Number(state.startX ?? transform.x)
    let dir = Number(state.dir ?? 1)
    transform.x += dir * 80 * ctx.api.delta
    if (transform.x > startX + 100) dir = -1
    if (transform.x < startX - 100) dir = 1
    state.dir = dir
  }
}`,
  'assets/scripts/orbit-around-chest.js': `export default {
  onInit(ctx) {
    const state = ctx.api.getState(ctx.entity)
    const chest = ctx.api.findEntityByName('Chest')
    const transform = ctx.entity.getTransform()
    const chestTransform = chest?.getTransform()
    if (!transform || !chestTransform) return
    const dx = transform.x - chestTransform.x
    const dy = transform.y - chestTransform.y
    state.radius = Math.max(80, Math.hypot(dx, dy))
    state.angle = Math.atan2(dy, dx)
    state.angularSpeed = 1.1
  },
  onUpdate(ctx) {
    const chest = ctx.api.findEntityByName('Chest')
    const transform = ctx.entity.getTransform()
    const chestTransform = chest?.getTransform()
    if (!transform || !chestTransform) return
    const state = ctx.api.getState(ctx.entity)
    const radius = Number(state.radius ?? 180)
    const angularSpeed = Number(state.angularSpeed ?? 1.1)
    const angle = Number(state.angle ?? 0) + angularSpeed * ctx.api.delta
    state.angle = angle
    transform.x = chestTransform.x + Math.cos(angle) * radius
    transform.y = chestTransform.y + Math.sin(angle) * radius
  }
}`,
  'assets/scripts/spin.js': `export default {
  onUpdate(ctx) {
    const transform = ctx.entity.getTransform()
    if (!transform) return
    transform.rotation += 1.5 * ctx.api.delta
  }
}`,
  'assets/scripts/enemy-chase-respawn.js': `export default {
  onUpdate(ctx) {
    const player = ctx.api.findEntityByName('Player')
    if (!player) return
    // Enemy 持续追踪 Player
    // 与 Player 接触后删除自身，并在随机位置生成新的 Enemy
  }
}`,
  'assets/scripts/InputState.ts': `export default {
  actionMap: {
    move_left: ['KeyA', 'ArrowLeft'],
    move_right: ['KeyD', 'ArrowRight'],
    move_up: ['KeyW', 'ArrowUp'],
    move_down: ['KeyS', 'ArrowDown'],
    sprint: ['ShiftLeft', 'ShiftRight'],
    jump: ['Space'],
    fire: ['KeyJ', 'Mouse0'],
    interact: ['Mouse2']
  }
}`,
  'assets/scripts/AudioRuntime.ts': `export default {
  initialMasterVolume: 1,
  initialGroupVolumes: {
    bgm: 0.8,
    sfx: 1,
    ui: 1
  }
}`
}

const assetScriptText = ref('')
const assetFilePath = ref('')
const assetLoadedPath = ref('')
const assetDirty = ref(false)
const loadingAsset = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const highlightRef = ref<HTMLElement | null>(null)

const canSaveAsset = computed(() => {
  return mode.value === 'asset' && !!window.unu?.saveTextAsset && project.rootPath !== 'sample-project'
})

const editorText = computed({
  get: () => {
    if (mode.value === 'entity') return script.value?.sourceCode ?? defaultTemplate.value
    if (mode.value === 'asset') return assetScriptText.value
    return ''
  },
  set: (value: string) => {
    if (mode.value === 'entity' && script.value) {
      script.value.sourceCode = value
      return
    }
    if (mode.value === 'asset') {
      assetScriptText.value = value
      assetDirty.value = true
    }
  }
})

const currentLanguage = computed<'js' | 'json' | 'plain'>(() => {
  const path = mode.value === 'asset' ? selectedTextAssetPath.value : script.value?.scriptPath || ''
  const lower = path.toLowerCase()
  if (lower.includes('custom://interaction') || lower.includes('interaction')) return 'json'
  if (lower.endsWith('.js') || lower.endsWith('.ts') || lower.includes('builtin://')) return 'js'
  if (lower.endsWith('.json') || lower.endsWith('.anim') || lower.endsWith('.atlas')) return 'json'
  return 'plain'
})

const highlightedHtml = computed(() => {
  const code = editorText.value || ''
  const language = currentLanguage.value
  if (language === 'plain') return `${escapeHtml(code)}\n`
  if (language === 'json') return `${highlightJson(code)}\n`
  return `${highlightJsLike(code)}\n`
})

watch(
  () => selectedTextAssetPath.value,
  async (path) => {
    if (!path) return
    await loadAssetScript(path)
  },
  { immediate: true }
)

watch(
  () => mode.value,
  async (nextMode) => {
    if (nextMode === 'asset' && selectedTextAssetPath.value) {
      await loadAssetScript(selectedTextAssetPath.value)
    }
  }
)

async function loadAssetScript(relativePath: string) {
  if (!relativePath || loadingAsset.value) return
  if (assetLoadedPath.value === relativePath && assetScriptText.value) return
  loadingAsset.value = true
  try {
    assetLoadedPath.value = relativePath
    assetDirty.value = false
    assetFilePath.value = ''

    if (!window.unu?.readTextAsset || project.rootPath === 'sample-project') {
      assetScriptText.value = builtinScriptTemplates[relativePath] || defaultTemplate.value
      return
    }

    const result = await window.unu.readTextAsset({ projectRoot: project.rootPath, relativePath })
    if (!result) {
      assetScriptText.value = builtinScriptTemplates[relativePath] || defaultTemplate.value
      project.setStatus(`读取脚本失败：${relativePath}`)
      return
    }
    assetFilePath.value = result.filePath
    assetScriptText.value = result.content
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    assetScriptText.value = builtinScriptTemplates[relativePath] || defaultTemplate.value
    project.setStatus(`读取脚本失败：${message}`)
  } finally {
    loadingAsset.value = false
  }
}

function onEditorInput() {
  if (mode.value === 'entity') {
    sceneStore.markDirty()
  }
  syncScroll()
}

function syncScroll() {
  if (!textareaRef.value || !highlightRef.value) return
  highlightRef.value.scrollTop = textareaRef.value.scrollTop
  highlightRef.value.scrollLeft = textareaRef.value.scrollLeft
}

async function saveAssetScript() {
  if (mode.value !== 'asset') return
  if (!assetDirty.value) return
  if (!canSaveAsset.value || !window.unu?.saveTextAsset) {
    project.setStatus('当前环境下无法直接保存脚本文件。')
    return
  }
  try {
    const saved = await window.unu.saveTextAsset({
      filePath: assetFilePath.value || undefined,
      content: assetScriptText.value,
      suggestedName: fileNameOf(selectedTextAssetPath.value),
      projectRoot: project.rootPath,
      subdir: 'assets/scripts',
      title: '保存脚本文件',
      filterName: 'Script'
    })
    if (!saved) {
      project.setStatus('已取消保存脚本。')
      return
    }
    assetFilePath.value = saved.filePath
    assetDirty.value = false
    const linkedCount = sceneStore.syncScriptSourceByPath(selectedTextAssetPath.value, assetScriptText.value)
    if (linkedCount > 0) {
      project.setStatus(`脚本已保存并同步到 ${linkedCount} 个实体：${saved.name}`)
    } else {
      project.setStatus(`脚本已保存：${saved.name}`)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    project.setStatus(`保存脚本失败：${message}`)
  }
}

function fileNameOf(path: string) {
  if (!path) return 'script.js'
  const normalized = path.replace(/\\/g, '/')
  const index = normalized.lastIndexOf('/')
  return index >= 0 ? normalized.slice(index + 1) : normalized
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const JS_KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
  'switch', 'case', 'break', 'continue', 'export', 'default', 'import', 'from',
  'new', 'class', 'extends', 'try', 'catch', 'finally', 'throw', 'async', 'await'
])

const JS_CONSTANTS = new Set(['true', 'false', 'null', 'undefined'])

function highlightPlainJsSegment(segment: string) {
  let out = ''
  let i = 0
  while (i < segment.length) {
    const ch = segment[i]
    if (/[A-Za-z_$]/.test(ch)) {
      const start = i
      i += 1
      while (i < segment.length && /[A-Za-z0-9_$]/.test(segment[i])) i += 1
      const word = segment.slice(start, i)
      if (JS_KEYWORDS.has(word)) out += `<span class="tok-keyword">${escapeHtml(word)}</span>`
      else if (JS_CONSTANTS.has(word)) out += `<span class="tok-constant">${escapeHtml(word)}</span>`
      else out += escapeHtml(word)
      continue
    }

    if (/\d/.test(ch) || ((ch === '-' || ch === '+') && i + 1 < segment.length && /\d/.test(segment[i + 1]))) {
      const start = i
      i += 1
      while (i < segment.length && /[0-9._eE+-]/.test(segment[i])) i += 1
      const num = segment.slice(start, i)
      out += `<span class="tok-number">${escapeHtml(num)}</span>`
      continue
    }

    out += escapeHtml(ch)
    i += 1
  }
  return out
}

function highlightJson(code: string) {
  let out = ''
  let i = 0
  while (i < code.length) {
    if (code[i] === '"') {
      const start = i
      i += 1
      while (i < code.length) {
        if (code[i] === '\\') {
          i += 2
          continue
        }
        if (code[i] === '"') {
          i += 1
          break
        }
        i += 1
      }
      const str = code.slice(start, i)
      let j = i
      while (j < code.length && /\s/.test(code[j])) j += 1
      const cls = code[j] === ':' ? 'tok-key' : 'tok-string'
      out += `<span class="${cls}">${escapeHtml(str)}</span>`
      continue
    }
    if (/\d/.test(code[i]) || ((code[i] === '-' || code[i] === '+') && i + 1 < code.length && /\d/.test(code[i + 1]))) {
      const start = i
      i += 1
      while (i < code.length && /[0-9.eE+-]/.test(code[i])) i += 1
      out += `<span class="tok-number">${escapeHtml(code.slice(start, i))}</span>`
      continue
    }
    if (code.startsWith('true', i) || code.startsWith('false', i) || code.startsWith('null', i)) {
      const lit = code.startsWith('true', i) ? 'true' : code.startsWith('false', i) ? 'false' : 'null'
      out += `<span class="tok-keyword">${lit}</span>`
      i += lit.length
      continue
    }
    out += escapeHtml(code[i])
    i += 1
  }
  return out
}

function highlightJsLike(code: string) {
  let out = ''
  let i = 0
  while (i < code.length) {
    if (code[i] === '/' && code[i + 1] === '/') {
      const start = i
      i += 2
      while (i < code.length && code[i] !== '\n') i += 1
      out += `<span class="tok-comment">${escapeHtml(code.slice(start, i))}</span>`
      continue
    }
    if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
      const quote = code[i]
      const start = i
      i += 1
      while (i < code.length) {
        if (code[i] === '\\') {
          i += 2
          continue
        }
        if (code[i] === quote) {
          i += 1
          break
        }
        i += 1
      }
      out += `<span class="tok-string">${escapeHtml(code.slice(start, i))}</span>`
      continue
    }

    const segStart = i
    while (i < code.length) {
      if ((code[i] === '/' && code[i + 1] === '/') || code[i] === '"' || code[i] === "'" || code[i] === '`') break
      i += 1
    }
    out += highlightPlainJsSegment(code.slice(segStart, i))
  }
  return out
}
</script>

<style scoped>
.editor-panel {
  height: 100%;
  min-height: 0;
  min-width: 0;
  display: grid;
  grid-template-rows: auto minmax(180px, 1fr) auto;
  gap: 10px;
}
.title-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  min-width: 0;
}
.title {
  color: #94a3b8;
  font-size: 13px;
  flex: 1;
  min-width: 0;
}
.actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.badge {
  font-size: 12px;
  color: #dbe4ee;
  background: #202838;
  padding: 4px 8px;
  border-radius: 999px;
  min-width: 0;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.save-btn {
  border: 1px solid #2f5f78;
  background: #174059;
  color: #dff5ff;
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 12px;
}
.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
textarea {
  position: absolute;
  inset: 0;
  width: 100%;
  min-width: 0;
  min-height: 0;
  height: 100%;
  resize: none;
  overflow-x: auto;
  overflow-y: auto;
  white-space: pre;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: transparent;
  caret-color: #dbe4ee;
  padding: 12px;
  font-family: 'Cascadia Code', 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.5;
  font-variant-ligatures: none;
  tab-size: 2;
  overflow-wrap: normal;
  word-break: normal;
  box-sizing: border-box;
  scrollbar-gutter: stable both-edges;
  z-index: 2;
}
.code-shell {
  position: relative;
  min-width: 0;
  min-height: 0;
  height: 100%;
  border: 1px solid #2a3140;
  border-radius: 10px;
  background: #0f141d;
  overflow: hidden;
}
.highlight-layer {
  margin: 0;
  position: absolute;
  inset: 0;
  overflow-x: auto;
  overflow-y: auto;
  pointer-events: none;
  padding: 12px;
  white-space: pre;
  font-family: 'Cascadia Code', 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.5;
  font-variant-ligatures: none;
  tab-size: 2;
  overflow-wrap: normal;
  word-break: normal;
  box-sizing: border-box;
  scrollbar-gutter: stable both-edges;
  color: #dbe4ee;
  z-index: 1;
}
.code-shell textarea::-webkit-scrollbar,
.code-shell .highlight-layer::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.code-shell textarea::-webkit-scrollbar-thumb,
.code-shell .highlight-layer::-webkit-scrollbar-thumb {
  background: #2a3040;
  border-radius: 999px;
}
.highlight-layer :deep(.tok-comment) { color: #6f839f; }
.highlight-layer :deep(.tok-keyword) { color: #7cc3ff; }
.highlight-layer :deep(.tok-constant) { color: #d7a6ff; }
.highlight-layer :deep(.tok-key) { color: #8bd8c7; }
.highlight-layer :deep(.tok-string) { color: #d9c88b; }
.highlight-layer :deep(.tok-number) { color: #f0a86e; }
.empty-state {
  border: 1px dashed #3a4357;
  border-radius: 10px;
  padding: 14px;
  color: #8ea0b8;
  font-size: 13px;
  line-height: 1.6;
}
.tips {
  color: #8ea0b8;
  font-size: 12px;
  line-height: 1.6;
}
</style>
