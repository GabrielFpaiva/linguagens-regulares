export const EPSILON = 'ε'

export interface AutomatonState {
  id: string
  label: string
  x: number
  y: number
  isInitial: boolean
  isAccepting: boolean
}

export interface AutomatonTransition {
  id: string
  from: string
  to: string
  symbol: string // single symbol or 'ε'
}

export interface Automaton {
  name?: string
  description?: string
  states: AutomatonState[]
  transitions: AutomatonTransition[]
}

/**
 * Formato JSON simplificado apresentado na Seção 2.1 (pág. 3) do PDF do Prof. Andrei Formiga:
 * {
 *   "q0": { "a": "q1", "b": "q0" },
 *   "q1": { "a": "q0", "b": "q1" }
 * }
 * Também suporta destino como lista para AFNs: { "q0": { "a": ["q0", "q1"] } }
 * e metadados opcionais "_initial" e "_accepting".
 */
export type ProfessorJsonFormat = Record<
  string,
  Record<string, string | string[]> | string | string[]
>

export function normalizeSymbol(sym: string): string {
  const trimmed = sym.trim()
  if (trimmed === '' || trimmed === 'epsilon' || trimmed === 'eps' || trimmed === 'λ' || trimmed === 'ε') {
    return EPSILON
  }
  return trimmed
}

export function getAlphabet(automaton: Automaton): string[] {
  const set = new Set<string>()
  for (const t of automaton.transitions) {
    if (t.symbol !== EPSILON) {
      set.add(t.symbol)
    }
  }
  return Array.from(set).sort()
}

export interface AutomatonClassification {
  isDFA: boolean
  hasEpsilon: boolean
  hasMultipleTransitions: boolean
  missingTransitions: Array<{ stateId: string; symbol: string }>
  reasons: string[]
}

export function classifyAutomaton(automaton: Automaton): AutomatonClassification {
  const alphabet = getAlphabet(automaton)
  let hasEpsilon = false
  let hasMultipleTransitions = false
  const reasons: string[] = []

  const initialStates = automaton.states.filter((s) => s.isInitial)
  if (initialStates.length === 0) {
    reasons.push('Nenhum estado inicial definido.')
  } else if (initialStates.length > 1) {
    hasMultipleTransitions = true
    reasons.push(`Múltiplos estados iniciais (${initialStates.map((s) => s.label).join(', ')}).`)
  }

  const pairCounts = new Map<string, number>()
  for (const t of automaton.transitions) {
    if (t.symbol === EPSILON) {
      hasEpsilon = true
    } else {
      const key = `${t.from}:::${t.symbol}`
      pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1)
    }
  }

  if (hasEpsilon) {
    reasons.push('Possui movimentos vazios (transições ε).')
  }

  for (const [key, count] of pairCounts.entries()) {
    if (count > 1) {
      hasMultipleTransitions = true
      const [fromId, sym] = key.split(':::')
      const stateLabel = automaton.states.find((s) => s.id === fromId)?.label ?? fromId
      reasons.push(`Estado ${stateLabel} possui ${count} transições para o símbolo '${sym}'.`)
    }
  }

  const missingTransitions: Array<{ stateId: string; symbol: string }> = []
  for (const state of automaton.states) {
    for (const sym of alphabet) {
      const key = `${state.id}:::${sym}`
      if (!pairCounts.has(key)) {
        missingTransitions.push({ stateId: state.id, symbol: sym })
      }
    }
  }

  const isDFA = initialStates.length === 1 && !hasEpsilon && !hasMultipleTransitions

  return {
    isDFA,
    hasEpsilon,
    hasMultipleTransitions,
    missingTransitions,
    reasons,
  }
}

/**
 * Posiciona os estados automaticamente em camadas por busca em largura (BFS)
 * a partir do estado inicial, mantendo um visual limpo para grafos gerados.
 */
export function autoLayoutAutomaton(
  automaton: Automaton,
  width = 820,
  height = 420,
): Automaton {
  const n = automaton.states.length
  if (n === 0) return automaton

  const initial = automaton.states.find((s) => s.isInitial) ?? automaton.states[0]!
  const adj = new Map<string, string[]>()
  for (const s of automaton.states) adj.set(s.id, [])
  for (const t of automaton.transitions) {
    adj.get(t.from)?.push(t.to)
  }

  const layerOf = new Map<string, number>()
  const queue: string[] = [initial.id]
  layerOf.set(initial.id, 0)

  while (queue.length > 0) {
    const curr = queue.shift()!
    const currLayer = layerOf.get(curr)!
    for (const next of adj.get(curr) ?? []) {
      if (!layerOf.has(next)) {
        layerOf.set(next, currLayer + 1)
        queue.push(next)
      }
    }
  }

  let maxLayer = Math.max(0, ...Array.from(layerOf.values()))
  for (const s of automaton.states) {
    if (!layerOf.has(s.id)) {
      maxLayer += 1
      layerOf.set(s.id, maxLayer)
    }
  }

  const layers = new Map<number, AutomatonState[]>()
  for (const s of automaton.states) {
    const l = layerOf.get(s.id) ?? 0
    const list = layers.get(l) ?? []
    list.push(s)
    layers.set(l, list)
  }

  const sortedLayerIndices = Array.from(layers.keys()).sort((a, b) => a - b)
  const numLayers = sortedLayerIndices.length

  const padX = 110
  const padY = 85
  const usableW = Math.max(240, width - padX * 2)
  const usableH = Math.max(180, height - padY * 2)

  const newStates = automaton.states.map((s) => ({ ...s }))
  const byId = new Map(newStates.map((s) => [s.id, s]))

  if (numLayers <= 2 && n >= 4) {
    // Layout circular quando há poucos níveis e muitos estados
    const cx = width / 2
    const cy = height / 2
    const rx = Math.min(usableW / 2, 260)
    const ry = Math.min(usableH / 2, 160)
    newStates.forEach((s, idx) => {
      const angle = Math.PI + (2 * Math.PI * idx) / n
      s.x = Math.round(cx + rx * Math.cos(angle))
      s.y = Math.round(cy + ry * Math.sin(angle))
    })
    return { ...automaton, states: newStates }
  }

  sortedLayerIndices.forEach((layerIdx, colIndex) => {
    const group = layers.get(layerIdx)!
    const x =
      numLayers === 1
        ? width / 2
        : Math.round(padX + (colIndex / (numLayers - 1)) * usableW)

    group.forEach((stateItem, rowIndex) => {
      const target = byId.get(stateItem.id)!
      const m = group.length
      const y =
        m === 1
          ? Math.round(height / 2 + (colIndex % 2 === 1 && numLayers > 3 ? -18 : 0))
          : Math.round(padY + (rowIndex / (m - 1)) * usableH)
      target.x = x
      target.y = y
    })
  })

  return { ...automaton, states: newStates }
}

/**
 * Exporta no formato JSON simplificado da Seção 2.1 do PDF:
 * {
 *   "q0" : { "a" : "q1", "b" : "q0" },
 *   "q1" : { "a" : "q0", "b" : "q1" }
 * }
 */
export function toProfessorJson(automaton: Automaton, includeMetadata = false): string {
  const labelById = new Map(automaton.states.map((s) => [s.id, s.label]))
  const result: Record<string, unknown> = {}

  if (includeMetadata) {
    const initial = automaton.states.find((s) => s.isInitial)
    result._initial = initial ? initial.label : null
    result._accepting = automaton.states.filter((s) => s.isAccepting).map((s) => s.label)
  }

  for (const state of automaton.states) {
    const transObj: Record<string, string | string[]> = {}
    const outgoing = automaton.transitions.filter((t) => t.from === state.id)

    for (const t of outgoing) {
      const targetLabel = labelById.get(t.to) ?? t.to
      const existing = transObj[t.symbol]
      if (existing === undefined) {
        transObj[t.symbol] = targetLabel
      } else if (Array.isArray(existing)) {
        if (!existing.includes(targetLabel)) existing.push(targetLabel)
      } else if (existing !== targetLabel) {
        transObj[t.symbol] = [existing, targetLabel]
      }
    }

    result[state.label] = transObj
  }

  return JSON.stringify(result, null, 2)
}

/**
 * Importa tanto o JSON simplificado da página 3 do PDF:
 * { "q0": { "a": "q1", "b": "q0" }, "q1": { "a": "q0", "b": "q1" } }
 * quanto o JSON completo da aplicação ({ states, transitions }).
 */
export function fromJsonString(jsonText: string): Automaton {
  const parsed = JSON.parse(jsonText) as Record<string, unknown>

  if (Array.isArray(parsed.states) && Array.isArray(parsed.transitions)) {
    return parsed as unknown as Automaton
  }

  const stateNames = Object.keys(parsed).filter((k) => !k.startsWith('_'))
  if (stateNames.length === 0) {
    throw new Error('JSON não contém estados válidos.')
  }

  const initialName =
    typeof parsed._initial === 'string' ? parsed._initial : stateNames[0]!
  const acceptingNames = Array.isArray(parsed._accepting)
    ? new Set(parsed._accepting.map(String))
    : new Set([stateNames[stateNames.length - 1]!])

  // Coleta também quaisquer estados citados apenas como destino
  const allNames = new Set(stateNames)
  for (const sName of stateNames) {
    const row = parsed[sName]
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      for (const target of Object.values(row as Record<string, unknown>)) {
        if (typeof target === 'string') allNames.add(target)
        else if (Array.isArray(target)) target.forEach((t) => allNames.add(String(t)))
      }
    }
  }

  const states: AutomatonState[] = Array.from(allNames).map((name, idx) => ({
    id: name,
    label: name,
    x: 150 + idx * 140,
    y: 200,
    isInitial: name === initialName,
    isAccepting: acceptingNames.has(name),
  }))

  const transitions: AutomatonTransition[] = []
  let tCounter = 1
  for (const sName of stateNames) {
    const row = parsed[sName]
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      for (const [rawSym, target] of Object.entries(row as Record<string, unknown>)) {
        const symbol = normalizeSymbol(rawSym)
        if (typeof target === 'string') {
          transitions.push({
            id: `t_${tCounter++}`,
            from: sName,
            to: target,
            symbol,
          })
        } else if (Array.isArray(target)) {
          for (const dst of target) {
            transitions.push({
              id: `t_${tCounter++}`,
              from: sName,
              to: String(dst),
              symbol,
            })
          }
        }
      }
    }
  }

  return autoLayoutAutomaton({
    name: 'Autômato Importado (JSON)',
    states,
    transitions,
  })
}

