import { describe, expect, it } from 'bun:test'
import { convertRegexToNfa } from './regexToNfa'
import { simulateAutomaton } from './simulator'

describe('Regex to NFA via Thompson Construction (PDF Section 2.5)', () => {
  it('converts (a|b)*abb into an NFA that accepts only strings ending in abb', () => {
    const res = convertRegexToNfa('(a|b)*abb')
    expect(res.explicitConcatPattern).toBe('(a|b)*.a.b.b')
    expect(res.steps.length).toBeGreaterThan(4)

    const shouldAccept = ['abb', 'aabb', 'babb', 'ababb', 'aaabbbabb']
    const shouldReject = ['', 'a', 'ab', 'aba', 'abba', 'bb']

    for (const w of shouldAccept) {
      expect(simulateAutomaton(res.nfa, w).accepted).toBe(true)
    }
    for (const w of shouldReject) {
      expect(simulateAutomaton(res.nfa, w).accepted).toBe(false)
    }
  })

  it('supports + and ? operators accurately', () => {
    const res = convertRegexToNfa('a+b?c')
    expect(simulateAutomaton(res.nfa, 'ac').accepted).toBe(true)
    expect(simulateAutomaton(res.nfa, 'aaabc').accepted).toBe(true)
    expect(simulateAutomaton(res.nfa, 'bc').accepted).toBe(false)
    expect(simulateAutomaton(res.nfa, 'abbc').accepted).toBe(false)
  })
})
