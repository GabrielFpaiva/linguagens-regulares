import { describe, expect, it } from 'bun:test'
import { convertNfaToDfa, removeEpsilonTransitions } from './nfaToDfa'
import { simulateAutomaton } from './simulator'
import { classifyAutomaton, EPSILON } from './types'

describe('NFA to DFA Conversion & Epsilon Removal (PDF Section 2.3)', () => {
  it('removes epsilon transitions while preserving accepted language', () => {
    // NFA-ε for a*b*
    const nfaEps = {
      states: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 0, y: 0, isInitial: false, isAccepting: true },
      ],
      transitions: [
        { id: 't1', from: 'q0', to: 'q0', symbol: 'a' },
        { id: 't2', from: 'q0', to: 'q1', symbol: EPSILON },
        { id: 't3', from: 'q1', to: 'q1', symbol: 'b' },
      ],
    }

    const res = removeEpsilonTransitions(nfaEps)
    expect(res.withoutEpsilon.transitions.some((t) => t.symbol === EPSILON)).toBe(false)
    // q0 should become accepting because ε-closure(q0) = {q0, q1}
    expect(res.withoutEpsilon.states.find((s) => s.id === 'q0')?.isAccepting).toBe(true)

    for (const word of ['', 'a', 'aa', 'b', 'bb', 'aab', 'aba', 'ba']) {
      expect(simulateAutomaton(res.withoutEpsilon, word).accepted).toBe(
        simulateAutomaton(nfaEps, word).accepted,
      )
    }
  })

  it('converts NFA ending in "ab" into an equivalent deterministic DFA via subset construction', () => {
    const nfa = {
      states: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 0, y: 0, isInitial: false, isAccepting: false },
        { id: 'q2', label: 'q2', x: 0, y: 0, isInitial: false, isAccepting: true },
      ],
      transitions: [
        { id: 't1', from: 'q0', to: 'q0', symbol: 'a' },
        { id: 't2', from: 'q0', to: 'q0', symbol: 'b' },
        { id: 't3', from: 'q0', to: 'q1', symbol: 'a' },
        { id: 't4', from: 'q1', to: 'q2', symbol: 'b' },
      ],
    }

    const conversion = convertNfaToDfa(nfa)
    const dfaCheck = classifyAutomaton(conversion.dfa)
    expect(dfaCheck.isDFA).toBe(true)
    expect(conversion.subsetTable).toHaveLength(3) // {q0}, {q0, q1}, {q0, q2}

    const testWords = ['', 'a', 'b', 'ab', 'aab', 'bab', 'aba', 'abba', 'bbab']
    for (const w of testWords) {
      expect(simulateAutomaton(conversion.dfa, w).accepted).toBe(
        simulateAutomaton(nfa, w).accepted,
      )
    }
  })
})

