import { epsilonClosure } from './simulator'
import {
  type Automaton,
  type AutomatonState,
  type AutomatonTransition,
  autoLayoutAutomaton,
  getAlphabet,
} from './types'

export interface EpsilonClosureEntry {
  stateId: string
  stateLabel: string
  closureIds: string[]
  closureLabels: string[]
  becameAccepting: boolean
}

export interface EpsilonRemovalResult {
  original: Automaton
  withoutEpsilon: Automaton
  closures: EpsilonClosureEntry[]
  steps: string[]
}

export interface SubsetTableRow {
  dfaStateId: string
  dfaStateLabel: string
  nfaStateIds: string[]
  nfaStateLabels: string[]
  isInitial: boolean
  isAccepting: boolean
  transitions: Record<string, { targetDfaLabel: string; targetNfaLabels: string[] }>
}

export interface NfaToDfaResult {
  epsilonRemoval: EpsilonRemovalResult
  dfa: Automaton
  alphabet: string[]
  subsetTable: SubsetTableRow[]
  steps: string[]
}

/**
 * Etapa 1 (Seção 2.3 do PDF): Remove os movimentos vazios (transições ε)
 * mantendo o não-determinismo (AFN-ε → AFN sem movimentos vazios).
 */
export function removeEpsilonTransitions(automaton: Automaton): EpsilonRemovalResult {
  const labelOf = new Map(automaton.states.map((s) => [s.id, s.label]))
  const origAccepting = new Set(
    automaton.states.filter((s) => s.isAccepting).map((s) => s.id),
  )
  const alphabet = getAlphabet(automaton)

  const closures: EpsilonClosureEntry[] = []
  const closureMap = new Map<string, Set<string>>()
  const steps: string[] = []

  for (const state of automaton.states) {
    const cl = epsilonClosure(automaton, [state.id])
    closureMap.set(state.id, cl)
    const clIds = Array.from(cl).sort()
    const clLabels = clIds.map((id) => labelOf.get(id) ?? id)
    const reachesAccepting = clIds.some((id) => origAccepting.has(id))
    const becameAccepting = !state.isAccepting && reachesAccepting

    closures.push({
      stateId: state.id,
      stateLabel: state.label,
      closureIds: clIds,
      closureLabels: clLabels,
      becameAccepting,
    })

    steps.push(
      `ε-fecho(${state.label}) = {${clLabels.join(', ')}}${becameAccepting ? ' → passa a ser estado de aceitação' : ''}`,
    )
  }

  const newStates: AutomatonState[] = automaton.states.map((s) => {
    const cl = closureMap.get(s.id) ?? new Set([s.id])
    const isAccepting = Array.from(cl).some((id) => origAccepting.has(id))
    return {
      ...s,
      isAccepting,
    }
  })

  const newTransitions: AutomatonTransition[] = []
  const seenEdges = new Set<string>()
  let tIdx = 1

  for (const state of automaton.states) {
    const cl = closureMap.get(state.id) ?? new Set([state.id])
    for (const sym of alphabet) {
      // Estados alcançados lendo 'sym' a partir de qualquer estado p em ε-fecho(state)
      const directTargets = new Set<string>()
      for (const p of cl) {
        for (const t of automaton.transitions) {
          if (t.from === p && t.symbol === sym) {
            directTargets.add(t.to)
          }
        }
      }

      // Aplica ε-fecho nos destinos alcançados
      const finalTargets = new Set<string>()
      for (const dst of directTargets) {
        for (const q of closureMap.get(dst) ?? [dst]) {
          finalTargets.add(q)
        }
      }

      for (const targetId of Array.from(finalTargets).sort()) {
        const edgeKey = `${state.id}:::${sym}:::${targetId}`
        if (!seenEdges.has(edgeKey)) {
          seenEdges.add(edgeKey)
          newTransitions.push({
            id: `noeps_t${tIdx++}`,
            from: state.id,
            to: targetId,
            symbol: sym,
          })
        }
      }
    }
  }

  const withoutEpsilon = autoLayoutAutomaton({
    name: `${automaton.name ?? 'Autômato'} (AFN sem ε)`,
    states: newStates,
    transitions: newTransitions,
  })

  return {
    original: automaton,
    withoutEpsilon,
    closures,
    steps,
  }
}

/**
 * Etapa 2 (Seção 2.3 do PDF): Construção de Subconjuntos (Rabin-Scott)
 * Converte um AFN em um AFD equivalente, gerando a tabela de macro-estados.
 */
export function convertNfaToDfa(automaton: Automaton): NfaToDfaResult {
  const epsilonRemoval = removeEpsilonTransitions(automaton)
  const cleanNfa = epsilonRemoval.withoutEpsilon
  const alphabet = getAlphabet(cleanNfa)
  const labelOf = new Map(cleanNfa.states.map((s) => [s.id, s.label]))
  const acceptingSet = new Set(
    cleanNfa.states.filter((s) => s.isAccepting).map((s) => s.id),
  )

  const initialNfaStates = cleanNfa.states
    .filter((s) => s.isInitial)
    .map((s) => s.id)
    .sort()

  if (initialNfaStates.length === 0) {
    return {
      epsilonRemoval,
      dfa: { name: 'AFD Vazio', states: [], transitions: [] },
      alphabet,
      subsetTable: [],
      steps: ['Nenhum estado inicial encontrado no AFN.'],
    }
  }

  const keyForSet = (ids: string[]) => [...ids].sort().join(',')
  const labelForSet = (ids: string[]) => {
    if (ids.length === 0) return '∅'
    return `{${ids.map((id) => labelOf.get(id) ?? id).join(', ')}}`
  }

  const discoveredSubsets = new Map<string, string[]>()
  const dfaIdBySubsetKey = new Map<string, string>()
  const queue: string[][] = []

  const initKey = keyForSet(initialNfaStates)
  discoveredSubsets.set(initKey, initialNfaStates)
  dfaIdBySubsetKey.set(initKey, 'D0')
  queue.push(initialNfaStates)

  const subsetTable: SubsetTableRow[] = []
  const dfaTransitions: AutomatonTransition[] = []
  const steps: string[] = [
    ...epsilonRemoval.steps,
    `Estado inicial do AFD: D0 = ${labelForSet(initialNfaStates)}`,
  ]

  let subsetCounter = 1
  let transCounter = 1

  while (queue.length > 0) {
    const currentSet = queue.shift()!
    const currentKey = keyForSet(currentSet)
    const currentDfaId = dfaIdBySubsetKey.get(currentKey)!
    const currentDfaLabel = labelForSet(currentSet)

    const rowTransitions: Record<
      string,
      { targetDfaLabel: string; targetNfaLabels: string[] }
    > = {}

    for (const sym of alphabet) {
      const targetSet = new Set<string>()
      for (const nfaStateId of currentSet) {
        for (const t of cleanNfa.transitions) {
          if (t.from === nfaStateId && t.symbol === sym) {
            targetSet.add(t.to)
          }
        }
      }

      const sortedTargets = Array.from(targetSet).sort()
      if (sortedTargets.length === 0) {
        rowTransitions[sym] = {
          targetDfaLabel: '∅',
          targetNfaLabels: [],
        }
        steps.push(`δ(${currentDfaLabel}, '${sym}') = ∅ (sem transição)`)
        continue
      }

      const targetKey = keyForSet(sortedTargets)
      if (!discoveredSubsets.has(targetKey)) {
        const newDfaId = `D${subsetCounter++}`
        discoveredSubsets.set(targetKey, sortedTargets)
        dfaIdBySubsetKey.set(targetKey, newDfaId)
        queue.push(sortedTargets)
        steps.push(
          `Novo subconjunto descoberto a partir de δ(${currentDfaLabel}, '${sym}'): ${newDfaId} = ${labelForSet(sortedTargets)}`,
        )
      } else {
        steps.push(`δ(${currentDfaLabel}, '${sym}') = ${labelForSet(sortedTargets)}`)
      }

      const targetDfaId = dfaIdBySubsetKey.get(targetKey)!
      const targetDfaLabel = labelForSet(sortedTargets)
      rowTransitions[sym] = {
        targetDfaLabel,
        targetNfaLabels: sortedTargets.map((id) => labelOf.get(id) ?? id),
      }

      dfaTransitions.push({
        id: `dfa_t${transCounter++}`,
        from: currentDfaId,
        to: targetDfaId,
        symbol: sym,
      })
    }

    subsetTable.push({
      dfaStateId: currentDfaId,
      dfaStateLabel: currentDfaLabel,
      nfaStateIds: currentSet,
      nfaStateLabels: currentSet.map((id) => labelOf.get(id) ?? id),
      isInitial: currentKey === initKey,
      isAccepting: currentSet.some((id) => acceptingSet.has(id)),
      transitions: rowTransitions,
    })
  }

  const dfaStates: AutomatonState[] = subsetTable.map((row, idx) => ({
    id: row.dfaStateId,
    label: row.dfaStateLabel,
    x: 150 + idx * 140,
    y: 200,
    isInitial: row.isInitial,
    isAccepting: row.isAccepting,
  }))

  const dfa = autoLayoutAutomaton({
    name: `${automaton.name ?? 'Autômato'} (Convertido para AFD)`,
    states: dfaStates,
    transitions: dfaTransitions,
  })

  return {
    epsilonRemoval,
    dfa,
    alphabet,
    subsetTable,
    steps,
  }
}
