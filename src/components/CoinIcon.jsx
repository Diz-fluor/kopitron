// Простые знаки монет в тёмном круге (без логотипов брендов)
const GLYPHS = {
  btc: (
    <text x="15" y="20.5" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="15" fill="var(--color-text)">
      ₿
    </text>
  ),
  eth: (
    <g fill="var(--color-text)">
      <path d="M15 6.5 10.2 15 15 17.8 19.8 15Z" />
      <path d="M15 18.9 10.2 16.1 15 23.5 19.8 16.1Z" opacity="0.7" />
    </g>
  ),
  gram: (
    <g fill="var(--color-text)">
      <path d="M9.5 12.5 12 9h6l2.5 3.5L15 21.5Z" />
    </g>
  ),
}

export const COINS = {
  btc: { id: 'btc', name: 'Bitcoin' },
  eth: { id: 'eth', name: 'Ethereum' },
  gram: { id: 'gram', name: 'Gram' },
}

export default function CoinIcon({ coin, size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-label={COINS[coin]?.name} style={{ display: 'block', flexShrink: 0 }}>
      <circle cx="15" cy="15" r="14" fill="var(--color-surface-nested)" stroke="var(--color-surface)" strokeWidth="2" />
      {GLYPHS[coin]}
    </svg>
  )
}

export function CoinStack({ coins }) {
  return (
    <span style={{ display: 'flex' }}>
      {coins.map((c, i) => (
        <span key={c} style={{ marginLeft: i ? -8 : 0 }}>
          <CoinIcon coin={c} />
        </span>
      ))}
    </span>
  )
}
