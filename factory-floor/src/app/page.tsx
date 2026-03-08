'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import AgentTimeline, { type AgentEvent } from './components/AgentTimeline'

// Types
interface Ranking {
  pain: number
  market: number
  buildability: number
  moat: number
  revenue: number
  virality: number
  weighted_score: number
}

interface DeveloperOutput {
  build_status: string
  files_implemented: string[]
  build_errors: string[]
}

interface Coverage {
  pages_found: number
  pages_expected: number
  endpoints_found: number
  endpoints_expected: number
  components_found: number
  components_expected: number
}

interface QAOutput {
  verdict: 'pass' | 'fail'
  build_ok: boolean
  lint_ok: boolean
  issues: string[]
  coverage: Coverage
}

interface Idea {
  id: number
  name: string
  status: 'scouted' | 'ranked' | 'specced' | 'designed' | 'scaffolded' | 'developed' | 'qa_pass' | 'qa_fail' | 'deployed' | 'killed' | 'filtered'
  one_liner?: string
  ranking?: Ranking
  repo_url?: string
  live_url?: string
  developer_output?: DeveloperOutput
  qa_output?: QAOutput
  agent_events?: AgentEvent[]
}

interface PipelineData {
  nextId: number
  ideas: Idea[]
}

// Mock agent events for development (remove when backend emits real data)
const MOCK_AGENT_EVENTS: AgentEvent[] = (() => {
  const base = new Date(Date.now() - 8 * 60000).toISOString()
  const at = (minOffset: number) => new Date(new Date(base).getTime() + minOffset * 60000).toISOString()
  return [
    { agent: 'scout', event: 'spawned', ts: at(0) },
    { agent: 'scout', event: 'completed', ts: at(1.2) },
    { agent: 'ranker', event: 'spawned', ts: at(1.3) },
    { agent: 'ranker', event: 'completed', ts: at(2.1) },
    { agent: 'specwriter', event: 'spawned', ts: at(2.2) },
    { agent: 'specwriter', event: 'completed', ts: at(3.8) },
    { agent: 'designer', event: 'spawned', ts: at(3.9) },
    { agent: 'designer', event: 'completed', ts: at(5.5) },
    { agent: 'scaffolder', event: 'spawned', ts: at(5.6) },
    { agent: 'scaffolder', event: 'completed', ts: at(6.4) },
    { agent: 'developer', event: 'spawned', ts: at(6.5) },
  ]
})()

// Status configuration
const STATUS_CONFIG = {
  scouted: { label: 'Scouted', color: 'text-teal-400', bgColor: 'bg-teal-500/10', borderColor: 'border-teal-500/30' },
  ranked: { label: 'Ranked', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/30' },
  specced: { label: 'Specced', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  designed: { label: 'Designed', color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' },
  scaffolded: { label: 'Scaffolded', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  developed: { label: 'Developed', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  qa_pass: { label: 'QA Pass', color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' },
  qa_fail: { label: 'QA Fail', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' },
  deployed: { label: 'Deployed', color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' },
  killed: { label: 'Killed', color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
  filtered: { label: 'Filtered', color: 'text-gray-500', bgColor: 'bg-gray-500/10', borderColor: 'border-gray-500/30' }
}

// Radar Chart Component
function RadarChart({ data }: { data: Ranking }) {
  const dimensions = ['pain', 'market', 'buildability', 'moat', 'revenue', 'virality']
  const center = 80
  const maxRadius = 60
  const angleStep = (Math.PI * 2) / dimensions.length

  const points = dimensions.map((dim, i) => {
    const angle = i * angleStep - Math.PI / 2
    const value = data[dim as keyof Ranking] as number
    const radius = (value / 10) * maxRadius
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius
    }
  })

  const gridLevels = [2, 4, 6, 8, 10]
  
  return (
    <svg width="160" height="160" className="flex-shrink-0">
      {/* Grid lines */}
      {gridLevels.map(level => (
        <polygon
          key={level}
          points={dimensions.map((_, i) => {
            const angle = i * angleStep - Math.PI / 2
            const radius = (level / 10) * maxRadius
            return `${center + Math.cos(angle) * radius},${center + Math.sin(angle) * radius}`
          }).join(' ')}
          fill="none"
          stroke="rgb(75, 85, 99)"
          strokeWidth="0.5"
          opacity={0.3}
        />
      ))}
      
      {/* Axis lines */}
      {dimensions.map((_, i) => (
        <line
          key={i}
          x1={center}
          y1={center}
          x2={center + Math.cos(i * angleStep - Math.PI / 2) * maxRadius}
          y2={center + Math.sin(i * angleStep - Math.PI / 2) * maxRadius}
          stroke="rgb(75, 85, 99)"
          strokeWidth="0.5"
          opacity={0.5}
        />
      ))}
      
      {/* Data polygon */}
      <polygon
        points={points.map(p => `${p.x},${p.y}`).join(' ')}
        fill="rgb(34, 197, 94)"
        fillOpacity="0.2"
        stroke="rgb(34, 197, 94)"
        strokeWidth="2"
      />
      
      {/* Data points */}
      {points.map((point, i) => (
        <circle
          key={i}
          cx={point.x}
          cy={point.y}
          r="3"
          fill="rgb(34, 197, 94)"
        />
      ))}
      
      {/* Labels */}
      {dimensions.map((dim, i) => {
        const angle = i * angleStep - Math.PI / 2
        const labelRadius = maxRadius + 15
        return (
          <text
            key={dim}
            x={center + Math.cos(angle) * labelRadius}
            y={center + Math.sin(angle) * labelRadius}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs font-mono text-gray-400 fill-current"
          >
            {dim.toUpperCase()}
          </text>
        )
      })}
    </svg>
  )
}

// Main Dashboard Component
export default function Dashboard() {
  const [data, setData] = useState<PipelineData | null>(null)
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)

  const scrollToColumn = (status: string) => {
    const el = document.getElementById(`column-${status}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
    }
  }

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('https://eitan-openclaw.duckdns.org/api/pipeline')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const newData = await response.json()
      // Inject mock agent_events for development (remove when backend emits real data)
      newData.ideas = newData.ideas.map((idea: Idea) => {
        if (!idea.agent_events) {
          return { ...idea, agent_events: MOCK_AGENT_EVENTS }
        }
        return idea
      })
      setData(newData)
      // Refresh selectedIdea from new data so timeline updates live
      setSelectedIdea(prev => {
        if (!prev) return null
        const updated = newData.ideas.find((i: Idea) => i.id === prev.id)
        return updated || prev
      })
      setError(null)
      setLastUpdate(new Date())
      if (isLoading) setIsLoading(false)
    } catch (err) {
      console.error('Failed to fetch pipeline data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
      if (isLoading) setIsLoading(false)
    }
  }, [isLoading])

  // Adaptive polling: 3s when selected idea is actively building, 15s otherwise
  const isActiveBuild = selectedIdea && ['scaffolded', 'developed', 'designed'].includes(selectedIdea.status)
  const pollInterval = isActiveBuild ? 3000 : 15000

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, pollInterval)
    return () => clearInterval(interval)
  }, [fetchData, pollInterval])

  // Status counts for top bar
  const statusCounts = data?.ideas.reduce((acc, idea) => {
    acc[idea.status] = (acc[idea.status] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  // Group ideas by status for kanban view
  const columns = [
    'scouted', 'ranked', 'specced', 'designed', 'scaffolded',
    'developed', 'qa_pass', 'qa_fail', 'deployed', 'killed'
  ]

  const groupedIdeas = columns.reduce((acc, status) => {
    acc[status] = data?.ideas.filter(idea => idea.status === status) || []
    return acc
  }, {} as Record<string, Idea[]>)

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-cyan-400 font-mono text-lg animate-pulse">
          INITIALIZING FACTORY FLOOR...
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-950 text-gray-100 font-mono overflow-hidden relative">
      {/* Grid pattern background */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />

      {/* Header */}
      <header className="relative z-10 bg-gray-900/50 backdrop-blur-sm border-b border-gray-800">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-cyan-400">
              ◉ FACTORY FLOOR
              <span className="text-gray-500 ml-4 text-sm">
                COMMAND CENTER
              </span>
            </h1>
            <div className="text-xs text-gray-500">
              {lastUpdate && `LAST UPDATE: ${lastUpdate.toLocaleTimeString()}`}
              {error && (
                <span className="text-red-400 ml-4">
                  ERROR: {error}
                </span>
              )}
            </div>
          </div>
          
          {/* Status counters */}
          <div className="flex gap-4 mt-4">
            <button onClick={() => scrollToColumn('deployed')} className="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded text-green-400 hover:bg-green-500/30 transition-colors cursor-pointer">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              DEPLOYED: {statusCounts.deployed || 0}
            </button>
            <button onClick={() => scrollToColumn('scaffolded')} className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 hover:bg-blue-500/30 transition-colors cursor-pointer">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              BUILDING: {(statusCounts.scaffolded || 0) + (statusCounts.developed || 0)}
            </button>
            <button onClick={() => scrollToColumn('qa_fail')} className="flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded text-amber-400 hover:bg-amber-500/30 transition-colors cursor-pointer">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
              QA FAIL: {statusCounts.qa_fail || 0}
            </button>
            <button onClick={() => scrollToColumn('killed')} className="flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
              KILLED: {statusCounts.killed || 0}
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-140px)] relative">
        {/* Main kanban board */}
        <div className={`flex-1 min-w-0 overflow-hidden transition-all duration-300 ${selectedIdea ? 'mr-96' : ''}`}>
          <div ref={boardRef} className="flex gap-4 p-6 h-full overflow-x-auto scrollbar-thin">
            {columns.map(status => (
              <div key={status} id={`column-${status}`} className="flex-shrink-0 w-72">
                <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg h-full flex flex-col">
                  <div className={`px-4 py-3 border-b border-gray-800 ${STATUS_CONFIG[status as keyof typeof STATUS_CONFIG].bgColor}`}>
                    <h3 className={`font-bold text-sm ${STATUS_CONFIG[status as keyof typeof STATUS_CONFIG].color}`}>
                      {STATUS_CONFIG[status as keyof typeof STATUS_CONFIG].label.toUpperCase()}
                      <span className="ml-2 text-gray-500">
                        ({groupedIdeas[status].length})
                      </span>
                    </h3>
                  </div>
                  <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                    {groupedIdeas[status].map(idea => (
                      <div
                        key={idea.id}
                        onClick={() => setSelectedIdea(idea)}
                        className={`p-3 rounded border cursor-pointer transition-all hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/20 ${STATUS_CONFIG[idea.status].bgColor} ${STATUS_CONFIG[idea.status].borderColor} ${selectedIdea?.id === idea.id ? 'ring-2 ring-cyan-400' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-sm text-white truncate">
                            #{idea.id} {idea.name}
                          </h4>
                          {idea.ranking && (
                            <span className="text-xs font-bold text-cyan-400">
                              {idea.ranking.weighted_score.toFixed(1)}
                            </span>
                          )}
                        </div>
                        {idea.one_liner && (
                          <p className="text-xs text-gray-400 line-clamp-2">
                            {idea.one_liner}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        {selectedIdea && (
          <div className="absolute right-0 top-0 w-96 h-full bg-gray-900/95 backdrop-blur-sm border-l border-gray-800 transform translate-x-0 transition-transform duration-300 overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    #{selectedIdea.id} {selectedIdea.name}
                  </h2>
                  <span className={`text-sm ${STATUS_CONFIG[selectedIdea.status].color}`}>
                    {STATUS_CONFIG[selectedIdea.status].label.toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedIdea(null)}
                  className="text-gray-500 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* One-liner */}
              {selectedIdea.one_liner && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">DESCRIPTION</h3>
                  <p className="text-sm text-gray-400">{selectedIdea.one_liner}</p>
                </div>
              )}

              {/* Agent Timeline */}
              {selectedIdea.agent_events && selectedIdea.agent_events.length > 0 && (
                <AgentTimeline events={selectedIdea.agent_events} />
              )}

              {/* Radar chart */}
              {selectedIdea.ranking && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">RANKING PROFILE</h3>
                  <div className="flex justify-center">
                    <RadarChart data={selectedIdea.ranking} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mt-4">
                    {Object.entries(selectedIdea.ranking).filter(([key]) => key !== 'weighted_score').map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-400">{key.toUpperCase()}:</span>
                        <span className="text-white">{value}/10</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-700 flex justify-between font-bold">
                    <span className="text-cyan-400">WEIGHTED SCORE:</span>
                    <span className="text-cyan-400">{selectedIdea.ranking.weighted_score.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* QA Output */}
              {selectedIdea.qa_output && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">QA STATUS</h3>
                  <div className="space-y-2">
                    <div className={`flex justify-between items-center p-2 rounded ${selectedIdea.qa_output.verdict === 'pass' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      <span>VERDICT:</span>
                      <span className="font-bold">{selectedIdea.qa_output.verdict.toUpperCase()}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className={`p-2 rounded ${selectedIdea.qa_output.build_ok ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        BUILD: {selectedIdea.qa_output.build_ok ? 'OK' : 'FAIL'}
                      </div>
                      <div className={`p-2 rounded ${selectedIdea.qa_output.lint_ok ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        LINT: {selectedIdea.qa_output.lint_ok ? 'OK' : 'FAIL'}
                      </div>
                    </div>
                    {selectedIdea.qa_output.coverage && (
                      <div className="mt-4">
                        <h4 className="text-xs font-semibold text-gray-400 mb-2">COVERAGE</h4>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span>Pages:</span>
                            <span>{selectedIdea.qa_output.coverage.pages_found}/{selectedIdea.qa_output.coverage.pages_expected}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Endpoints:</span>
                            <span>{selectedIdea.qa_output.coverage.endpoints_found}/{selectedIdea.qa_output.coverage.endpoints_expected}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Components:</span>
                            <span>{selectedIdea.qa_output.coverage.components_found}/{selectedIdea.qa_output.coverage.components_expected}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedIdea.qa_output.issues.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-xs font-semibold text-red-400 mb-2">ISSUES</h4>
                        <div className="space-y-1">
                          {selectedIdea.qa_output.issues.map((issue, i) => (
                            <div key={i} className="text-xs text-red-300 bg-red-500/10 p-2 rounded">
                              {issue}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Developer Output */}
              {selectedIdea.developer_output && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">BUILD STATUS</h3>
                  <div className="space-y-2">
                    <div className="text-xs">
                      <span className="text-gray-400">Status: </span>
                      <span className="text-white">{selectedIdea.developer_output.build_status}</span>
                    </div>
                    {selectedIdea.developer_output.files_implemented.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-green-400 mb-1">FILES IMPLEMENTED</h4>
                        <div className="space-y-1">
                          {selectedIdea.developer_output.files_implemented.map((file, i) => (
                            <div key={i} className="text-xs text-green-300 bg-green-500/10 p-1 rounded font-mono">
                              {file}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedIdea.developer_output.build_errors.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-red-400 mb-1">BUILD ERRORS</h4>
                        <div className="space-y-1">
                          {selectedIdea.developer_output.build_errors.map((error, i) => (
                            <div key={i} className="text-xs text-red-300 bg-red-500/10 p-2 rounded font-mono">
                              {error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2">
                {selectedIdea.repo_url && (
                  <a
                    href={selectedIdea.repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full p-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-center text-sm font-semibold transition-colors"
                  >
                    📂 REPO
                  </a>
                )}
                {selectedIdea.live_url && (
                  <a
                    href={selectedIdea.live_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full p-3 bg-cyan-600 hover:bg-cyan-500 border border-cyan-500 rounded text-center text-sm font-semibold transition-colors"
                  >
                    🚀 LIVE SITE
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom ticker */}
      <footer className="absolute bottom-0 left-0 right-0 bg-gray-900/50 backdrop-blur-sm border-t border-gray-800 px-6 py-2">
        <div className="flex justify-between items-center text-xs">
          <div className="text-gray-500">
            FACTORY STATUS: {data?.ideas.length || 0} IDEAS PROCESSED | NEXT ID: {data?.nextId || 'N/A'}
          </div>
          <div className="text-gray-500">
            {lastUpdate && `LAST SYNC: ${lastUpdate.toLocaleTimeString()}`}
          </div>
        </div>
      </footer>
    </div>
  )
}