// Точечное лицо Kopitron. Сетка 9×9, точка 2,8, шаг 3,65 в базе 32×32 — как компонент 129:6163 в Figma.
// Клетки — [колонка, строка].

const HEAD = '0,2 8,2 0,3 8,3 0,4 8,4 0,5 8,5 0,6 8,6 0,7 1,7 2,7 3,7 4,7 5,7 6,7 7,7 8,7 1,8 7,8'
const EARS_EYES = '3,0 4,0 5,0 1,2 2,2 6,2 7,2 2,4 6,4'

const FACES = {
  sleep: { cells: `${HEAD} ${EARS_EYES} 3,6 4,6 5,6`, color: 'var(--color-kopitron-sleep)' },
  awake: { cells: `${HEAD} ${EARS_EYES} 3,6 4,6 5,6`, color: 'var(--color-text)' },
  attention: { cells: `${HEAD} ${EARS_EYES} 3,6 4,6 5,6`, color: 'var(--color-accent)' },
  waiting: { cells: `${HEAD} ${EARS_EYES} 3,5 4,5 5,5 3,6 5,6`, color: 'var(--color-accent)' },
  wink: {
    cells: `${HEAD} 1,2 2,2 3,2 4,2 5,2 6,2 7,2 2,4 5,4 6,4 2,5 6,5`,
    color: 'var(--color-accent)',
  },
  joy: { cells: `${HEAD} 1,2 2,2 6,2 7,2 2,4 5,4 6,4 2,5 6,5 3,6 4,6 5,6`, color: 'var(--color-accent)' },
  sad: { cells: `${HEAD} 1,2 2,2 6,2 7,2 2,4 6,4 3,5 4,5 5,5 2,6 6,6`, color: 'var(--color-text-secondary)' },
}

const parse = (s) => [...new Set(s.trim().split(/\s+/))].map((c) => c.split(',').map(Number))

const STEP = 3.65
const R = 1.4
const OFFSET = 0.4 + R

export default function KopitronFace({ emotion = 'sleep', size = 32, color }) {
  const face = FACES[emotion] ?? FACES.sleep
  const cells = parse(face.cells)
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ display: 'block' }}>
      {cells.map(([x, y]) => (
        <circle
          key={`${x}-${y}`}
          cx={OFFSET + x * STEP}
          cy={OFFSET + y * STEP}
          r={R}
          fill={color ?? face.color}
          style={{ transition: 'fill 200ms ease' }}
        />
      ))}
    </svg>
  )
}
