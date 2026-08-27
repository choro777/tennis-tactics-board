import type { PlacedCharacter } from '../../types'
import { SIZES, toUnits } from '../../lib/board'
import { getCharacter, placeholderColor, placeholderLabel } from '../../data/characters'
import { markImageFailed, useImageFailed } from '../../lib/imageStatus'

const SIDE_RING: Record<string, string> = {
  self: '#0ea5e9',
  opponent: '#ef4444',
}

/**
 * コート上のキャラクター。
 * 仕様どおり、名前・プレイヤー名・チーム名は表示しません（画像のみ）。
 * サイズ固定・回転なし。
 */
export function CharacterShape({
  placed,
  interactive,
}: {
  placed: PlacedCharacter
  interactive: boolean
}) {
  const character = getCharacter(placed.characterId)
  const src = character?.image ?? ''
  const failed = useImageFailed(src)
  const u = toUnits(placed)
  const r = SIZES.characterRadius
  const ring = SIDE_RING[placed.side] ?? '#0ea5e9'

  return (
    <g
      data-id={placed.id}
      data-type="character"
      style={interactive ? { cursor: 'move' } : undefined}
    >
      {interactive && <circle cx={u.x} cy={u.y} r={r + 8} fill="rgba(0,0,0,0)" />}
      <circle cx={u.x} cy={u.y} r={r} fill="#ffffff" stroke={ring} strokeWidth={7} />
      {!failed && src ? (
        <>
          <clipPath id={`clip-${placed.id}`}>
            <circle cx={u.x} cy={u.y} r={r - 4} />
          </clipPath>
          <image
            href={src}
            x={u.x - (r - 4)}
            y={u.y - (r - 4)}
            width={(r - 4) * 2}
            height={(r - 4) * 2}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#clip-${placed.id})`}
            onError={() => markImageFailed(src)}
          />
        </>
      ) : (
        <>
          <circle cx={u.x} cy={u.y} r={r - 5} fill={placeholderColor(placed.characterId)} />
          <text
            x={u.x}
            y={u.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={r * 0.95}
            fontWeight={700}
            fill="#ffffff"
            style={{ fontFamily: 'system-ui, sans-serif' }}
          >
            {placeholderLabel(placed.characterId)}
          </text>
        </>
      )}
    </g>
  )
}

export function CharacterLayer({
  characters,
  interactive,
}: {
  characters: PlacedCharacter[]
  interactive: boolean
}) {
  return (
    <g data-layer="character">
      {characters.map((c) => (
        <CharacterShape key={c.id} placed={c} interactive={interactive} />
      ))}
    </g>
  )
}
