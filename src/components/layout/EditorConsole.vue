<template>
  <section class="editor-console">
    <div class="console-header">
      <div class="title">Console</div>
      <div class="meta">{{ consoleStore.messages.length }} messages</div>
      <button @click="consoleStore.clear()">清空</button>
    </div>

    <div ref="scrollRef" class="console-body">
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
      <div v-if="consoleStore.messages.length === 0" class="empty">脚本日志、警告、错误和调试命令结果会显示在这里。</div>
    </div>

    <form class="console-input-row" @submit.prevent="runCommand">
      <span class="prompt">&gt;</span>
      <input
        v-model="commandText"
        spellcheck="false"
        placeholder="输入 help 查看可用调试指令"
        @keydown.up.prevent="browseHistory(-1)"
        @keydown.down.prevent="browseHistory(1)"
      />
    </form>
  </section>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useConsoleStore } from '../../stores/console'
import { useRuntimeStore } from '../../stores/runtime'
import { useSceneStore } from '../../stores/scene'
import { useSelectionStore } from '../../stores/selection'

const consoleStore = useConsoleStore()
const runtime = useRuntimeStore()
const sceneStore = useSceneStore()
const selection = useSelectionStore()
const scrollRef = ref<HTMLDivElement | null>(null)
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
      '常用调试指令：',
      '\thelp\t显示常用指令',
      '\tclear / cls\t清空控制台',
      '\tplay / pause / resume / stop\t控制播放预览',
      '\tdebug on|off\t显示或隐藏播放调试信息',
      '\tfps\t查看 FPS 与 deltaTime',
      '\tentities [filter]\t列出或过滤实体',
      '\tscenes\t列出场景',
      '\tscene <name/id>\t切换编辑场景',
      '\tselect <id/name>\t选中实体',
      '\tinspect <id/name>\t查看实体组件',
      '\ttp <id/name> <x> <y>\t移动实体',
      '\tget <id/name> <Component.prop>\t读取组件属性',
      '\tset <id/name> <Component.prop> <value>\t设置组件属性',
      '\tremove <id/name>\t删除实体'
    ].join('\n'))
    return
  }
  if (command === 'clear' || command === 'cls') {
    consoleStore.clear()
    return
  }
  if (command === 'play') {
    runtime.play()
    writeCommandResult('播放预览已启动')
    return
  }
  if (command === 'pause') {
    runtime.pause()
    writeCommandResult('播放预览已暂停')
    return
  }
  if (command === 'resume') {
    runtime.resume()
    writeCommandResult('播放预览已继续')
    return
  }
  if (command === 'stop') {
    runtime.stop()
    writeCommandResult('播放预览已停止')
    return
  }
  if (command === 'debug') {
    const mode = String(args[0] || 'toggle').toLowerCase()
    if (mode === 'on') runtime.setPlayDebugEnabled(true)
    else if (mode === 'off') runtime.setPlayDebugEnabled(false)
    else runtime.togglePlayDebug()
    writeCommandResult(`调试显示：${runtime.playDebugEnabled ? 'on' : 'off'}`)
    return
  }
  if (command === 'fps') {
    writeCommandResult(`FPS ${runtime.fps} / delta ${runtime.deltaTime.toFixed(4)}s`)
    return
  }
  if (command === 'entities' || command === 'ls') {
    if (!scene) throw new Error('当前没有场景')
    const filter = String(args[0] || '').toLowerCase()
    const entities = scene.entities.filter((entity) => !filter || entity.id.toLowerCase().includes(filter) || entity.name.toLowerCase().includes(filter))
    writeCommandResult(entities.map((entity) => `${entity.id} | ${entity.name}`).join('\n') || '没有匹配实体')
    return
  }
  if (command === 'scenes') {
    writeCommandResult(sceneStore.scenes.map((item) => `${item.id} | ${item.name}${item.id === sceneStore.currentScene?.id ? ' *' : ''}`).join('\n') || '没有场景')
    return
  }
  if (command === 'scene') {
    const query = String(args[0] || '').toLowerCase()
    const target = sceneStore.scenes.find((item) => item.id.toLowerCase() === query || item.name.toLowerCase() === query)
    if (!target) throw new Error('未找到场景')
    if (runtime.isPlaying) throw new Error('播放中请通过脚本或门交互切换场景；编辑场景切换请先 stop')
    sceneStore.switchEditingScene(target.id)
    writeCommandResult(`已切换编辑场景：${target.name}`)
    return
  }
  if (command === 'select') {
    const entity = findEntity(args.join(' '))
    if (!entity) throw new Error('未找到实体')
    selection.selectEntity(entity.id)
    writeCommandResult(`已选中：${entity.name} (${entity.id})`)
    return
  }
  if (command === 'inspect') {
    const entity = findEntity(args.join(' '))
    if (!entity) throw new Error('未找到实体')
    const components = Array.from((entity as any).components?.keys?.() || [])
    writeCommandResult(`${entity.name} (${entity.id})\ncomponents: ${components.join(', ') || 'none'}`)
    return
  }
  if (command === 'tp') {
    const entity = findEntity(args[0])
    if (!entity) throw new Error('未找到实体')
    const x = Number(args[1])
    const y = Number(args[2])
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('用法：tp <id|name> <x> <y>')
    const transform = entity.getTransform?.()
    if (!transform) throw new Error('实体没有 Transform')
    transform.x = x
    transform.y = y
    if (!runtime.isPlaying) sceneStore.markDirty()
    writeCommandResult(`已移动 ${entity.name} 到 (${x}, ${y})`)
    return
  }
  if (command === 'get') {
    const entity = findEntity(args[0])
    if (!entity) throw new Error('未找到实体')
    const value = getComponentValue(entity, args[1] || '')
    writeCommandResult(typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value))
    return
  }
  if (command === 'set') {
    const entity = findEntity(args[0])
    if (!entity) throw new Error('未找到实体')
    if (!setComponentValue(entity, args[1] || '', parseValue(args.slice(2).join(' ')))) throw new Error('设置失败，请使用 Component.prop，如 Transform.x')
    writeCommandResult(`已设置 ${entity.name}.${args[1]} = ${args.slice(2).join(' ')}`)
    return
  }
  if (command === 'remove' || command === 'delete') {
    if (!scene) throw new Error('当前没有场景')
    const entity = findEntity(args.join(' '))
    if (!entity) throw new Error('未找到实体')
    scene.removeEntityById(entity.id)
    if (!runtime.isPlaying) sceneStore.markDirty()
    writeCommandResult(`已删除实体：${entity.name} (${entity.id})`)
    return
  }
  throw new Error(`未知指令：${command}。输入 help 查看可用指令。`)
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
