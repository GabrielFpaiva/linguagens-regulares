import type { Automaton } from './types'

const STATE_RADIUS = 28

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Seção 2.2 do PDF: Exporta o autômato em formato gráfico vetorial SVG
 * pronto para inserção em relatórios, artigos LaTeX/Markdown ou apresentações.
 */
export function exportAutomatonToSvg(
  automaton: Automaton,
  width = 860,
  height = 460,
): string {
  const stateMap = new Map(automaton.states.map((s) => [s.id, s]))

  // Agrupa múltiplos símbolos na mesma aresta (from -> to)
  const groupedEdges = new Map<string, { from: string; to: string; symbols: string[] }>()
  for (const t of automaton.transitions) {
    const key = `${t.from}:::${t.to}`
    const existing = groupedEdges.get(key)
    if (existing) {
      if (!existing.symbols.includes(t.symbol)) existing.symbols.push(t.symbol)
    } else {
      groupedEdges.set(key, { from: t.from, to: t.to, symbols: [t.symbol] })
    }
  }

  const edgeElements: string[] = []

  for (const edge of groupedEdges.values()) {
    const fromState = stateMap.get(edge.from)
    const toState = stateMap.get(edge.to)
    if (!fromState || !toState) continue

    const label = escapeXml(edge.symbols.join(', '))

    if (edge.from === edge.to) {
      // Self-loop acima do estado
      const x = fromState.x
      const y = fromState.y
      const startX = x - 12
      const startY = y - STATE_RADIUS + 3
      const endX = x + 12
      const endY = y - STATE_RADIUS + 3
      const ctrl1X = x - 34
      const ctrl1Y = y - STATE_RADIUS - 52
      const ctrl2X = x + 34
      const ctrl2Y = y - STATE_RADIUS - 52

      edgeElements.push(
        `<path d="M ${startX} ${startY} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${endX} ${endY}" fill="none" stroke="#334155" stroke-width="2" marker-end="url(#arrow)" />`,
        `<text x="${x}" y="${y - STATE_RADIUS - 44}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="#0f172a">${label}</text>`,
      )
      continue
    }

    const hasReverse = groupedEdges.has(`${edge.to}:::${edge.from}`)
    const dx = toState.x - fromState.x
    const dy = toState.y - fromState.y
    const dist = Math.hypot(dx, dy) || 1
    const ux = dx / dist
    const uy = dy / dist
    const nx = -uy
    const ny = ux

    const curveOffset = hasReverse ? 28 : 0
    const midX = (fromState.x + toState.x) / 2 + nx * curveOffset
    const midY = (fromState.y + toState.y) / 2 + ny * curveOffset

    // Pontos nas bordas dos círculos
    const startAngle = Math.atan2(midY - fromState.y, midX - fromState.x)
    const endAngle = Math.atan2(toState.y - midY, toState.x - midX)

    const sx = fromState.x + Math.cos(startAngle) * STATE_RADIUS
    const sy = fromState.y + Math.sin(startAngle) * STATE_RADIUS
    const ex = toState.x - Math.cos(endAngle) * (STATE_RADIUS + 5)
    const ey = toState.y - Math.sin(endAngle) * (STATE_RADIUS + 5)

    const labelX = (sx + 2 * midX + ex) / 4 + nx * 12
    const labelY = (sy + 2 * midY + ey) / 4 + ny * 12

    edgeElements.push(
      `<path d="M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${midX.toFixed(1)} ${midY.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none" stroke="#334155" stroke-width="2" marker-end="url(#arrow)" />`,
      `<text x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="#0f172a">${label}</text>`,
    )
  }

  const stateElements: string[] = []
  for (const s of automaton.states) {
    if (s.isInitial) {
      const ix1 = s.x - STATE_RADIUS - 38
      const ix2 = s.x - STATE_RADIUS - 5
      stateElements.push(
        `<line x1="${ix1}" y1="${s.y}" x2="${ix2}" y2="${s.y}" stroke="#4f46e5" stroke-width="2.5" marker-end="url(#arrow-init)" />`,
      )
    }

    stateElements.push(
      `<circle cx="${s.x}" cy="${s.y}" r="${STATE_RADIUS}" fill="#ffffff" stroke="#1e293b" stroke-width="2.2" />`,
    )

    if (s.isAccepting) {
      stateElements.push(
        `<circle cx="${s.x}" cy="${s.y}" r="${STATE_RADIUS - 5}" fill="none" stroke="#1e293b" stroke-width="1.8" />`,
      )
    }

    stateElements.push(
      `<text x="${s.x}" y="${s.y}" text-anchor="middle" dominant-baseline="central" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#0f172a">${escapeXml(s.label)}</text>`,
    )
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#334155" />
    </marker>
    <marker id="arrow-init" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#4f46e5" />
    </marker>
  </defs>
  <rect width="100%" height="100%" fill="#f8fafc" rx="12" />
  ${edgeElements.join('\n  ')}
  ${stateElements.join('\n  ')}
</svg>`
}
