import { type Automaton, classifyAutomaton, EPSILON } from './types'

export interface MachineCopy {
  copyId: string
  stateId: string
  stateLabel: string
  parentCopyId: string | null
  viaSymbol: string | null
  history: string[] // state labels visited by this copy
}

export interface SimulationStep {
  stepIndex: number
  consumedSymbol: string | null // null at step 0 (initial state)
  consumedPrefix: string
  remainingInput: string
  activeStateIds: string[]
  activeTransitions: Array<{ from: string; to: string; symbol: string }>
  copies: MachineCopy[]
  explanation: string
}

export interface SimulationResult {
  isDFA: boolean
  input: string
  accepted: boolean
  steps: SimulationStep[]
  finalAcceptingStates: string[]
  rejectedReason?: string
}

/**
 * Calcula o fecho-ε (ε-closure) de um conjunto de estados,
 * retornando também os caminhos de ε-transições percorridos.
 */
export function epsilonClosure(
  automaton: Automaton,
  stateIds: Iterable<string>,
): Set<string> {
  const closure = new Set<string>(stateIds)
  const stack = Array.from(closure)

  while (stack.length > 0) {
    const curr = stack.pop()!
    for (const t of automaton.transitions) {
      if (t.from === curr && t.symbol === EPSILON && !closure.has(t.to)) {
        closure.add(t.to)
        stack.push(t.to)
      }
    }
  }

  return closure
}

/**
 * Simula um autômato (AFD ou AFN/AFN-ε) sobre uma cadeia de entrada,
 * registrando cada passo:
 * - Para AFD: guarda (1) estado atual e (2) cadeia restante a ler.
 * - Para AFN: guarda a lista explícita de cópias paralelas do autômato em execução.
 */
export function simulateAutomaton(
  automaton: Automaton,
  input: string,
): SimulationResult {
  const classification = classifyAutomaton(automaton)
  const labelMap = new Map(automaton.states.map((s) => [s.id, s.label]))
  const acceptingSet = new Set(
    automaton.states.filter((s) => s.isAccepting).map((s) => s.id),
  )

  const initialStates = automaton.states.filter((s) => s.isInitial)
  if (initialStates.length === 0) {
    return {
      isDFA: classification.isDFA,
      input,
      accepted: false,
      steps: [],
      finalAcceptingStates: [],
      rejectedReason: 'O autômato não possui estado inicial definido.',
    }
  }

  const initialClosure = epsilonClosure(
    automaton,
    initialStates.map((s) => s.id),
  )

  let copyCounter = 1
  let currentCopies: MachineCopy[] = Array.from(initialClosure).map((stateId) => {
    const label = labelMap.get(stateId) ?? stateId
    return {
      copyId: `c${copyCounter++}`,
      stateId,
      stateLabel: label,
      parentCopyId: null,
      viaSymbol: null,
      history: [label],
    }
  })

  const steps: SimulationStep[] = []
  const initialLabels = currentCopies.map((c) => c.stateLabel)

  steps.push({
    stepIndex: 0,
    consumedSymbol: null,
    consumedPrefix: '',
    remainingInput: input,
    activeStateIds: currentCopies.map((c) => c.stateId),
    activeTransitions: [],
    copies: currentCopies,
    explanation: classification.isDFA
      ? `Início no estado inicial ${initialLabels[0] ?? ''}. Cadeia restante: "${input || 'ε'}".`
      : `Início com ${currentCopies.length} cópia(s) ativa(s) após fecho-ε: {${initialLabels.join(', ')}}.`,
  })

  const symbols = Array.from(input)

  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i]!
    const consumedPrefix = symbols.slice(0, i + 1).join('')
    const remainingInput = symbols.slice(i + 1).join('')

    const nextCopies: MachineCopy[] = []
    const usedTransitions: Array<{ from: string; to: string; symbol: string }> = []
    const seenStateInStep = new Set<string>()

    for (const copy of currentCopies) {
      const matchingTransitions = automaton.transitions.filter(
        (t) => t.from === copy.stateId && t.symbol === sym,
      )

      for (const t of matchingTransitions) {
        usedTransitions.push({ from: t.from, to: t.to, symbol: t.symbol })
        const targetClosure = epsilonClosure(automaton, [t.to])

        for (const closedStateId of targetClosure) {
          if (closedStateId !== t.to) {
            usedTransitions.push({ from: t.to, to: closedStateId, symbol: EPSILON })
          }
          // Mantém uma cópia representativa por estado distinto no passo para evitar explosão exponencial em loops ε
          const dedupKey = `${closedStateId}`
          if (!seenStateInStep.has(dedupKey)) {
            seenStateInStep.add(dedupKey)
            const closedLabel = labelMap.get(closedStateId) ?? closedStateId
            nextCopies.push({
              copyId: `c${copyCounter++}`,
              stateId: closedStateId,
              stateLabel: closedLabel,
              parentCopyId: copy.copyId,
              viaSymbol: sym,
              history: [...copy.history, closedLabel],
            })
          }
        }
      }
    }

    currentCopies = nextCopies
    const activeLabels = currentCopies.map((c) => c.stateLabel)

    let explanation: string
    if (currentCopies.length === 0) {
      explanation = `Ao ler '${sym}', nenhuma transição partiu do(s) estado(s) anterior(es). Simulação travou (rejeitada).`
    } else if (classification.isDFA) {
      explanation = `Lido '${sym}': transição δ(${steps[steps.length - 1]?.copies[0]?.stateLabel}, ${sym}) = ${activeLabels[0]}. Restante: "${remainingInput || 'ε'}".`
    } else {
      explanation = `Lido '${sym}': ${currentCopies.length} cópia(s) ativa(s) em {${activeLabels.join(', ')}}. Restante: "${remainingInput || 'ε'}".`
    }

    steps.push({
      stepIndex: i + 1,
      consumedSymbol: sym,
      consumedPrefix,
      remainingInput,
      activeStateIds: currentCopies.map((c) => c.stateId),
      activeTransitions: usedTransitions,
      copies: currentCopies,
      explanation,
    })

    if (currentCopies.length === 0) {
      break
    }
  }

  const finalAcceptingStates = currentCopies
    .filter((c) => acceptingSet.has(c.stateId))
    .map((c) => c.stateLabel)

  const accepted =
    steps.length === symbols.length + 1 && finalAcceptingStates.length > 0

  let rejectedReason: string | undefined
  if (!accepted) {
    if (currentCopies.length === 0) {
      rejectedReason = 'Todas as cópias/caminhos morreram antes do fim ou por falta de transição.'
    } else {
      rejectedReason = `Entrada consumida por completo, mas nenhum estado ativo ({${currentCopies.map((c) => c.stateLabel).join(', ')}}) é de aceitação.`
    }
  }

  return {
    isDFA: classification.isDFA,
    input,
    accepted,
    steps,
    finalAcceptingStates,
    rejectedReason,
  }
}
