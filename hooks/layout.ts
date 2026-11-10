import type { UsageSnap } from '../types'

// ---- shared ---------------------------------------------------------------

export type Cell = {
  icon: string
  name: string
  pct: number | null
  reset: string | null // null = this cell has no reset slot (CONTEXT)
  fill: string
}

export const COLORS = {
  bg: '#0f1b3d',
  name: '#ffffff',
  dim: '#b4bccb',
  session: '#2dd4bf',
  week: '#4ade80',
  context: '#7dd3fc',
  hot: '#fb923c',
  track: '#26314f',
  dot: '#7d879c',
}

export function weather(p: number | null): string {
  if (p === null || p < 50) return '☀'
  if (p < 70) return '☁'
  if (p < 85) return '☂'
  return '⚡'
}

export function fmtReset(resetMs: number | null, now: number): string {
  if (resetMs === null || !Number.isFinite(resetMs)) return '—'
  const min = Math.max(0, Math.round((resetMs - now) / 60000))
  const d = Math.floor(min / 1440)
  const h = Math.floor((min % 1440) / 60)
  const m = min % 60
  if (d > 0) return `${d}d${h}h`
  return `${h}h${String(m).padStart(2, '0')}`
}

export function fmtPct(p: number | null): string {
  return p === null ? '—' : `${Math.round(p)}%`
}

export function cells(snap: UsageSnap | null, now: number): Cell[] {
  const s = snap ?? { sessionPct: null, sessionReset: null, weekPct: null, weekReset: null, ctxPct: null }
  const color = (p: number | null, base: string) => (p !== null && p > 80 ? COLORS.hot : base)
  return [
    { icon: '⏱', name: 'SESSION', pct: s.sessionPct, reset: fmtReset(s.sessionReset, now), fill: color(s.sessionPct, COLORS.session) },
    { icon: '📅', name: 'WEEK', pct: s.weekPct, reset: fmtReset(s.weekReset, now), fill: color(s.weekPct, COLORS.week) },
    { icon: weather(s.ctxPct), name: 'CONTEXT', pct: s.ctxPct, reset: null, fill: color(s.ctxPct, COLORS.context) },
  ]
}

// ---- desktop: one SVG, sizes in px -----------------------------------------

export const PX = {
  height: 28,
  font: 13,
  ch: 7.8, // forced advance per character (textLength), so text never overlaps
  icon: 18,
  pad: 10,
  gap: 6,
  bracket: 8,
  sep: 22,
  barMax: 120,
  barMin: 24,
  pctChars: 4,
  resetChars: 6,
}

export function fixedPx(cs: Cell[], showReset: boolean): number {
  let w = PX.pad * 2 + PX.sep * (cs.length - 1)
  for (const c of cs) {
    w += PX.icon + 4 + c.name.length * PX.ch + PX.gap + PX.bracket * 2 + PX.gap + PX.pctChars * PX.ch
    if (showReset && c.reset !== null) w += PX.gap + PX.resetChars * PX.ch
  }
  return w
}

/** Bars shrink first; when they would drop under barMin, the ↻ times go. */
export function fitPx(cs: Cell[], avail: number): { bar: number; showReset: boolean; width: number } {
  let showReset = true
  let bar = Math.min(PX.barMax, Math.floor((avail - fixedPx(cs, true)) / 3))
  if (bar < PX.barMin) {
    showReset = false
    bar = Math.min(PX.barMax, Math.floor((avail - fixedPx(cs, false)) / 3))
  }
  bar = Math.max(6, bar)
  return { bar, showReset, width: Math.ceil(fixedPx(cs, showReset) + bar * 3) }
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function svg(cs: Cell[], avail: number): { source: string; width: number; height: number; bar: number; showReset: boolean } {
  const { bar, showReset, width } = fitPx(cs, avail)
  const H = PX.height
  const cy = H / 2
  const mono = `font-family="Consolas, 'Cascadia Mono', D2Coding, monospace" font-size="${PX.font}"`
  const txt = (x: number, t: string, fill: string, extra = '') =>
    `<text x="${x.toFixed(1)}" y="${cy}" dominant-baseline="central" ${mono} fill="${fill}" textLength="${(t.length * PX.ch).toFixed(1)}" lengthAdjust="spacingAndGlyphs" ${extra}>${esc(t)}</text>`
  const parts: string[] = []
  parts.push(`<rect x="0" y="0" width="${width}" height="${H}" rx="6" fill="${COLORS.bg}"/>`)
  let x = PX.pad
  cs.forEach((c, i) => {
    if (i > 0) {
      const sx = (x + PX.sep / 2).toFixed(1)
      parts.push(`<line x1="${sx}" y1="7" x2="${sx}" y2="21" stroke="${COLORS.dot}" stroke-width="1"/>`)
      x += PX.sep
    }
    parts.push(`<text x="${(x + PX.icon / 2).toFixed(1)}" y="${cy}" dominant-baseline="central" text-anchor="middle" font-family="'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif" font-size="${PX.font}">${esc(c.icon)}</text>`)
    x += PX.icon + 4
    parts.push(txt(x, c.name, COLORS.name, 'font-weight="700"'))
    x += c.name.length * PX.ch + PX.gap
    parts.push(txt(x, '[', COLORS.dim))
    x += PX.bracket
    const by = cy - 5
    parts.push(`<rect x="${x.toFixed(1)}" y="${by}" width="${bar}" height="10" fill="url(#dots)"/>`)
    if (c.pct !== null) {
      const fw = (Math.max(0, Math.min(100, c.pct)) / 100) * bar
      if (fw > 0) parts.push(`<rect x="${x.toFixed(1)}" y="${by}" width="${fw.toFixed(1)}" height="10" fill="${c.fill}"/>`)
    }
    x += bar
    parts.push(txt(x + 1, ']', COLORS.dim))
    x += PX.bracket + PX.gap
    const p = fmtPct(c.pct)
    parts.push(txt(x + (PX.pctChars - p.length) * PX.ch, p, COLORS.dim)) // right-aligned in its slot
    x += PX.pctChars * PX.ch
    if (showReset && c.reset !== null) {
      x += PX.gap
      parts.push(txt(x, `↻${c.reset}`, COLORS.dim))
      x += PX.resetChars * PX.ch
    }
  })
  const defs = `<defs><pattern id="dots" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="${COLORS.track}"/><circle cx="2" cy="2" r="0.9" fill="${COLORS.dot}"/></pattern></defs>`
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${H}" viewBox="0 0 ${width} ${H}">${defs}${parts.join('')}</svg>`
  return { source, width, height: H, bar, showReset }
}

// ---- terminal: same shape in █ ░ ------------------------------------------

export const TERM = { icon: 2, barMax: 10, barMin: 3, sep: 3 }

export function fixedCols(cs: Cell[], showReset: boolean): number {
  let w = TERM.sep * (cs.length - 1) + 2
  for (const c of cs) {
    w += TERM.icon + 1 + c.name.length + 2 + 2 + 4
    if (showReset && c.reset !== null) w += 2 + c.reset.length
  }
  return w
}

export function fitCols(cs: Cell[], cols: number): { bar: number; showReset: boolean } {
  let showReset = true
  let bar = Math.min(TERM.barMax, Math.floor((cols - 4 - fixedCols(cs, true)) / 3))
  if (bar < TERM.barMin) {
    showReset = false
    bar = Math.min(TERM.barMax, Math.floor((cols - 4 - fixedCols(cs, false)) / 3))
  }
  return { bar: Math.max(1, bar), showReset }
}

export function barChars(p: number | null, n: number): [string, string] {
  const f = p === null ? 0 : Math.round((Math.max(0, Math.min(100, p)) / 100) * n)
  return ['█'.repeat(f), '░'.repeat(n - f)]
}
