import { create } from 'zustand'
import type {
  Ball,
  Drawing,
  GameMode,
  Movement,
  PenWidth,
  PlacedCharacter,
  Point,
  Scene,
  SelectionRef,
  Shot,
  ShotPower,
  ShotType,
  Side,
  TextItem,
  Tool,
} from '../types'
import { SIZES, ZOOM_MAX, ZOOM_MIN, clamp01 } from '../lib/board'

const emptyScene = (): Scene => ({
  characters: [],
  balls: [],
  shots: [],
  movements: [],
  drawings: [],
  texts: [],
})

const cloneScene = (s: Scene): Scene => ({
  characters: s.characters.map((o) => ({ ...o })),
  balls: s.balls.map((o) => ({ ...o })),
  shots: s.shots.map((o) => ({ ...o, start: { ...o.start }, end: { ...o.end } })),
  movements: s.movements.map((o) => ({ ...o, start: { ...o.start }, end: { ...o.end } })),
  drawings: s.drawings.map((o) => ({ ...o, points: o.points.map((p) => ({ ...p })) })),
  texts: s.texts.map((o) => ({ ...o })),
})

const HISTORY_LIMIT = 80

export interface ShotSettings {
  type: ShotType
  power: ShotPower
  curve: number
}

export interface PenSettings {
  color: string
  /** ハイライトペン専用の色（通常のペンと分けて覚えておく） */
  highlightColor: string
  width: PenWidth
}

export interface ViewState {
  zoom: number
  panX: number
  panY: number
}

interface BoardState {
  mode: GameMode
  modeChosen: boolean
  tool: Tool
  scene: Scene
  selection: SelectionRef | null
  pendingCharacterId: string | null
  shotSettings: ShotSettings
  penSettings: PenSettings
  textSettings: { fontSize: number; color: string }
  view: ViewState
  past: Scene[]
  future: Scene[]
  notice: string | null

  // --- 基本操作 ---
  setMode: (mode: GameMode) => void
  confirmMode: () => void
  setTool: (tool: Tool) => void
  setSelection: (ref: SelectionRef | null) => void
  setPendingCharacter: (id: string | null) => void
  setShotSettings: (patch: Partial<ShotSettings>) => void
  setPenSettings: (patch: Partial<PenSettings>) => void
  setTextSettings: (patch: Partial<{ fontSize: number; color: string }>) => void
  setNotice: (message: string | null) => void

  // --- 履歴 ---
  pushHistory: () => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  clearBoard: () => void

  // --- 盤面の編集 ---
  addCharacter: (characterId: string, point: Point, side?: Side) => boolean
  setCharacterSide: (id: string, side: Side) => void
  addBall: (point: Point) => void
  addShot: (shot: Omit<Shot, 'id'>) => string
  updateShot: (id: string, patch: Partial<Omit<Shot, 'id'>>) => void
  addMovement: (movement: Omit<Movement, 'id'>) => string
  addDrawing: (drawing: Omit<Drawing, 'id'>) => string
  addText: (text: Omit<TextItem, 'id'>) => string
  updateText: (id: string, patch: Partial<Omit<TextItem, 'id'>>) => void
  updateDrawing: (id: string, patch: Partial<Omit<Drawing, 'id' | 'points'>>) => void
  moveObjectTo: (ref: SelectionRef, point: Point) => void
  translateObject: (ref: SelectionRef, dx: number, dy: number) => void
  setEndpoint: (ref: SelectionRef, which: 'start' | 'end', point: Point) => void
  deleteObject: (ref: SelectionRef) => void

  // --- 表示 ---
  setView: (patch: Partial<ViewState>) => void
  zoomAt: (factor: number, focusX: number, focusY: number) => void
  resetView: () => void
}

let idCounter = 0
const nextId = (prefix: string) => {
  idCounter += 1
  return `${prefix}_${idCounter.toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export const useBoardStore = create<BoardState>((set, get) => ({
  mode: 'singles',
  modeChosen: false,
  tool: 'select',
  scene: emptyScene(),
  selection: null,
  pendingCharacterId: null,
  shotSettings: { type: 'topspin', power: 'strong', curve: 0 },
  penSettings: { color: '#111827', highlightColor: '#fde047', width: 'medium' },
  textSettings: { fontSize: SIZES.textSize.medium, color: '#111827' },
  view: { zoom: 1, panX: 0, panY: 0 },
  past: [],
  future: [],
  notice: null,

  setMode: (mode) => {
    const state = get()
    const limit = mode === 'singles' ? 1 : 2
    // モード変更で人数がはみ出す場合は、超過分を後ろから外す
    const past = [...state.past, cloneScene(state.scene)].slice(-HISTORY_LIMIT)
    const keep: PlacedCharacter[] = []
    const count: Record<Side, number> = { self: 0, opponent: 0 }
    for (const c of state.scene.characters) {
      if (count[c.side] < limit) {
        keep.push(c)
        count[c.side] += 1
      }
    }
    const changed = keep.length !== state.scene.characters.length
    set({
      mode,
      modeChosen: true,
      past: changed ? past : state.past,
      future: changed ? [] : state.future,
      scene: changed ? { ...state.scene, characters: keep } : state.scene,
      notice: changed ? 'モード変更にともない、はみ出したキャラクターを外しました' : null,
    })
  },

  confirmMode: () => set({ modeChosen: true }),

  setTool: (tool) =>
    set((s) => ({
      tool,
      selection: tool === 'select' ? s.selection : null,
      notice: null,
    })),

  setSelection: (ref) => set({ selection: ref }),

  setPendingCharacter: (id) => set({ pendingCharacterId: id, tool: id ? 'character' : 'select' }),

  setShotSettings: (patch) => {
    set((s) => ({ shotSettings: { ...s.shotSettings, ...patch } }))
    // 選択中の配球があれば、その場で反映する
    const { selection } = get()
    if (selection?.type === 'shot') {
      get().pushHistory()
      get().updateShot(selection.id, patch)
    }
  },

  setPenSettings: (patch) => set((s) => ({ penSettings: { ...s.penSettings, ...patch } })),

  setTextSettings: (patch) => {
    set((s) => ({ textSettings: { ...s.textSettings, ...patch } }))
    const { selection } = get()
    if (selection?.type === 'text') {
      get().pushHistory()
      get().updateText(selection.id, patch)
    }
  },

  setNotice: (message) => set({ notice: message }),

  pushHistory: () =>
    set((s) => ({
      past: [...s.past, cloneScene(s.scene)].slice(-HISTORY_LIMIT),
      future: [],
    })),

  undo: () =>
    set((s) => {
      if (s.past.length === 0) return {}
      const previous = s.past[s.past.length - 1]
      return {
        past: s.past.slice(0, -1),
        future: [cloneScene(s.scene), ...s.future].slice(0, HISTORY_LIMIT),
        scene: previous,
        selection: null,
      }
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0) return {}
      const next = s.future[0]
      return {
        past: [...s.past, cloneScene(s.scene)].slice(-HISTORY_LIMIT),
        future: s.future.slice(1),
        scene: next,
        selection: null,
      }
    }),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  clearBoard: () => {
    get().pushHistory()
    set({ scene: emptyScene(), selection: null, notice: null })
  },

  addCharacter: (characterId, point, side) => {
    const state = get()
    const resolvedSide: Side = side ?? (point.y >= 0.5 ? 'self' : 'opponent')
    const limit = state.mode === 'singles' ? 1 : 2
    const current = state.scene.characters.filter((c) => c.side === resolvedSide).length
    if (current >= limit) {
      set({
        notice:
          resolvedSide === 'self'
            ? `自分側は${limit}体までです（${state.mode === 'singles' ? 'シングルス' : 'ダブルス'}）`
            : `相手側は${limit}体までです（${state.mode === 'singles' ? 'シングルス' : 'ダブルス'}）`,
      })
      return false
    }
    const placed: PlacedCharacter = {
      id: nextId('pc'),
      characterId,
      side: resolvedSide,
      x: clamp01(point.x),
      y: clamp01(point.y),
    }
    get().pushHistory()
    set((s) => ({
      scene: { ...s.scene, characters: [...s.scene.characters, placed] },
      selection: { type: 'character', id: placed.id },
      notice: null,
    }))
    return true
  },

  setCharacterSide: (id, side) => {
    const state = get()
    const limit = state.mode === 'singles' ? 1 : 2
    const others = state.scene.characters.filter((c) => c.id !== id && c.side === side).length
    if (others >= limit) {
      set({ notice: `${side === 'self' ? '自分' : '相手'}側は${limit}体までです` })
      return
    }
    get().pushHistory()
    set((s) => ({
      scene: {
        ...s.scene,
        characters: s.scene.characters.map((c) => (c.id === id ? { ...c, side } : c)),
      },
      notice: null,
    }))
  },

  addBall: (point) => {
    const ball: Ball = { id: nextId('ball'), x: clamp01(point.x), y: clamp01(point.y) }
    get().pushHistory()
    set((s) => ({ scene: { ...s.scene, balls: [...s.scene.balls, ball] } }))
  },

  addShot: (shot) => {
    const created: Shot = { ...shot, id: nextId('shot') }
    get().pushHistory()
    set((s) => ({ scene: { ...s.scene, shots: [...s.scene.shots, created] } }))
    return created.id
  },

  updateShot: (id, patch) =>
    set((s) => ({
      scene: {
        ...s.scene,
        shots: s.scene.shots.map((sh) => (sh.id === id ? { ...sh, ...patch } : sh)),
      },
    })),

  addMovement: (movement) => {
    const created: Movement = { ...movement, id: nextId('move') }
    get().pushHistory()
    set((s) => ({ scene: { ...s.scene, movements: [...s.scene.movements, created] } }))
    return created.id
  },

  addDrawing: (drawing) => {
    const created: Drawing = { ...drawing, id: nextId('draw') }
    get().pushHistory()
    set((s) => ({ scene: { ...s.scene, drawings: [...s.scene.drawings, created] } }))
    return created.id
  },

  addText: (text) => {
    const created: TextItem = { ...text, id: nextId('text') }
    get().pushHistory()
    set((s) => ({ scene: { ...s.scene, texts: [...s.scene.texts, created] } }))
    return created.id
  },

  updateText: (id, patch) =>
    set((s) => ({
      scene: {
        ...s.scene,
        texts: s.scene.texts.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      },
    })),

  updateDrawing: (id, patch) => {
    get().pushHistory()
    set((s) => ({
      scene: {
        ...s.scene,
        drawings: s.scene.drawings.map((d) => (d.id === id ? { ...d, ...patch } : d)),
      },
    }))
  },

  moveObjectTo: (ref, point) => {
    const x = clamp01(point.x)
    const y = clamp01(point.y)
    set((s) => {
      const scene = s.scene
      switch (ref.type) {
        case 'character':
          return {
            scene: {
              ...scene,
              characters: scene.characters.map((c) => (c.id === ref.id ? { ...c, x, y } : c)),
            },
          }
        case 'ball':
          return {
            scene: {
              ...scene,
              balls: scene.balls.map((b) => (b.id === ref.id ? { ...b, x, y } : b)),
            },
          }
        case 'text':
          return {
            scene: {
              ...scene,
              texts: scene.texts.map((t) => (t.id === ref.id ? { ...t, x, y } : t)),
            },
          }
        default:
          return {}
      }
    })
  },

  translateObject: (ref, dx, dy) =>
    set((s) => {
      const scene = s.scene
      const shift = (p: Point): Point => ({ x: clamp01(p.x + dx), y: clamp01(p.y + dy) })
      switch (ref.type) {
        case 'character':
          return {
            scene: {
              ...scene,
              characters: scene.characters.map((c) =>
                c.id === ref.id ? { ...c, ...shift(c) } : c,
              ),
            },
          }
        case 'ball':
          return {
            scene: {
              ...scene,
              balls: scene.balls.map((b) => (b.id === ref.id ? { ...b, ...shift(b) } : b)),
            },
          }
        case 'text':
          return {
            scene: {
              ...scene,
              texts: scene.texts.map((t) => (t.id === ref.id ? { ...t, ...shift(t) } : t)),
            },
          }
        case 'shot':
          return {
            scene: {
              ...scene,
              shots: scene.shots.map((sh) =>
                sh.id === ref.id ? { ...sh, start: shift(sh.start), end: shift(sh.end) } : sh,
              ),
            },
          }
        case 'movement':
          return {
            scene: {
              ...scene,
              movements: scene.movements.map((mv) =>
                mv.id === ref.id ? { ...mv, start: shift(mv.start), end: shift(mv.end) } : mv,
              ),
            },
          }
        case 'drawing':
          return {
            scene: {
              ...scene,
              drawings: scene.drawings.map((d) =>
                d.id === ref.id ? { ...d, points: d.points.map(shift) } : d,
              ),
            },
          }
        default:
          return {}
      }
    }),

  setEndpoint: (ref, which, point) =>
    set((s) => {
      const p = { x: clamp01(point.x), y: clamp01(point.y) }
      if (ref.type === 'shot') {
        return {
          scene: {
            ...s.scene,
            shots: s.scene.shots.map((sh) =>
              sh.id === ref.id
                ? which === 'start'
                  ? { ...sh, start: p }
                  : { ...sh, end: p }
                : sh,
            ),
          },
        }
      }
      if (ref.type === 'movement') {
        return {
          scene: {
            ...s.scene,
            movements: s.scene.movements.map((mv) =>
              mv.id === ref.id
                ? which === 'start'
                  ? { ...mv, start: p }
                  : { ...mv, end: p }
                : mv,
            ),
          },
        }
      }
      return {}
    }),

  deleteObject: (ref) => {
    get().pushHistory()
    set((s) => {
      const scene = s.scene
      const next: Scene = {
        characters:
          ref.type === 'character' ? scene.characters.filter((o) => o.id !== ref.id) : scene.characters,
        balls: ref.type === 'ball' ? scene.balls.filter((o) => o.id !== ref.id) : scene.balls,
        shots: ref.type === 'shot' ? scene.shots.filter((o) => o.id !== ref.id) : scene.shots,
        movements:
          ref.type === 'movement' ? scene.movements.filter((o) => o.id !== ref.id) : scene.movements,
        drawings:
          ref.type === 'drawing' ? scene.drawings.filter((o) => o.id !== ref.id) : scene.drawings,
        texts: ref.type === 'text' ? scene.texts.filter((o) => o.id !== ref.id) : scene.texts,
      }
      return {
        scene: next,
        selection: s.selection?.id === ref.id ? null : s.selection,
      }
    })
  },

  setView: (patch) => set((s) => ({ view: { ...s.view, ...patch } })),

  zoomAt: (factor, focusX, focusY) =>
    set((s) => {
      const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, s.view.zoom * factor))
      const applied = zoom / s.view.zoom
      return {
        view: {
          zoom,
          panX: focusX - (focusX - s.view.panX) * applied,
          panY: focusY - (focusY - s.view.panY) * applied,
        },
      }
    }),

  resetView: () => set({ view: { zoom: 1, panX: 0, panY: 0 } }),
}))

export const characterLimit = (mode: GameMode) => (mode === 'singles' ? 1 : 2)
