import { describe, expect, it } from 'bun:test'
import { minimizeDfa } from './minimizeDfa'
import { convertNfaToDfa } from './nfaToDfa'
import { convertNfaToRegex } from './nfaToRegex'
import { runBacktrackingRegex } from './regexEngine'
import { convertRegexToNfa } from './regexToNfa'
import { simulateAutomaton } from './simulator'
import { classifyAutomaton } from './types'

// Todas as cadeias sobre {a, b} com tamanho de 0 até `max`.
function allWords(max: number): string[] {
  const out = ['']
  let layer = ['']
  for (let n = 1; n <= max; n++) {
    layer = layer.flatMap((w) => [`${w}a`, `${w}b`])
    out.push(...layer)
  }
  return out
}

// Gerador pseudoaleatório determinístico: a mesma semente gera sempre as mesmas ERs,
// então uma falha aqui é reproduzível.
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
}

function randomRegex(rand: () => number, depth: number): string {
  if (depth === 0 || rand() < 0.25) return rand() < 0.5 ? 'a' : 'b'
  const r = rand()
  const sub = () => randomRegex(rand, depth - 1)
  if (r < 0.3) return `${sub()}${sub()}`
  if (r < 0.55) return `(${sub()}|${sub()})`
  if (r < 0.75) return `(${sub()})*`
  if (r < 0.88) return `(${sub()})+`
  return `(${sub()})?`
}

const WORDS = allWords(6) // 127 cadeias

const FIXED_PATTERNS = [
  'a',
  'ab',
  'a|b',
  'a*',
  '(a|b)*',
  '(a|b)*abb',
  'a(b|c)*d'.replace('c', 'a').replace('d', 'b'),
  '(ab)+a?',
  '(a*)*',
  '(a|ab)(b|ba)*',
  '((a|b)(a|b))*',
  'b*(ab*ab*)*', // número par de "a"
  '(a?)+b',
]

function checkPattern(pattern: string) {
  const native = new RegExp(`^(?:${pattern})$`)
  const nfa = convertRegexToNfa(pattern).nfa
  const dfa = convertNfaToDfa(nfa).dfa
  const minimized = minimizeDfa(dfa).minimizedDfa
  const backRegex = convertNfaToRegex(minimized).regex
  const roundTrip = backRegex === '∅' ? null : convertRegexToNfa(backRegex).nfa

  expect(classifyAutomaton(dfa).isDFA).toBe(true)
  expect(classifyAutomaton(minimized).isDFA).toBe(true)
  expect(minimized.states.length <= dfa.states.length).toBe(true)

  for (const w of WORDS) {
    const expected = native.test(w)
    const results = {
      thompson: simulateAutomaton(nfa, w).accepted,
      subsetDfa: simulateAutomaton(dfa, w).accepted,
      minimizedDfa: simulateAutomaton(minimized, w).accepted,
      backtracking: runBacktrackingRegex(pattern, w).accepted,
      roundTripEr: roundTrip ? simulateAutomaton(roundTrip, w).accepted : false,
    }
    for (const [engine, got] of Object.entries(results)) {
      if (got !== expected) {
        throw new Error(
          `/${pattern}/ com "${w}": ${engine} deu ${got}, RegExp nativo deu ${expected} (ER de volta: ${backRegex})`,
        )
      }
    }
  }
}

describe('Equivalência entre todos os motores (todas as cadeias até tamanho 6)', () => {
  it('padrões fixos: Thompson, AFD, AFD mínimo, backtracking e ER de volta concordam com o RegExp nativo', () => {
    for (const p of FIXED_PATTERNS) checkPattern(p)
  })

  it('200 ERs aleatórias concordam com o RegExp nativo', () => {
    const rand = rng(2026)
    for (let i = 0; i < 200; i++) checkPattern(randomRegex(rand, 4))
  })

  it('backtracking não desiste em entradas longas', () => {
    const long = `${'ab'.repeat(300)}abb`
    expect(runBacktrackingRegex('(a|b)*abb', long).accepted).toBe(true)
    expect(runBacktrackingRegex('(a|b)*abb', `${long}a`).accepted).toBe(false)
  })
})

