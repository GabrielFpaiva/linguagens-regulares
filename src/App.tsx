import {
  BookOpen,
  Code2,
  Cpu,
  GitCompareArrows,
  PlayCircle,
  Sparkles,
} from 'lucide-react'
import React, { useState } from 'react'
import { AutomatonCanvas } from './components/AutomatonCanvas'
import { ConversionsPanel } from './components/ConversionsPanel'
import { RegexPanel } from './components/RegexPanel'
import { SimulatorPanel } from './components/SimulatorPanel'
import { AUTOMATON_PRESETS } from './core/presets'
import type { SimulationStep } from './core/simulator'
import type { Automaton } from './core/types'

type MainTab = 'editor-simulator' | 'conversions' | 'regex'

export const App: React.FC = () => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    AUTOMATON_PRESETS[0]!.id,
  )
  const [automaton, setAutomaton] = useState<Automaton>(
    AUTOMATON_PRESETS[0]!.automaton,
  )
  const [activeTab, setActiveTab] = useState<MainTab>('editor-simulator')
  const [activeSimStep, setActiveSimStep] = useState<SimulationStep | null>(null)

  const currentPreset =
    AUTOMATON_PRESETS.find((p) => p.id === selectedPresetId) ?? AUTOMATON_PRESETS[0]!

  const handleSelectPreset = (presetId: string) => {
    const found = AUTOMATON_PRESETS.find((p) => p.id === presetId)
    if (!found) return
    setSelectedPresetId(found.id)
    setAutomaton(found.automaton)
    setActiveSimStep(null)
  }

  const handleLoadGeneratedAutomaton = (target: Automaton) => {
    setAutomaton(target)
    setActiveSimStep(null)
    setActiveTab('editor-simulator')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800/90 bg-slate-900/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white">
                  Estúdio de Linguagens Regulares
                </h1>
                <span className="rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[11px] font-semibold text-indigo-300">
                  Projeto 01 · LFC
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Autômatos Finitos (AFD, AFN, AFN-ε), Minimização e Expressões Regulares — UFPB
              </p>
            </div>
          </div>

          {/* Navegação das Seções do PDF */}
          <nav className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('editor-simulator')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'editor-simulator'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PlayCircle className="h-3.5 w-3.5" />
              2.1 &amp; 2.2 Editor Gráfico + Simulador
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('conversions')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'conversions'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GitCompareArrows className="h-3.5 w-3.5" />
              2.3, 2.4 &amp; 2.6 Conversões e Minimização
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('regex')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'regex'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              2.5 &amp; 2.7 Motor de Expressões Regulares
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 space-y-5">
        {/* Catálogo de Presets para Demonstração */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
              Exemplos Prontos para Simulação e Apresentação
            </div>
            <span className="text-xs text-slate-400">{currentPreset.sectionRef}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {AUTOMATON_PRESETS.map((preset) => {
              const isSelected = preset.id === selectedPresetId
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`flex flex-col justify-between rounded-lg border p-2.5 text-left transition ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/50 text-white shadow-sm'
                      : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs font-semibold leading-snug">{preset.title}</span>
                  <span className="mt-2 inline-block self-start rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-indigo-300">
                    {preset.badge}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Aba 1: Editor Gráfico (2.2) + Simulador de AFD/AFN (2.1) */}
        {activeTab === 'editor-simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-7">
              <AutomatonCanvas
                title={automaton.name ?? 'Editor Gráfico de Autômatos'}
                automaton={automaton}
                onChange={setAutomaton}
                activeStateIds={activeSimStep?.activeStateIds ?? []}
                activeTransitions={activeSimStep?.activeTransitions ?? []}
                height={430}
              />
            </div>

            <div className="lg:col-span-5">
              <SimulatorPanel
                automaton={automaton}
                sampleAccept={currentPreset.sampleInputs.accept}
                sampleReject={currentPreset.sampleInputs.reject}
                onStepChange={setActiveSimStep}
              />
            </div>
          </div>
        )}

        {/* Aba 2: Conversão AFN -> AFD (2.3), Minimização (2.4) e AFN -> ER (2.6) */}
        {activeTab === 'conversions' && (
          <ConversionsPanel
            automaton={automaton}
            testWords={[
              ...currentPreset.sampleInputs.accept,
              ...currentPreset.sampleInputs.reject,
            ]}
            onLoadIntoEditor={handleLoadGeneratedAutomaton}
          />
        )}

        {/* Aba 3: Conversão ER -> AFN (2.5) e Motor de Expressões Regulares (2.7) */}
        {activeTab === 'regex' && (
          <RegexPanel onLoadAutomatonIntoEditor={handleLoadGeneratedAutomaton} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-3 px-4 text-center text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          Linguagens Formais e Computabilidade (UFPB) — Projeto 01: Autômatos Finitos e
          Expressões Regulares
        </span>
      </footer>
    </div>
  )
}

export default App
