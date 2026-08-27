import type { TextItem } from '../../types'
import { toUnits } from '../../lib/board'

export function TextShape({ item, interactive }: { item: TextItem; interactive: boolean }) {
  const u = toUnits(item)
  const lines = item.text.split('\n')
  const lineHeight = item.fontSize * 1.25
  const startY = u.y - ((lines.length - 1) * lineHeight) / 2

  return (
    <g data-id={item.id} data-type="text" style={interactive ? { cursor: 'move' } : undefined}>
      <text
        x={u.x}
        y={startY}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={item.fontSize}
        fontWeight={700}
        fill={item.color}
        stroke="#ffffff"
        strokeWidth={item.fontSize * 0.16}
        paintOrder="stroke"
        strokeLinejoin="round"
        pointerEvents={interactive ? 'all' : 'none'}
        style={{ fontFamily: 'system-ui, "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif' }}
      >
        {lines.map((line, i) => (
          <tspan key={i} x={u.x} dy={i === 0 ? 0 : lineHeight}>
            {line || ' '}
          </tspan>
        ))}
      </text>
    </g>
  )
}

export function TextLayer({ texts, interactive }: { texts: TextItem[]; interactive: boolean }) {
  return (
    <g data-layer="text">
      {texts.map((t) => (
        <TextShape key={t.id} item={t} interactive={interactive} />
      ))}
    </g>
  )
}
