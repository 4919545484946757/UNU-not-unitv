export type CodeLanguage = 'js' | 'json' | 'plain'

export function useSyntaxHighlight() {
  return {
    highlightCode
  }
}

export function highlightCode(code: string, language: CodeLanguage) {
  if (language === 'plain') return `${escapeHtml(code)}\n`
  if (language === 'json') return `${highlightJson(code)}\n`
  return `${highlightJsLike(code)}\n`
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
