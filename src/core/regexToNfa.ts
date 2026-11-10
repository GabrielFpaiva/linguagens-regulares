import {
  type Automaton,
  type AutomatonState,
  type AutomatonTransition,
  autoLayoutAutomaton,
  EPSILON,
} from './types'

export type RegexAstNode =
  | { type: 'literal'; symbol: string }
  | { type: 'concat'; left: RegexAstNode; right: RegexAstNode }
  | { type: 'union'; left: RegexAstNode; right: RegexAstNode }
  | { type: 'star'; expr: RegexAstNode }
  | { type: 'plus'; expr: RegexAstNode }
  | { type: 'optional'; expr: RegexAstNode }

export interface ThompsonStep {
  stepNumber: number
  operation: string
  subExpression: string
  startState: string
  acceptState: string
  description: string
}

export interface RegexToNfaResult {
  pattern: string
  explicitConcatPattern: string
  postfix: string
  ast: RegexAstNode
  nfa: Automaton
  steps: ThompsonStep[]
}

interface Token {
  kind: 'lit' | 'op'
  value: string
}

function tokenizeRegex(pattern: string): Token[] {
  const cleaned = pattern.trim()
  if (cleaned.length === 0) {
    return [{ kind: 'lit', value: EPSILON }]
  }

  const raw: Token[] = []
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i]!
    if (ch === ' ') continue
    if (ch === '\\' && i + 1 < cleaned.length) {
      raw.push({ kind: 'lit', value: cleaned[++i]! })
    } else if (ch === '(' || ch === ')' || ch === '|' || ch === '*' || ch === '+' || ch === '?' || ch === '.') {
      raw.push({ kind: 'op', value: ch })
    } else if (ch === 'ε' || ch === 'λ') {
      raw.push({ kind: 'lit', value: EPSILON })
    } else {
      raw.push({ kind: 'lit', value: ch })
    }
  }

  // Insere operador explícito de concatenação '.' onde necessário
  const withConcat: Token[] = []
  for (let i = 0; i < raw.length; i++) {
    const curr = raw[i]!
    withConcat.push(curr)
    if (i + 1 < raw.length) {
      const next = raw[i + 1]!
      const currCanPrecede =
        curr.kind === 'lit' ||
        curr.value === ')' ||
        curr.value === '*' ||
        curr.value === '+' ||
        curr.value === '?'
      const nextCanFollow = next.kind === 'lit' || next.value === '('
      if (currCanPrecede && nextCanFollow) {
        withConcat.push({ kind: 'op', value: '.' })
      }
    }
  }

  return withConcat
}

function precedence(op: string): number {
  if (op === '*' || op === '+' || op === '?') return 3
  if (op === '.') return 2
  if (op === '|') return 1
  return 0
}

export function parseRegexToAst(pattern: string): {
  ast: RegexAstNode
  explicitConcatPattern: string
  postfix: string
} {
  const tokens = tokenizeRegex(pattern)
  const explicitConcatPattern = tokens.map((t) => t.value).join('')

  const outputQueue: Token[] = []
  const opStack: Token[] = []

  for (const token of tokens) {
    if (token.kind === 'lit') {
      outputQueue.push(token)
    } else if (token.value === '(') {
      opStack.push(token)
    } else if (token.value === ')') {
      while (opStack.length > 0 && opStack[opStack.length - 1]!.value !== '(') {
        outputQueue.push(opStack.pop()!)
      }
      if (opStack.length === 0) {
        throw new Error('Parênteses desbalanceados na Expressão Regular.')
      }
      opStack.pop() // remove '('
    } else {
      const prec = precedence(token.value)
      while (
        opStack.length > 0 &&
        opStack[opStack.length - 1]!.value !== '(' &&
        precedence(opStack[opStack.length - 1]!.value) >= prec
      ) {
        outputQueue.push(opStack.pop()!)
      }
      opStack.push(token)
    }
  }

  while (opStack.length > 0) {
    const top = opStack.pop()!
    if (top.value === '(' || top.value === ')') {
      throw new Error('Parênteses desbalanceados na Expressão Regular.')
    }
    outputQueue.push(top)
  }

  const astStack: RegexAstNode[] = []
  for (const tok of outputQueue) {
    if (tok.kind === 'lit') {
      astStack.push({ type: 'literal', symbol: tok.value })
    } else if (tok.value === '*') {
      const expr = astStack.pop()
      if (!expr) throw new Error('Operador * sem operando.')
      astStack.push({ type: 'star', expr })
    } else if (tok.value === '+') {
      const expr = astStack.pop()
      if (!expr) throw new Error('Operador + sem operando.')
      astStack.push({ type: 'plus', expr })
    } else if (tok.value === '?') {
      const expr = astStack.pop()
      if (!expr) throw new Error('Operador ? sem operando.')
      astStack.push({ type: 'optional', expr })
    } else if (tok.value === '.') {
      const right = astStack.pop()
      const left = astStack.pop()
      if (!left || !right) throw new Error('Concatenação inválida na Expressão Regular.')
      astStack.push({ type: 'concat', left, right })
    } else if (tok.value === '|') {
      const right = astStack.pop()
      const left = astStack.pop()
      if (!left || !right) throw new Error('Operador de união (|) requer dois operandos.')
      astStack.push({ type: 'union', left, right })
    }
  }

  if (astStack.length !== 1) {
    throw new Error('Expressão Regular malformada.')
  }

  return {
    ast: astStack[0]!,
    explicitConcatPattern,
    postfix: outputQueue.map((t) => t.value).join(' '),
  }
}

export function formatAst(node: RegexAstNode): string {
  switch (node.type) {
    case 'literal':
      return node.symbol
    case 'concat':
      return `${formatAst(node.left)}${formatAst(node.right)}`
    case 'union':
      return `(${formatAst(node.left)}|${formatAst(node.right)})`
    case 'star':
      return `(${formatAst(node.expr)})*`
    case 'plus':
      return `(${formatAst(node.expr)})+`
    case 'optional':
      return `(${formatAst(node.expr)})?`
  }
}

/**
 * Seção 2.5 do PDF: Conversão de Expressões Regulares para AFN (Construção de Thompson)
 */
export function convertRegexToNfa(pattern: string): RegexToNfaResult {
  const { ast, explicitConcatPattern, postfix } = parseRegexToAst(pattern)

  const states: AutomatonState[] = []
  const transitions: AutomatonTransition[] = []
  const steps: ThompsonStep[] = []

  let stateCounter = 0
  let transCounter = 1

  const createState = (): string => {
    const id = `q${stateCounter++}`
    states.push({
      id,
      label: id,
      x: 0,
      y: 0,
      isInitial: false,
      isAccepting: false,
    })
    return id
  }

  const addEdge = (from: string, to: string, symbol: string) => {
    transitions.push({
      id: `th_t${transCounter++}`,
      from,
      to,
      symbol,
    })
  }

  const buildFragment = (node: RegexAstNode): { start: string; accept: string } => {
    switch (node.type) {
      case 'literal': {
        const s = createState()
        const f = createState()
        addEdge(s, f, node.symbol)
        steps.push({
          stepNumber: steps.length + 1,
          operation: 'Símbolo Base',
          subExpression: node.symbol,
          startState: s,
          acceptState: f,
          description: `Criado fragmento básico ${s} —(${node.symbol})→ ${f}.`,
        })
        return { start: s, accept: f }
      }

      case 'concat': {
        const leftFrag = buildFragment(node.left)
        const rightFrag = buildFragment(node.right)
        addEdge(leftFrag.accept, rightFrag.start, EPSILON)
        const sub = formatAst(node)
        steps.push({
          stepNumber: steps.length + 1,
          operation: 'Concatenação (·)',
          subExpression: sub,
          startState: leftFrag.start,
          acceptState: rightFrag.accept,
          description: `Conectado fim do 1º fragmento (${leftFrag.accept}) ao início do 2º (${rightFrag.start}) via ε.`,
        })
        return { start: leftFrag.start, accept: rightFrag.accept }
      }

      case 'union': {
        const leftFrag = buildFragment(node.left)
        const rightFrag = buildFragment(node.right)
        const s = createState()
        const f = createState()
        addEdge(s, leftFrag.start, EPSILON)
        addEdge(s, rightFrag.start, EPSILON)
        addEdge(leftFrag.accept, f, EPSILON)
        addEdge(rightFrag.accept, f, EPSILON)
        const sub = formatAst(node)
        steps.push({
          stepNumber: steps.length + 1,
          operation: 'União (|)',
          subExpression: sub,
          startState: s,
          acceptState: f,
          description: `Novo início ${s} bifurca via ε para ${leftFrag.start} e ${rightFrag.start}; ambos convergem via ε para ${f}.`,
        })
        return { start: s, accept: f }
      }

      case 'star': {
        const inner = buildFragment(node.expr)
        const s = createState()
        const f = createState()
        addEdge(s, inner.start, EPSILON)
        addEdge(s, f, EPSILON)
        addEdge(inner.accept, inner.start, EPSILON)
        addEdge(inner.accept, f, EPSILON)
        const sub = formatAst(node)
        steps.push({
          stepNumber: steps.length + 1,
          operation: 'Fecho de Kleene (*)',
          subExpression: sub,
          startState: s,
          acceptState: f,
          description: `Estado ${s} entra em ${inner.start} ou salta para ${f} via ε; ${inner.accept} repete para ${inner.start} ou sai para ${f} via ε.`,
        })
        return { start: s, accept: f }
      }

      case 'plus': {
        const inner = buildFragment(node.expr)
        const s = createState()
        const f = createState()
        addEdge(s, inner.start, EPSILON)
        addEdge(inner.accept, inner.start, EPSILON)
        addEdge(inner.accept, f, EPSILON)
        const sub = formatAst(node)
        steps.push({
          stepNumber: steps.length + 1,
          operation: 'Fecho Positivo (+)',
          subExpression: sub,
          startState: s,
          acceptState: f,
          description: `Exige ao menos uma passagem por ${inner.start}..${inner.accept}, com retorno ε de ${inner.accept} para ${inner.start}.`,
        })
        return { start: s, accept: f }
      }

      case 'optional': {
        const inner = buildFragment(node.expr)
        const s = createState()
        const f = createState()
        addEdge(s, inner.start, EPSILON)
        addEdge(s, f, EPSILON)
        addEdge(inner.accept, f, EPSILON)
        const sub = formatAst(node)
        steps.push({
          stepNumber: steps.length + 1,
          operation: 'Opcional (?)',
          subExpression: sub,
          startState: s,
          acceptState: f,
          description: `Permite passar por ${inner.start}..${inner.accept} ou saltar diretamente de ${s} para ${f} via ε.`,
        })
        return { start: s, accept: f }
      }
    }
  }

  const root = buildFragment(ast)
  for (const st of states) {
    if (st.id === root.start) st.isInitial = true
    if (st.id === root.accept) st.isAccepting = true
  }

  const nfa = autoLayoutAutomaton({
    name: `AFN de Thompson para /${pattern}/`,
    states,
    transitions,
  })

  return {
    pattern,
    explicitConcatPattern,
    postfix,
    ast,
    nfa,
    steps,
  }
}
