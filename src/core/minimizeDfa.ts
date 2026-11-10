import { convertNfaToDfa } from './nfaToDfa'
import {
  type Automaton,
  type AutomatonState,
  type AutomatonTransition,
  autoLayoutAutomaton,
  classifyAutomaton,
  getAlphabet,
} from './types'

export interface PartitionIteration {
  iteration: number
  groups: string[][] // state labels per block
  explanation: string
}

export interface DistinguishabilityCell {
  stateA: string
  stateB: string
  distinguishable: boolean
  reason: string
}

export interface MinimizationResult {
  originalDfa: Automaton
  minimizedDfa: Automaton
  removedUnreachableLabels: string[]
  partitionHistory: PartitionIteration[]
  pairTable: DistinguishabilityCell[]
  mergedGroups: Array<{ newLabel: string; memberLabels: string[]; isInitial: boolean; isAccepting: boolean }>
  steps: string[]
}

/**
 * Seção 2.4 do PDF: Minimização de AFDs
 * 1. Remove estados inalcançáveis a partir do estado inicial.
 * 2. Aplica refinamento sucessivo de partições (Moore / Hopcroft) e gera a tabela
 *    de pares distinguíveis (Myhill-Nerode).
 * 3. Constrói o AFD mínimo resultante unificando estados equivalentes.
 */
export function minimizeDfa(automaton: Automaton): MinimizationResult {
  const classification = classifyAutomaton(automaton)
  const baseDfa = classification.isDFA ? automaton : convertNfaToDfa(automaton).dfa
  const alphabet = getAlphabet(baseDfa)
  const steps: string[] = []

  if (!classification.isDFA) {
    steps.push('O autômato de entrada era não-determinístico; convertido previamente para AFD.')
  }

  const initialState = baseDfa.states.find((s) => s.isInitial)
  if (!initialState) {
    return {
      originalDfa: baseDfa,
      minimizedDfa: { name: 'AFD Mínimo Vazio', states: [], transitions: [] },
      removedUnreachableLabels: [],
      partitionHistory: [],
      pairTable: [],
      mergedGroups: [],
      steps: ['Nenhum estado inicial encontrado.'],
    }
  }

  // 1. Remoção de estados inalcançáveis via BFS
  const reachableIds = new Set<string>([initialState.id])
  const queue: string[] = [initialState.id]
  while (queue.length > 0) {
    const curr = queue.shift()!
    for (const t of baseDfa.transitions) {
      if (t.from === curr && !reachableIds.has(t.to)) {
        reachableIds.add(t.to)
        queue.push(t.to)
      }
    }
  }

  const removedUnreachableLabels = baseDfa.states
    .filter((s) => !reachableIds.has(s.id))
    .map((s) => s.label)

  if (removedUnreachableLabels.length > 0) {
    steps.push(`Estados inalcançáveis removidos: {${removedUnreachableLabels.join(', ')}}.`)
  } else {
    steps.push('Todos os estados são alcançáveis a partir do estado inicial.')
  }

  const reachableStates = baseDfa.states.filter((s) => reachableIds.has(s.id))
  const reachableTransitions = baseDfa.transitions.filter(
    (t) => reachableIds.has(t.from) && reachableIds.has(t.to),
  )

  const labelOf = new Map(reachableStates.map((s) => [s.id, s.label]))
  const transMap = new Map<string, string>()
  for (const t of reachableTransitions) {
    transMap.set(`${t.from}:::${t.symbol}`, t.to)
  }

  // 2. Partição inicial P0 = { Aceitação, Não-Aceitação }
  const acceptingIds = reachableStates.filter((s) => s.isAccepting).map((s) => s.id)
  const nonAcceptingIds = reachableStates.filter((s) => !s.isAccepting).map((s) => s.id)

  let partitions: string[][] = []
  if (acceptingIds.length > 0) partitions.push(acceptingIds)
  if (nonAcceptingIds.length > 0) partitions.push(nonAcceptingIds)

  const partitionHistory: PartitionIteration[] = [
    {
      iteration: 0,
      groups: partitions.map((g) => g.map((id) => labelOf.get(id) ?? id)),
      explanation: 'Partição inicial P₀ separando estados de aceitação (F) e não-aceitação (Q \\ F).',
    },
  ]
  steps.push(
    `P₀ = ${partitions.map((g) => `{${g.map((id) => labelOf.get(id)).join(', ')}}`).join(' , ')}`,
  )

  const pairReasons = new Map<string, string>()
  const pairKey = (a: string, b: string) => (a < b ? `${a}:::${b}` : `${b}:::${a}`)

  for (const a of acceptingIds) {
    for (const b of nonAcceptingIds) {
      pairReasons.set(pairKey(a, b), 'Iteração 0: um é de aceitação e o outro não.')
    }
  }

  // 3. Refinamento iterativo de partições
  let iteration = 1
  let changed = true

  while (changed) {
    changed = false
    const blockIndexOf = new Map<string, number>()
    partitions.forEach((group, idx) => {
      for (const stateId of group) blockIndexOf.set(stateId, idx)
    })

    const nextPartitions: string[][] = []
    const splitExplanations: string[] = []

    for (const group of partitions) {
      if (group.length <= 1) {
        nextPartitions.push(group)
        continue
      }

      const subGroups = new Map<string, string[]>()
      for (const stateId of group) {
        const signatureParts = alphabet.map((sym) => {
          const target = transMap.get(`${stateId}:::${sym}`)
          if (!target) return `${sym}:-1`
          return `${sym}:${blockIndexOf.get(target) ?? -1}`
        })
        const signature = signatureParts.join('|')
        const list = subGroups.get(signature) ?? []
        list.push(stateId)
        subGroups.set(signature, list)
      }

      if (subGroups.size > 1) {
        changed = true
        const subArrays = Array.from(subGroups.values())
        for (const sub of subArrays) nextPartitions.push(sub)

        // Registra motivo de distinção entre os subgrupos recém-separados
        for (let i = 0; i < subArrays.length; i++) {
          for (let j = i + 1; j < subArrays.length; j++) {
            for (const sA of subArrays[i]!) {
              for (const sB of subArrays[j]!) {
                const diffSym = alphabet.find((sym) => {
                  const tA = transMap.get(`${sA}:::${sym}`)
                  const tB = transMap.get(`${sB}:::${sym}`)
                  const bA = tA ? (blockIndexOf.get(tA) ?? -1) : -1
                  const bB = tB ? (blockIndexOf.get(tB) ?? -1) : -1
                  return bA !== bB
                })
                if (diffSym && !pairReasons.has(pairKey(sA, sB))) {
                  const tALabel = labelOf.get(transMap.get(`${sA}:::${diffSym}`) ?? '') ?? '∅'
                  const tBLabel = labelOf.get(transMap.get(`${sB}:::${diffSym}`) ?? '') ?? '∅'
                  pairReasons.set(
                    pairKey(sA, sB),
                    `Iteração ${iteration}: com '${diffSym}', ${labelOf.get(sA)} → ${tALabel} e ${labelOf.get(sB)} → ${tBLabel} caem em blocos distintos.`,
                  )
                }
              }
            }
          }
        }

        const oldLabels = `{${group.map((id) => labelOf.get(id)).join(', ')}}`
        const newLabels = subArrays
          .map((sub) => `{${sub.map((id) => labelOf.get(id)).join(', ')}}`)
          .join(' e ')
        splitExplanations.push(`Bloco ${oldLabels} dividido em ${newLabels}.`)
      } else {
        nextPartitions.push(group)
      }
    }

    partitions = nextPartitions
    const explanation = changed
      ? splitExplanations.join(' ')
      : 'Nenhuma partição foi dividida — ponto fixo atingido (partição final).'

    partitionHistory.push({
      iteration,
      groups: partitions.map((g) => g.map((id) => labelOf.get(id) ?? id)),
      explanation,
    })

    steps.push(
      `P_${iteration} = ${partitions.map((g) => `{${g.map((id) => labelOf.get(id)).join(', ')}}`).join(' , ')} (${explanation})`,
    )
    iteration++
  }

  // 4. Monta tabela de pares (Myhill-Nerode)
  const pairTable: DistinguishabilityCell[] = []
  for (let i = 0; i < reachableStates.length; i++) {
    for (let j = i + 1; j < reachableStates.length; j++) {
      const sA = reachableStates[i]!
      const sB = reachableStates[j]!
      const reason = pairReasons.get(pairKey(sA.id, sB.id))
      pairTable.push({
        stateA: sA.label,
        stateB: sB.label,
        distinguishable: Boolean(reason),
        reason: reason ?? 'Estados equivalentes (mesma classe de equivalência).',
      })
    }
  }

  // 5. Constrói o AFD minimizado
  // Ordena para que o bloco contendo o estado inicial venha primeiro
  partitions.sort((a, b) => {
    const aInit = a.includes(initialState.id) ? 0 : 1
    const bInit = b.includes(initialState.id) ? 0 : 1
    return aInit - bInit
  })

  const blockIdByOldState = new Map<string, string>()
  const mergedGroups: MinimizationResult['mergedGroups'] = []
  const minStates: AutomatonState[] = []

  partitions.forEach((group, idx) => {
    const newId = `M${idx}`
    const memberLabels = group.map((id) => labelOf.get(id) ?? id)
    const newLabel =
      memberLabels.length === 1 ? memberLabels[0]! : `{${memberLabels.join(', ')}}`
    const isInitial = group.includes(initialState.id)
    const isAccepting = group.some((id) => acceptingIds.includes(id))

    for (const oldId of group) {
      blockIdByOldState.set(oldId, newId)
    }

    mergedGroups.push({
      newLabel,
      memberLabels,
      isInitial,
      isAccepting,
    })

    minStates.push({
      id: newId,
      label: newLabel,
      x: 150 + idx * 140,
      y: 200,
      isInitial,
      isAccepting,
    })
  })

  const minTransitions: AutomatonTransition[] = []
  let tIdx = 1
  partitions.forEach((group, idx) => {
    const fromMinId = `M${idx}`
    const repStateId = group[0]!
    for (const sym of alphabet) {
      const targetOldId = transMap.get(`${repStateId}:::${sym}`)
      if (targetOldId) {
        const toMinId = blockIdByOldState.get(targetOldId)
        if (toMinId) {
          minTransitions.push({
            id: `min_t${tIdx++}`,
            from: fromMinId,
            to: toMinId,
            symbol: sym,
          })
        }
      }
    }
  })

  const minimizedDfa = autoLayoutAutomaton({
    name: `${baseDfa.name ?? 'AFD'} (Minimizado)`,
    states: minStates,
    transitions: minTransitions,
  })

  return {
    originalDfa: baseDfa,
    minimizedDfa,
    removedUnreachableLabels,
    partitionHistory,
    pairTable,
    mergedGroups,
    steps,
  }
}
