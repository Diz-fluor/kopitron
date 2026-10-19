import { useState } from 'react'
import CoinIcon from '../components/CoinIcon.jsx'
import MainButton from '../components/MainButton.jsx'
import { COINS, HISTORY, WALLET_SHORT, money } from '../data/mock.js'
import { haptic } from '../telegram.js'
import { useWallet, isDemoWallet } from '../wallet.js'
import { useHistory } from '../api/history.js'
import { usePlans } from '../data/plans.js'
import { usePortfolio, fmtAmount } from '../api/tonapi.js'
import './History.css'

const FILTERS = [
  ['all', 'Все'],
  ['btc', 'BTC'],
  ['eth', 'ETH'],
  ['gram', 'Gram'],
]

export function Segments({ items, value, onChange, className = '' }) {
  return (
    <div className={`segments ${className}`}>
      {items.map(([id, label]) => (
        <button
          key={id}
          type="button"
          className={value === id ? 'is-on' : ''}
          onClick={() => {
            haptic.tick()
            onChange(id)
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/* Живая история: только монеты из планов. В демо — примеры из макета */
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const fmtRate = (n) => (n >= 10000 ? Math.round(n).toLocaleString('ru-RU') : n >= 100 ? String(Math.round(n)) : n.toFixed(2).replace('.', ','))
const short = (a) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '')

function toItem(h) {
  const d = new Date(h.time)
  return {
    ...h,
    month: MONTHS[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ''),
    date: d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', ''),
    full: d.toLocaleString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
    amountText: fmtAmount(h.amount),
    rateText: fmtRate(h.rate),
  }
}

export function useLiveHistory() {
  const wallet = useWallet()
  const plans = usePlans()
  const demo = isDemoWallet(wallet)
  const live = useHistory(wallet && !demo ? wallet : null)
  if (demo) return { demo, wallet, items: HISTORY.map((h) => ({ ...h, amountText: h.amount, rateText: h.rate })), loading: false, coins: ['btc', 'eth', 'gram'] }
  const coins = plans.map((p) => p.coin)
  const items = (live.data ?? []).filter((h) => coins.includes(h.coin)).map(toItem)
  return { demo, wallet, items, coins, loading: live.loading && !live.data, error: live.error }
}

/* Вкладка «История» */
export function History({ nav }) {
  const [filter, setFilter] = useState('all')
  const { items: all, coins, loading, error, wallet } = useLiveHistory()
  const filters = FILTERS.filter(([id]) => id === 'all' || coins.includes(id))
  const items = all.filter((h) => filter === 'all' || h.coin === filter)
  const months = [...new Set(items.map((h) => h.month))]

  return (
    <div className="scr scr--tab">
      <div className="scr__body">
        <h1 className="title">История</h1>
        {coins.length > 1 && <Segments items={filters} value={filter} onChange={setFilter} className="segments--pills" />}
        {!wallet && <p className="muted empty-note">Подключи кошелёк, и здесь появятся твои покупки</p>}
        {wallet && loading && <p className="muted empty-note">Загружаем покупки из блокчейна</p>}
        {wallet && !loading && error && !all.length && <p className="muted empty-note">Не получилось загрузить историю. Попробуем ещё раз через минуту</p>}
        {wallet && !loading && !error && !items.length && <p className="muted empty-note">Покупок пока нет. Первая появится здесь сразу после свайпа</p>}
        {months.map((m) => {
          const list = items.filter((h) => h.month === m)
          const sum = list.filter((h) => !h.skipped).reduce((s, h) => s + h.usd, 0)
          return (
            <section key={m} className="month">
              <div className="month__head">
                <strong>{m}</strong>
                <span className="muted">{money(sum)}</span>
              </div>
              <div className="card list">
                {list.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    className={`row ${h.skipped ? 'is-skipped' : ''}`}
                    disabled={h.skipped}
                    onClick={() => nav.push('purchase', { id: h.id })}
                  >
                    <CoinIcon coin={h.coin} size={30} />
                    <span className="row__main">
                      <span className="row__title row__title--sm">{money(h.usd)} → {COINS[h.coin].name}</span>
                      <span className="row__sub">{h.pending ? 'в процессе' : h.date}</span>
                    </span>
                    <span className="row__value">
                      {h.skipped ? <span className="muted skipped">пропущено</span> : `+${h.amountText} ${COINS[h.coin].ticker}`}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

/* Детали покупки */
export function PurchaseDetails({ id }) {
  const { items, demo, wallet } = useLiveHistory()
  const gram = usePortfolio(!demo ? wallet : null).data?.gram?.price ?? 0
  const h = items.find((x) => x.id === id) ?? (demo ? items[0] : null)
  if (!h) return <div className="scr"><div className="scr__body"><h1 className="title">Покупка</h1><p className="muted">Загружаем</p></div></div>
  const t = COINS[h.coin].ticker
  const cents = (n) => `$${n.toFixed(2).replace('.', ',')}`
  const rows = [
    ['Статус', h.pending ? 'В процессе' : 'Выполнено', 'sans'],
    ['Отправлено', `${String(h.usd).replace('.', ',')} USDT`],
    ['Получено (в сети TON)', `${h.amountText} ${t}`],
    ['Курс', `1 ${t} = $${h.rateText}`],
    ['Комиссия Kopitron 0,25%', cents(h.usd * 0.0025)],
    demo ? ['Комиссия сети', '$0,04'] : ['Комиссия сети', h.fee ? `${fmtAmount(h.fee)} GRAM${gram ? ` ≈ ${cents(h.fee * gram)}` : ''}` : '—'],
    ['Кошелёк', demo ? WALLET_SHORT : short(wallet), 'wallet'],
  ]
  return (
    <div className="scr">
      <div className="scr__body">
        <h1 className="title">Покупка</h1>
        <p className="details__amount num accent">+{h.amountText} {t}</p>
        <p className="muted details__sub">{money(h.usd)} → {COINS[h.coin].name}, {h.full}</p>
        <dl className="card card--pad kv">
          {rows.map(([k, v, kind]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd className={kind === 'sans' ? 'kv__sans' : ''}>
                {kind === 'wallet' && <i className="kv__wallet" />}
                {v}
              </dd>
            </div>
          ))}
        </dl>
        <section className="card card--pad">
          <MainButton variant="dark" onClick={() => window.open(h.hash ? `https://tonviewer.com/transaction/${h.hash}` : 'https://tonviewer.com', '_blank')}>Открыть в блокчейне</MainButton>
          <p className="muted note">Монеты уже в твоём кошельке.<br />Kopitron только записал покупку в историю</p>
        </section>
      </div>
    </div>
  )
}
