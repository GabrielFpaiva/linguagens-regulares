import { ArrowRight, CheckCircle2, Sparkles, XCircle } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { minimizeDfa } from '../core/minimizeDfa'
import { convertNfaToDfa } from '../core/nfaToDfa'
import { convertNfaToRegex } from '../core/nfaToRegex'
import { simulateAutomaton } from '../core/simulator'
import type { Automaton } from '../core/types'
import { AutomatonCanvas } from './AutomatonCanvas'

interface ConversionsPanelProps {
  automaton: Automaton
  testWords: string[]
  onLoadIntoEditor: (target: Automaton) => void
}

export const ConversionsPanel: React.FC<ConversionsPanelProps> = ({
  automaton,
  testWords,
  onLoadIntoEditor,
}) => {
  const [subTab, setSubTab] = useState<'nfa-to-dfa' | 'minimize' | 'nfa-to-er'>('nfa-to-dfa')

  const nfaToDfaResult = useMemo(() => convertNfaToDfa(automaton), [automaton])
  const minimizationResult = useMemo(() => minimizeDfa(automaton), [automaton])
  const nfaToRegexResult = useMemo(() => convertNfaToRegex(automaton), [automaton])

  const equivalenceWords = useMemo(() => {
    const defaults = ['', 'a', 'b', 'ab', 'ba', 'aa', 'aba', 'aab', 'abb']
    return Array.from(new Set([...testWords, ...defaults])).slice(0, 8)
  }, [testWords])

  return (
    <div className="space-y-4">
      {/* Seletor de algoritmo das Seções 2.3, 2.4 e 2.6 */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white p-2">
        <button
          type="button"
          onClick={() => setSubTab('nfa-to-dfa')}
          className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
            subTab === 'nfa-to-dfa'
              ? 'bg-neutral-900 text-white'
              : 'text-neutral-700 hover:bg-neutral-100'
          }`}
        >
          AFN → AFD
        </button>
        <button
          type="button"
          onClick={() => setSubTab('minimize')}
          className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
            subTab === 'minimize'
              ? 'bg-neutral-900 text-white'
              : 'text-neutral-700 hover:bg-neutral-100'
          }`}
        >
          Minimização
        </button>
        <button
          type="button"
          onClick={() => setSubTab('nfa-to-er')}
          className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
            subTab === 'nfa-to-er'
              ? 'bg-neutral-900 text-white'
              : 'text-neutral-700 hover:bg-neutral-100'
          }`}
        >
          AFN → ER
        </button>
      </div>

      {/* ABA 2.3: AFN -> AFD */}
      {subTab === 'nfa-to-dfa' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-neutral-700">
                  1. Sem movimentos vazios
                </span>
                <button
                  type="button"
                  onClick={() => onLoadIntoEditor(nfaToDfaResult.epsilonRemoval.withoutEpsilon)}
                  className="inline-flex items-center gap-1 text-xs text-neutral-900 hover:text-neutral-900"
                >
                  Enviar ao Editor <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <AutomatonCanvas
                automaton={nfaToDfaResult.epsilonRemoval.withoutEpsilon}
                readOnly
                height={320}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-neutral-900">
                  2. AFD por subconjuntos
                </span>
                <button
                  type="button"
                  onClick={() => onLoadIntoEditor(nfaToDfaResult.dfa)}
                  className="inline-flex items-center gap-1 text-xs text-neutral-900 hover:text-neutral-900"
                >
                  Enviar AFD ao Editor <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <AutomatonCanvas automaton={nfaToDfaResult.dfa} readOnly height={320} />
            </div>
          </div>

          {/* Tabela de Fecho-ε e Tabela de Subconjuntos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-neutral-200 bg-white/90 p-4">
              <h4 className="text-xs font-semibold text-neutral-900 mb-2">
                Fecho-ε
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-500">
                      <th className="py-1.5">Estado</th>
                      <th className="py-1.5">ε-fecho(q)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {nfaToDfaResult.epsilonRemoval.closures.map((c) => (
                      <tr key={c.stateId}>
                        <td className="py-1.5 font-bold text-neutral-800">{c.stateLabel}</td>
                        <td className="py-1.5 text-neutral-900">
                          {'{'}
                          {c.closureLabels.join(', ')}
                          {'}'}
                          {c.becameAccepting && (
                            <span className="ml-1.5 text-[10px] text-neutral-900">
                              (+aceitação)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-2 rounded-xl border border-neutral-200 bg-white/90 p-4">
              <h4 className="text-xs font-semibold text-neutral-900 mb-2">
                Subconjuntos
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-500">
                      <th className="py-1.5 pr-3">Macro-Estado AFD</th>
                      <th className="py-1.5 pr-3">Conjunto no AFN</th>
                      {nfaToDfaResult.alphabet.map((sym) => (
                        <th key={sym} className="py-1.5 px-2 text-neutral-900">
                          δ(·, {sym})
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {nfaToDfaResult.subsetTable.map((row) => (
                      <tr key={row.dfaStateId}>
                        <td className="py-1.5 pr-3 font-bold text-neutral-900">
                          {row.isInitial ? '→ ' : ''}
                          {row.isAccepting ? '*' : ''}
                          {row.dfaStateId}
                        </td>
                        <td className="py-1.5 pr-3 text-neutral-900">{row.dfaStateLabel}</td>
                        {nfaToDfaResult.alphabet.map((sym) => (
                          <td key={sym} className="py-1.5 px-2 text-neutral-700">
                            {row.transitions[sym]?.targetDfaLabel ?? '∅'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Verificação de Equivalência Original vs Convertido */}
          <div className="rounded-xl border border-neutral-200 bg-white/90 p-4">
            <h4 className="text-xs font-semibold text-neutral-700 mb-2">
              Original e AFD dão a mesma resposta?
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {equivalenceWords.map((w) => {
                const origOk = simulateAutomaton(automaton, w).accepted
                const dfaOk = simulateAutomaton(nfaToDfaResult.dfa, w).accepted
                const agree = origOk === dfaOk
                return (
                  <div
                    key={w}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-mono"
                  >
                    <span className="text-neutral-800">&quot;{w || 'ε'}&quot;</span>
                    <span
                      className={`inline-flex items-center gap-1 ${agree ? 'text-neutral-900' : 'text-neutral-500'}`}
                    >
                      {agree ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      {agree ? (origOk ? 'Ambos Aceitam' : 'Ambos Rejeitam') : 'Divergente'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ABA 2.4: MINIMIZAÇÃO DE AFD */}
      {subTab === 'minimize' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="mb-1.5 text-xs font-semibold text-neutral-700">
                AFD Original ({minimizationResult.originalDfa.states.length} estados)
              </div>
              <AutomatonCanvas
                automaton={minimizationResult.originalDfa}
                readOnly
                height={320}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-neutral-900">
                  AFD Minimizado ({minimizationResult.minimizedDfa.states.length} estados)
                </span>
                <button
                  type="button"
                  onClick={() => onLoadIntoEditor(minimizationResult.minimizedDfa)}
                  className="inline-flex items-center gap-1 text-xs text-neutral-900 hover:text-neutral-900"
                >
                  Enviar AFD Mínimo ao Editor <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <AutomatonCanvas
                automaton={minimizationResult.minimizedDfa}
                readOnly
                height={320}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-neutral-200 bg-white/90 p-4">
              <h4 className="text-xs font-semibold text-neutral-900 mb-2">
                Partições
              </h4>
              {minimizationResult.removedUnreachableLabels.length > 0 && (
                <div className="mb-2.5 rounded bg-neutral-100 border border-neutral-300 px-2.5 py-1.5 text-xs text-neutral-900">
                  Estados inalcançáveis eliminados antes do refinamento:{' '}
                  <strong>{minimizationResult.removedUnreachableLabels.join(', ')}</strong>
                </div>
              )}
              <div className="space-y-2">
                {minimizationResult.partitionHistory.map((p) => (
                  <div
                    key={p.iteration}
                    className="rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 text-xs"
                  >
                    <div className="font-mono font-semibold text-neutral-900">
                      P_{p.iteration} ={' '}
                      {p.groups.map((g) => `{${g.join(', ')}}`).join(' , ')}
                    </div>
                    <div className="mt-1 text-neutral-500">{p.explanation}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white/90 p-4">
              <h4 className="text-xs font-semibold text-neutral-900 mb-2">
                Pares distinguíveis
              </h4>
              <div className="max-h-64 overflow-y-auto divide-y divide-neutral-200">
                {minimizationResult.pairTable.map((cell) => (
                  <div
                    key={`${cell.stateA}-${cell.stateB}`}
                    className="flex items-start justify-between gap-2 py-2 text-xs"
                  >
                    <span className="font-mono font-bold text-neutral-800 shrink-0">
                      ({cell.stateA}, {cell.stateB})
                    </span>
                    <span
                      className={`text-right ${
                        cell.distinguishable ? 'text-neutral-500' : 'text-neutral-900 font-semibold'
                      }`}
                    >
                      {cell.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2.6: AFN -> EXPRESSÃO REGULAR */}
      {subTab === 'nfa-to-er' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-300 bg-neutral-100 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900 mb-1">
              <Sparkles className="h-4 w-4" />
              Expressão regular equivalente
            </div>
            <div className="mt-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 font-mono text-base font-bold text-neutral-900 break-all">
              {nfaToRegexResult.regex}
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white/90 p-4">
            <h4 className="text-xs font-semibold text-neutral-700 mb-3">
              Passo a Passo da Eliminação de Estados (R&apos;ᵢⱼ = Rᵢⱼ ∪ Rᵢₖ(Rₖₖ)*Rₖⱼ)
            </h4>
            <div className="space-y-3">
              {nfaToRegexResult.steps.map((st) => (
                <div
                  key={st.stepNumber}
                  className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-neutral-900">
                      Passo {st.stepNumber}: Eliminado estado{' '}
                      <code className="rounded bg-neutral-100 px-1.5 py-0.5">
                        {st.eliminatedStateLabel}
                      </code>
                    </span>
                    <span className="text-neutral-500">
                       Estados internos restantes:{' '}
                      {st.remainingLabels.length > 0
                        ? st.remainingLabels.join(', ')
                        : 'nenhum (apenas q_ini e q_fim)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {st.updatedPaths.map((up, idx) => (
                      <div
                        key={idx}
                        className="rounded border border-neutral-300 bg-white px-2.5 py-1.5 font-mono"
                      >
                        <span className="text-neutral-900">
                          {up.from} → {up.to}:
                        </span>{' '}
                        <span className="text-neutral-900 font-semibold">{up.result}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

