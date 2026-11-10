import {
  ArrowRight,
  CheckCircle2,
  GitBranch,
  Search,
  Sparkles,
  XCircle,
} from 'lucide-react'
import React, { useMemo, useState } from 'react'
import {
  compareRegexEngines,
  findPatternMatchesInText,
} from '../core/regexEngine'
import type { Automaton } from '../core/types'
import { AutomatonCanvas } from './AutomatonCanvas'

interface RegexPanelProps {
  onLoadAutomatonIntoEditor: (automaton: Automaton) => void
}

const REGEX_PRESETS = [
  {
    label: '(a|b)*abb',
    pattern: '(a|b)*abb',
    sampleInput: 'aabb',
    sampleText: 'xxabbyyaabbzzababbw',
    desc: 'Clássico de compiladores: cadeias terminadas em "abb" (mostra backtracking vs AFD).',
  },
  {
    label: 'a(b|c)*d',
    pattern: 'a(b|c)*d',
    sampleInput: 'abcbd',
    sampleText: 'inicio ad meio abcbd fim acdxx',
    desc: 'Começa com "a", seguido de zero ou mais "b" ou "c", e termina com "d".',
  },
  {
    label: '0*10*10*',
    pattern: '0*10*10*',
    sampleInput: '01010',
    sampleText: '000 01010 11 00100',
    desc: 'Cadeias binárias contendo exatamente dois dígitos "1".',
  },
  {
    label: '(ab)+c?',
    pattern: '(ab)+c?',
    sampleInput: 'ababc',
    sampleText: 'xxabcyyababzzababc',
    desc: 'Usa fecho positivo (+) e operador opcional (?).',
  },
]

export const RegexPanel: React.FC<RegexPanelProps> = ({
  onLoadAutomatonIntoEditor,
}) => {
  const [pattern, setPattern] = useState('(a|b)*abb')
  const [testInput, setTestInput] = useState('aabb')
  const [searchText, setSearchText] = useState('xxabbyyaabbzzababbw')
  const [pipelineView, setPipelineView] = useState<'thompson' | 'dfa' | 'min-dfa'>('thompson')

  const result = useMemo(() => {
    try {
      return {
        data: compareRegexEngines(pattern, testInput),
        matches: findPatternMatchesInText(pattern, searchText),
        error: null,
      }
    } catch (err) {
      return {
        data: null,
        matches: [],
        error: err instanceof Error ? err.message : 'Expressão Regular inválida.',
      }
    }
  }, [pattern, testInput, searchText])

  const displayedAutomaton = useMemo(() => {
    if (!result.data) return null
    if (pipelineView === 'thompson') return result.data.automatonPipeline.thompson.nfa
    if (pipelineView === 'dfa') return result.data.automatonPipeline.subsetDfa.dfa
    return result.data.automatonPipeline.minimizedDfa.minimizedDfa
  }, [result.data, pipelineView])

  // Renderiza o texto com highlight dos casamentos encontrados
  const renderHighlightedText = () => {
    if (!searchText) return <span className="text-slate-500">Texto vazio</span>
    if (result.matches.length === 0) {
      return <span className="text-slate-300">{searchText}</span>
    }

    const parts: React.ReactNode[] = []
    let cursor = 0
    result.matches.forEach((m, idx) => {
      if (m.start > cursor) {
        parts.push(
          <span key={`plain-${idx}`} className="text-slate-400">
            {searchText.slice(cursor, m.start)}
          </span>,
        )
      }
      parts.push(
        <mark
          key={`match-${idx}`}
          className="rounded bg-emerald-500/30 border border-emerald-400/50 px-1 py-0.5 font-bold text-emerald-200"
        >
          {m.match}
        </mark>,
      )
      cursor = m.end
    })
    if (cursor < searchText.length) {
      parts.push(
        <span key="plain-end" className="text-slate-400">
          {searchText.slice(cursor)}
        </span>,
      )
    }
    return parts
  }

  return (
    <div className="space-y-4">
      {/* Presets e Entrada da ER */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold text-white">
              Seções 2.5 e 2.7 — Conversão ER → AFN e Implementação de Expressões Regulares
            </h3>
            <p className="text-xs text-slate-400">
              Compara as duas técnicas descritas na página 5 do PDF: (1) Pipeline de Autômatos
              (ER → AFN → AFD → AFD Mínimo) vs (2) Busca Direta na ER com Backtracking.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {REGEX_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setPattern(p.pattern)
                setTestInput(p.sampleInput)
                setSearchText(p.sampleText)
              }}
              className={`rounded-lg border px-2.5 py-1 text-xs font-mono transition ${
                pattern === p.pattern
                  ? 'border-indigo-500 bg-indigo-950/60 text-indigo-200'
                  : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
              }`}
            >
              /{p.label}/
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Expressão Regular (Operadores: <code className="text-indigo-300">| * + ? ( )</code>):
            </label>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Cadeia para validação exata (<code className="text-indigo-300">w</code>):
            </label>
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {result.error && (
          <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">
            {result.error}
          </div>
        )}

        {result.data && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs">
            <div className="space-x-4 font-mono">
              <span className="text-slate-400">
                Concatenação explícita:{' '}
                <strong className="text-indigo-300">
                  {result.data.automatonPipeline.thompson.explicitConcatPattern}
                </strong>
              </span>
              <span className="text-slate-400">
                Pós-fixa (Shunting-Yard):{' '}
                <strong className="text-amber-300">
                  {result.data.automatonPipeline.thompson.postfix}
                </strong>
              </span>
            </div>

            <div>
              {result.data.accepted ? (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 font-semibold text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Cadeia &quot;{testInput || 'ε'}&quot; ACEITA
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 font-semibold text-rose-300">
                  <XCircle className="h-3.5 w-3.5" />
                  Cadeia &quot;{testInput || 'ε'}&quot; REJEITADA
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Visualização do Pipeline de Autômatos vs Backtracking */}
      {result.data && displayedAutomaton && (
        <>
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPipelineView('thompson')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    pipelineView === 'thompson'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  1. AFN-ε de Thompson ({result.data.automatonPipeline.thompson.nfa.states.length}{' '}
                  estados)
                </button>
                <button
                  type="button"
                  onClick={() => setPipelineView('dfa')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    pipelineView === 'dfa'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  2. AFD Subconjuntos ({result.data.automatonPipeline.subsetDfa.dfa.states.length}{' '}
                  estados)
                </button>
                <button
                  type="button"
                  onClick={() => setPipelineView('min-dfa')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    pipelineView === 'min-dfa'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  3. AFD Minimizado (
                  {result.data.automatonPipeline.minimizedDfa.minimizedDfa.states.length} estados)
                </button>
              </div>

              <button
                type="button"
                onClick={() => onLoadAutomatonIntoEditor(displayedAutomaton)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/30"
              >
                Abrir e Simular no Editor Principal
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <AutomatonCanvas automaton={displayedAutomaton} readOnly height={330} />
          </div>

          {/* Comparação lado a lado: Técnica 1 (Pipeline AFD) vs Técnica 2 (Backtracking) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Técnica 1: Simulação Direta no AFD Minimizado (Sem Backtracking)
                </h4>
                <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[11px] font-mono text-emerald-300">
                  {result.data.automatonPipeline.dfaSimulation.steps.length - 1} transições O(|w|)
                </span>
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {result.data.automatonPipeline.dfaSimulation.steps.map((st) => (
                  <div
                    key={st.stepIndex}
                    className="rounded border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-mono text-slate-300"
                  >
                    <span className="text-indigo-400 font-bold">Passo {st.stepIndex}:</span>{' '}
                    {st.explanation}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-300">
                  <GitBranch className="h-3.5 w-3.5" />
                  Técnica 2: Interpretador Direto da ER com Backtracking
                </h4>
                <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[11px] font-mono text-amber-300">
                  {result.data.backtrackingEngine.backtrackCount} backtrack(s)
                </span>
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {result.data.backtrackingEngine.events.map((ev) => (
                  <div
                    key={ev.step}
                    className={`rounded border px-3 py-1.5 text-xs font-mono ${
                      ev.action === 'backtrack'
                        ? 'border-rose-500/30 bg-rose-950/20 text-rose-300'
                        : ev.action === 'match'
                          ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                          : 'border-slate-800 bg-slate-950 text-slate-300'
                    }`}
                  >
                    <span className="font-bold">#{ev.step}</span> [{ev.action.toUpperCase()}] —{' '}
                    {ev.detail}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Busca por padrões em texto livre (Seção 2.7) */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-300">
                <Search className="h-3.5 w-3.5" />
                Aplicação de ER (Seção 2.7): Busca de Padrões em Texto Livre
              </h4>
              <span className="text-xs text-emerald-300 font-semibold">
                {result.matches.length} ocorrência(s) encontrada(s)
              </span>
            </div>

            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white mb-2.5 focus:border-indigo-500 focus:outline-none"
              placeholder="Digite um texto para buscar todas as subcadeias que casam com a ER..."
            />

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-sm leading-relaxed">
              {renderHighlightedText()}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
