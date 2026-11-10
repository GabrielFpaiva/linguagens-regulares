import { describe, expect, it } from 'bun:test'
import { convertNfaToRegex } from './nfaToRegex'
import { compareRegexEngines, findPatternMatchesInText } from './regexEngine'
import { convertRegexToNfa } from './regexToNfa'
import { simulateAutomaton } from './simulator'
import { fromJsonString } from './types'

describe('State Elimination (NFA to ER) & Regex Engines (PDF Sections 2.6 & 2.7)', () => {
  it('converts an automaton back into an equivalent Regular Expression via state elimination', () => {
    const dfa = fromJsonString(`{
      "q0" : { "a" : "q1", "b" : "q0" },
      "q1" : { "a" : "q0", "b" : "q1" }
    }`)

    const { regex, steps } = convertNfaToRegex(dfa)
    expect(steps).toHaveLength(2)
    expect(regex.length).toBeGreaterThan(0)

    // Re-compile the generated regex to NFA and verify equivalence on sample words!
    const roundTripNfa = convertRegexToNfa(regex).nfa
    const sampleWords = ['', 'a', 'b', 'ab', 'ba', 'aa', 'aba', 'bab', 'abba', 'aaab']
    for (const w of sampleWords) {
      expect(simulateAutomaton(roundTripNfa, w).accepted).toBe(
        simulateAutomaton(dfa, w).accepted,
      )
    }
  })

  it('agrees between Pipeline (ER -> NFA -> DFA -> MinDFA) and Direct Backtracking Engine', () => {
    const pattern = '(a|b)*abb'
    for (const word of ['abb', 'aabb', 'ababb', 'aba', 'ab', '']) {
      const cmp = compareRegexEngines(pattern, word)
      expect(cmp.automatonPipeline.dfaSimulation.accepted).toBe(
        cmp.backtrackingEngine.accepted,
      )
      if (word === 'aabb') {
        expect(cmp.accepted).toBe(true)
        // Backtracking on (a|b)*abb with "aabb" must backtrack after greedy (a|b)* consumes the whole string
        expect(cmp.backtrackingEngine.backtrackCount).toBeGreaterThan(0)
      }
    }
  })

  it('finds pattern occurrences in free text using the compiled DFA', () => {
    const matches = findPatternMatchesInText('a(b|c)+d', 'xxabcbdyyacdzzab')
    expect(matches).toEqual([
      { start: 2, end: 7, match: 'abcbd' },
      { start: 9, end: 12, match: 'acd' },
    ])
  })
})
