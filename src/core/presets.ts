import { type Automaton, EPSILON } from './types'

export interface AutomatonPreset {
  id: string
  title: string
  badge: string
  sectionRef: string
  sampleInputs: { accept: string[]; reject: string[] }
  automaton: Automaton
}

export const AUTOMATON_PRESETS: AutomatonPreset[] = [
  {
    id: 'pdf-page-3',
    title: 'Número ímpar de "a"',
    badge: 'AFD · enunciado, p. 3',
    sectionRef: 'Aceita cadeias sobre {a, b} com número ímpar de "a".',
    sampleInputs: {
      accept: ['a', 'ab', 'ba', 'abaa', 'bbab'],
      reject: ['', 'b', 'aa', 'aba', 'abba'],
    },
    automaton: {
      name: 'Número ímpar de "a"',
      description: 'Aceita cadeias com quantidade ímpar de "a".',
      states: [
        { id: 'q0', label: 'q0', x: 250, y: 210, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 550, y: 210, isInitial: false, isAccepting: true },
      ],
      transitions: [
        { id: 't1', from: 'q0', to: 'q1', symbol: 'a' },
        { id: 't2', from: 'q0', to: 'q0', symbol: 'b' },
        { id: 't3', from: 'q1', to: 'q0', symbol: 'a' },
        { id: 't4', from: 'q1', to: 'q1', symbol: 'b' },
      ],
    },
  },
  {
    id: 'nfa-ends-ab',
    title: 'Termina em "ab"',
    badge: 'AFN',
    sectionRef: 'Várias cópias ao mesmo tempo no simulador.',
    sampleInputs: {
      accept: ['ab', 'aab', 'bab', 'aaab', 'abab'],
      reject: ['', 'a', 'b', 'ba', 'aba', 'abb'],
    },
    automaton: {
      name: 'Termina em "ab"',
      description: 'Em q0, ao ler "a", o autômato se divide em duas cópias (q0 e q1).',
      states: [
        { id: 'q0', label: 'q0', x: 180, y: 210, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 420, y: 210, isInitial: false, isAccepting: false },
        { id: 'q2', label: 'q2', x: 660, y: 210, isInitial: false, isAccepting: true },
      ],
      transitions: [
        { id: 't1', from: 'q0', to: 'q0', symbol: 'a' },
        { id: 't2', from: 'q0', to: 'q0', symbol: 'b' },
        { id: 't3', from: 'q0', to: 'q1', symbol: 'a' },
        { id: 't4', from: 'q1', to: 'q2', symbol: 'b' },
      ],
    },
  },
  {
    id: 'nfa-epsilon',
    title: 'a*b* | bc',
    badge: 'AFN-ε',
    sectionRef: 'Tem movimentos vazios (ε).',
    sampleInputs: {
      accept: ['', 'a', 'aa', 'aab', 'b', 'bc'],
      reject: ['ba', 'c', 'abc', 'acb'],
    },
    automaton: {
      name: 'a*b* | bc',
      description: 'Possui transições ε partindo de q0 para dois ramos independentes.',
      states: [
        { id: 'q0', label: 'q0', x: 140, y: 210, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 360, y: 120, isInitial: false, isAccepting: false },
        { id: 'q2', label: 'q2', x: 620, y: 120, isInitial: false, isAccepting: true },
        { id: 'q3', label: 'q3', x: 360, y: 310, isInitial: false, isAccepting: false },
        { id: 'q4', label: 'q4', x: 620, y: 310, isInitial: false, isAccepting: true },
      ],
      transitions: [
        { id: 't1', from: 'q0', to: 'q1', symbol: EPSILON },
        { id: 't2', from: 'q1', to: 'q1', symbol: 'a' },
        { id: 't3', from: 'q1', to: 'q2', symbol: EPSILON },
        { id: 't4', from: 'q2', to: 'q2', symbol: 'b' },
        { id: 't5', from: 'q0', to: 'q3', symbol: 'b' },
        { id: 't6', from: 'q3', to: 'q4', symbol: 'c' },
      ],
    },
  },
  {
    id: 'dfa-redundant-minimization',
    title: 'Estados redundantes',
    badge: 'AFD · 6 estados',
    sectionRef: 'Estados equivalentes ({q1, q2} e {q3, q4}) e um inalcançável (q5).',
    sampleInputs: {
      accept: ['aa', 'ab', 'ba', 'bb', 'aba', 'bab'],
      reject: ['', 'a', 'b'],
    },
    automaton: {
      name: 'Estados redundantes',
      description: 'Aceita cadeias sobre {a, b} de comprimento >= 2.',
      states: [
        { id: 'q0', label: 'q0', x: 130, y: 210, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 340, y: 110, isInitial: false, isAccepting: false },
        { id: 'q2', label: 'q2', x: 340, y: 310, isInitial: false, isAccepting: false },
        { id: 'q3', label: 'q3', x: 590, y: 110, isInitial: false, isAccepting: true },
        { id: 'q4', label: 'q4', x: 590, y: 310, isInitial: false, isAccepting: true },
        { id: 'q5', label: 'q5', x: 130, y: 370, isInitial: false, isAccepting: false },
      ],
      transitions: [
        { id: 't1', from: 'q0', to: 'q1', symbol: 'a' },
        { id: 't2', from: 'q0', to: 'q2', symbol: 'b' },
        { id: 't3', from: 'q1', to: 'q3', symbol: 'a' },
        { id: 't4', from: 'q1', to: 'q4', symbol: 'b' },
        { id: 't5', from: 'q2', to: 'q4', symbol: 'a' },
        { id: 't6', from: 'q2', to: 'q3', symbol: 'b' },
        { id: 't7', from: 'q3', to: 'q3', symbol: 'a' },
        { id: 't8', from: 'q3', to: 'q3', symbol: 'b' },
        { id: 't9', from: 'q4', to: 'q4', symbol: 'a' },
        { id: 't10', from: 'q4', to: 'q4', symbol: 'b' },
        { id: 't11', from: 'q5', to: 'q1', symbol: 'a' },
      ],
    },
  },
  {
    id: 'real-world-onboarding',
    title: 'Cadastro com biometria',
    badge: 'AFD · caso real',
    sectionRef: 'CPF, documento, biometria (com nova tentativa) e aprovação.',
    sampleInputs: {
      accept: ['cdfa', 'cdrfdfa', 'cdffa'],
      reject: ['c', 'cd', 'cdf', 'cdr'],
    },
    automaton: {
      name: 'Cadastro (c=cpf, d=doc, f=face ok, r=recusa, a=aprova)',
      description: 'Mostra como máquinas de estados de sistemas reais são Autômatos Finitos Determinísticos.',
      states: [
        { id: 's0', label: 'Inicio', x: 110, y: 210, isInitial: true, isAccepting: false },
        { id: 's1', label: 'CPF_OK', x: 260, y: 210, isInitial: false, isAccepting: false },
        { id: 's2', label: 'Doc_Env', x: 420, y: 130, isInitial: false, isAccepting: false },
        { id: 's3', label: 'Face_Falhou', x: 420, y: 320, isInitial: false, isAccepting: false },
        { id: 's4', label: 'Em_Analise', x: 590, y: 210, isInitial: false, isAccepting: false },
        { id: 's5', label: 'Conta_Ativa', x: 750, y: 210, isInitial: false, isAccepting: true },
      ],
      transitions: [
        { id: 'w1', from: 's0', to: 's1', symbol: 'c' },
        { id: 'w2', from: 's1', to: 's2', symbol: 'd' },
        { id: 'w3', from: 's2', to: 's4', symbol: 'f' },
        { id: 'w4', from: 's2', to: 's3', symbol: 'r' },
        { id: 'w5', from: 's3', to: 's2', symbol: 'd' },
        { id: 'w6', from: 's3', to: 's4', symbol: 'f' },
        { id: 'w7', from: 's4', to: 's5', symbol: 'a' },
      ],
    },
  },
]

