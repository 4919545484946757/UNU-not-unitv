import { defineStore } from 'pinia'

export type ConsoleMessageLevel = 'log' | 'warn' | 'error'

export interface ConsoleMessage {
  id: number
  level: ConsoleMessageLevel
  message: string
  source?: string
  line?: number
  column?: number
  createdAt: string
  lastAt: string
  repeatCount: number
}

let nextConsoleMessageId = 1

function normalizeConsoleText(input: unknown) {
  return String(input ?? '')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
}

function makeConsoleMessageKey(level: ConsoleMessageLevel, message: string, meta?: { source?: string; line?: number; column?: number }) {
  return [
    level,
    meta?.source || '',
    meta?.line ?? '',
    meta?.column ?? '',
    message
  ].join('\u0001')
}

export const useConsoleStore = defineStore('console', {
  state: () => ({
    messages: [] as ConsoleMessage[],
    maxMessages: 500,
    duplicateIndex: {} as Record<string, number>,
    revision: 0
  }),
  actions: {
    push(level: ConsoleMessageLevel, message: string, meta?: { source?: string; line?: number; column?: number }) {
      const createdAt = new Date().toLocaleTimeString()
      const normalizedMessage = normalizeConsoleText(message)
      const key = makeConsoleMessageKey(level, normalizedMessage, meta)
      const existingId = this.duplicateIndex[key]
      const existing = existingId ? this.messages.find((item) => item.id === existingId) : null
      if (existing) {
        existing.repeatCount += 1
        existing.lastAt = createdAt
        this.revision += 1
        return
      }
      const id = nextConsoleMessageId++
      this.messages.push({
        id,
        level,
        message: normalizedMessage,
        source: meta?.source,
        line: meta?.line,
        column: meta?.column,
        createdAt,
        lastAt: createdAt,
        repeatCount: 1
      })
      this.duplicateIndex[key] = id
      if (this.messages.length > this.maxMessages) {
        this.messages.splice(0, this.messages.length - this.maxMessages)
        this.rebuildDuplicateIndex()
      }
      this.revision += 1
    },
    log(message: string, meta?: { source?: string; line?: number; column?: number }) {
      this.push('log', message, meta)
    },
    warn(message: string, meta?: { source?: string; line?: number; column?: number }) {
      this.push('warn', message, meta)
    },
    error(message: string, meta?: { source?: string; line?: number; column?: number }) {
      this.push('error', message, meta)
    },
    clear() {
      this.messages = []
      this.duplicateIndex = {}
      this.revision += 1
    },
    rebuildDuplicateIndex() {
      const next: Record<string, number> = {}
      for (const item of this.messages) {
        next[makeConsoleMessageKey(item.level, item.message, item)] = item.id
      }
      this.duplicateIndex = next
    }
  }
})
