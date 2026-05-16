export function blendColor(left: number, right: number, amount: number) {
  const ratio = Math.max(0, Math.min(1, amount))
  const lr = (left >> 16) & 0xff
  const lg = (left >> 8) & 0xff
  const lb = left & 0xff
  const rr = (right >> 16) & 0xff
  const rg = (right >> 8) & 0xff
  const rb = right & 0xff
  const r = Math.round(lr * (1 - ratio) + rr * ratio)
  const g = Math.round(lg * (1 - ratio) + rg * ratio)
  const b = Math.round(lb * (1 - ratio) + rb * ratio)
  return (r << 16) | (g << 8) | b
}

export function colorToCss(value: number) {
  const normalized = Math.max(0, Math.min(0xffffff, Math.round(Number(value) || 0)))
  return `#${normalized.toString(16).padStart(6, '0')}`
}

export function hexToRgba(value: number, alpha: number) {
  const normalized = Math.max(0, Math.min(0xffffff, Math.round(Number(value) || 0)))
  const r = (normalized >> 16) & 0xff
  const g = (normalized >> 8) & 0xff
  const b = normalized & 0xff
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`
}
