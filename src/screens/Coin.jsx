import { useEffect, useMemo, useState } from 'react'
import CoinIcon from '../components/CoinIcon.jsx'
import MainButton from '../components/MainButton.jsx'
import { Segments } from './History.jsx'
import { COINS, PORTFOLIO, pct, money } from '../data/mock.js'
import { useWallet, isDemoWallet } from '../wallet.js'
import { usePortfolio, fmtAmount } from '../api/tonapi.js'
import { fetchChart } from '../api/history.js'
import { useLiveHistory } from './History.jsx'
import { usePlans, planTitle } from '../data/plans.js'
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

const DAY = 86400000
const SPAN = { '1m': 30 * DAY, '6m': 182 * DAY, '1y': 365 * DAY }
const usdShort = (n) => (n >= 10000 ? `$${(n / 1000).toFixed(1).replace('.', ',')}k` : n >= 100 ? `$${Math.round(n)}` : `$${n.toFixed(2).replace('.', ',')}`)

// Настоящий график: курс из TonAPI, оранжевые точки там, где были покупки
function LiveChart({ coin, period, buys }) {
  const [points, setPoints] = useState(null)
  const first = buys.length ? Math.min(...buys.map((b) => b.time)) : Date.now() - 2 * 365 * DAY
  const from = period === 'all' ? Math.min(first, Date.now() - 30 * DAY) : Date.now() - SPAN[period]
  useEffect(() => {
    let alive = true
    setPoints(null)
    fetchChart(coin, from, Date.now(), COLS).then((p) => alive && setPoints(p)).catch(() => alive && setPoints([]))
    return () => { alive = false }
  }, [coin, period])

  if (!points) return <div className="led"><p className="muted led__empty">Загружаем курс</p></div>
  if (points.length < 2) return <div className="led"><p className="muted led__empty">Курс сейчас недоступен</p></div>

  // сводим к COLS столбцам
  const cols = Array.from({ length: COLS }, (_, i) => points[Math.round((i / (COLS - 1)) * (points.length - 1))])
  const prices = cols.map((p) => p[1])
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const row = (v) => (max === min ? Math.floor(ROWS / 2) : Math.round(((v - min) / (max - min)) * (ROWS - 1)))
  const t0 = cols[0][0]
  const step = (cols[COLS - 1][0] - t0) / (COLS - 1) || 1
  const bought = new Set(buys.filter((b) => b.time >= t0 - step / 2).map((b) => Math.min(COLS - 1, Math.round((b.time - t0) / step))))
  const spent = buys.reduce((s, b) => s + b.usd, 0)
  const got = buys.reduce((s, b) => s + b.amount, 0)
  const mean = got ? spent / got : prices.reduce((a, b) => a + b, 0) / prices.length
  const meanRow = Math.max(0, Math.min(ROWS - 1, row(mean)))

  const cells = []
  for (let r = ROWS - 1; r >= 0; r--)
    for (let c = 0; c < COLS; c++) {
      const v = row(prices[c])
      const last = c === COLS - 1
      let cls = ''
      if (v === r) cls = bought.has(c) || last ? 'is-buy' : 'is-price'
      else if (last && r < v) cls = 'is-tail'
      cells.push(<i key={`${r}-${c}`} className={cls} style={cls ? { animationDelay: `${c * 25}ms` } : undefined} />)
    }
  const fmt = period === '1m' ? { day: 'numeric' } : period === 'all' && cols[COLS - 1][0] - t0 > 400 * DAY ? { year: 'numeric' } : { month: 'short' }
  const labels = [0, 0.25, 0.5, 0.75, 1].map((k) => new Date(t0 + k * step * (COLS - 1)).toLocaleDateString('ru-RU', fmt).replace('.', ''))
  return (
    <div className="led">
      <div className="led__plot">
        <div className="led__grid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>{cells}</div>
        <span className="led__avg" style={{ bottom: `${((meanRow + 0.5) / ROWS) * 100}%` }} />
        <span className="led__tag led__tag--now">{usdShort(prices[COLS - 1])}</span>
        <span className="led__tag" style={{ bottom: `calc(${((meanRow + 0.5) / ROWS) * 100}% - 10px)` }}>{usdShort(mean)}</span>
      </div>
      <div className="led__axis">
        {labels.map((l, i) => <span key={i}>{l}</span>)}
      </div>
      <p className="muted led__legend">{got ? 'Пунктир: твоя средняя цена покупки' : 'Пунктир: средний курс за период'}</p>
    </div>
  )
}

export default function Coin({ coin = 'btc', nav }) {
  const [period, setPeriod] = useState('6m')
  const wallet = useWallet()
  const demo = isDemoWallet(wallet)
  const live = usePortfolio(wallet && !demo ? wallet : null)
  const { items } = useLiveHistory()
  const plan = usePlans().find((p) => p.coin === coin)
  const c = COINS[coin]
  const buys = demo ? [] : items.filter((x) => x.coin === coin && !x.pending)
  let h
  if (demo) h = PORTFOLIO.holdings.find((x) => x.coin === coin)
  else {
    const d = live.data?.[coin]
    const invested = buys.reduce((s, b) => s + b.usd, 0)
    const value = d?.value ?? 0
    h = {
      value: Math.round(value * 100) / 100,
      amount: fmtAmount(d?.amount ?? 0),
      change: invested ? Math.round(((value - invested) / invested) * 1000) / 10 : Math.round((d?.change ?? 0) * 10) / 10,
      since: invested ? 'за всё время' : 'за сутки',
    }
  }
  const planText = demo ? PLANS[coin] : plan ? planTitle(plan) + (plan.paused ? ', пауза' : '') : null

  return (
    <div className="scr">
      <div className="scr__body">
        <header className="coin__head">
          <CoinIcon coin={coin} size={36} />
          <h1 className="title coin__name">{c.name}</h1>
        </header>
        <p className="coin__value num">{money(h.value)}</p>
        <p className="muted coin__sub">
          {h.amount} {c.ticker}{h.value > 0 ? `, ${pct(h.change)} ${h.since ?? 'за всё время'}` : ''}
        </p>
        <button type="button" className="coin__plan" onClick={() => nav.push(planText ? 'plan' : 'newplan', { coin })}>
          <span className="muted">План</span> <span className="accent">{planText ?? 'Создать'} ›</span>
        </button>

        <section className="card card--pad">
          <Segments items={PERIODS} value={period} onChange={setPeriod} className="segments--track" />
          {demo ? <LedChart coin={coin} period={period} /> : <LiveChart coin={coin} period={period} buys={buys} />}
        </section>

        <section className="card card--pad">
          <MainButton variant="dark" onClick={() => window.open('https://t.me/wallet', '_blank')}>Открыть в кошельке</MainButton>
          <p className="muted coin__note">1 {c.ticker} в сети TON = 1 {c.ticker} в сети {coin === 'gram' ? 'TON' : c.name}</p>
        </section>
      </div>
    </div>
  )
}
