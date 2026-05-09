<template>
  <section class="editor-console">
    <div class="console-header">
      <div class="title">Console</div>
      <div class="tabs">
        <button :class="{ active: activeTab === 'log' }" @click="activeTab = 'log'">Log</button>
        <button :class="{ active: activeTab === 'performance' }" @click="activeTab = 'performance'">Performance</button>
      </div>
      <div class="meta">{{ activeTab === 'log' ? `${consoleStore.messages.length} messages` : `${runtime.fps} FPS` }}</div>
      <button v-if="activeTab === 'log'" @click="consoleStore.clear()">Clear</button>
    </div>

    <div v-if="activeTab === 'performance'" class="performance-body">
      <div class="perf-toolbar">
        <span>Detailed performance sampling</span>
        <button :class="{ active: runtime.detailedPerformanceEnabled }" @click="runtime.toggleDetailedPerformance()">
          {{ runtime.detailedPerformanceEnabled ? 'On' : 'Off' }}
        </button>
      </div>
      <div class="perf-grid">
        <article v-for="item in performanceItems" :key="item.key" class="perf-card">
          <div class="perf-label">{{ item.label }}</div>
          <div class="perf-value">{{ item.value }}</div>
          <div class="perf-bar">
            <span :style="{ width: item.percent }"></span>
          </div>
        </article>
      </div>
      <div class="perf-note">
        Detailed sampling is off by default to avoid measurement overhead. FPS and entity count stay available with minimal cost.
      </div>
    </div>

    <div v-else ref="scrollRef" class="console-body">
      <div
        v-for="item in consoleStore.messages"
        :key="item.id"
        class="console-line"
        :class="item.level"
      >
        <span class="time">{{ item.createdAt }}</span>
        <span class="level">{{ item.level }}</span>
        <span v-if="item.source" class="source">
          {{ item.source }}<template v-if="item.line">:{{ item.line }}</template><template v-if="item.column">:{{ item.column }}</template>
        </span>
        <span class="message">{{ item.message }}</span>
      </div>
      <div v-if="consoleStore.messages.length === 0" class="empty">Script logs, warnings, errors, and debug command results appear here.</div>
    </div>

    <form v-if="activeTab === 'log'" class="console-input-row" @submit.prevent="runCommand">
      <span class="prompt">&gt;</span>
      <input
        v-model="commandText"
        spellcheck="false"
        placeholder="Type help to list debug commands"
        @keydown.up.prevent="browseHistory(-1)"
        @keydown.down.prevent="browseHistory(1)"
      />
    </form>
    <div v-else class="performance-footer">
      Full stage timings are available during Play Preview; edit mode mainly shows FPS, frame time, and entity count.
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useConsoleStore } from '../../stores/console'
import { useRuntimeStore } from '../../stores/runtime'
import { useSceneStore } from '../../stores/scene'
import { useSelectionStore } from '../../stores/selection'

const consoleStore = useConsoleStore()
const runtime = useRuntimeStore()
const sceneStore = useSceneStore()
const selection = useSelectionStore()
const scrollRef = ref<HTMLDivElement | null>(null)
const activeTab = ref<'log' | 'performance'>('log')
const commandText = ref('')
const commandHistory = ref<string[]>([])
const historyIndex = ref(-1)

watch(
  () => consoleStore.messages.length,
  async () => {
    await nextTick()
    if (scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  }
)

const performanceItems = computed(() => {
  const budget = 16.67
  const ms = (value: number) => `${value.toFixed(2)} ms`
  const percentOfFrameBudget = (value: number) => `${Math.max(2, Math.min(100, (value / budget) * 100))}%`
  const detailed = runtime.detailedPerformanceEnabled
  const maybeMs = (value: number) => detailed ? ms(value) : 'Off'
  const maybePercent = (value: number) => detailed ? percentOfFrameBudget(value) : '2%'
  return [
    { key: 'fps', label: 'FPS', value: String(runtime.fps), percent: `${Math.max(2, Math.min(100, (runtime.fps / 60) * 100))}%` },
    { key: 'frame', label: 'Frame Time', value: maybeMs(runtime.frameTimeMs), percent: maybePercent(runtime.frameTimeMs) },
    { key: 'render', label: 'Render', value: maybeMs(runtime.renderTimeMs), percent: maybePercent(runtime.renderTimeMs) },
    { key: 'script', label: 'Script', value: maybeMs(runtime.scriptTimeMs), percent: maybePercent(runtime.scriptTimeMs) },
    { key: 'collision', label: 'Collision', value: maybeMs(runtime.collisionTimeMs), percent: maybePercent(runtime.collisionTimeMs) },
    { key: 'animation', label: 'Animation', value: maybeMs(runtime.animationTimeMs), percent: maybePercent(runtime.animationTimeMs) },
    { key: 'audio', label: 'Audio Sync', value: maybeMs(runtime.audioTimeMs), percent: maybePercent(runtime.audioTimeMs) },
    { key: 'camera', label: 'Camera', value: maybeMs(runtime.cameraTimeMs), percent: maybePercent(runtime.cameraTimeMs) },
    { key: 'entities', label: 'Entities', value: String(runtime.entityCount), percent: `${Math.max(2, Math.min(100, runtime.entityCount))}%` }
  ]
})

function getActiveScene() {
  return runtime.isPlaying ? (sceneStore.runtimeScene || sceneStore.currentScene) : sceneStore.currentScene
}

function tokenizeCommand(input: string) {
  const tokens: string[] = []
  const matcher = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(\S+)/g
  let match: RegExpExecArray | null
  while ((match = matcher.exec(input))) {
    tokens.push((match[1] ?? match[2] ?? match[3] ?? '').replace(/\\(["'])/g, '$1'))
  }
  return tokens
}

function findEntity(query = '') {
  const scene = getActiveScene()
  const text = String(query || '').trim().toLowerCase()
  if (!scene || !text) return null
  return scene.entities.find((entity) => entity.id.toLowerCase() === text) ||
    scene.entities.find((entity) => entity.name.toLowerCase() === text) ||
    scene.entities.find((entity) => entity.id.toLowerCase().includes(text) || entity.name.toLowerCase().includes(text)) ||
    null
}

function parseValue(raw: string) {
  const text = String(raw ?? '').trim()
  if (text === 'true') return true
  if (text === 'false') return false
  if (text === 'null') return null
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text)
  return text
}

function getComponentValue(entity: any, path: string) {
  const [componentName, propName] = String(path || '').split('.')
  if (!componentName) return undefined
  const component = componentName === 'Transform' ? entity.getTransform?.() : entity.getComponent?.(componentName)
  if (!component) return undefined
  if (!propName) return component
  return component[propName]
}

function setComponentValue(entity: any, path: string, value: unknown) {
  const [componentName, propName] = String(path || '').split('.')
  if (!componentName || !propName) return false
  const component = componentName === 'Transform' ? entity.getTransform?.() : entity.getComponent?.(componentName)
  if (!component || !(propName in component)) return false
  component[propName] = value
  if (!runtime.isPlaying) sceneStore.markDirty()
  return true
}

function writeCommandResult(message: string, level: 'log' | 'warn' | 'error' = 'log') {
  consoleStore.push(level, message, { source: 'Console' })
}

function runCommand() {
  const raw = commandText.value.trim()
  if (!raw) return
  commandHistory.value.push(raw)
  historyIndex.value = commandHistory.value.length
  commandText.value = ''
  consoleStore.log(`> ${raw}`, { source: 'Console' })

  const [commandRaw, ...args] = tokenizeCommand(raw)
  const command = String(commandRaw || '').toLowerCase()
  try {
    executeCommand(command, args)
  } catch (error) {
    writeCommandResult(error instanceof Error ? error.message : String(error), 'error')
  }
}

function executeCommand(command: string, args: string[]) {
  const scene = getActiveScene()
  if (command === 'help' || command === '?') {
    writeCommandResult([
      'Debug commands:',
      '\thelp\tShow commands',
      '\tclear / cls\tClear console',
      '\tplay / pause / resume / stop\tControl play preview',
      '\tdebug on|off\tToggle play debug overlays',
      '\tfps\tShow FPS and delta time',
      '\tentities [filter]\tList entities',
      '\tscenes\tList scenes',
      '\tscene <name/id>\tSwitch editing scene',
      '\tselect <id/name>\tSelect entity',
      '\tinspect <id/name>\tInspect entity components',
      '\ttp <id/name> <x> <y>\tMove entity',
      '\tget <id/name> <Component.prop>\tRead component value',
      '\tset <id/name> <Component.prop> <value>\tSet component value',
      '\tremove <id/name>\tRemove entity'
    ].join('\n'))
    return
  }
  if (command === 'clear' || command === 'cls') {
    consoleStore.clear()
    return
  }
  if (command === 'play') {
    runtime.play()
    writeCommandResult('Play preview started.')
    return
  }
  if (command === 'pause') {
    runtime.pause()
    writeCommandResult('Play preview paused.')
    return
  }
  if (command === 'resume') {
    runtime.resume()
    writeCommandResult('Play preview resumed.')
    return
  }
  if (command === 'stop') {
    runtime.stop()
    writeCommandResult('Play preview stopped.')
    return
  }
  if (command === 'debug') {
    const mode = String(args[0] || 'toggle').toLowerCase()
    if (mode === 'on') runtime.setPlayDebugEnabled(true)
    else if (mode === 'off') runtime.setPlayDebugEnabled(false)
    else runtime.togglePlayDebug()
    writeCommandResult(`Debug overlays: ${runtime.playDebugEnabled ? 'on' : 'off'}`)
    return
  }
  if (command === 'fps') {
    if (!runtime.detailedPerformanceEnabled) {
      writeCommandResult(`FPS ${runtime.fps} / delta ${runtime.deltaTime.toFixed(4)}s / detailed performance sampling: Off`)
      return
    }
    writeCommandResult(`FPS ${runtime.fps} / delta ${runtime.deltaTime.toFixed(4)}s / frame ${runtime.frameTimeMs.toFixed(2)}ms / render ${runtime.renderTimeMs.toFixed(2)}ms / script ${runtime.scriptTimeMs.toFixed(2)}ms / collision ${runtime.collisionTimeMs.toFixed(2)}ms`)
    return
  }
  if (command === 'entities' || command === 'ls') {
    if (!scene) throw new Error('No active scene.')
    const filter = String(args[0] || '').toLowerCase()
    const entities = scene.entities.filter((entity) => !filter || entity.id.toLowerCase().includes(filter) || entity.name.toLowerCase().includes(filter))
    writeCommandResult(entities.map((entity) => `${entity.id} | ${entity.name}`).join('\n') || 'No matching entities.')
    return
  }
  if (command === 'scenes') {
    writeCommandResult(sceneStore.scenes.map((item) => `${item.id} | ${item.name}${item.id === sceneStore.currentScene?.id ? ' *' : ''}`).join('\n') || 'No scenes.')
    return
  }
  if (command === 'scene') {
    const query = String(args[0] || '').toLowerCase()
    const target = sceneStore.scenes.find((item) => item.id.toLowerCase() === query || item.name.toLowerCase() === query)
    if (!target) throw new Error('Scene not found.')
    if (runtime.isPlaying) throw new Error('Stop play preview before switching the editing scene.')
    sceneStore.switchEditingScene(target.id)
    writeCommandResult(`Editing scene switched to: ${target.name}`)
    return
  }
  if (command === 'select') {
    const entity = findEntity(args.join(' '))
    if (!entity) throw new Error('Entity not found.')
    selection.selectEntity(entity.id)
    writeCommandResult(`Selected: ${entity.name} (${entity.id})`)
    return
  }
  if (command === 'inspect') {
    const entity = findEntity(args.join(' '))
    if (!entity) throw new Error('Entity not found.')
    const components = Array.from((entity as any).components?.keys?.() || [])
    writeCommandResult(`${entity.name} (${entity.id})\ncomponents: ${components.join(', ') || 'none'}`)
    return
  }
  if (command === 'tp') {
    const entity = findEntity(args[0])
    if (!entity) throw new Error('Entity not found.')
    const x = Number(args[1])
    const y = Number(args[2])
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Usage: tp <id|name> <x> <y>')
    const transform = entity.getTransform?.()
    if (!transform) throw new Error('Entity has no Transform.')
    transform.x = x
    transform.y = y
    if (!runtime.isPlaying) sceneStore.markDirty()
    writeCommandResult(`Moved ${entity.name} to (${x}, ${y})`)
    return
  }
  if (command === 'get') {
    const entity = findEntity(args[0])
    if (!entity) throw new Error('Entity not found.')
    const value = getComponentValue(entity, args[1] || '')
    writeCommandResult(typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value))
    return
  }
  if (command === 'set') {
    const entity = findEntity(args[0])
    if (!entity) throw new Error('Entity not found.')
    if (!setComponentValue(entity, args[1] || '', parseValue(args.slice(2).join(' ')))) throw new Error('Set failed. Use Component.prop, for example Transform.x')
    writeCommandResult(`Set ${entity.name}.${args[1]} = ${args.slice(2).join(' ')}`)
    return
  }
  if (command === 'remove' || command === 'delete') {
    if (!scene) throw new Error('No active scene.')
    const entity = findEntity(args.join(' '))
    if (!entity) throw new Error('Entity not found.')
    scene.removeEntityById(entity.id)
    if (!runtime.isPlaying) sceneStore.markDirty()
    writeCommandResult(`Removed entity: ${entity.name} (${entity.id})`)
    return
  }
  throw new Error(`Unknown command: ${command}. Type help to list commands.`)
}
function browseHistory(direction: number) {
  if (!commandHistory.value.length) return
  historyIndex.value = Math.max(0, Math.min(commandHistory.value.length, historyIndex.value + direction))
  commandText.value = commandHistory.value[historyIndex.value] || ''
}
</script>

<style scoped>
.editor-console {
  display: grid;
  grid-template-rows: 30px minmax(0, 1fr) 34px;
  min-width: 0;
  min-height: 0;
  background: #0b0f16;
  border-top: 1px solid #263040;
}

.console-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  background: #111827;
  border-bottom: 1px solid #222b3a;
  color: #d7e1ef;
  font-size: 12px;
}

.title {
  font-weight: 700;
  letter-spacing: 0.04em;
}

.tabs {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tabs button {
  padding: 3px 8px;
  border-radius: 999px;
  background: transparent;
}

.tabs button.active {
  border-color: #56b6c2;
  background: rgba(86, 182, 194, 0.16);
  color: #e8fbff;
}

.meta {
  color: #8190a7;
  margin-right: auto;
}

button {
  border: 1px solid #303a4d;
  background: #1c2432;
  color: #d7e1ef;
  border-radius: 5px;
  padding: 3px 8px;
  cursor: pointer;
}

button:hover {
  border-color: #56b6c2;
}

.console-body {
  min-height: 0;
  overflow: auto;
  padding: 6px 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  line-height: 1.55;
}

.performance-body {
  min-height: 0;
  overflow: auto;
  padding: 8px;
  display: grid;
  gap: 8px;
}

.perf-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid #263040;
  border-radius: 9px;
  background: #111827;
  color: #cbd7e8;
  font-size: 12px;
}

.perf-toolbar button {
  min-width: 54px;
  border-radius: 999px;
}

.perf-toolbar button.active {
  border-color: #6fcf97;
  background: rgba(111, 207, 151, 0.18);
  color: #d9ffe7;
}

.perf-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
}

.perf-card {
  min-width: 0;
  display: grid;
  gap: 6px;
  padding: 9px;
  border: 1px solid #263040;
  border-radius: 9px;
  background: linear-gradient(180deg, #151c2a, #101620);
}

.perf-label {
  color: #8ea0b8;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.perf-value {
  color: #edf5ff;
  font-size: 16px;
  font-weight: 700;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
}

.perf-bar {
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: #0a0f18;
}

.perf-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #56b6c2, #f2c94c);
}

.perf-note,
.performance-footer {
  color: #8190a7;
  font-size: 12px;
  line-height: 1.5;
}

.console-line {
  display: grid;
  grid-template-columns: 72px 48px minmax(120px, auto) minmax(0, 1fr);
  gap: 8px;
  align-items: baseline;
  color: #cbd5e1;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.console-line.log .level {
  color: #8dd3ff;
}

.console-line.warn .level {
  color: #ffd166;
}

.console-line.error .level,
.console-line.error .message {
  color: #ff8a8a;
}

.time {
  color: #64748b;
}

.level {
  text-transform: uppercase;
  font-weight: 700;
}

.source {
  color: #a9b8ce;
}

.message {
  min-width: 0;
}

.empty {
  color: #64748b;
  padding: 8px 0;
}

.console-input-row {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-top: 1px solid #222b3a;
  background: #0f1724;
}

.performance-footer {
  padding: 7px 10px;
  border-top: 1px solid #222b3a;
  background: #0f1724;
}

.prompt {
  color: #56b6c2;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
}

input {
  min-width: 0;
  border: 1px solid #2b3547;
  background: #0b0f16;
  color: #dbeafe;
  border-radius: 5px;
  padding: 5px 8px;
  outline: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
}

input:focus {
  border-color: #56b6c2;
}
</style>
