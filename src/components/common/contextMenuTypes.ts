export interface ContextMenuItem {
  label: string
  disabled?: boolean
  action: () => void | Promise<void>
}
