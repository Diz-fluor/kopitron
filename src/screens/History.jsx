import { useState } from 'react'
import CoinIcon from '../components/CoinIcon.jsx'
import MainButton from '../components/MainButton.jsx'
import { COINS, HISTORY, WALLET_SHORT } from '../data/mock.js'
import { haptic } from '../telegram.js'
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

/* Вкладка «История» */
export function History({ nav }) {
  const [filter, setFilter] = useState('all')
  const items = HISTORY.filter((h) => filter === 'all' || h.coin === filter)
  const months = [...new Set(items.map((h) => h.month))]

  return (
    <div className="scr scr--tab">
      <div className="scr__body">
        <h1 className="title">История</h1>
        <Segments items={FILTERS} value={filter} onChange={setFilter} className="segments--pills" />
        {months.map((m) => {
          const list = items.filter((h) => h.month === m)
          const sum = list.filter((h) => !h.skipped).reduce((s, h) => s + h.usd, 0)
          return (
            <section key={m} className="month">
              <div className="month__head">
                <strong>{m}</strong>
                <span className="muted">${sum}</span>
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
                      <span className="row__title row__title--sm">${h.usd} → {COINS[h.coin].name}</span>
                      <span className="row__sub">{h.date}</span>
                    </span>
                    <span className="row__value">
                      {h.skipped ? <span className="muted skipped">пропущено</span> : `+${h.amount} ${COINS[h.coin].ticker}`}
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
  const h = HISTORY.find((x) => x.id === id) ?? HISTORY[0]
  const t = COINS[h.coin].ticker
  const rows = [
    ['Статус', 'Выполнено', 'sans'],
    ['Отправлено', `${h.usd} USDT`],
    ['Получено (в сети TON)', `${h.amount} ${t}`],
    ['Курс', `1 ${t} = $${h.rate}`],
    ['Комиссия Kopitron 0,25%', `$${(h.usd * 0.0025).toFixed(2).replace('.', ',')}`],
    ['Комиссия обмена', '$0,03'],
    ['Комиссия сети', '$0,04'],
    ['Кошелёк', WALLET_SHORT, 'wallet'],
  ]
  return (
    <div className="scr">
      <div className="scr__body">
        <h1 className="title">Покупка</h1>
        <p className="details__amount num accent">+{h.amount} {t}</p>
        <p className="muted details__sub">${h.usd} → {COINS[h.coin].name}, {h.full}</p>
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
          <MainButton variant="dark" onClick={() => window.open('https://tonviewer.com', '_blank')}>Открыть в блокчейне</MainButton>
          <p className="muted note">Монеты уже в твоём кошельке.<br />Kopitron только записал покупку в историю</p>
        </section>
      </div>
    </div>
  )
}
