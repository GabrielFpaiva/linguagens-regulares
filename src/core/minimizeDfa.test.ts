import { describe, expect, it } from 'bun:test'
import { minimizeDfa } from './minimizeDfa'
import { simulateAutomaton } from './simulator'
import type { Automaton } from './types'

describe('DFA Minimization (PDF Section 2.4)', () => {
  it('merges equivalent states and removes unreachable states', () => {
    // Classic 6-state DFA where q1 ≡ q2, q3 ≡ q4, and q5 is unreachable
    const redundantDfa: Automaton = {
      name: 'AFD Redundante',
      states: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 0, y: 0, isInitial: false, isAccepting: false },
        { id: 'q2', label: 'q2', x: 0, y: 0, isInitial: false, isAccepting: false },
        { id: 'q3', label: 'q3', x: 0, y: 0, isInitial: false, isAccepting: true },
        { id: 'q4', label: 'q4', x: 0, y: 0, isInitial: false, isAccepting: true },
        { id: 'q5', label: 'q5', x: 0, y: 0, isInitial: false, isAccepting: false },
      ],
      transitions: [
        { id: 't1', from: 'q0', to: 'q1', symbol: 'a' },
        { id: 't2', from: 'q0', to: 'q2', symbol: 'b' },
        { id: 't3', from: 'q1', to: 'q3', symbol: 'a' },
        { id: 't4', from: 'q1', to: 'q4', symbol: 'b' },
        { id: 't5', from: 'q2', to: 'q4', symbol: 'a' },
        { id: 't6', from: 'q2', to: 'q3', symbol: 'b' },
        { id: 't7', from: 'q3', to: 'q3', symbol: 'a' },
        { id: 't8', from: 'q3', to: 'q3', symbol: 'b' },
        { id: 't9', from: 'q4', to: 'q4', symbol: 'a' },
        { id: 't10', from: 'q4', to: 'q4', symbol: 'b' },
        { id: 't11', from: 'q5', to: 'q0', symbol: 'a' },
      ],
    }

    const result = minimizeDfa(redundantDfa)
    expect(result.removedUnreachableLabels).toEqual(['q5'])
    // Remaining 5 states collapse into 3 equivalence classes: {q0}, {q1, q2}, {q3, q4}
    expect(result.minimizedDfa.states).toHaveLength(3)

    const testWords = ['', 'a', 'b', 'aa', 'ab', 'ba', 'bb', 'aba', 'bab']
    for (const w of testWords) {
      expect(simulateAutomaton(result.minimizedDfa, w).accepted).toBe(
        simulateAutomaton(redundantDfa, w).accepted,
      )
    }
  })
})
