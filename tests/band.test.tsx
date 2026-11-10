import { expect, test } from 'claude-code/testing'

const band = (surface: 'terminal' | 'desktop', cols: number) =>
  ({
    plugin: 'usage-band',
    component: 'AbovePrompt',
    surface,
    props: {
      hasSurvey: false,
      isCollapsed: false,
      isWorking: false,
      maxRows: 10,
      bodyColumns: cols,
      scroll: { offset: 0, bodyRows: 10 },
      view: {},
    },
    viewport: { columns: cols + 5, rows: 40 },
  }) as const

const NOW = Date.parse('2026-11-10T08:00:00Z')

async function seed($: any, on: any, withLimits = true) {
  on('clock.now', () => ({ value: NOW }))
  on('session.measure', (_: unknown, e: any) => ({ changed: e.changed }))
  await $.session.measure({
    context: { tokens: 28000, window: 200000, percent: 14 },
    rateLimits: withLimits
      ? [
          { kind: 'five_hour', percentUsed: 54, resetsAt: '2026-11-10T10:00:00Z' },
          { kind: 'seven_day', percentUsed: 86, resetsAt: '2026-11-14T22:59:00Z' },
        ]
      : [],
    changed: ['context', 'rateLimits'],
  })
}

const PX_PER_COL = 7.8

test('desktop: one SVG row, 28px tall, fits every width, bars shrink before ↻ goes', async ($, on) => {
  await seed($, on)
  const seen: string[] = []
  for (const cols of [200, 130, 110, 95, 80, 70]) {
    const ui = await $.ui.mount(band('desktop', cols))
    const el = await ui.find({ type: 'Svg' })
    const p = el?.props as { source: string; width: number; height: number; alt: string }
    expect(p.height).toBe(28)
    expect(typeof p.width).toBe('number')
    expect(p.width <= cols * PX_PER_COL).toBe(true)
    expect(p.source.includes('font-size="13"')).toBe(true)
    expect(p.source.includes('#0f1b3d')).toBe(true)
    // WEEK 86% → orange; SESSION teal; CONTEXT light sky
    expect(p.source.includes('#fb923c')).toBe(true)
    expect(p.source.includes('#2dd4bf')).toBe(true)
    expect(p.source.includes('#7dd3fc')).toBe(true)
    const bars = [...p.source.matchAll(/fill="url\(#dots\)".*?/g)].length
    expect(bars).toBe(3)
    const widths = [...p.source.matchAll(/<rect x="[\d.]+" y="9" width="([\d.]+)" height="10" fill="url/g)].map(m => m[1])
    expect(new Set(widths).size).toBe(1)
    expect(Number(widths[0]) <= 120).toBe(true)
    seen.push(`${cols}col→${p.width}px bar=${widths[0]} reset=${p.source.includes('↻')}`)
    await ui.unmount()
  }
  console.log(seen.join('\n'))
})

test('desktop: ↻ values and percentages read from the measurement', async ($, on) => {
  await seed($, on)
  const ui = await $.ui.mount(band('desktop', 200))
  const p = (await ui.find({ type: 'Svg' }))?.props as { alt: string; source: string }
  expect(p.alt).toBe('SESSION 54% ↻2h00 | WEEK 86% ↻4d14h | CONTEXT 14%')
  expect(p.source.includes('☀')).toBe(true)
  await ui.unmount()
})

test('missing values show —, never a made-up number', async ($, on) => {
  await seed($, on, false)
  const ui = await $.ui.mount(band('desktop', 200))
  const p = (await ui.find({ type: 'Svg' }))?.props as { alt: string }
  expect(p.alt).toBe('SESSION — ↻— | WEEK — ↻— | CONTEXT 14%')
  await ui.unmount()
})

test('terminal: █ ░ row never wider than the band', async ($, on) => {
  await seed($, on)
  const out: string[] = []
  for (const cols of [160, 100, 80, 70, 64]) {
    const ui = await $.ui.mount(band('terminal', cols))
    const t = (await ui.find({ type: 'Text', text: /SESSION.*CONTEXT/ }))?.text ?? ''
    out.push(`${cols}: ${t}`)
    console.log(cols, [...t].length, JSON.stringify(t))
    expect(t.includes('\n')).toBe(false)
    expect(t.includes('█')).toBe(true)
    // emoji take 2 cells each
    expect([...t].length + 3 <= cols).toBe(true)
    await ui.unmount()
  }
  console.log(out.join('\n'))
})
