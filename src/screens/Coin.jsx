import { useMemo, useState } from 'react'
import CoinIcon from '../components/CoinIcon.jsx'
import MainButton from '../components/MainButton.jsx'
import { Segments } from './History.jsx'
import { COINS, PORTFOLIO, pct } from '../data/mock.js'
import './Coin.css'

const PERIODS = [
  ['1m', '1М'],
  ['6m', '6М'],
  ['1y', '1Г'],
  ['all', 'Всё'],
]
const LABELS = {
  '1m': ['1', '8', '15', '22', '29'],
  '6m': ['май', 'июн', 'июл', 'авг', 'сен', 'окт'],
  '1y': ['ноя', 'янв', 'мар', 'май', 'июл', 'сен'],
  all: ['2023', '2024', '2025', '2026'],
}
const PLANS = { btc: '$10 каждую пятницу', eth: '$5 каждый понедельник', gram: '$3 раз в месяц' }
const LEVELS = { btc: ['$67,4k', '$63,9k'], eth: ['$2610', '$2480'], gram: ['$1,52', '$1,41'] }

const COLS = 26
const ROWS = 12

// условная цена по столбцам (0 — низ), детерминированно от монеты и периода
function series(seed, period) {
  let s = [...(seed + period)].reduce((a, c) => a + c.charCodeAt(0), 0)
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  const out = []
  let v = 4
  for (let i = 0; i < COLS; i++) {
    v += (rnd() - 0.42) * 2.2 + (i > COLS * 0.55 ? 0.35 : 0)
    v = Math.max(1, Math.min(ROWS - 2, v))
    out.push(Math.round(v))
  }
  out[COLS - 1] = ROWS - 1
  return out
}

function LedChart({ coin, period }) {
  const data = useMemo(() => series(coin, period), [coin, period])
  const avg = Math.round(data.reduce((a, b) => a + b, 0) / data.length)
  const [now, mean] = LEVELS[coin]
  const cells = []
  for (let r = ROWS - 1; r >= 0; r--)
    for (let c = 0; c < COLS; c++) {
      const last = c === COLS - 1
      let cls = ''
      if (data[c] === r) cls = last ? 'is-buy' : c % 2 ? 'is-buy' : 'is-price'
      else if (last && r < data[c]) cls = 'is-tail'
      cells.push(<i key={`${r}-${c}`} className={cls} style={cls ? { animationDelay: `${c * 25}ms` } : undefined} />)
    }
  return (
    <div className="led">
      <div className="led__plot">
        <div className="led__grid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>{cells}</div>
        <span className="led__avg" style={{ bottom: `${((avg + 0.5) / ROWS) * 100}%` }} />
        <span className="led__tag led__tag--now">{now}</span>
        <span className="led__tag" style={{ bottom: `calc(${((avg + 0.5) / ROWS) * 100}% - 10px)` }}>{mean}</span>
      </div>
      <div className="led__axis">
        {LABELS[period].map((l) => <span key={l}>{l}</span>)}
      </div>
    </div>
  )
}

export default function Coin({ coin = 'btc', nav }) {
  const [period, setPeriod] = useState('6m')
  const h = PORTFOLIO.holdings.find((x) => x.coin === coin)
  const c = COINS[coin]

  return (
    <div className="scr">
      <div className="scr__body">
        <header className="coin__head">
          <CoinIcon coin={coin} size={36} />
          <h1 className="title coin__name">{c.name}</h1>
        </header>
        <p className="coin__value num">${h.value}</p>
        <p className="muted coin__sub">
          {h.amount} {c.ticker}, {pct(h.change)} за всё время
        </p>
        <button type="button" className="coin__plan" onClick={() => nav.push('plan', { coin })}>
          <span className="muted">План</span> <span className="accent">{PLANS[coin]} ›</span>
        </button>

        <section className="card card--pad">
          <Segments items={PERIODS} value={period} onChange={setPeriod} className="segments--track" />
          <LedChart coin={coin} period={period} />
        </section>

        <section className="card card--pad">
          <MainButton variant="dark" onClick={() => window.open('https://t.me/wallet', '_blank')}>Открыть в кошельке</MainButton>
          <p className="muted coin__note">1 {c.ticker} в сети TON = 1 {c.ticker} в сети {coin === 'gram' ? 'TON' : c.name}</p>
        </section>
      </div>
    </div>
  )
}
