import {
  CheckCircle2,
  FastForward,
  Layers,
  Play,
  RotateCcw,
  StepBack,
  StepForward,
  XCircle,
} from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { type SimulationStep, simulateAutomaton } from '../core/simulator'
import { type Automaton, classifyAutomaton } from '../core/types'

interface SimulatorPanelProps {
  automaton: Automaton
  sampleAccept?: string[]
  sampleReject?: string[]
  onStepChange?: (step: SimulationStep | null) => void
}

export const SimulatorPanel: React.FC<SimulatorPanelProps> = ({
  automaton,
  sampleAccept = ['a', 'abaa'],
  sampleReject = ['', 'aba'],
  onStepChange,
}) => {
  const [input, setInput] = useState(sampleAccept[0] ?? 'abaa')
  const [stepIndex, setStepIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const classification = useMemo(() => classifyAutomaton(automaton), [automaton])
  const simulation = useMemo(
    () => simulateAutomaton(automaton, input),
    [automaton, input],
  )

  const batchWords = useMemo(() => {
    const combined = [...sampleAccept, ...sampleReject]
    return Array.from(new Set(combined))
  }, [sampleAccept, sampleReject])

  useEffect(() => {
    setStepIndex(0)
    setIsPlaying(false)
  }, [automaton, input])

  const currentStep =
    simulation.steps[Math.min(stepIndex, simulation.steps.length - 1)] ?? null

  useEffect(() => {
    onStepChange?.(currentStep)
  }, [currentStep, onStepChange])

  useEffect(() => {
    if (!isPlaying) return
    if (stepIndex >= simulation.steps.length - 1) {
      setIsPlaying(false)
      return
    }
    const timer = setTimeout(() => {
      setStepIndex((prev) => Math.min(prev + 1, simulation.steps.length - 1))
    }, 650)
    return () => clearTimeout(timer)
  }, [isPlaying, stepIndex, simulation.steps.length])

  const isAtFinalStep = stepIndex >= simulation.steps.length - 1

  return (
    <div className="space-y-4">
      {/* Cabeçalho com classificação AFD vs AFN */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                classification.isDFA
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              }`}
            >
              {classification.isDFA
                ? 'AFD — Autômato Finito Determinístico'
                : 'AFN — Autômato Finito Não-Determinístico'}
            </span>
          </div>

          <span className="text-xs text-slate-400">
            Seção 2.1 do PDF — Simulador passo a passo
          </span>
        </div>

        {!classification.isDFA && classification.reasons.length > 0 && (
          <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-950/20 px-3 py-2 text-xs text-amber-200/90">
            <strong>Por que é um AFN?</strong> {classification.reasons.join(' ')}
          </div>
        )}

        {/* Entrada da cadeia e controles */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Cadeia de entrada <code className="text-indigo-300">w</code> (vazio = ε):
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite a cadeia (ex: abaa)"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-end gap-1.5">
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false)
                setStepIndex(0)
              }}
              className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"
              title="Reiniciar"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={stepIndex <= 0}
              onClick={() => {
                setIsPlaying(false)
                setStepIndex((s) => Math.max(0, s - 1))
              }}
              className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
              title="Passo anterior"
            >
              <StepBack className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (isAtFinalStep) setStepIndex(0)
                setIsPlaying((p) => !p)
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              <Play className="h-4 w-4" />
              {isPlaying ? 'Pausar' : 'Simular'}
            </button>
            <button
              type="button"
              disabled={isAtFinalStep}
              onClick={() => {
                setIsPlaying(false)
                setStepIndex((s) => Math.min(simulation.steps.length - 1, s + 1))
              }}
              className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
              title="Próximo passo"
            >
              <StepForward className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={isAtFinalStep}
              onClick={() => {
                setIsPlaying(false)
                setStepIndex(simulation.steps.length - 1)
              }}
              className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
              title="Ir para o fim"
            >
              <FastForward className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Fita visual da cadeia de entrada */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span>
              Passo {stepIndex} de {Math.max(0, simulation.steps.length - 1)}
            </span>
            <span className="font-mono">
              Lido: &quot;{currentStep?.consumedPrefix || 'ε'}&quot; | Restante: &quot;
              {currentStep?.remainingInput || 'ε'}&quot;
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 p-2.5">
            {input.length === 0 ? (
              <span className="px-2 py-1 font-mono text-xs text-slate-400">
                Cadeia vazia (ε)
              </span>
            ) : (
              Array.from(input).map((ch, idx) => {
                const isConsumed = idx < stepIndex - 1
                const isJustRead = idx === stepIndex - 1
                return (
                  <span
                    key={idx}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded font-mono text-sm font-bold transition ${
                      isJustRead
                        ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300'
                        : isConsumed
                          ? 'bg-slate-800/70 text-slate-500 line-through'
                          : 'bg-slate-900 text-slate-200 border border-slate-700'
                    }`}
                  >
                    {ch}
                  </span>
                )
              })
            )}

            <div className="ml-auto flex items-center gap-2">
              {simulation.accepted ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  CADEIA ACEITA
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 px-3 py-1 text-xs font-semibold text-rose-300">
                  <XCircle className="h-4 w-4" />
                  CADEIA REJEITADA
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Estado interno do Simulador (exatamente como pedido na Seção 2.1 do PDF) */}
        {currentStep && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-1.5">
                {classification.isDFA
                  ? 'Variáveis do Simulador de AFD (Pág. 3)'
                  : 'Explicação do Passo Atual'}
              </div>
              {classification.isDFA ? (
                <ul className="space-y-1 text-xs text-slate-300 font-mono">
                  <li>
                    1. estadoAtual ={' '}
                    <span className="text-amber-300 font-bold">
                      {currentStep.copies[0]?.stateLabel ?? '∅ (travado)'}
                    </span>
                  </li>
                  <li>
                    2. entradaRestante ={' '}
                    <span className="text-emerald-300">
                      &quot;{currentStep.remainingInput || 'ε'}&quot;
                    </span>
                  </li>
                </ul>
              ) : null}
              <p className="mt-2 text-xs text-slate-300">{currentStep.explanation}</p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-300">
                  <Layers className="h-3.5 w-3.5" />
                  Lista de Cópias Ativas ({currentStep.copies.length})
                </span>
              </div>
              {currentStep.copies.length === 0 ? (
                <p className="text-xs text-rose-400">
                  Nenhuma cópia ativa — todas as ramificações morreram.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-28 overflow-y-auto">
                  {currentStep.copies.map((copy) => (
                    <div
                      key={copy.copyId}
                      className="flex items-center justify-between rounded bg-slate-900 px-2.5 py-1 text-xs font-mono"
                    >
                      <span className="text-amber-300 font-semibold">
                        Cópia {copy.copyId}: estado {copy.stateLabel}
                      </span>
                      <span className="text-slate-400">
                        trilha: {copy.history.join(' → ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bateria rápida de casos de teste */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2.5">
          Bateria de Testes Rápidos (Clique para simular passo a passo)
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {batchWords.map((w) => {
            const res = simulateAutomaton(automaton, w)
            const isSelected = w === input
            return (
              <button
                key={w}
                type="button"
                onClick={() => setInput(w)}
                className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 font-mono text-xs transition ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-950/60 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span>&quot;{w || 'ε'}&quot;</span>
                <span
                  className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-sans font-semibold ${
                    res.accepted
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {res.accepted ? 'ACEITA' : 'REJEITA'}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
