// Точечная картинка по клеткам «x,y x,y …»: иконки таб-бара, табло дней, шкалы
export default function DotGrid({ cols, rows, cells, dim, size, dot, step, color = 'currentColor', dimColor }) {
  const lit = new Set(cells.trim().split(/\s+/))
  const w = (cols - 1) * step + dot
  const h = (rows - 1) * step + dot
  const out = []
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const on = lit.has(`${x},${y}`)
      if (!on && !dim) continue
      out.push(<circle key={`${x}-${y}`} cx={dot / 2 + x * step} cy={dot / 2 + y * step} r={dot / 2} fill={on ? color : dimColor} />)
    }
  return (
    <svg width={size?.[0] ?? w} height={size?.[1] ?? h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
      {out}
    </svg>
  )
}

// Цифры 5×7 для табло «дней до покупки» (ноль перечёркнут, как в Figma)
const DIGITS = {
  0: '1,0 2,0 3,0 0,1 4,1 0,2 3,2 4,2 0,3 2,3 4,3 0,4 1,4 4,4 0,5 4,5 1,6 2,6 3,6',
  1: '2,0 1,1 2,1 2,2 2,3 2,4 2,5 1,6 2,6 3,6',
  2: '1,0 2,0 3,0 0,1 4,1 4,2 3,3 2,4 1,5 0,6 1,6 2,6 3,6 4,6',
  3: '0,0 1,0 2,0 3,0 4,0 3,1 2,2 3,3 4,4 0,5 4,5 1,6 2,6 3,6',
  4: '3,0 2,1 3,1 1,2 3,2 0,3 3,3 0,4 1,4 2,4 3,4 4,4 3,5 3,6',
  5: '0,0 1,0 2,0 3,0 4,0 0,1 0,2 1,2 2,2 3,2 4,3 4,4 0,5 4,5 1,6 2,6 3,6',
  6: '2,0 3,0 1,1 0,2 0,3 1,3 2,3 3,3 0,4 4,4 0,5 4,5 1,6 2,6 3,6',
  7: '0,0 1,0 2,0 3,0 4,0 4,1 3,2 2,3 1,4 1,5 1,6',
  8: '1,0 2,0 3,0 0,1 4,1 0,2 4,2 1,3 2,3 3,3 0,4 4,4 0,5 4,5 1,6 2,6 3,6',
  9: '1,0 2,0 3,0 0,1 4,1 0,2 4,2 1,3 2,3 3,3 4,3 4,4 3,5 1,6 2,6',
}

export function DotNumber({ value, digits = 2, dot = 9, step = 12, color = 'var(--color-text)', dimColor = 'var(--color-bg)' }) {
  const s = String(Math.max(0, value)).padStart(digits, '0').slice(-digits)
  const cells = [...s].flatMap((d, i) => DIGITS[d].split(' ').map((c) => {
    const [x, y] = c.split(',').map(Number)
    return `${x + i * 6},${y}`
  }))
  return <DotGrid cols={digits * 6 - 1} rows={7} cells={cells.join(' ')} dim dot={dot} step={step} color={color} dimColor={dimColor} />
}
