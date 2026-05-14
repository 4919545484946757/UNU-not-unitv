<template>
  <div class="editor-panel">
    <div class="title-row">
      <div class="title">Text Editor</div>
      <div class="actions">
        <div class="badge" v-if="mode === 'entity'">{{ script?.scriptPath || '未挂载脚本' }}</div>
        <div class="badge" v-else-if="mode === 'asset'">{{ selectedTextAssetPath }}</div>
        <button v-if="mode !== 'none'" class="save-btn secondary" :disabled="externalCodeEditorLocked" @click="openExternalCodeEditor">独立窗口编辑</button>
        <button v-if="mode === 'asset'" class="save-btn" :disabled="externalCodeEditorLocked || !currentAssetDirty || !canSaveAsset" @click="saveAssetScript">保存脚本</button>
      </div>
    </div>

    <div v-if="mode !== 'none'" class="editor-body">
      <div class="code-shell">
        <div v-if="findPanel.visible" class="find-popover">
          <input
            ref="findInputRef"
            v-model="findPanel.query"
            class="find-input"
            placeholder="查找"
            @keydown.enter.prevent="findNext(1)"
            @keydown.shift.enter.prevent="findNext(-1)"
            @keydown.esc.prevent="closeFindPanel"
          />
          <input
            v-model="findPanel.replace"
            class="find-input replace-input"
            placeholder="替换为"
            @keydown.enter.prevent="replaceCurrent"
            @keydown.esc.prevent="closeFindPanel"
          />
          <span class="find-count">{{ findMatchLabel }}</span>
          <label class="find-toggle">
            <input v-model="findPanel.caseSensitive" type="checkbox" />
            Aa
          </label>
          <button @click="findNext(-1)">上一个</button>
          <button @click="findNext(1)">下一个</button>
          <button @click="replaceCurrent">替换</button>
          <button @click="replaceAll">全部替换</button>
          <button class="find-close" title="关闭" @click="closeFindPanel">×</button>
        </div>
        <pre ref="highlightRef" class="highlight-layer" v-html="highlightedHtml"></pre>
        <textarea
          ref="textareaRef"
          v-model="editorText"
          wrap="off"
          spellcheck="false"
          :disabled="externalCodeEditorLocked"
          @input="onEditorInput"
          @scroll="syncScroll"
          @keydown.ctrl.s.prevent="saveAssetScript"
          @keydown.meta.s.prevent="saveAssetScript"
          @keydown="handleEditorKeydown"
        ></textarea>
        <div v-if="externalCodeEditorLocked" class="editor-lock">
          <strong>已交由独立窗口编辑</strong>
          <span>{{ externalCodeEditorLockLabel }}</span>
        </div>
      </div>
    </div>
    <div v-else class="empty-state">请在场景中选择带 Script 组件的实体，或在资源树中选择一个脚本文件。</div>

    <div class="tips">
      项目级运行时覆盖文件：`assets/scripts/ScriptRuntime.ts`、`assets/scripts/InputState.ts`、`assets/scripts/AudioRuntime.ts`。保存后会自动热重载；播放中会尽量立即生效。
      运行时已接入内置脚本：`builtin://player-input`、`builtin://bullet-projectile`、`builtin://orbit-around-chest`、`builtin://patrol`、`builtin://spin`、`builtin://enemy-chase-respawn`。
      `builtin://player-input` 与 `builtin://bullet-projectile` 支持直接填写 JSON 配置（如移动速度、疾跑速度、疾跑动画倍速、子弹速度/寿命/射程）。
      脚本可使用 `ctx.api.log/warn/error` 输出到下方 Console；也可使用 `ctx.api.input`（含 `getMoveVector` / `wasMousePressed`）、`ctx.api.audio`（`playOneShot` / `playEntity` / `setGroupVolume`）、`ctx.api.isBlockedAt`（Tilemap 碰撞检测）、`ctx.api.findEntityByName`、`ctx.api.removeEntity`、`ctx.api.spawnEntity`、`ctx.api.setBackgroundTexture`、`ctx.api.cycleBackgroundTexture`。
      示例项目在 `assets/scripts/ScriptRuntime.ts` 中提供 `custom://interaction` JSON 交互脚本：`switchScene`、`setBackgroundTexture`、`cycleBackgroundTexture`、`setTexture`、`cycleTexture`、`setTint`、`cycleTint`、`toggleVisible`、`setInteractDistance`、`removeEntity`、`sequence`、`randomOne`。
      <span v-if="mode === 'asset' && !canSaveAsset">当前为示例工程（内存资源）或非桌面环境，脚本文件不可直接保存。</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { ScriptComponent } from '../../engine/components/ScriptComponent'
import { useAssetStore } from '../../stores/assets'
import { useEditorStore } from '../../stores/editor'
import { useProjectStore } from '../../stores/project'
import { useSceneStore } from '../../stores/scene'
import { useSelectionStore } from '../../stores/selection'

const assets = useAssetStore()
const editor = useEditorStore()
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
  if (script.value) return 'entity'
  if (selectedTextAssetPath.value) return 'asset'
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
  },
  onCollisionEnter(ctx) {
    const other = ctx.event?.other
    if (!other || other.name !== 'Player') return
    // 与 Player 接触后触发生命周期事件，可在这里删除自身或生成新 Enemy
  },
  onTriggerEnter(ctx) {
    const other = ctx.event?.other
    // 当当前实体或 other 的 Collider 勾选 Trigger 时触发
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
const findInputRef = ref<HTMLInputElement | null>(null)
const findPanel = reactive({
  visible: false,
  query: '',
  replace: '',
  caseSensitive: false,
  currentIndex: -1
})
let codeEditorSessionId = ''
let codeEditorSessionMode: 'entity' | 'asset' | '' = ''
let codeEditorSessionPath = ''
let codeEditorSessionEntityId = ''
let codeEditorSessionAssetFilePath = ''
let removeCodeEditorListener: (() => void) | null = null
let removeCodeEditorClosedListener: (() => void) | null = null
const localExternalCodeEditorLocked = ref(false)
const externalCodeEditorLocked = computed(() => localExternalCodeEditorLocked.value || !!editor.scriptEditorExternalLock)
const externalCodeEditorLockLabel = computed(() => {
  const label = editor.scriptEditorExternalLock?.label
  return label
    ? `正在独立窗口编辑：${label}。请在独立代码编辑器中完成修改、保存或关闭窗口后再回到这里编辑。`
    : '请在独立代码编辑器中完成修改、保存或关闭窗口后再回到这里编辑。'
})

const canSaveAsset = computed(() => {
  return mode.value === 'asset' && !!window.unu?.saveTextAsset && project.rootPath !== 'sample-project'
})

const currentAssetDirty = computed(() => selectedTextAssetPath.value ? assets.isTextAssetDirty(selectedTextAssetPath.value) : assetDirty.value)

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
      if (selectedTextAssetPath.value) assets.setTextAssetDraft(selectedTextAssetPath.value, value, true)
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

const findMatches = computed(() => collectFindMatches(editorText.value, findPanel.query, findPanel.caseSensitive))
const findMatchLabel = computed(() => {
  if (!findPanel.query) return '输入关键词'
  if (!findMatches.value.length) return '0 / 0'
  return `${Math.max(1, findPanel.currentIndex + 1)} / ${findMatches.value.length}`
})

watch(
  () => selectedTextAssetPath.value,
  async (path) => {
    if (!path) return
    await loadAssetScript(path)
    if (externalCodeEditorLocked.value && codeEditorSessionMode === 'asset') {
      await retargetExternalCodeEditorToAsset(path)
    }
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

watch(
  () => editor.scriptErrorTarget?.nonce,
  async () => {
    const target = editor.scriptErrorTarget
    if (!target || !target.path) return
    if (target.path !== selectedTextAssetPath.value) return
    await loadAssetScript(target.path)
    await nextTick()
    revealLine(target.line, target.column)
  }
)

watch(
  () => [editorText.value, findPanel.query, findPanel.caseSensitive],
  () => updateFindIndexFromSelection()
)

async function loadAssetScript(relativePath: string) {
  if (!relativePath || loadingAsset.value) return
  const draft = assets.getTextAssetDraft(relativePath)
  if (draft !== undefined) {
    assetLoadedPath.value = relativePath
    assetScriptText.value = draft
    assetDirty.value = assets.isTextAssetDirty(relativePath)
    return
  }
  if (assetLoadedPath.value === relativePath && assetScriptText.value) return
  loadingAsset.value = true
  try {
    assetLoadedPath.value = relativePath
    assetDirty.value = assets.isTextAssetDirty(relativePath)
    assetFilePath.value = ''

    if (!window.unu?.readTextAsset || project.rootPath === 'sample-project') {
      assetScriptText.value = builtinScriptTemplates[relativePath] || defaultTemplate.value
      assetDirty.value = assets.isTextAssetDirty(relativePath)
      return
    }

    const result = await window.unu.readTextAsset({ projectRoot: project.rootPath, relativePath })
    if (!result) {
      assetScriptText.value = builtinScriptTemplates[relativePath] || defaultTemplate.value
      assetDirty.value = assets.isTextAssetDirty(relativePath)
      project.setStatus(`读取脚本失败：${relativePath}`)
      return
    }
    assetFilePath.value = result.filePath
    assetScriptText.value = result.content
    assetDirty.value = assets.isTextAssetDirty(relativePath)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    assetScriptText.value = builtinScriptTemplates[relativePath] || defaultTemplate.value
    assetDirty.value = assets.isTextAssetDirty(relativePath)
    project.setStatus(`读取脚本失败：${message}`)
  } finally {
    loadingAsset.value = false
  }
}

function onEditorInput() {
  if (mode.value === 'entity') {
    sceneStore.markDirty()
  }
  updateFindIndexFromSelection()
  syncScroll()
}

function handleEditorKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
    event.preventDefault()
    openFindPanel()
    return
  }
  if (findPanel.visible && event.key === 'F3') {
    event.preventDefault()
    findNext(event.shiftKey ? -1 : 1)
  }
}

function syncScroll() {
  if (!textareaRef.value || !highlightRef.value) return
  highlightRef.value.scrollTop = textareaRef.value.scrollTop
  highlightRef.value.scrollLeft = textareaRef.value.scrollLeft
}

function revealLine(line: number, column?: number) {
  const textarea = textareaRef.value
  if (!textarea) return
  const text = editorText.value || ''
  const lines = text.split('\n')
  const targetLine = Math.max(1, Math.min(lines.length || 1, Math.round(Number(line) || 1)))
  const targetColumn = Math.max(1, Math.round(Number(column) || 1))
  let offset = 0
  for (let index = 0; index < targetLine - 1; index += 1) offset += lines[index].length + 1
  offset += Math.min(Math.max(0, targetColumn - 1), lines[targetLine - 1]?.length ?? 0)
  textarea.focus()
  textarea.setSelectionRange(offset, offset)
  const computedStyle = window.getComputedStyle(textarea)
  const lineHeight = Number.parseFloat(computedStyle.lineHeight) || 18
  textarea.scrollTop = Math.max(0, (targetLine - 1) * lineHeight - textarea.clientHeight * 0.35)
  syncScroll()
}

function openFindPanel() {
  const textarea = textareaRef.value
  const selected = textarea && textarea.selectionEnd > textarea.selectionStart
    ? editorText.value.slice(textarea.selectionStart, textarea.selectionEnd)
    : ''
  if (selected && !selected.includes('\n') && selected.length <= 120) {
    findPanel.query = selected
  }
  findPanel.visible = true
  updateFindIndexFromSelection()
  void nextTick(() => {
    findInputRef.value?.focus()
    findInputRef.value?.select()
  })
}

function closeFindPanel() {
  findPanel.visible = false
  textareaRef.value?.focus()
}

function collectFindMatches(text: string, query: string, caseSensitive: boolean) {
  if (!query) return [] as Array<{ start: number; end: number }>
  const haystack = caseSensitive ? text : text.toLowerCase()
  const needle = caseSensitive ? query : query.toLowerCase()
  const matches: Array<{ start: number; end: number }> = []
  let cursor = 0
  while (cursor <= haystack.length) {
    const index = haystack.indexOf(needle, cursor)
    if (index < 0) break
    matches.push({ start: index, end: index + query.length })
    cursor = index + Math.max(1, query.length)
  }
  return matches
}

function updateFindIndexFromSelection() {
  const textarea = textareaRef.value
  if (!textarea || !findMatches.value.length) {
    findPanel.currentIndex = -1
    return
  }
  const index = findMatches.value.findIndex((match) => (
    match.start === textarea.selectionStart && match.end === textarea.selectionEnd
  ))
  findPanel.currentIndex = index
}

function findNext(direction: 1 | -1 = 1) {
  if (!findPanel.query) {
    openFindPanel()
    return
  }
  const textarea = textareaRef.value
  const matches = findMatches.value
  if (!textarea || !matches.length) {
    findPanel.currentIndex = -1
    project.setStatus(`未找到：${findPanel.query}`)
    return
  }
  const cursor = direction > 0 ? textarea.selectionEnd : Math.max(0, textarea.selectionStart - 1)
  let nextIndex = direction > 0
    ? matches.findIndex((match) => match.start >= cursor)
    : findLastMatchBefore(matches, cursor)
  if (nextIndex < 0) nextIndex = direction > 0 ? 0 : matches.length - 1
  selectFindMatch(nextIndex)
}

function findLastMatchBefore(matches: Array<{ start: number; end: number }>, cursor: number) {
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    if (matches[index].start <= cursor) return index
  }
  return -1
}

function selectFindMatch(index: number) {
  const textarea = textareaRef.value
  const match = findMatches.value[index]
  if (!textarea || !match) return
  textarea.focus()
  textarea.setSelectionRange(match.start, match.end)
  findPanel.currentIndex = index
  scrollSelectionIntoView()
  syncScroll()
}

function selectedTextMatchesQuery() {
  const textarea = textareaRef.value
  if (!textarea || !findPanel.query) return false
  const selected = editorText.value.slice(textarea.selectionStart, textarea.selectionEnd)
  return findPanel.caseSensitive
    ? selected === findPanel.query
    : selected.toLowerCase() === findPanel.query.toLowerCase()
}

function replaceCurrent() {
  const textarea = textareaRef.value
  if (!textarea || !findPanel.query) return
  if (!selectedTextMatchesQuery()) {
    findNext(1)
    return
  }
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const nextText = `${editorText.value.slice(0, start)}${findPanel.replace}${editorText.value.slice(end)}`
  applyEditorText(nextText, start, start + findPanel.replace.length)
  void nextTick(() => {
    findNext(1)
  })
}

function replaceAll() {
  if (!findPanel.query) return
  const matches = findMatches.value
  if (!matches.length) {
    project.setStatus(`未找到：${findPanel.query}`)
    return
  }
  let nextText = ''
  let cursor = 0
  for (const match of matches) {
    nextText += editorText.value.slice(cursor, match.start)
    nextText += findPanel.replace
    cursor = match.end
  }
  nextText += editorText.value.slice(cursor)
  applyEditorText(nextText, 0, 0)
  project.setStatus(`已替换 ${matches.length} 处：${findPanel.query}`)
}

function applyEditorText(value: string, selectionStart: number, selectionEnd: number) {
  editorText.value = value
  if (mode.value === 'entity') sceneStore.markDirty()
  if (mode.value === 'asset') {
    assetDirty.value = true
    if (selectedTextAssetPath.value) assets.setTextAssetDraft(selectedTextAssetPath.value, value, true)
  }
  void nextTick(() => {
    const textarea = textareaRef.value
    if (!textarea) return
    textarea.focus()
    textarea.setSelectionRange(selectionStart, selectionEnd)
    updateFindIndexFromSelection()
    syncScroll()
  })
}

function scrollSelectionIntoView() {
  const textarea = textareaRef.value
  if (!textarea) return
  const textBefore = editorText.value.slice(0, textarea.selectionStart)
  const line = textBefore.split('\n').length
  const column = textBefore.length - textBefore.lastIndexOf('\n') - 1
  const computedStyle = window.getComputedStyle(textarea)
  const lineHeight = Number.parseFloat(computedStyle.lineHeight) || 18
  const charWidth = Math.max(7, Number.parseFloat(computedStyle.fontSize || '13') * 0.62)
  const targetTop = Math.max(0, (line - 1) * lineHeight - textarea.clientHeight * 0.42)
  const targetLeft = Math.max(0, column * charWidth - textarea.clientWidth * 0.45)
  textarea.scrollTop = targetTop
  textarea.scrollLeft = targetLeft
}

async function saveAssetScript() {
  if (mode.value !== 'asset') return
  if (!currentAssetDirty.value) return
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
    assets.clearTextAssetDraft(selectedTextAssetPath.value)
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

async function openExternalCodeEditor() {
  if (mode.value === 'none') return
  if (!window.unu?.openCodeEditor) {
    project.setStatus('当前环境未接入代码编辑器窗口，请使用桌面版运行。')
    return
  }
  const nextSessionId = `code_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const nextSessionMode = mode.value
  const nextSessionPath = mode.value === 'asset' ? selectedTextAssetPath.value : script.value?.scriptPath || ''
  const nextSessionEntityId = entity.value?.id || ''
  const nextSessionAssetFilePath = mode.value === 'asset' ? assetFilePath.value : ''
  const path = nextSessionPath
  const result = await window.unu.openCodeEditor({
    id: nextSessionId,
    mode: nextSessionMode,
    title: nextSessionMode === 'asset' ? fileNameOf(path) : `${entity.value?.name || 'Entity'} Script`,
    path,
    language: currentLanguage.value,
    content: editorText.value
  }) as { ok: boolean; error?: string } | null
  if (!result?.ok) {
    project.setStatus(`打开代码编辑窗口失败：${result?.error || '未知错误'}`)
    return
  }
  codeEditorSessionId = nextSessionId
  codeEditorSessionMode = nextSessionMode
  codeEditorSessionPath = nextSessionPath
  codeEditorSessionEntityId = nextSessionEntityId
  codeEditorSessionAssetFilePath = nextSessionAssetFilePath
  localExternalCodeEditorLocked.value = true
  editor.lockScriptEditorExternal({
    id: nextSessionId,
    mode: nextSessionMode,
    targetId: nextSessionMode === 'entity' ? nextSessionEntityId : nextSessionPath,
    label: nextSessionMode === 'asset' ? nextSessionPath : `${entity.value?.name || 'Entity'} Script`
  })
  project.setStatus('已打开独立代码编辑窗口')
}

async function retargetExternalCodeEditorToAsset(path: string) {
  if (!window.unu?.openCodeEditor || !path) return
  const previousLoadedPath = assetLoadedPath.value
  const previousText = assetScriptText.value
  const previousDirty = assetDirty.value
  await loadAssetScript(path)
  const nextSessionId = `code_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const nextFilePath = assetFilePath.value
  const nextContent = assetScriptText.value
  const nextLanguage = guessLanguageForPath(path)
  const result = await window.unu.openCodeEditor({
    id: nextSessionId,
    mode: 'asset',
    title: fileNameOf(path),
    path,
    language: nextLanguage,
    content: nextContent
  }) as { ok: boolean; error?: string } | null
  if (!result?.ok) {
    project.setStatus(`切换独立代码窗口目标失败：${result?.error || '未知错误'}`)
    assetLoadedPath.value = previousLoadedPath
    assetScriptText.value = previousText
    assetDirty.value = previousDirty
    return
  }
  codeEditorSessionId = nextSessionId
  codeEditorSessionMode = 'asset'
  codeEditorSessionPath = path
  codeEditorSessionEntityId = ''
  codeEditorSessionAssetFilePath = nextFilePath
  project.setStatus(`独立代码窗口已切换到：${path}`)
}

function guessLanguageForPath(path: string) {
  const lower = path.toLowerCase()
  if (lower.includes('custom://interaction') || lower.includes('interaction')) return 'json'
  if (lower.endsWith('.js') || lower.endsWith('.ts') || lower.includes('builtin://')) return 'js'
  if (lower.endsWith('.json') || lower.endsWith('.anim') || lower.endsWith('.atlas')) return 'json'
  return 'plain'
}

function applyExternalCodeEditorPayload(raw: unknown) {
  const payload = (raw || {}) as { id?: string; mode?: string; path?: string; content?: string; saveRequested?: boolean; live?: boolean }
  if (payload.mode === 'inspector-entity-script') {
    const lock = editor.scriptEditorExternalLock
    if (payload.id && lock?.id && payload.id !== lock.id) return
    const targetEntity = sceneStore.scenes
      .map((scene) => scene.getEntityById(lock?.targetId || ''))
      .find(Boolean)
    const targetScript = targetEntity?.getComponent<ScriptComponent>('Script')
    if (!targetScript) {
      project.setStatus('代码窗口内容未应用：原实体脚本已不存在')
      return
    }
    targetScript.sourceCode = String(payload.content ?? '')
    targetScript.instance = null
    targetScript.initialized = false
    targetScript.started = false
    sceneStore.markDirty()
    if (!payload.live) project.setStatus('已从独立代码编辑窗口接收实体脚本配置')
    if (payload.saveRequested) project.setStatus('实体脚本配置已保存到当前场景状态，请保存场景/项目以写入文件')
    return
  }

  if (payload.mode !== 'asset' && payload.mode !== 'entity') return
  if (payload.id && codeEditorSessionId && payload.id !== codeEditorSessionId) return
  if (codeEditorSessionMode && payload.mode !== codeEditorSessionMode) return
  const nextContent = String(payload.content ?? '')
  if (payload.mode === 'entity') {
    const targetEntity = sceneStore.scenes
      .map((scene) => scene.getEntityById(codeEditorSessionEntityId))
      .find(Boolean)
    const targetScript = targetEntity?.getComponent<ScriptComponent>('Script')
    if (!targetScript) {
      project.setStatus('代码窗口内容未应用：原实体脚本已不存在')
      return
    }
    targetScript.sourceCode = nextContent
    sceneStore.markDirty()
  } else {
    if (!codeEditorSessionPath || (payload.path && payload.path !== codeEditorSessionPath)) return
    assets.setTextAssetDraft(codeEditorSessionPath, nextContent, true)
    if (selectedTextAssetPath.value === codeEditorSessionPath) {
      assetScriptText.value = nextContent
      assetDirty.value = true
    }
  }
  if (!payload.live) project.setStatus('已从独立代码编辑窗口接收内容')
  if (payload.saveRequested && payload.mode === 'asset') {
    void saveExternalAssetScript(nextContent)
  } else if (payload.saveRequested && payload.mode === 'entity') {
    project.setStatus('实体脚本已保存到当前场景状态，请保存场景/项目以写入文件')
  }
}

async function saveExternalAssetScript(content: string) {
  if (!codeEditorSessionPath) return
  if (!window.unu?.saveTextAsset || project.rootPath === 'sample-project') {
    project.setStatus('当前环境下无法直接保存脚本文件。')
    return
  }
  try {
    const saved = await window.unu.saveTextAsset({
      filePath: codeEditorSessionAssetFilePath || undefined,
      content,
      suggestedName: fileNameOf(codeEditorSessionPath),
      projectRoot: project.rootPath,
      subdir: 'assets/scripts',
      title: '保存脚本文件',
      filterName: 'Script'
    })
    if (!saved) {
      project.setStatus('已取消保存脚本。')
      return
    }
    codeEditorSessionAssetFilePath = saved.filePath
    if (selectedTextAssetPath.value === codeEditorSessionPath) {
      assetFilePath.value = saved.filePath
      assetDirty.value = false
    }
    assets.clearTextAssetDraft(codeEditorSessionPath)
    const linkedCount = sceneStore.syncScriptSourceByPath(codeEditorSessionPath, content)
    project.setStatus(linkedCount > 0
      ? `脚本已保存并同步到 ${linkedCount} 个实体：${saved.name}`
      : `脚本已保存：${saved.name}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    project.setStatus(`保存脚本失败：${message}`)
  }
}

function handleExternalCodeEditorClosed(raw: unknown) {
  const payload = (raw || {}) as { id?: string; mode?: string }
  if (payload.mode === 'inspector-entity-script') {
    editor.unlockScriptEditorExternal(payload.id)
    project.setStatus('独立代码编辑窗口已关闭，右侧编辑器已解锁')
    return
  }

  if (payload.mode && payload.mode !== 'asset' && payload.mode !== 'entity') return
  if (payload.id && codeEditorSessionId && payload.id !== codeEditorSessionId) return
  localExternalCodeEditorLocked.value = false
  editor.unlockScriptEditorExternal(payload.id)
  codeEditorSessionId = ''
  codeEditorSessionMode = ''
  codeEditorSessionPath = ''
  codeEditorSessionEntityId = ''
  codeEditorSessionAssetFilePath = ''
  project.setStatus('独立代码编辑窗口已关闭，右侧编辑器已解锁')
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
  'new', 'class', 'extends', 'try', 'catch', 'finally', 'throw', 'async', 'await',
  'typeof', 'instanceof', 'in', 'of', 'static', 'get', 'set', 'do', 'yield',
  'this', 'super', 'void', 'delete'
])

const JS_CONSTANTS = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity'])
const JS_TYPES = new Set([
  'Array', 'Object', 'String', 'Number', 'Boolean', 'Map', 'Set', 'Promise',
  'Math', 'Date', 'JSON', 'Error', 'RegExp', 'console'
])
const UNU_API_WORDS = new Set([
  'api', 'world', 'entity', 'scene', 'input', 'audio', 'camera', 'ui', 'physics',
  'collision', 'trigger', 'prefab', 'asset', 'assets', 'runtime', 'debug', 'logger'
])
const UNU_LIFECYCLE_WORDS = new Set([
  'onInit', 'onStart', 'onUpdate', 'onFixedUpdate', 'onDestroy',
  'onEnterScene', 'onExitScene', 'onInteract',
  'onCollisionEnter', 'onCollisionStay', 'onCollisionExit',
  'onTriggerEnter', 'onTriggerStay', 'onTriggerExit'
])
const JS_OPERATORS = new Set([
  '+', '-', '*', '/', '%', '=', '!', '<', '>', '&', '|', '^', '?', ':', '~'
])

function nextNonWhitespaceIndex(text: string, index: number) {
  let cursor = index
  while (cursor < text.length && /\s/.test(text[cursor])) cursor += 1
  return cursor
}

function previousNonWhitespaceIndex(text: string, index: number) {
  let cursor = index
  while (cursor >= 0 && /\s/.test(text[cursor])) cursor -= 1
  return cursor
}

function previousWord(text: string, index: number) {
  let cursor = previousNonWhitespaceIndex(text, index)
  while (cursor >= 0 && /[A-Za-z0-9_$]/.test(text[cursor])) cursor -= 1
  const word = text.slice(cursor + 1, previousNonWhitespaceIndex(text, index) + 1)
  return word || ''
}

function wrapToken(cls: string, value: string) {
  return `<span class="${cls}">${escapeHtml(value)}</span>`
}

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
      const prevIndex = previousNonWhitespaceIndex(segment, start - 1)
      const nextIndex = nextNonWhitespaceIndex(segment, i)
      const prevChar = prevIndex >= 0 ? segment[prevIndex] : ''
      const nextChar = nextIndex < segment.length ? segment[nextIndex] : ''
      const prevWord = previousWord(segment, start - 1)
      if (UNU_LIFECYCLE_WORDS.has(word)) out += wrapToken('tok-lifecycle', word)
      else if (JS_KEYWORDS.has(word)) out += wrapToken('tok-keyword', word)
      else if (JS_CONSTANTS.has(word)) out += wrapToken('tok-constant', word)
      else if (UNU_API_WORDS.has(word)) out += wrapToken('tok-api', word)
      else if (JS_TYPES.has(word)) out += wrapToken('tok-type', word)
      else if (nextChar === ':' && prevChar !== '?') out += wrapToken('tok-key', word)
      else if (prevChar === '.') out += wrapToken('tok-property', word)
      else if (nextChar === '(' || prevWord === 'function' || prevWord === 'class') out += wrapToken('tok-function', word)
      else out += escapeHtml(word)
      continue
    }

    if (/\d/.test(ch) || ((ch === '-' || ch === '+') && i + 1 < segment.length && /\d/.test(segment[i + 1]))) {
      const start = i
      i += 1
      while (i < segment.length && /[0-9a-fA-FxXbBoO._eE+-]/.test(segment[i])) i += 1
      out += wrapToken('tok-number', segment.slice(start, i))
      continue
    }

    if (JS_OPERATORS.has(ch)) {
      const start = i
      i += 1
      while (i < segment.length && JS_OPERATORS.has(segment[i])) i += 1
      out += wrapToken('tok-operator', segment.slice(start, i))
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
      const rawKey = str.slice(1, -1)
      let cls = code[j] === ':' ? 'tok-key' : 'tok-string'
      if (code[j] === ':' && UNU_LIFECYCLE_WORDS.has(rawKey)) cls = 'tok-lifecycle'
      out += wrapToken(cls, str)
      continue
    }
    if (/\d/.test(code[i]) || ((code[i] === '-' || code[i] === '+') && i + 1 < code.length && /\d/.test(code[i + 1]))) {
      const start = i
      i += 1
      while (i < code.length && /[0-9.eE+-]/.test(code[i])) i += 1
      out += wrapToken('tok-number', code.slice(start, i))
      continue
    }
    if (
      (code.startsWith('true', i) || code.startsWith('false', i) || code.startsWith('null', i)) &&
      !/[A-Za-z0-9_$]/.test(code[i - 1] || '') &&
      !/[A-Za-z0-9_$]/.test(code[i + (code.startsWith('true', i) ? 4 : code.startsWith('false', i) ? 5 : 4)] || '')
    ) {
      const lit = code.startsWith('true', i) ? 'true' : code.startsWith('false', i) ? 'false' : 'null'
      out += wrapToken('tok-constant', lit)
      i += lit.length
      continue
    }
    if (JS_OPERATORS.has(code[i])) {
      const start = i
      i += 1
      while (i < code.length && JS_OPERATORS.has(code[i])) i += 1
      out += wrapToken('tok-operator', code.slice(start, i))
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
      out += wrapToken('tok-comment', code.slice(start, i))
      continue
    }
    if (code[i] === '/' && code[i + 1] === '*') {
      const start = i
      i += 2
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i += 1
      i = Math.min(code.length, i + 2)
      out += wrapToken('tok-comment', code.slice(start, i))
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
      out += wrapToken('tok-string', code.slice(start, i))
      continue
    }

    const segStart = i
    while (i < code.length) {
      if (
        (code[i] === '/' && (code[i + 1] === '/' || code[i + 1] === '*')) ||
        code[i] === '"' ||
        code[i] === "'" ||
        code[i] === '`'
      ) break
      i += 1
    }
    out += highlightPlainJsSegment(code.slice(segStart, i))
  }
  return out
}

onMounted(() => {
  removeCodeEditorListener = window.unu?.onCodeEditorApply?.((payload) => applyExternalCodeEditorPayload(payload)) || null
  removeCodeEditorClosedListener = window.unu?.onCodeEditorClosed?.((payload) => handleExternalCodeEditorClosed(payload)) || null
})

onBeforeUnmount(() => {
  removeCodeEditorListener?.()
  removeCodeEditorListener = null
  removeCodeEditorClosedListener?.()
  removeCodeEditorClosedListener = null
})
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
.editor-body {
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: grid;
  grid-template-rows: minmax(180px, 1fr);
}
.find-popover {
  position: absolute;
  top: 10px;
  right: 14px;
  z-index: 5;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
  max-width: calc(100% - 28px);
  padding: 7px;
  border: 1px solid #2a3140;
  border-radius: 10px;
  background: rgba(17, 24, 33, 0.98);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.36);
  backdrop-filter: blur(8px);
}
.find-input {
  min-width: 0;
  width: 150px;
  border: 1px solid #303848;
  border-radius: 7px;
  background: #202632;
  color: #ecf0f7;
  padding: 6px 8px;
  font-size: 12px;
  outline: none;
}
.replace-input {
  width: 150px;
}
.find-input:focus {
  border-color: #56b6c2;
}
.find-count {
  flex: 0 0 auto;
  min-width: 58px;
  color: #8ea0b8;
  font-size: 12px;
  text-align: center;
}
.find-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #9fb1c6;
  font-size: 12px;
  user-select: none;
}
.find-popover button {
  flex: 0 0 auto;
  border: 1px solid #303848;
  background: #202632;
  color: #ecf0f7;
  padding: 6px 8px;
  border-radius: 7px;
  cursor: pointer;
  font-size: 12px;
}
.find-popover button:hover {
  background: #2d3443;
}
.find-close {
  width: 28px;
  height: 28px;
  padding: 0;
  font-size: 16px;
  line-height: 1;
  margin-top: auto;
  margin-left: auto;
}
.title-row {
  display: flex;
  justify-content: space-between;
  gap: 40px;
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
  /*background: #202838;*/
  padding: 4px 8px;
  /*border-radius: 999px;*/
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
.save-btn.secondary {
  border-color: #39465a;
  background: #202632;
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
textarea:disabled {
  cursor: not-allowed;
}
.editor-lock {
  position: absolute;
  inset: 0;
  z-index: 6;
  display: grid;
  place-content: center;
  gap: 8px;
  padding: 18px;
  text-align: center;
  color: #dbe8f7;
  background: rgba(10, 15, 23, 0.72);
  backdrop-filter: blur(3px);
}
.editor-lock strong {
  font-size: 14px;
}
.editor-lock span {
  max-width: 360px;
  color: #9fb0c5;
  font-size: 12px;
  line-height: 1.6;
}
.code-shell {
  position: relative;
  min-width: 0;
  min-height: 180px;
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
.highlight-layer :deep(.tok-api) {
  color: #61d6a3;
  font-weight: 600;
}
.highlight-layer :deep(.tok-lifecycle) {
  color: #ff9ecb;
  font-weight: 700;
}
.highlight-layer :deep(.tok-type) { color: #82d2ff; }
.highlight-layer :deep(.tok-function) { color: #f5d76e; }
.highlight-layer :deep(.tok-property) { color: #b8c7da; }
.highlight-layer :deep(.tok-key) { color: #8bd8c7; }
.highlight-layer :deep(.tok-string) { color: #d9c88b; }
.highlight-layer :deep(.tok-number) { color: #f0a86e; }
.highlight-layer :deep(.tok-operator) { color: #f08fa3; }
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
  height: 100px;
}
</style>
