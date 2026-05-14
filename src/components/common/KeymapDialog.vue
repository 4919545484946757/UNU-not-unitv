<template>
  <div v-if="editor.keymapDialogVisible" class="modal-backdrop" @mousedown.self="close">
    <section class="dialog" @keydown.stop>
      <header class="dialog-header">
        <div>
          <h2>输入映射 / 改键</h2>
          <p>修改会写入项目的 <code>assets/scripts/InputState.ts</code>，播放和导出 Web 游戏都会使用这份配置。</p>
        </div>
        <button class="icon-btn" @click="close">×</button>
      </header>

      <div class="toolbar">
        <button @click="reload" :disabled="loading">重新读取</button>
        <button @click="resetDefaults">恢复默认映射</button>
        <button class="primary" @click="save" :disabled="saving || !canSave">{{ saving ? '保存中...' : '保存映射' }}</button>
      </div>

      <div v-if="project.rootPath === 'sample-project'" class="notice">
        当前为内置示例工程，请先“项目另存”为本地项目后再保存改键。
      </div>

      <div v-if="captureAction" class="capture-banner">
        <span>正在录入 <strong>{{ actionLabel(captureAction) }}</strong>：请按下键盘按键或鼠标按钮。</span>
        <button @click="stopCapture">取消</button>
      </div>

      <div class="mapping-table">
        <div class="table-head">
          <span>动作</span>
          <span>绑定</span>
          <span>操作</span>
        </div>
        <div v-for="action in actionOrder" :key="action" class="mapping-row">
          <div>
            <strong>{{ actionLabel(action) }}</strong>
            <small>{{ action }}</small>
          </div>
          <div class="binding-list">
            <span v-for="binding in draftMap[action]" :key="binding" class="binding-chip">
              {{ formatBinding(binding) }}
              <button title="移除" @click="removeBinding(action, binding)">×</button>
            </span>
            <span v-if="!draftMap[action]?.length" class="empty">未绑定</span>
          </div>
          <div class="row-actions">
            <button @click="startCapture(action)">录入</button>
            <button @click="clearAction(action)">清空</button>
          </div>
        </div>
      </div>

      <details class="advanced">
        <summary>高级：原始 InputState.ts 预览</summary>
        <pre>{{ previewSource }}</pre>
      </details>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch, reactive, ref } from 'vue'
import { useAssetStore } from '../../stores/assets'
import { useEditorStore } from '../../stores/editor'
import { useProjectStore } from '../../stores/project'

type InputActionMap = Record<string, string[]>

const INPUT_STATE_PATH = 'assets/scripts/InputState.ts'
const defaultActionMap: InputActionMap = {
  move_left: ['KeyA', 'ArrowLeft'],
  move_right: ['KeyD', 'ArrowRight'],
  move_up: ['KeyW', 'ArrowUp'],
  move_down: ['KeyS', 'ArrowDown'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  jump: ['Space'],
  fire: ['KeyJ', 'Mouse0'],
  interact: ['Mouse2'],
  menu: ['Escape']
}
const actionLabels: Record<string, string> = {
  move_left: '左移',
  move_right: '右移',
  move_up: '上移',
  move_down: '下移',
  sprint: '疾跑',
  jump: '跳跃',
  fire: '攻击 / 射击',
  interact: '交互',
  menu: '菜单 / 暂停'
}

const editor = useEditorStore()
const project = useProjectStore()
const assets = useAssetStore()
const draftMap = reactive<InputActionMap>({})
const sourceText = ref('')
const loading = ref(false)
const saving = ref(false)
const captureAction = ref('')

const actionOrder = computed(() => {
  const seen = new Set<string>()
  const result: string[] = []
  for (const action of Object.keys(defaultActionMap)) {
    seen.add(action)
    result.push(action)
  }
  for (const action of Object.keys(draftMap)) {
    if (!seen.has(action)) result.push(action)
  }
  return result
})
const canSave = computed(() => !!window.unu?.saveTextAsset && !!project.rootPath && project.rootPath !== 'sample-project')
const previewSource = computed(() => replaceActionMapInSource(sourceText.value, draftMap))

watch(() => editor.keymapDialogVisible, (visible) => {
  if (visible) void reload()
  else stopCapture()
})

onBeforeUnmount(() => {
  stopCapture()
})

function cloneMap(map: InputActionMap) {
  return Object.fromEntries(Object.entries(map).map(([action, bindings]) => [action, [...bindings]])) as InputActionMap
}

function setDraftMap(map: InputActionMap) {
  for (const key of Object.keys(draftMap)) delete draftMap[key]
  for (const [action, bindings] of Object.entries(map)) {
    draftMap[action] = uniqueBindings(bindings)
  }
}

async function reload() {
  if (!editor.keymapDialogVisible) return
  loading.value = true
  try {
    let content = ''
    if (window.unu?.readTextAsset && project.rootPath && project.rootPath !== 'sample-project') {
      const result = await window.unu.readTextAsset({ projectRoot: project.rootPath, relativePath: INPUT_STATE_PATH }).catch(() => null)
      content = result?.content || ''
    }
    sourceText.value = content || buildInputStateSource(defaultActionMap)
    setDraftMap({ ...cloneMap(defaultActionMap), ...parseActionMapFromSource(sourceText.value) })
  } finally {
    loading.value = false
  }
}

function close() {
  editor.closeKeymapDialog()
}

function resetDefaults() {
  setDraftMap(cloneMap(defaultActionMap))
  project.setStatus('输入映射已恢复为默认值，保存后生效。')
}

async function save() {
  if (!canSave.value || !window.unu?.saveTextAsset) {
    project.setStatus('请先打开或另存为本地项目，再保存输入映射。')
    return
  }
  saving.value = true
  try {
    await window.unu.saveTextAsset({
      projectRoot: project.rootPath,
      filePath: INPUT_STATE_PATH,
      content: previewSource.value,
      suggestedName: 'InputState.ts',
      subdir: 'assets/scripts',
      title: '保存输入映射',
      filterName: 'UNU Input Runtime'
    })
    sourceText.value = previewSource.value
    await assets.refreshProject()
    project.setStatus('输入映射已保存，播放预览会自动热重载。')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    project.setStatus(`保存输入映射失败：${message}`)
  } finally {
    saving.value = false
  }
}

function startCapture(action: string) {
  stopCapture()
  captureAction.value = action
  window.addEventListener('keydown', handleCaptureKey, true)
  window.addEventListener('mousedown', handleCaptureMouse, true)
}

function stopCapture() {
  if (!captureAction.value) return
  captureAction.value = ''
  window.removeEventListener('keydown', handleCaptureKey, true)
  window.removeEventListener('mousedown', handleCaptureMouse, true)
}

function handleCaptureKey(event: KeyboardEvent) {
  event.preventDefault()
  event.stopPropagation()
  addBinding(captureAction.value, event.code)
  stopCapture()
}

function handleCaptureMouse(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  addBinding(captureAction.value, `Mouse${event.button}`)
  stopCapture()
}

function addBinding(action: string, binding: string) {
  if (!action || !binding) return
  draftMap[action] = uniqueBindings([...(draftMap[action] || []), binding])
}

function removeBinding(action: string, binding: string) {
  draftMap[action] = (draftMap[action] || []).filter((item) => item !== binding)
}

function clearAction(action: string) {
  draftMap[action] = []
}

function uniqueBindings(bindings: string[]) {
  return Array.from(new Set(bindings.map((item) => String(item || '').trim()).filter(Boolean)))
}

function actionLabel(action: string) {
  return actionLabels[action] || action
}

function formatBinding(binding: string) {
  const mouseLabels: Record<string, string> = {
    Mouse0: '鼠标左键',
    Mouse1: '鼠标中键',
    Mouse2: '鼠标右键'
  }
  if (mouseLabels[binding]) return mouseLabels[binding]
  return binding
    .replace(/^Key/, '')
    .replace(/^Digit/, '')
    .replace('Arrow', '方向键')
    .replace('ShiftLeft', '左 Shift')
    .replace('ShiftRight', '右 Shift')
    .replace('ControlLeft', '左 Ctrl')
    .replace('ControlRight', '右 Ctrl')
    .replace('AltLeft', '左 Alt')
    .replace('AltRight', '右 Alt')
    .replace('Space', '空格')
    .replace('Escape', 'Esc')
}

function parseActionMapFromSource(source: string) {
  const block = findActionMapObjectBlock(source)
  if (!block) return {}
  const result: InputActionMap = {}
  const entryRegex = /([A-Za-z_$][\w$-]*)\s*:\s*\[([\s\S]*?)\]/g
  let entry: RegExpExecArray | null
  while ((entry = entryRegex.exec(block.text))) {
    const bindings: string[] = []
    const bindingRegex = /['"`]([^'"`\n\r]+)['"`]/g
    let binding: RegExpExecArray | null
    while ((binding = bindingRegex.exec(entry[2]))) bindings.push(binding[1])
    if (bindings.length) result[entry[1]] = uniqueBindings(bindings)
  }
  return result
}

function replaceActionMapInSource(source: string, map: InputActionMap) {
  const nextMap = formatActionMapObject(map)
  const block = findActionMapObjectBlock(source)
  if (!block) return buildInputStateSource(map)
  return `${source.slice(0, block.start)}${nextMap}${source.slice(block.end)}`
}

function findActionMapObjectBlock(source: string) {
  const match = /actionMap\s*:/.exec(source)
  if (!match) return null
  const open = source.indexOf('{', match.index + match[0].length)
  if (open < 0) return null
  let depth = 0
  let quote = ''
  let escaped = false
  for (let index = open; index < source.length; index += 1) {
    const char = source[index]
    if (quote) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return { start: open, end: index + 1, text: source.slice(open, index + 1) }
      }
    }
  }
  return null
}

function formatActionMapObject(map: InputActionMap) {
  const lines = actionOrder.value.map((action) => {
    const bindings = uniqueBindings(map[action] || [])
    const formatted = bindings.map((binding) => `'${binding.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`).join(', ')
    return `    ${action}: [${formatted}]`
  })
  return `{\n${lines.join(',\n')}\n  }`
}

function buildInputStateSource(map: InputActionMap) {
  return `export default {\n  actionMap: ${formatActionMapObject(map)}\n}\n`
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  background: rgba(3, 6, 12, 0.66);
}

.dialog {
  width: min(820px, calc(100vw - 48px));
  max-height: min(760px, calc(100vh - 48px));
  overflow: auto;
  border: 1px solid #354055;
  border-radius: 14px;
  background: #111722;
  color: #edf3ff;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 20px 12px;
  border-bottom: 1px solid #263044;
}

h2 {
  margin: 0;
  font-size: 19px;
}

p {
  margin: 6px 0 0;
  color: #9fb0cc;
  font-size: 13px;
}

code {
  color: #b8d7ff;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: #202a3c;
  color: #fff;
  cursor: pointer;
}

.toolbar {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  border-bottom: 1px solid #263044;
}

button {
  border: 1px solid #36455d;
  border-radius: 8px;
  background: #1b2535;
  color: #edf3ff;
  padding: 7px 10px;
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

button.primary {
  border-color: #4c7bd9;
  background: #2454b8;
}

.notice,
.capture-banner {
  margin: 12px 20px 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: #2a2435;
  color: #ffe0a6;
}

.capture-banner {
  background: #17324a;
  color: #cde9ff;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.mapping-table {
  display: grid;
  padding: 14px 20px 18px;
  gap: 8px;
}

.table-head,
.mapping-row {
  display: grid;
  grid-template-columns: minmax(150px, 0.7fr) minmax(260px, 1.4fr) 150px;
  gap: 12px;
  align-items: center;
}

.table-head {
  color: #7f90ad;
  font-size: 12px;
  padding: 0 8px;
}

.mapping-row {
  border: 1px solid #263044;
  border-radius: 10px;
  background: #151d2b;
  padding: 10px 8px;
}

.mapping-row small {
  display: block;
  margin-top: 3px;
  color: #7f90ad;
}

.binding-list,
.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.binding-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #40516d;
  border-radius: 999px;
  background: #202b3d;
  padding: 4px 7px 4px 10px;
}

.binding-chip button {
  border: 0;
  background: transparent;
  padding: 0 2px;
  color: #ffb5b5;
}

.empty {
  color: #7f90ad;
}

.advanced {
  margin: 0 20px 20px;
  border-top: 1px solid #263044;
  padding-top: 12px;
}

.advanced pre {
  overflow: auto;
  max-height: 220px;
  border-radius: 10px;
  background: #070a10;
  padding: 12px;
  color: #c9d7ef;
  font-size: 12px;
}

@media (max-width: 760px) {
  .table-head {
    display: none;
  }

  .mapping-row {
    grid-template-columns: 1fr;
  }
}
</style>
