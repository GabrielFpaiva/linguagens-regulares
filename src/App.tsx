import {
  Code2,
  GitCompareArrows,
  PlayCircle,
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
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex flex-col">
      {/* Top Header */}
      <header className="border-b border-black/5 bg-white/75 backdrop-blur-xl sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[17px] font-semibold tracking-[-0.01em] text-neutral-900">
                  Linguagens Regulares
                </h1>
              </div>
              <p className="text-xs text-neutral-500">
                Projeto 1 · Linguagens Formais e Computabilidade · UFPB
              </p>
            </div>
          </div>

          {/* Navegação das Seções do PDF */}
          <nav className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('editor-simulator')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'editor-simulator'
                  ? 'bg-neutral-900 text-white shadow'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              <PlayCircle className="h-3.5 w-3.5" />
              Editor e simulador
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('conversions')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'conversions'
                  ? 'bg-neutral-900 text-white shadow'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              <GitCompareArrows className="h-3.5 w-3.5" />
              Conversões
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('regex')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'regex'
                  ? 'bg-neutral-900 text-white shadow'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              Expressões regulares
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 space-y-5">
        {/* Catálogo de Presets para Demonstração */}
        <section className="rounded-xl border border-neutral-200 bg-white p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700">
              Exemplos
            </div>
            <span className="text-xs text-neutral-500">{currentPreset.sectionRef}</span>
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
                      ? 'border-neutral-900 bg-neutral-100 text-neutral-900 shadow-sm'
                      : 'border-neutral-200 bg-neutral-50/70 text-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <span className="text-xs font-semibold leading-snug">{preset.title}</span>
                  <span className="mt-2 inline-block self-start rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-900">
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
      <footer className="border-t border-neutral-200 bg-neutral-50 py-3 px-4 text-center text-xs text-neutral-400">
        <span className="inline-flex items-center gap-1.5">
          Gabriel Fernandes Paiva · LFC 2026
        </span>
      </footer>
    </div>
  )
}

export default App

