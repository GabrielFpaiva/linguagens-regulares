import { describe, expect, it } from 'bun:test'
import {
  classifyAutomaton,
  EPSILON,
  fromJsonString,
  getAlphabet,
  toProfessorJson,
} from './types'

describe('Automaton types & JSON parser (PDF Section 2.1)', () => {
  it('parses the exact JSON example from page 3 of the PDF and classifies it as DFA', () => {
    const pdfJson = `{
      "q0" : { "a" : "q1", "b" : "q0" },
      "q1" : { "a" : "q0", "b" : "q1" }
    }`

    const aut = fromJsonString(pdfJson)
    expect(aut.states.map((s) => s.label)).toEqual(['q0', 'q1'])
    expect(aut.states[0]?.isInitial).toBe(true)
    expect(aut.states[1]?.isAccepting).toBe(true)
    expect(getAlphabet(aut)).toEqual(['a', 'b'])

    const classification = classifyAutomaton(aut)
    expect(classification.isDFA).toBe(true)
    expect(classification.hasEpsilon).toBe(false)
    expect(classification.hasMultipleTransitions).toBe(false)
    expect(classification.missingTransitions).toHaveLength(0)

    const exported = JSON.parse(toProfessorJson(aut))
    expect(exported).toEqual({
      q0: { a: 'q1', b: 'q0' },
      q1: { a: 'q0', b: 'q1' },
    })
  })

  it('detects NFA when a state has epsilon transitions or multiple targets', () => {
    const nfaJson = JSON.stringify({
      q0: { a: ['q0', 'q1'], ε: 'q1' },
      q1: { b: 'q1' },
    })
    const aut = fromJsonString(nfaJson)
    const classification = classifyAutomaton(aut)

    expect(classification.isDFA).toBe(false)
    expect(classification.hasEpsilon).toBe(true)
    expect(classification.hasMultipleTransitions).toBe(true)
    expect(aut.transitions.some((t) => t.symbol === EPSILON)).toBe(true)
  })
})

