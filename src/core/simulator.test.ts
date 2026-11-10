import { describe, expect, it } from 'bun:test'
import { epsilonClosure, simulateAutomaton } from './simulator'
import { EPSILON, fromJsonString } from './types'

describe('Automaton Simulator (PDF Section 2.1)', () => {
  it('simulates the PDF DFA (odd number of a) step by step', () => {
    const dfa = fromJsonString(`{
      "q0" : { "a" : "q1", "b" : "q0" },
      "q1" : { "a" : "q0", "b" : "q1" }
    }`)

    const resAccept = simulateAutomaton(dfa, 'abaa')
    expect(resAccept.isDFA).toBe(true)
    expect(resAccept.accepted).toBe(true)
    expect(resAccept.steps).toHaveLength(5)
    expect(resAccept.steps.map((s) => s.copies[0]?.stateLabel)).toEqual([
      'q0',
      'q1',
      'q1',
      'q0',
      'q1',
    ])
    expect(resAccept.steps[2]?.remainingInput).toBe('aa')

    const resReject = simulateAutomaton(dfa, 'aba')
    expect(resReject.accepted).toBe(false)
    expect(resReject.finalAcceptingStates).toEqual([])
  })

  it('simulates an NFA with multiple parallel copies and epsilon transitions', () => {
    // NFA that accepts strings ending in "ab"
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

    const res = simulateAutomaton(nfa, 'aab')
    expect(res.isDFA).toBe(false)
    expect(res.accepted).toBe(true)
    // After reading 'a', two copies exist: q0 and q1
    expect(res.steps[1]?.copies.map((c) => c.stateLabel).sort()).toEqual(['q0', 'q1'])
    // After reading 'aab', copies at q0 and q2 exist, and q2 is accepting
    expect(res.finalAcceptingStates).toEqual(['q2'])
  })

  it('computes epsilon closure accurately', () => {
    const nfaEps = {
      states: [
        { id: 's0', label: 's0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 's1', label: 's1', x: 0, y: 0, isInitial: false, isAccepting: false },
        { id: 's2', label: 's2', x: 0, y: 0, isInitial: false, isAccepting: true },
      ],
      transitions: [
        { id: 'e1', from: 's0', to: 's1', symbol: EPSILON },
        { id: 'e2', from: 's1', to: 's2', symbol: EPSILON },
      ],
    }

    const closure = epsilonClosure(nfaEps, ['s0'])
    expect(Array.from(closure).sort()).toEqual(['s0', 's1', 's2'])

    const emptyRun = simulateAutomaton(nfaEps, '')
    expect(emptyRun.accepted).toBe(true)
  })
})
