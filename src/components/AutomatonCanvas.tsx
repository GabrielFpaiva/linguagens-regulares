import {
  CheckCircle2,
  CirclePlus,
  Download,
  FileCode2,
  GitCommitHorizontal,
  LayoutGrid,
  MousePointer,
  Play,
  Trash2,
  Upload,
} from 'lucide-react'
import React, { useRef, useState } from 'react'
import { exportAutomatonToSvg } from '../core/svgExport'
import {
  type Automaton,
  autoLayoutAutomaton,
  EPSILON,
  fromJsonString,
  normalizeSymbol,
  toProfessorJson,
} from '../core/types'

export type EditorTool = 'select' | 'add-state' | 'add-transition'

interface AutomatonCanvasProps {
  automaton: Automaton
  onChange?: (next: Automaton) => void
  readOnly?: boolean
  activeStateIds?: string[]
  activeTransitions?: Array<{ from: string; to: string; symbol: string }>
  height?: number
  title?: string
}

const RADIUS = 28

export const AutomatonCanvas: React.FC<AutomatonCanvasProps> = ({
  automaton,
  onChange,
  readOnly = false,
  activeStateIds = [],
  activeTransitions = [],
  height = 430,
  title,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [tool, setTool] = useState<EditorTool>('select')
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null)
  const [draggingStateId, setDraggingStateId] = useState<string | null>(null)
  const [transitionSourceId, setTransitionSourceId] = useState<string | null>(null)
  const [pendingTransitionTarget, setPendingTransitionTarget] = useState<{
    from: string
    to: string
  } | null>(null)
  const [symbolInput, setSymbolInput] = useState('a')
  const [jsonModalOpen, setJsonModalOpen] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)

  const activeSet = new Set(activeStateIds)
  const stateMap = new Map(automaton.states.map((s) => [s.id, s]))

  const isEdgeActive = (from: string, to: string, symbols: string[]) =>
    activeTransitions.some(
      (t) => t.from === from && t.to === to && symbols.includes(t.symbol),
    )

  const getSvgCoords = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const scaleX = 860 / rect.width
    const scaleY = height / rect.height
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    }
  }

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (readOnly || !onChange) return
    if (e.target !== svgRef.current && (e.target as SVGElement).tagName !== 'rect') {
      return
    }

    if (tool === 'add-state') {
      const { x, y } = getSvgCoords(e)
      let idx = automaton.states.length
      while (automaton.states.some((s) => s.id === `q${idx}` || s.label === `q${idx}`)) {
        idx++
      }
      const newId = `q${idx}`
      const next: Automaton = {
        ...automaton,
        states: [
          ...automaton.states,
          {
            id: newId,
            label: newId,
            x: Math.max(50, Math.min(810, x)),
            y: Math.max(50, Math.min(height - 50, y)),
            isInitial: automaton.states.length === 0,
            isAccepting: false,
          },
        ],
      }
      onChange(next)
      setSelectedStateId(newId)
    } else {
      setSelectedStateId(null)
      setTransitionSourceId(null)
    }
  }

  const handleStateMouseDown = (e: React.MouseEvent, stateId: string) => {
    e.stopPropagation()
    if (readOnly || !onChange) return

    if (tool === 'select') {
      setSelectedStateId(stateId)
      setDraggingStateId(stateId)
    } else if (tool === 'add-transition') {
      if (!transitionSourceId) {
        setTransitionSourceId(stateId)
      } else {
        setPendingTransitionTarget({ from: transitionSourceId, to: stateId })
        setSymbolInput('a')
        setTransitionSourceId(null)
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggingStateId || readOnly || !onChange) return
    const { x, y } = getSvgCoords(e)
    onChange({
      ...automaton,
      states: automaton.states.map((s) =>
        s.id === draggingStateId
          ? {
              ...s,
              x: Math.max(45, Math.min(815, x)),
              y: Math.max(45, Math.min(height - 45, y)),
            }
          : s,
      ),
    })
  }

  const handleMouseUp = () => {
    setDraggingStateId(null)
  }

  const confirmAddTransition = (e: React.FormEvent) => {
    e.preventDefault()
    if (!pendingTransitionTarget || !onChange) return
    const rawParts = symbolInput.split(',').map((p) => normalizeSymbol(p))
    const newTransitions = [...automaton.transitions]

    for (const sym of rawParts) {
      const exists = newTransitions.some(
        (t) =>
          t.from === pendingTransitionTarget.from &&
          t.to === pendingTransitionTarget.to &&
          t.symbol === sym,
      )
      if (!exists) {
        newTransitions.push({
          id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          from: pendingTransitionTarget.from,
          to: pendingTransitionTarget.to,
          symbol: sym,
        })
      }
    }

    onChange({ ...automaton, transitions: newTransitions })
    setPendingTransitionTarget(null)
  }

  const toggleInitial = (stateId: string) => {
    if (!onChange) return
    onChange({
      ...automaton,
      states: automaton.states.map((s) => ({
        ...s,
        isInitial: s.id === stateId ? !s.isInitial : false,
      })),
    })
  }

  const toggleAccepting = (stateId: string) => {
    if (!onChange) return
    onChange({
      ...automaton,
      states: automaton.states.map((s) =>
        s.id === stateId ? { ...s, isAccepting: !s.isAccepting } : s,
      ),
    })
  }

  const deleteState = (stateId: string) => {
    if (!onChange) return
    onChange({
      ...automaton,
      states: automaton.states.filter((s) => s.id !== stateId),
      transitions: automaton.transitions.filter(
        (t) => t.from !== stateId && t.to !== stateId,
      ),
    })
    setSelectedStateId(null)
  }

  const deleteEdgeGroup = (from: string, to: string) => {
    if (!onChange || readOnly) return
    onChange({
      ...automaton,
      transitions: automaton.transitions.filter(
        (t) => !(t.from === from && t.to === to),
      ),
    })
  }

  const handleDownloadSvg = () => {
    const svgContent = exportAutomatonToSvg(automaton, 860, height)
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(automaton.name ?? 'automato').toLowerCase().replace(/\s+/g, '-')}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  const openJsonModal = () => {
    setJsonText(toProfessorJson(automaton, false))
    setJsonError(null)
    setJsonModalOpen(true)
  }

  const handleImportJson = () => {
    if (!onChange) return
    try {
      const imported = fromJsonString(jsonText)
      onChange(imported)
      setJsonModalOpen(false)
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'JSON inválido.')
    }
  }

  // Agrupa arestas (from, to)
  const groupedEdges = new Map<string, { from: string; to: string; symbols: string[] }>()
  for (const t of automaton.transitions) {
    const key = `${t.from}:::${t.to}`
    const existing = groupedEdges.get(key)
    if (existing) {
      if (!existing.symbols.includes(t.symbol)) existing.symbols.push(t.symbol)
    } else {
      groupedEdges.set(key, { from: t.from, to: t.to, symbols: [t.symbol] })
    }
  }

  const selectedState = automaton.states.find((s) => s.id === selectedStateId)

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 shadow-lg overflow-hidden">
      {/* Barra de ferramentas superior */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-3.5 py-2.5">
        <div className="flex items-center gap-1.5">
          {title ? (
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 px-1">
              {title}
            </span>
          ) : null}

          {!readOnly && onChange && (
            <>
              <button
                type="button"
                onClick={() => {
                  setTool('select')
                  setTransitionSourceId(null)
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  tool === 'select'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <MousePointer className="h-3.5 w-3.5" />
                Mover / Editar
              </button>
              <button
                type="button"
                onClick={() => {
                  setTool('add-state')
                  setTransitionSourceId(null)
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  tool === 'add-state'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <CirclePlus className="h-3.5 w-3.5" />
                + Estado
              </button>
              <button
                type="button"
                onClick={() => {
                  setTool('add-transition')
                  setTransitionSourceId(null)
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  tool === 'add-transition'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <GitCommitHorizontal className="h-3.5 w-3.5" />
                + Transição
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {!readOnly && onChange && (
            <button
              type="button"
              onClick={() => onChange(autoLayoutAutomaton(automaton, 860, height))}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
              title="Organizar estados automaticamente"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Auto-Layout
            </button>
          )}
          <button
            type="button"
            onClick={openJsonModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
          >
            <FileCode2 className="h-3.5 w-3.5 text-indigo-400" />
            JSON (PDF)
          </button>
          <button
            type="button"
            onClick={handleDownloadSvg}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" />
            Exportar SVG
          </button>
        </div>
      </div>

      {/* Dica contextual da ferramenta ativa */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 bg-slate-950/60 px-3.5 py-1.5 text-xs text-slate-400">
          <div>
            {tool === 'select' &&
              'Dica: Arraste estados para posicioná-los. Clique em um estado para definir Inicial / Aceitação ou excluir.'}
            {tool === 'add-state' &&
              'Dica: Clique em qualquer ponto vazio do quadro abaixo para criar um novo estado.'}
            {tool === 'add-transition' &&
              (transitionSourceId
                ? `Origem selecionada (${stateMap.get(transitionSourceId)?.label}). Agora clique no estado de destino.`
                : 'Dica: Clique no estado de origem e em seguida no estado de destino.')}
          </div>

          {selectedState && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-indigo-300">
                Estado {selectedState.label}:
              </span>
              <button
                type="button"
                onClick={() => toggleInitial(selectedState.id)}
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
                  selectedState.isInitial
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Play className="h-3 w-3" />
                Inicial
              </button>
              <button
                type="button"
                onClick={() => toggleAccepting(selectedState.id)}
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
                  selectedState.isAccepting
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <CheckCircle2 className="h-3 w-3" />
                Aceitação
              </button>
              <button
                type="button"
                onClick={() => deleteState(selectedState.id)}
                className="inline-flex items-center gap-1 rounded bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-300 hover:bg-rose-500/25"
              >
                <Trash2 className="h-3 w-3" />
                Excluir
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal para digitar símbolo da transição */}
      {pendingTransitionTarget && (
        <form
          onSubmit={confirmAddTransition}
          className="flex items-center justify-between gap-3 border-b border-indigo-500/30 bg-indigo-950/40 px-4 py-2 text-xs"
        >
          <div className="flex items-center gap-2 text-indigo-200">
            <span>
              Nova transição de{' '}
              <strong>{stateMap.get(pendingTransitionTarget.from)?.label}</strong> para{' '}
              <strong>{stateMap.get(pendingTransitionTarget.to)?.label}</strong>:
            </span>
            <input
              type="text"
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value)}
              placeholder="Símbolo (ex: a, b ou ε)"
              className="w-36 rounded border border-indigo-500/50 bg-slate-900 px-2 py-1 text-xs text-white focus:outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setSymbolInput(EPSILON)}
              className="rounded bg-slate-800 px-2 py-1 text-amber-300 hover:bg-slate-700"
            >
              Inserir {EPSILON}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="rounded bg-indigo-600 px-3 py-1 font-medium text-white hover:bg-indigo-500"
            >
              Adicionar
            </button>
            <button
              type="button"
              onClick={() => setPendingTransitionTarget(null)}
              className="rounded bg-slate-800 px-2.5 py-1 text-slate-300 hover:bg-slate-700"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Quadro SVG Interativo */}
      <div className="relative bg-slate-950">
        <svg
          ref={svgRef}
          viewBox={`0 0 860 ${height}`}
          className={`w-full select-none ${
            tool === 'add-state' ? 'cursor-crosshair' : 'cursor-default'
          }`}
          style={{ height }}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <defs>
            <pattern
              id="grid-pattern"
              width="28"
              height="28"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="1" fill="#1e293b" />
            </pattern>
            <marker
              id="arrow-normal"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
            </marker>
            <marker
              id="arrow-active"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
            </marker>
            <marker
              id="arrow-initial"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#818cf8" />
            </marker>
          </defs>

          <rect width="860" height={height} fill="url(#grid-pattern)" />

          {/* Arestas / Transições */}
          {Array.from(groupedEdges.values()).map((edge) => {
            const fromState = stateMap.get(edge.from)
            const toState = stateMap.get(edge.to)
            if (!fromState || !toState) return null

            const active = isEdgeActive(edge.from, edge.to, edge.symbols)
            const strokeColor = active ? '#f59e0b' : '#64748b'
            const marker = active ? 'url(#arrow-active)' : 'url(#arrow-normal)'
            const label = edge.symbols.join(', ')

            if (edge.from === edge.to) {
              const x = fromState.x
              const y = fromState.y
              const startX = x - 12
              const startY = y - RADIUS + 2
              const endX = x + 12
              const endY = y - RADIUS + 2
              const ctrl1X = x - 34
              const ctrl1Y = y - RADIUS - 50
              const ctrl2X = x + 34
              const ctrl2Y = y - RADIUS - 50

              return (
                <g
                  key={`${edge.from}->${edge.to}`}
                  className={!readOnly ? 'cursor-pointer group' : ''}
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteEdgeGroup(edge.from, edge.to)
                  }}
                >
                  <path
                    d={`M ${startX} ${startY} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${endX} ${endY}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={active ? 2.8 : 2}
                    markerEnd={marker}
                  />
                  <rect
                    x={x - (label.length * 4 + 10)}
                    y={y - RADIUS - 56}
                    width={label.length * 8 + 20}
                    height={20}
                    rx={6}
                    fill="#0f172a"
                    stroke={active ? '#f59e0b' : '#334155'}
                    strokeWidth={1}
                  />
                  <text
                    x={x}
                    y={y - RADIUS - 46}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={`text-xs font-mono font-semibold ${
                      active ? 'fill-amber-300' : 'fill-slate-200'
                    }`}
                  >
                    {label}
                  </text>
                </g>
              )
            }

            const hasReverse = groupedEdges.has(`${edge.to}:::${edge.from}`)
            const dx = toState.x - fromState.x
            const dy = toState.y - fromState.y
            const dist = Math.hypot(dx, dy) || 1
            const ux = dx / dist
            const uy = dy / dist
            const nx = -uy
            const ny = ux

            const curveOffset = hasReverse ? 28 : 0
            const midX = (fromState.x + toState.x) / 2 + nx * curveOffset
            const midY = (fromState.y + toState.y) / 2 + ny * curveOffset

            const startAngle = Math.atan2(midY - fromState.y, midX - fromState.x)
            const endAngle = Math.atan2(toState.y - midY, toState.x - midX)

            const sx = fromState.x + Math.cos(startAngle) * RADIUS
            const sy = fromState.y + Math.sin(startAngle) * RADIUS
            const ex = toState.x - Math.cos(endAngle) * (RADIUS + 5)
            const ey = toState.y - Math.sin(endAngle) * (RADIUS + 5)

            const labelX = (sx + 2 * midX + ex) / 4 + nx * 12
            const labelY = (sy + 2 * midY + ey) / 4 + ny * 12

            return (
              <g
                key={`${edge.from}->${edge.to}`}
                className={!readOnly ? 'cursor-pointer' : ''}
                onClick={(e) => {
                  e.stopPropagation()
                  deleteEdgeGroup(edge.from, edge.to)
                }}
              >
                <title>
                  {!readOnly
                    ? `Transição ${fromState.label} → ${toState.label} (${label}). Clique para remover.`
                    : `${fromState.label} → ${toState.label} (${label})`}
                </title>
                <path
                  d={`M ${sx} ${sy} Q ${midX} ${midY} ${ex} ${ey}`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={active ? 2.8 : 2}
                  markerEnd={marker}
                />
                <rect
                  x={labelX - (label.length * 4 + 10)}
                  y={labelY - 10}
                  width={label.length * 8 + 20}
                  height={20}
                  rx={6}
                  fill="#0f172a"
                  stroke={active ? '#f59e0b' : '#334155'}
                  strokeWidth={1}
                />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={`text-xs font-mono font-semibold ${
                    active ? 'fill-amber-300' : 'fill-slate-200'
                  }`}
                >
                  {label}
                </text>
              </g>
            )
          })}

          {/* Estados */}
          {automaton.states.map((s) => {
            const isActive = activeSet.has(s.id)
            const isSelected = selectedStateId === s.id || transitionSourceId === s.id

            return (
              <g
                key={s.id}
                onMouseDown={(e) => handleStateMouseDown(e, s.id)}
                className={!readOnly ? 'cursor-grab active:cursor-grabbing' : ''}
              >
                {s.isInitial && (
                  <line
                    x1={s.x - RADIUS - 36}
                    y1={s.y}
                    x2={s.x - RADIUS - 5}
                    y2={s.y}
                    stroke="#818cf8"
                    strokeWidth="2.5"
                    markerEnd="url(#arrow-initial)"
                  />
                )}

                {isActive && (
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r={RADIUS + 7}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />
                )}

                <circle
                  cx={s.x}
                  cy={s.y}
                  r={RADIUS}
                  fill={isActive ? '#451a03' : isSelected ? '#1e1b4b' : '#0f172a'}
                  stroke={
                    isActive
                      ? '#f59e0b'
                      : isSelected
                        ? '#818cf8'
                        : s.isAccepting
                          ? '#10b981'
                          : '#475569'
                  }
                  strokeWidth={isActive || isSelected ? 2.6 : 2}
                />

                {s.isAccepting && (
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r={RADIUS - 5}
                    fill="none"
                    stroke={isActive ? '#fbbf24' : '#10b981'}
                    strokeWidth="1.8"
                  />
                )}

                <text
                  x={s.x}
                  y={s.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={`text-xs font-mono font-bold ${
                    isActive ? 'fill-amber-300' : 'fill-slate-100'
                  }`}
                >
                  {s.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Modal de Exportação / Importação JSON (Formato da Seção 2.1 do PDF) */}
      {jsonModalOpen && (
        <div className="border-t border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                Especificação JSON do Autômato (Seção 2.1 do PDF)
              </h4>
              <p className="text-xs text-slate-400">
                Compatível com o formato da página 3 do PDF:{' '}
                <code className="text-slate-300">
                  {'{ "q0": { "a": "q1", "b": "q0" }, ... }'}
                </code>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setJsonModalOpen(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Fechar
            </button>
          </div>

          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={7}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
          />

          {jsonError && <p className="mt-1.5 text-xs text-rose-400">{jsonError}</p>}

          <div className="mt-2.5 flex items-center justify-end gap-2">
            {!readOnly && onChange && (
              <button
                type="button"
                onClick={handleImportJson}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
              >
                <Upload className="h-3.5 w-3.5" />
                Carregar este JSON no Editor
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
