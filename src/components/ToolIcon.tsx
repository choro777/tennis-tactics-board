import type { Tool } from '../types'

/** ツールバー用のシンプルなラインアイコン */
export function ToolIcon({ tool }: { tool: Tool }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (tool) {
    case 'select':
      return (
        <svg {...common}>
          <path d="M5 3l6.5 16 2.2-6.3L20 10.5z" />
        </svg>
      )
    case 'character':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.6" />
          <path d="M4.5 20c1.4-3.6 4.2-5.4 7.5-5.4S18.1 16.4 19.5 20" />
        </svg>
      )
    case 'ball':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M4.6 9.2c4 .6 6.6 3.2 7.4 7M19.4 9.2c-4 .6-6.6 3.2-7.4 7" />
        </svg>
      )
    case 'shot':
      return (
        <svg {...common}>
          <path d="M4 19C7 9 13 5 20 5" />
          <path d="M20 5l-4.6.6M20 5l-.6 4.6" />
          <circle cx="4" cy="19" r="1.8" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'movement':
      return (
        <svg {...common}>
          <path d="M5 19L17 7" strokeDasharray="3.5 3" />
          <path d="M17 7h-5M17 7v5" />
        </svg>
      )
    case 'pen':
      return (
        <svg {...common}>
          <path d="M4 20l1-4L16 5l3 3L8 19z" />
          <path d="M14.5 6.5l3 3" />
        </svg>
      )
    case 'highlight':
      return (
        <svg {...common}>
          <path d="M6 15l7-7 3.5 3.5-7 7H6z" />
          <path d="M4 20h9" strokeWidth="3" />
        </svg>
      )
    case 'arrow':
      return (
        <svg {...common}>
          <path d="M4 20L20 4" />
          <path d="M20 4h-6M20 4v6" />
        </svg>
      )
    case 'line':
      return (
        <svg {...common}>
          <path d="M4 20L20 4" />
        </svg>
      )
    case 'circle':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      )
    case 'rectangle':
      return (
        <svg {...common}>
          <rect x="4" y="6" width="16" height="12" rx="1.5" />
        </svg>
      )
    case 'text':
      return (
        <svg {...common}>
          <path d="M5 6h14M12 6v13M9 19h6" />
        </svg>
      )
    case 'eraser':
      return (
        <svg {...common}>
          <path d="M8 20l-4-4a1.6 1.6 0 010-2.3l8-8a1.6 1.6 0 012.3 0l4 4a1.6 1.6 0 010 2.3L14 20z" />
          <path d="M9 20h11" />
        </svg>
      )
    default:
      return null
  }
}
