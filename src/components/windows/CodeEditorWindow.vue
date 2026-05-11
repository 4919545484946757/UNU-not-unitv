<template>
  <div class="code-window">
    <header>
      <div class="title">
        <strong>{{ title || 'UNU Code Editor' }}</strong>
        <span>{{ path || mode }}</span>
      </div>
      <div class="actions">
        <button title="保存当前代码。资源脚本会写入文件；实体脚本会标记场景已修改。" @click="saveToMain">保存</button>
        <button title="保存当前代码，然后关闭独立窗口。" @click="saveAndClose">保存并关闭</button>
        <button @click="closeWindow">关闭</button>
      </div>
    </header>

    <main>
      <div class="editor-wrap">
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
          <button class="find-close" title="关闭" @click="closeFindPanel">x</button>
        </div>
        <pre ref="highlightRef" class="highlight-layer" v-html="highlightedHtml"></pre>
        <textarea
          ref="textareaRef"
          v-model="content"
          spellcheck="false"
          wrap="off"
          @input="handleInput"
          @scroll="syncScroll"
          @keydown="handleEditorKeydown"
          @keydown.ctrl.s.prevent="saveToMain"
          @keydown.meta.s.prevent="saveToMain"
        ></textarea>
      </div>
    </main>

    <footer>
      <span>{{ languageLabel }}</span>
      <span>{{ lineCount }} lines</span>
      <span>{{ status }}</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

interface CodeEditorInitPayload {
  id?: string
  mode?: 'entity' | 'asset' | string
  title?: string
  path?: string
  language?: string
  content?: string
}

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const highlightRef = ref<HTMLElement | null>(null)
const findInputRef = ref<HTMLInputElement | null>(null)
const sessionId = ref('')
const mode = ref('')
const title = ref('')
const path = ref('')
const language = ref('')
const content = ref('')
const status = ref('输入会实时同步到右侧脚本面板；Ctrl+S 保存；Ctrl+F 查找/替换。')
const findPanel = reactive({
  visible: false,
  query: '',
  replace: '',
  caseSensitive: false,
  currentIndex: -1
})
let removeInitListener: (() => void) | null = null
let liveSyncTimer = 0

const lineCount = computed(() => Math.max(1, content.value.split('\n').length))
const currentLanguage = computed<'js' | 'json' | 'plain'>(() => {
  const raw = language.value.toLowerCase()
  if (raw === 'js' || raw === 'javascript' || raw === 'ts' || raw === 'typescript') return 'js'
  if (raw === 'json') return 'json'
  if (raw === 'plain' || raw === 'text') return 'plain'
  const lowerPath = path.value.toLowerCase()
  if (lowerPath.includes('custom://interaction')) return 'json'
  if (lowerPath.endsWith('.json') || lowerPath.endsWith('.anim') || lowerPath.endsWith('.atlas')) return 'json'
  if (lowerPath.endsWith('.js') || lowerPath.endsWith('.ts') || lowerPath.includes('builtin://')) return 'js'
  return 'plain'
})
const languageLabel = computed(() => currentLanguage.value.toUpperCase())
const highlightedHtml = computed(() => {
  const code = content.value || ''
  if (currentLanguage.value === 'json') return `${highlightJson(code)}\n`
  if (currentLanguage.value === 'js') return `${highlightJsLike(code)}\n`
  return `${escapeHtml(code)}\n`
})
const findMatches = computed(() => collectFindMatches(content.value, findPanel.query, findPanel.caseSensitive))
const findMatchLabel = computed(() => {
  if (!findPanel.query) return '输入关键字'
  if (!findMatches.value.length) return '0 / 0'
  return `${Math.max(1, findPanel.currentIndex + 1)} / ${findMatches.value.length}`
})

function hydrate(raw: unknown) {
  const payload = (raw || {}) as CodeEditorInitPayload
  sessionId.value = String(payload.id || '')
  mode.value = String(payload.mode || '')
  title.value = String(payload.title || '')
  path.value = String(payload.path || '')
  language.value = String(payload.language || '')
  content.value = String(payload.content || '')
  status.value = '已从主编辑器加载。'
  void nextTick(() => {
    textareaRef.value?.focus()
    syncScroll()
  })
}

async function pushToMain(options: { saveRequested?: boolean; live?: boolean } = {}) {
  if (!window.unu?.submitCodeEditorUpdate) return
  const result = await window.unu.submitCodeEditorUpdate({
    id: sessionId.value,
    mode: mode.value,
    path: path.value,
    language: language.value,
    content: content.value,
    saveRequested: Boolean(options.saveRequested),
    live: Boolean(options.live),
    appliedAt: Date.now()
  })
  if (!result?.ok) {
    status.value = `同步失败：${result?.error || '未知错误'}`
    return
  }
  if (options.saveRequested) status.value = '已保存。'
  else if (!options.live) status.value = '已同步到右侧脚本面板。'
}

function queueLiveSync() {
  if (liveSyncTimer) window.clearTimeout(liveSyncTimer)
  liveSyncTimer = window.setTimeout(() => {
    liveSyncTimer = 0
    void pushToMain({ live: true })
  }, 120)
}

async function flushLiveSync() {
  if (liveSyncTimer) {
    window.clearTimeout(liveSyncTimer)
    liveSyncTimer = 0
  }
  await pushToMain({ live: true })
}

async function saveToMain() {
  await flushLiveSync()
  await pushToMain({ saveRequested: true })
}

async function saveAndClose() {
  await saveToMain()
  await closeWindow()
}

async function closeWindow() {
  await flushLiveSync()
  await window.unu?.closeCodeEditor?.()
}

function handleInput() {
  queueLiveSync()
  updateFindIndexFromSelection()
  syncScroll()
}

function syncScroll() {
  const textarea = textareaRef.value
  const highlight = highlightRef.value
  if (!textarea || !highlight) return
  highlight.scrollTop = textarea.scrollTop
  highlight.scrollLeft = textarea.scrollLeft
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

function openFindPanel() {
  const textarea = textareaRef.value
  const selected = textarea && textarea.selectionEnd > textarea.selectionStart
    ? content.value.slice(textarea.selectionStart, textarea.selectionEnd)
    : ''
  if (selected && !selected.includes('\n') && selected.length <= 120) findPanel.query = selected
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
  findPanel.currentIndex = findMatches.value.findIndex((match) => (
    match.start === textarea.selectionStart && match.end === textarea.selectionEnd
  ))
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
    status.value = `未找到：${findPanel.query}`
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
}

function selectedTextMatchesQuery() {
  const textarea = textareaRef.value
  if (!textarea || !findPanel.query) return false
  const selected = content.value.slice(textarea.selectionStart, textarea.selectionEnd)
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
  content.value = `${content.value.slice(0, start)}${findPanel.replace}${content.value.slice(end)}`
  queueLiveSync()
  void nextTick(() => {
    textarea.focus()
    textarea.setSelectionRange(start, start + findPanel.replace.length)
    syncScroll()
    findNext(1)
  })
}

function replaceAll() {
  if (!findPanel.query) return
  const matches = findMatches.value
  if (!matches.length) {
    status.value = `未找到：${findPanel.query}`
    return
  }
  let nextText = ''
  let cursor = 0
  for (const match of matches) {
    nextText += content.value.slice(cursor, match.start)
    nextText += findPanel.replace
    cursor = match.end
  }
  nextText += content.value.slice(cursor)
  content.value = nextText
  findPanel.currentIndex = -1
  status.value = `已替换 ${matches.length} 处：${findPanel.query}`
  queueLiveSync()
  void nextTick(syncScroll)
}

function scrollSelectionIntoView() {
  const textarea = textareaRef.value
  if (!textarea) return
  const textBefore = content.value.slice(0, textarea.selectionStart)
  const line = textBefore.split('\n').length
  const column = textBefore.length - textBefore.lastIndexOf('\n') - 1
  const style = window.getComputedStyle(textarea)
  const lineHeight = Number.parseFloat(style.lineHeight) || 20
  const charWidth = Math.max(7, Number.parseFloat(style.fontSize || '14') * 0.62)
  textarea.scrollTop = Math.max(0, (line - 1) * lineHeight - textarea.clientHeight * 0.42)
  textarea.scrollLeft = Math.max(0, column * charWidth - textarea.clientWidth * 0.45)
  syncScroll()
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
  removeInitListener = window.unu?.onCodeEditorInit?.((payload) => hydrate(payload)) || null
})

onBeforeUnmount(() => {
  if (liveSyncTimer) window.clearTimeout(liveSyncTimer)
  removeInitListener?.()
  removeInitListener = null
})
</script>

<style scoped>
.code-window {
  height: 100vh;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  background: #0f141d;
  color: #dbe4ee;
  font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace;
}
header,
footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: #151c29;
  border-bottom: 1px solid #2a3140;
}
footer {
  border-top: 1px solid #2a3140;
  border-bottom: 0;
  color: #8ea0b8;
  font-size: 12px;
}
.title {
  min-width: 0;
  display: grid;
  gap: 3px;
}
.title strong {
  color: #edf5ff;
  font-size: 13px;
}
.title span {
  color: #8ea0b8;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
button {
  border: 1px solid #303848;
  background: #202632;
  color: #ecf0f7;
  padding: 7px 10px;
  border-radius: 8px;
  cursor: pointer;
}
button:hover {
  background: #2d3443;
}
main {
  min-height: 0;
  padding: 12px;
}
.editor-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  border: 1px solid #2a3140;
  border-radius: 12px;
  background: #0b1018;
  overflow: hidden;
}
.highlight-layer,
textarea {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  margin: 0;
  padding: 14px;
  overflow: auto;
  white-space: pre;
  font: inherit;
  font-size: 14px;
  line-height: 1.55;
  font-variant-ligatures: none;
  tab-size: 2;
  overflow-wrap: normal;
  word-break: normal;
  scrollbar-gutter: stable both-edges;
}
.highlight-layer {
  pointer-events: none;
  color: #dbe4ee;
  z-index: 1;
}
textarea {
  z-index: 2;
  resize: none;
  border: 0;
  outline: none;
  background: transparent;
  color: transparent;
  caret-color: #edf5ff;
  -webkit-text-fill-color: transparent;
}
.editor-wrap:focus-within {
  border-color: #56b6c2;
}
textarea::selection {
  background: rgba(88, 166, 255, 0.35);
  -webkit-text-fill-color: transparent;
}
textarea::-webkit-scrollbar,
.highlight-layer::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
textarea::-webkit-scrollbar-thumb,
.highlight-layer::-webkit-scrollbar-thumb {
  background: #2a3040;
  border-radius: 999px;
}
.highlight-layer :deep(.tok-comment) {
  color: #6f839f;
}
.highlight-layer :deep(.tok-keyword) {
  color: #7cc3ff;
}
.highlight-layer :deep(.tok-constant) {
  color: #d7a6ff;
}
.highlight-layer :deep(.tok-api) {
  color: #61d6a3;
  font-weight: 600;
}
.highlight-layer :deep(.tok-lifecycle) {
  color: #ff9ecb;
  font-weight: 700;
}
.highlight-layer :deep(.tok-type) {
  color: #82d2ff;
}
.highlight-layer :deep(.tok-function) {
  color: #f5d76e;
}
.highlight-layer :deep(.tok-property) {
  color: #b8c7da;
}
.highlight-layer :deep(.tok-key) {
  color: #8bd8c7;
}
.highlight-layer :deep(.tok-string) {
  color: #d9c88b;
}
.highlight-layer :deep(.tok-number) {
  color: #f0a86e;
}
.highlight-layer :deep(.tok-operator) {
  color: #f08fa3;
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
  max-width: calc(100% - 28px);
  padding: 7px;
  border: 1px solid #2a3140;
  border-radius: 10px;
  background: rgba(17, 24, 33, 0.98);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.36);
}
.find-input {
  width: 160px;
  border: 1px solid #303848;
  border-radius: 7px;
  background: #202632;
  color: #ecf0f7;
  padding: 6px 8px;
  font-size: 12px;
  outline: none;
}
.replace-input {
  width: 170px;
}
.find-count {
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
.find-close {
  width: 28px;
  height: 28px;
  padding: 0;
  font-size: 16px;
  line-height: 1;
}
</style>
