'use client'

export interface AgentEvent {
  agent: string
  event: 'spawned' | 'completed'
  ts: string
}

const AGENT_COLORS = [
  '#22d3ee', // cyan
  '#a78bfa', // violet
  '#fbbf24', // amber
  '#f472b6', // pink
  '#c084fc', // purple
  '#60a5fa', // blue
  '#34d399', // emerald
  '#fb923c', // orange
  '#4ade80', // green
  '#e879f9', // fuchsia
]

interface Span {
  agent: string
  start: number
  end: number | null // null = still active
  color: string
}

export default function AgentTimeline({ events }: { events: AgentEvent[] }) {
  if (events.length === 0) return null

  const sorted = [...events].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
  const t0 = new Date(sorted[0].ts).getTime()
  const now = Date.now()

  // Build spans, handling retries (multiple spawn/complete per agent)
  const agentColorMap = new Map<string, string>()
  let colorIdx = 0
  const spans: Span[] = []
  const pending = new Map<string, number>() // agent -> span index

  for (const ev of sorted) {
    if (!agentColorMap.has(ev.agent)) {
      agentColorMap.set(ev.agent, AGENT_COLORS[colorIdx % AGENT_COLORS.length])
      colorIdx++
    }
    const ms = new Date(ev.ts).getTime() - t0
    if (ev.event === 'spawned') {
      const idx = spans.length
      spans.push({ agent: ev.agent, start: ms, end: null, color: agentColorMap.get(ev.agent)! })
      pending.set(ev.agent, idx)
    } else if (ev.event === 'completed') {
      const idx = pending.get(ev.agent)
      if (idx !== undefined) {
        spans[idx].end = ms
        pending.delete(ev.agent)
      }
    }
  }

  // Unique agents in order of first appearance
  const agents: string[] = []
  for (const ev of sorted) {
    if (!agents.includes(ev.agent)) agents.push(ev.agent)
  }

  const totalMs = now - t0
  const labelW = 70
  const rowH = 24
  const gap = 4
  const axisH = 20
  const chartW = 280
  const svgW = labelW + chartW
  const svgH = agents.length * (rowH + gap) + axisH

  // Time axis ticks (up to 5)
  const totalMin = totalMs / 60000
  const tickCount = Math.min(5, Math.max(2, Math.ceil(totalMin)))
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (i / tickCount) * totalMs)

  const xScale = (ms: number) => labelW + (ms / totalMs) * chartW

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-300 mb-2">AGENT TIMELINE</h3>
      <svg width={svgW} height={svgH} className="w-full" viewBox={`0 0 ${svgW} ${svgH}`}>
        {agents.map((agent, row) => {
          const y = row * (rowH + gap)
          const agentSpans = spans.filter(s => s.agent === agent)
          return (
            <g key={agent}>
              {/* Agent label */}
              <text
                x={labelW - 4}
                y={y + rowH / 2}
                textAnchor="end"
                dominantBaseline="middle"
                className="text-[9px] font-mono fill-gray-400"
              >
                {agent.length > 10 ? agent.slice(0, 9) + '\u2026' : agent}
              </text>
              {/* Row background */}
              <rect x={labelW} y={y} width={chartW} height={rowH} rx={2} fill="white" opacity={0.03} />
              {/* Spans */}
              {agentSpans.map((span, i) => {
                const x1 = xScale(span.start)
                const active = span.end === null
                const x2 = active ? xScale(totalMs) : xScale(span.end!)
                const w = Math.max(x2 - x1, 2)
                const duration = active
                  ? ((now - t0 - span.start) / 1000).toFixed(0) + 's (active)'
                  : ((span.end! - span.start) / 1000).toFixed(0) + 's'
                return (
                  <rect key={i} x={x1} y={y + 2} width={w} height={rowH - 4} rx={3} fill={span.color} opacity={0.8}>
                    <title>{agent}: {duration}</title>
                    {active && (
                      <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1.5s" repeatCount="indefinite" />
                    )}
                  </rect>
                )
              })}
            </g>
          )
        })}
        {/* Time axis */}
        {ticks.map((ms, i) => {
          const x = xScale(ms)
          const label = (ms / 60000).toFixed(1) + 'm'
          return (
            <g key={i}>
              <line x1={x} y1={svgH - axisH} x2={x} y2={svgH - axisH + 4} stroke="rgb(107,114,128)" strokeWidth={0.5} />
              <text x={x} y={svgH - 2} textAnchor="middle" className="text-[8px] font-mono fill-gray-500">
                {label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
