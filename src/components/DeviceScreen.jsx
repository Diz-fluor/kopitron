// Точечный экран K-02 поверх рендера. Сетка 18×13 (4:3) лежит в той же проекции, что экран на фото:
// координаты — в пикселях рендера 427×427 (как фрейм «Экспорт · kopitron-k02» в Figma).
// Лица — те же, что у KopitronFace (компонент 129:6163), каждая точка лица = блок 2×2.

const SIZE = 427
const COLS = 18
const ROWS = 13
const PAD = 0.5 // отступ сетки от края стекла, в клетках

// Углы экрана на рендере: верх-лево, верх-право, низ-право, низ-лево
const TL = [101.68, 119.6]
const TR = [349.08, 132.45]
const BR = [349.28, 317.52]
const BL = [101.98, 290.5]

const RADIUS = 5 // скругление панели, как у стекла на рендере
const BLEED = 0.3 // панель чуть заходит под рамку, чтобы не просвечивал край стекла

const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
const point = (u, v) => lerp(lerp(TL, TR, u), lerp(BL, BR, u), v)
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])

// Панель: расширенный четырёхугольник со скруглёнными углами (обводка с круглыми стыками)
const center = [(TL[0] + TR[0] + BR[0] + BL[0]) / 4, (TL[1] + TR[1] + BR[1] + BL[1]) / 4]
const shift = (p, by) => {
  const dx = p[0] - center[0]
  const dy = p[1] - center[1]
  const l = Math.hypot(dx, dy)
  return [p[0] + (dx / l) * by, p[1] + (dy / l) * by]
}
const PANEL = [TL, TR, BR, BL]
  .map((p) => shift(p, BLEED * 1.41 - RADIUS * 1.41))
  .map((p) => p.map((n) => n.toFixed(2)).join(','))
  .join(' ')

// Сетка точек с размером под перспективу
const U = (c) => (c + PAD) / (COLS + 2 * PAD)
const V = (r) => (r + PAD) / (ROWS + 2 * PAD)
const DOTS = []
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const u = U(c + 0.5)
    const v = V(r + 0.5)
    const [x, y] = point(u, v)
    const rx = (dist(point(U(c + 1), v), point(U(c), v)) * 0.66) / 2
    const ry = (dist(point(u, V(r + 1)), point(u, V(r))) * 0.62) / 2
    DOTS.push({ key: r * COLS + c, x, y, rx, ry })
  }
}

// Лицо в клетках 7×4 внутри головы KopitronFace: [колонка, строка]
const EYES = [[1, 1], [5, 1]]
const MOUTH = [[2, 3], [3, 3], [4, 3]]

const FACES = {
  sleep: { cells: [...EYES, ...MOUTH], closed: true, color: 'var(--color-kopitron-sleep)' },
  awake: { cells: [...EYES, ...MOUTH], color: 'var(--color-text)' },
  blink: { cells: [...EYES, ...MOUTH], closed: true, color: 'var(--color-text)' },
  attention: { cells: [...EYES, ...MOUTH], color: 'var(--color-accent)' },
  waiting: { cells: [...EYES, [2, 2], [3, 2], [4, 2], [2, 3], [4, 3]], color: 'var(--color-accent)' },
  wink: { cells: [[1, 1], [4, 1], [5, 1], [1, 2], [5, 2]], color: 'var(--color-accent)' },
  joy: { cells: [[1, 1], [4, 1], [5, 1], [1, 2], [5, 2], ...MOUTH], color: 'var(--color-accent)' },
  sad: { cells: [...EYES, [2, 2], [3, 2], [4, 2], [1, 3], [5, 3]], color: 'var(--color-text-secondary)' },
}

// Клетка лица → блок 2×2 на сетке 18×13; лицо по центру экрана.
// Закрытые глаза — только нижний ряд блока.
function litCells({ cells, closed }) {
  const on = new Set()
  for (const [j, i] of cells) {
    for (let a = 0; a < 2; a++) {
      if (closed && i === 1 && a === 0) continue
      for (let b = 0; b < 2; b++) on.add((1 + 2 * i + a) * COLS + (2 + 2 * j + b))
    }
  }
  return on
}
const LIT = Object.fromEntries(Object.entries(FACES).map(([k, f]) => [k, litCells(f)]))

export const DEVICE_EMOTIONS = Object.keys(FACES)

export default function DeviceScreen({ emotion = 'awake' }) {
  const face = FACES[emotion] ?? FACES.awake
  const lit = LIT[emotion] ?? LIT.awake
  return (
    <svg className="device-screen" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
      <polygon
        points={PANEL}
        fill="#0d0d0d"
        stroke="#0d0d0d"
        strokeWidth={RADIUS * 2}
        strokeLinejoin="round"
      />
      {DOTS.map((d) => (
        <ellipse
          key={d.key}
          cx={d.x.toFixed(2)}
          cy={d.y.toFixed(2)}
          rx={d.rx.toFixed(2)}
          ry={d.ry.toFixed(2)}
          fill={lit.has(d.key) ? face.color : '#262626'}
          className="device-screen__dot"
        />
      ))}
    </svg>
  )
}
