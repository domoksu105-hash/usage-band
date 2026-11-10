export type UsageSnap = {
  /** 5-hour window % used, null when not reported */
  sessionPct: number | null
  /** reset time, epoch ms, null when not reported */
  sessionReset: number | null
  weekPct: number | null
  weekReset: number | null
  /** context window % used, null when not reported */
  ctxPct: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'usage-band': { snap: UsageSnap | null }
  }
}
