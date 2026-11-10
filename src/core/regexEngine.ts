import { minimizeDfa, type MinimizationResult } from './minimizeDfa'
import { convertNfaToDfa, type NfaToDfaResult } from './nfaToDfa'
import {
  convertRegexToNfa,
  formatAst,
  parseRegexToAst,
  type RegexAstNode,
  type RegexToNfaResult,
} from './regexToNfa'
import { simulateAutomaton, type SimulationResult } from './simulator'
import { EPSILON } from './types'

export interface BacktrackEvent {
  step: number
  action: 'try' | 'match' | 'backtrack'
  nodeSummary: string
  position: number
  PrefixMatched: string
  detail: string
}

export interface RegexExecutionComparison {
  pattern: string
  input: string
  accepted: boolean
  automatonPipeline: {
    thompson: RegexToNfaResult
    subsetDfa: NfaToDfaResult
    minimizedDfa: MinimizationResult
    dfaSimulation: SimulationResult
  }
  backtrackingEngine: {
    accepted: boolean
    events: BacktrackEvent[]
    backtrackCount: number
  }
}

export interface TextMatchSpan {
  start: number
  end: number
  match: string
}

/**
 * Técnica 2 da Seção 2.7 do PDF:
 * Interpretador direto da Expressão Regular com Backtracking explícito.
 * Usa continuações sobre a AST para testar diferentes caminhos e registrar
 * cada tentativa e cada backtrack realizado.
 */
export function runBacktrackingRegex(
  pattern: string,
  input: string,
  maxSteps = 400,
): {
  accepted: boolean
  events: BacktrackEvent[]
  backtrackCount: number
} {
  const { ast } = parseRegexToAst(pattern)
  const events: BacktrackEvent[] = []
  let backtrackCount = 0
  let stepCounter = 1

  const record = (
    action: BacktrackEvent['action'],
    node: RegexAstNode,
    pos: number,
    detail: string,
  ) => {
    if (events.length >= maxSteps) return
    events.push({
      step: stepCounter++,
      action,
      nodeSummary: formatAst(node),
      position: pos,
      PrefixMatched: input.slice(0, pos) || 'ε',
      detail,
    })
  }

  // Retorna gerador de todas as posições finais possíveis a partir de `pos`
  // evitando loops infinitos em fechos sobre ε.
  // O limite `maxSteps` só corta o LOG exibido na tela; a busca sempre vai até o fim,
  // senão uma entrada longa seria rejeitada por falta de passos, não por falta de casamento.
  function* matchNode(
    node: RegexAstNode,
    pos: number,
    visitedStar = new Set<string>(),
  ): Generator<number> {

    switch (node.type) {
      case 'literal': {
        if (node.symbol === EPSILON) {
          record('match', node, pos, `Movimento vazio ε na posição ${pos}.`)
          yield pos
          return
        }
        const ch = input[pos]
        record(
          'try',
          node,
          pos,
          `Testando literal '${node.symbol}' contra ${ch ? `'${ch}'` : 'fim da cadeia'} na pos ${pos}.`,
        )
        if (ch === node.symbol) {
          record('match', node, pos + 1, `Casou '${node.symbol}' → avança para pos ${pos + 1}.`)
          yield pos + 1
        } else {
          backtrackCount++
          record(
            'backtrack',
            node,
            pos,
            `Falhou '${node.symbol}' (encontrou ${ch ? `'${ch}'` : 'EOF'}) → backtrack.`,
          )
        }
        return
      }

      case 'concat': {
        for (const midPos of matchNode(node.left, pos, visitedStar)) {
          let matchedRight = false
          for (const endPos of matchNode(node.right, midPos, new Set())) {
            matchedRight = true
            yield endPos
          }
          if (!matchedRight) {
            backtrackCount++
            record(
              'backtrack',
              node,
              midPos,
              `Lado direito '${formatAst(node.right)}' falhou na pos ${midPos} → backtrack para testar outra divisão de '${formatAst(node.left)}'.`,
            )
          }
        }
        return
      }

      case 'union': {
        record(
          'try',
          node,
          pos,
          `Tentando 1º ramo da união '${formatAst(node.left)}' na pos ${pos}.`,
        )
        yield* matchNode(node.left, pos, visitedStar)

        backtrackCount++
        record(
          'backtrack',
          node,
          pos,
          `Backtrack na união: tentando 2º ramo '${formatAst(node.right)}' na pos ${pos}.`,
        )
        yield* matchNode(node.right, pos, visitedStar)
        return
      }

      case 'star': {
        const starKey = `${formatAst(node)}@${pos}`
        if (visitedStar.has(starKey)) return
        const nextVisited = new Set(visitedStar)
        nextVisited.add(starKey)

        // Abordagem gulosa (greedy): tenta repetir primeiro, e faz backtrack para 0 repetições se falhar adiante
        record('try', node, pos, `Tentando repetição de ${formatAst(node)} na pos ${pos}.`)
        for (const afterOne of matchNode(node.expr, pos, nextVisited)) {
          if (afterOne > pos) {
            yield* matchNode(node, afterOne, new Set())
          }
        }
        record(
          'match',
          node,
          pos,
          `Opção de saída (fecho vazio ε) de ${formatAst(node)} na pos ${pos}.`,
        )
        yield pos
        return
      }

      case 'plus': {
        for (const afterOne of matchNode(node.expr, pos, visitedStar)) {
          if (afterOne > pos) {
            yield* matchNode({ type: 'star', expr: node.expr }, afterOne, new Set())
          } else {
            yield afterOne
          }
        }
        return
      }

      case 'optional': {
        record('try', node, pos, `Tentando presença opcional de '${formatAst(node.expr)}'.`)
        yield* matchNode(node.expr, pos, visitedStar)
        backtrackCount++
        record('backtrack', node, pos, `Backtrack no opcional: tentando ausência (ε) na pos ${pos}.`)
        yield pos
        return
      }
    }
  }

  let accepted = false
  for (const endPos of matchNode(ast, 0)) {
    if (endPos === input.length) {
      accepted = true
      events.push({
        step: stepCounter++,
        action: 'match',
        nodeSummary: formatAst(ast),
        position: endPos,
        PrefixMatched: input || 'ε',
        detail: 'Cadeia inteira consumida com sucesso! Casamento completo.',
      })
      break
    } else {
      backtrackCount++
      events.push({
        step: stepCounter++,
        action: 'backtrack',
        nodeSummary: formatAst(ast),
        position: endPos,
        PrefixMatched: input.slice(0, endPos) || 'ε',
        detail: `Ramo terminou na pos ${endPos}, mas a cadeia tem tamanho ${input.length} → backtrack.`,
      })
    }
  }

  return {
    accepted,
    events,
    backtrackCount,
  }
}

/**
 * Executa e compara as duas técnicas da Seção 2.7 do PDF sobre a mesma Expressão Regular:
 * 1. Conversão ER → AFN → AFD → AFD Minimizado + simulação linear
 * 2. Interpretação direta da ER com Backtracking
 */
export function compareRegexEngines(
  pattern: string,
  input: string,
): RegexExecutionComparison {
  const thompson = convertRegexToNfa(pattern)
  const subsetDfa = convertNfaToDfa(thompson.nfa)
  const minimizedDfa = minimizeDfa(subsetDfa.dfa)
  const dfaSimulation = simulateAutomaton(minimizedDfa.minimizedDfa, input)
  const backtrackingEngine = runBacktrackingRegex(pattern, input)

  return {
    pattern,
    input,
    accepted: dfaSimulation.accepted,
    automatonPipeline: {
      thompson,
      subsetDfa,
      minimizedDfa,
      dfaSimulation,
    },
    backtrackingEngine,
  }
}

/**
 * Busca por padrões em um texto usando o AFD minimizado construído a partir da ER
 * (Seção 2.7: "busca por padrões e validação de entrada usando padrões").
 */
export function findPatternMatchesInText(pattern: string, text: string): TextMatchSpan[] {
  const thompson = convertRegexToNfa(pattern)
  const subsetDfa = convertNfaToDfa(thompson.nfa)
  const minDfa = minimizeDfa(subsetDfa.dfa).minimizedDfa

  const spans: TextMatchSpan[] = []
  let i = 0

  while (i < text.length) {
    let longestEnd = -1
    for (let j = i + 1; j <= text.length; j++) {
      const candidate = text.slice(i, j)
      if (simulateAutomaton(minDfa, candidate).accepted) {
        longestEnd = j
      }
    }

    if (longestEnd > i) {
      spans.push({
        start: i,
        end: longestEnd,
        match: text.slice(i, longestEnd),
      })
      i = longestEnd
    } else {
      i++
    }
  }

  return spans
}

