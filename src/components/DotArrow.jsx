// Стрелка из точек: на главной кнопке и на ползунке свайпа
const CELLS = [[3, 0], [4, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [4, 3], [3, 4]]

export default function DotArrow({ color = 'var(--color-text-on-accent)' }) {
  return (
    <svg width="24" height="17" viewBox="0 0 24 17" aria-hidden="true" style={{ display: 'block' }}>
      {CELLS.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={1.5 + x * 3.4} cy={1.5 + y * 3.5} r={1.5} fill={color} />
      ))}
    </svg>
  )
}
