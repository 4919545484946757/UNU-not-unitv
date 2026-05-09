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
}

let nextConsoleMessageId = 1

function normalizeConsoleText(input: unknown) {
  return String(input ?? '')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
}

export const useConsoleStore = defineStore('console', {
  state: () => ({
    messages: [] as ConsoleMessage[],
    maxMessages: 500
  }),
  actions: {
    push(level: ConsoleMessageLevel, message: string, meta?: { source?: string; line?: number; column?: number }) {
      const createdAt = new Date().toLocaleTimeString()
      this.messages.push({
        id: nextConsoleMessageId++,
        level,
        message: normalizeConsoleText(message),
        source: meta?.source,
        line: meta?.line,
        column: meta?.column,
        createdAt
      })
      if (this.messages.length > this.maxMessages) {
        this.messages.splice(0, this.messages.length - this.maxMessages)
      }
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
    }
  }
})
