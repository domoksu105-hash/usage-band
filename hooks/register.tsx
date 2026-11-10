import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionContextUsage, SessionRateLimit } from 'claude-code'

import type { UsageSnap } from '../types'
import { barChars, cells, COLORS, fitCols, fmtPct, svg } from './layout'

const snapAtom = atom({ plugin: 'usage-band', key: 'snap' } as const, null)

/** Desktop code-font cell width in px: turns viewport columns into px. */
const DESKTOP_CELL_PX = 7.8
const DESKTOP_RESERVE_PX = 8 // safety margin

function pick(limits: SessionRateLimit[], kind: string): { pct: number | null; reset: number | null } {
  const l = limits.find(r => r.kind === kind)
  if (!l || typeof l.percentUsed !== 'number') return { pct: null, reset: null }
  const t = l.resetsAt ? Date.parse(l.resetsAt) : NaN
  return { pct: l.percentUsed, reset: Number.isFinite(t) ? t : null }
}

function toSnap(context: SessionContextUsage, limits: SessionRateLimit[]): UsageSnap {
  const s = pick(limits, 'five_hour')
  const w = pick(limits, 'seven_day')
  return {
    sessionPct: s.pct,
    sessionReset: s.reset,
    weekPct: w.pct,
    weekReset: w.reset,
    ctxPct: typeof context.percent === 'number' ? context.percent : null,
  }
}

async function refresh($: EngineInterface) {
  try {
    const u = await $.session.usage()
    const snap = toSnap(u.context, u.rateLimits)
    await update($, snapAtom, () => snap)
  } catch {
    // keep the last reading; unknown values stay '—'
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    await refresh($)
    return r
  })

  on('session.measure', async ($, e, next) => {
    const snap = toSnap(e.context, e.rateLimits)
    await update($, snapAtom, () => snap)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    await refresh($)
    return r
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const snap = await read($, snapAtom)
    const now = await $.clock.now()
    const cs = cells(snap, now)
    // the band's own width (engine's [-] already taken off), else the viewport's
    const cols = e.props.bodyColumns > 0 ? e.props.bodyColumns : e.viewport?.columns

    if (e.surface === 'terminal') {
      const { Box, Text } = $.ui.resolve(e)
      const { bar, showReset } = fitCols(cs, cols ?? 200)
      return (
        <Box flexDirection="row" flexWrap="nowrap" alignItems="center">
          <Text wrap="truncate-end" backgroundColor={COLORS.bg}>
            {' '}
            {cs.map((c, i) => {
              const [f, r] = barChars(c.pct, bar)
              return (
                <Text key={c.name}>
                  {i > 0 ? <Text color={COLORS.dot}> │ </Text> : ''}
                  <Text>{c.icon} </Text>
                  <Text weight="bold" color={COLORS.name}>{c.name}</Text>
                  <Text color={COLORS.dim}> [</Text>
                  <Text color={c.fill}>{f}</Text>
                  <Text color={COLORS.dot}>{r}</Text>
                  <Text color={COLORS.dim}>] {fmtPct(c.pct).padStart(4)}</Text>
                  {showReset && c.reset !== null ? <Text color={COLORS.dim}> ↻{c.reset}</Text> : ''}
                </Text>
              )
            })}{' '}
          </Text>
        </Box>
      )
    }

    const els = $.ui.resolve(e)
    if (!('Svg' in els)) return next(e)
    const { Box, Svg } = els
    const avail = cols !== undefined ? cols * DESKTOP_CELL_PX - DESKTOP_RESERVE_PX : 1200
    const d = svg(cs, avail)
    const alt = cs.map(c => `${c.name} ${fmtPct(c.pct)}${c.reset ? ` ↻${c.reset}` : ''}`).join(' | ')
    return (
      <Box flexDirection="row" flexWrap="nowrap" alignItems="center">
        <Svg source={d.source} alt={alt} width={d.width} height={d.height} />
      </Box>
    )
  })
}
