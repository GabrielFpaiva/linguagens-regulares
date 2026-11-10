import { type Automaton, EPSILON } from './types'

export interface EliminationStep {
  stepNumber: number
  eliminatedStateLabel: string
  remainingLabels: string[]
  updatedPaths: Array<{ from: string; to: string; formula: string; result: string }>
}

export interface NfaToRegexResult {
  regex: string
  steps: EliminationStep[]
}

function isSimpleAtom(expr: string): boolean {
  if (expr.length === 1) return true
  if (expr.startsWith('(') && expr.endsWith(')')) {
    let depth = 0
    for (let i = 0; i < expr.length; i++) {
      if (expr[i] === '(') depth++
      else if (expr[i] === ')') depth--
      if (depth === 0 && i < expr.length - 1) return false
    }
    return true
  }
  return false
}

function hasTopLevelUnion(expr: string): boolean {
  let depth = 0
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i]
    if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (ch === '|' && depth === 0) return true
  }
  return false
}

function wrapIfUnion(expr: string): string {
  if (hasTopLevelUnion(expr)) return `(${expr})`
  return expr
}

function regexUnion(a: string | null, b: string | null): string | null {
  if (!a) return b
  if (!b) return a
  if (a === b) return a
  // Evita duplicatas em uniões de topo
  const parts = new Set<string>()
  const splitTop = (s: string) => {
    let depth = 0
    let start = 0
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '(') depth++
      else if (s[i] === ')') depth--
      else if (s[i] === '|' && depth === 0) {
        parts.add(s.slice(start, i))
        start = i + 1
      }
    }
    parts.add(s.slice(start))
  }
  splitTop(a)
  splitTop(b)
  return Array.from(parts).join('|')
}

function regexConcat(a: string | null, b: string | null): string | null {
  if (!a || !b) return null
  if (a === EPSILON) return b
  if (b === EPSILON) return a
  return `${wrapIfUnion(a)}${wrapIfUnion(b)}`
}

function regexStar(a: string | null): string {
  if (!a || a === EPSILON) return EPSILON
  if (isSimpleAtom(a)) {
    if (a.endsWith('*')) return a
    return `${a}*`
  }
  return `(${a})*`
}

/**
 * Seção 2.6 do PDF: Conversão de AFN para Expressão Regular
 * Algoritmo de Eliminação de Estados passo-a-passo (AFN Generalizado / GNFA).
 */
export function convertNfaToRegex(automaton: Automaton): NfaToRegexResult {
  const initials = automaton.states.filter((s) => s.isInitial)
  const acceptings = automaton.states.filter((s) => s.isAccepting)

  if (initials.length === 0 || acceptings.length === 0) {
    return {
      regex: '∅',
      steps: [],
    }
  }

  const START = '__q_ini__'
  const END = '__q_fim__'
  const labelOf = new Map<string, string>([
    [START, 'q_ini'],
    [END, 'q_fim'],
    ...automaton.states.map((s) => [s.id, s.label] as [string, string]),
  ])

  const allNodes = [START, ...automaton.states.map((s) => s.id), END]
  const matrix = new Map<string, string | null>()
  const key = (u: string, v: string) => `${u}:::${v}`

  for (const u of allNodes) {
    for (const v of allNodes) {
      matrix.set(key(u, v), null)
    }
  }

  // Liga novo estado inicial aos estados iniciais originais via ε
  for (const init of initials) {
    matrix.set(key(START, init.id), EPSILON)
  }

  // Liga estados de aceitação originais ao novo estado final único via ε
  for (const acc of acceptings) {
    matrix.set(key(acc.id, END), EPSILON)
  }

  // Preenche transições existentes (unindo múltiplos símbolos na mesma aresta com |)
  for (const t of automaton.transitions) {
    const prev = matrix.get(key(t.from, t.to)) ?? null
    matrix.set(key(t.from, t.to), regexUnion(prev, t.symbol))
  }

  const activeInternal = automaton.states.map((s) => s.id)
  const steps: EliminationStep[] = []
  let stepNum = 1

  while (activeInternal.length > 0) {
    const rip = activeInternal.shift()!
    const ripLabel = labelOf.get(rip) ?? rip
    const remainingNodes = [START, ...activeInternal, END]
    const rLoop = matrix.get(key(rip, rip)) ?? null
    const loopExpr = regexStar(rLoop)

    const updatedPaths: EliminationStep['updatedPaths'] = []

    for (const qi of remainingNodes) {
      if (qi === END) continue
      const rIn = matrix.get(key(qi, rip)) ?? null
      if (!rIn) continue

      for (const qj of remainingNodes) {
        if (qj === START) continue
        const rOut = matrix.get(key(rip, qj)) ?? null
        if (!rOut) continue

        const rDirect = matrix.get(key(qi, qj)) ?? null
        const bypass = regexConcat(regexConcat(rIn, loopExpr), rOut)
        const combined = regexUnion(rDirect, bypass)

        matrix.set(key(qi, qj), combined)

        const fromLbl = labelOf.get(qi) ?? qi
        const toLbl = labelOf.get(qj) ?? qj
        updatedPaths.push({
          from: fromLbl,
          to: toLbl,
          formula: `${rDirect ? `${rDirect} | ` : ''}${wrapIfUnion(rIn)}${loopExpr === EPSILON ? '' : loopExpr}${wrapIfUnion(rOut)}`,
          result: combined ?? '∅',
        })
      }
    }

    steps.push({
      stepNumber: stepNum++,
      eliminatedStateLabel: ripLabel,
      remainingLabels: activeInternal.map((id) => labelOf.get(id) ?? id),
      updatedPaths,
    })
  }

  const finalRegex = matrix.get(key(START, END)) ?? '∅'
  return {
    regex: finalRegex,
    steps,
  }
}
