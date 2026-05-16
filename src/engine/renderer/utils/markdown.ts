export type MarkdownLineKind = 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'quote' | 'list' | 'code' | 'blank'

export type MarkdownLine = {
  kind: MarkdownLineKind
  text: string
  bold?: boolean
  italic?: boolean
  indent?: number
}

export function parseBasicMarkdownLines(source: string): MarkdownLine[] {
  const lines = String(source || '').replace(/\r\n/g, '\n').split('\n')
  const output: MarkdownLine[] = []
  let inCodeBlock = false
  for (const raw of lines) {
    const line = raw.trimEnd()
    if (/^```/.test(line.trim())) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) {
      output.push({ kind: 'code', text: line || ' ' })
      continue
    }
    if (!line.trim()) {
      output.push({ kind: 'blank', text: '' })
      continue
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      output.push({
        kind: `heading${heading[1].length}` as MarkdownLineKind,
        text: stripInlineMarkdown(heading[2]),
        bold: true
      })
      continue
    }
    const quote = line.match(/^>\s*(.+)$/)
    if (quote) {
      output.push({ kind: 'quote', text: stripInlineMarkdown(quote[1]), italic: true, indent: 12 })
      continue
    }
    const list = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/)
    if (list) {
      output.push({
        kind: 'list',
        text: `• ${stripInlineMarkdown(list[3])}`,
        indent: Math.min(48, 14 + Math.floor(list[1].length / 2) * 12)
      })
      continue
    }
    const inline = analyzeInlineMarkdown(line)
    output.push({ kind: inline.isCode ? 'code' : 'paragraph', text: inline.text, bold: inline.bold, italic: inline.italic })
  }
  return output
}

function analyzeInlineMarkdown(source: string) {
  const isCode = /^`[^`]+`$/.test(source.trim())
  return {
    text: stripInlineMarkdown(source),
    bold: /\*\*[^*]+\*\*|__[^_]+__/.test(source),
    italic: /(^|[^*])\*[^*]+\*|(^|[^_])_[^_]+_/.test(source),
    isCode
  }
}

export function stripInlineMarkdown(source: string) {
  return String(source || '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .trim()
}

export function escapeHtmlContent(source: string) {
  return String(source || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function sanitizeHtmlContent(source: string) {
  const template = document.createElement('template')
  template.innerHTML = String(source || '')
  const allowedTags = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'CODE', 'PRE', 'P', 'BR', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'SPAN', 'DIV', 'SMALL', 'MARK', 'HR'])
  const allowedAttrs = new Set(['class', 'title'])
  const visit = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as HTMLElement
        if (!allowedTags.has(element.tagName)) {
          element.replaceWith(document.createTextNode(element.textContent || ''))
          continue
        }
        for (const attr of Array.from(element.attributes)) {
          if (!allowedAttrs.has(attr.name.toLowerCase())) element.removeAttribute(attr.name)
        }
      }
      visit(child)
    }
  }
  visit(template.content)
  return template.innerHTML
}

export function basicMarkdownToHtml(source: string) {
  const lines = parseBasicMarkdownLines(source)
  const html: string[] = []
  let listOpen = false
  const closeList = () => {
    if (!listOpen) return
    html.push('</ul>')
    listOpen = false
  }
  for (const line of lines) {
    if (line.kind !== 'list') closeList()
    if (line.kind === 'blank') {
      html.push('<br />')
      continue
    }
    const content = renderInlineMarkdownToHtml(line.text)
    if (line.kind === 'heading1') html.push(`<h1>${content}</h1>`)
    else if (line.kind === 'heading2') html.push(`<h2>${content}</h2>`)
    else if (line.kind === 'heading3') html.push(`<h3>${content}</h3>`)
    else if (line.kind === 'quote') html.push(`<blockquote>${content}</blockquote>`)
    else if (line.kind === 'code') html.push(`<pre><code>${escapeHtmlContent(line.text)}</code></pre>`)
    else if (line.kind === 'list') {
      if (!listOpen) {
        html.push('<ul>')
        listOpen = true
      }
      html.push(`<li>${content.replace(/^•\s*/, '')}</li>`)
    } else {
      html.push(`<p>${content}</p>`)
    }
  }
  closeList()
  return html.join('')
}

function renderInlineMarkdownToHtml(source: string) {
  return escapeHtmlContent(source)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
}
