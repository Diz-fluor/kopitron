import { useState } from 'react'
import CoinIcon from '../components/CoinIcon.jsx'
import MainButton from '../components/MainButton.jsx'
import { COINS, GOAL, money } from '../data/mock.js'
import { DAYS } from '../onboarding/plan.js'
import { haptic } from '../telegram.js'
import { Segments } from './History.jsx'
import './Goals.css'

export const PLANS = [
  { coin: 'btc', amount: 10, freq: 'week', day: 4, title: '$10 каждую пятницу', goal: '0,01 BTC', saved: '0,0047 BTC', pct: 47, eta: 'к маю 2027', when: 'пт, 09:00' },
  { coin: 'eth', amount: 5, freq: 'week', day: 0, title: '$5 каждый понедельник', goal: '0,1 ETH', saved: '0,019 ETH', pct: 19, eta: 'к марту 2028', when: 'пн, 09:00' },
  { coin: 'gram', amount: 3, freq: 'month', day: 0, title: '$3 каждое 1-е число', goal: '100 GRAM', saved: '34 GRAM', pct: 34, eta: 'к апрелю 2027', when: '1-го числа, 09:00' },
]

export function SegBar({ value, total = 20 }) {
  const lit = Math.round((value / 100) * total)
  return (
    <span className="segbar">
      {Array.from({ length: total }, (_, i) => <i key={i} className={i < lit ? 'is-on' : ''} />)}
    </span>
  )
}

/* Вкладка «Цели и планы» */
export function Goals({ nav }) {
  const pct = Math.round((GOAL.saved / GOAL.target) * 100)
  return (
    <div className="scr scr--tab">
      <div className="scr__body">
        <h1 className="title">Цели и планы</h1>
        <section className="card card--pad goal-total">
          <div className="goal-total__head">
            <span className="label">Общая цель</span>
            <span className="muted">≈ июнь 2027</span>
          </div>
          <div className="goal-total__row">
            <span>{money(GOAL.saved)} из {money(GOAL.target)}</span>
            <span>{pct}%</span>
          </div>
          <SegBar value={pct} />
        </section>

        <span className="label section-label">Планы</span>
        {PLANS.map((p) => (
          <button key={p.coin} type="button" className="card card--pad plan-card" onClick={() => nav.push('plan', { coin: p.coin })}>
            <span className="plan-card__top">
              <CoinIcon coin={p.coin} size={36} />
              <span className="row__main">
                <span className="row__title">{p.title}</span>
                <span className="row__sub">{COINS[p.coin].name}, цель {p.goal}</span>
              </span>
              <span className="plan-card__pct">{p.pct}%</span>
              <span className="row__chevron">›</span>
            </span>
            <SegBar value={p.pct} />
          </button>
        ))}

        <button type="button" className="new-plan" onClick={() => nav.push('newplan')}>+ Новый план</button>
      </div>
    </div>
  )
}

/* Общие блоки редактора плана */
function AmountCard({ value, onChange }) {
  return (
    <section className="card card--pad stepper">
      <span className="label">За одну покупку</span>
      <div className="stepper__row">
        <button type="button" className="round" onClick={() => { haptic.tick(); onChange(Math.max(1, value - (value > 5 ? 5 : 1))) }}>−</button>
        <strong key={value} className="stepper__value num">${value}</strong>
        <button type="button" className="round" onClick={() => { haptic.tick(); onChange(Math.min(500, value + (value >= 5 ? 5 : 1))) }}>+</button>
      </div>
    </section>
  )
}

const FREQS = [
  ['week', 'Неделя'],
  ['2weeks', '2 недели'],
  ['month', 'Месяц'],
]

function ScheduleCard({ freq, day, onChange }) {
  return (
    <section className="card card--pad schedule-card">
      <Segments items={FREQS} value={freq} onChange={(f) => onChange({ freq: f })} className="segments--track" />
      {freq === 'month' ? (
        <div className="schedule-card__month">
          <span>День месяца</span>
          <span className="muted">1-е число ›</span>
        </div>
      ) : (
        <div className="days">
          {DAYS.map((d, i) => (
            <button key={d} type="button" className={`chip day ${day === i ? 'is-on' : ''}`} onClick={() => { haptic.tick(); onChange({ day: i }) }}>
              {d}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

const perMonth = (amount, freq) => Math.round((amount * 52) / 12 / (freq === 'week' ? 1 : freq === '2weeks' ? 2 : 52 / 12))

/* План монеты */
export function PlanEdit({ coin = 'btc', nav }) {
  const base = PLANS.find((p) => p.coin === coin) ?? PLANS[0]
  const [p, setP] = useState(base)
  const name = COINS[coin].name
  return (
    <div className="scr">
      <div className="scr__body">
        <h1 className="title">План {name}</h1>
        <AmountCard value={p.amount} onChange={(amount) => setP({ ...p, amount })} />
        <ScheduleCard freq={p.freq} day={p.day} onChange={(x) => setP({ ...p, ...x })} />
        <section className="card card--pad coin-goal">
          <div className="coin-goal__head"><span>Цель по монете</span><span className="muted">{p.goal} ›</span></div>
          <SegBar value={p.pct} />
          <span className="muted coin-goal__note">Накоплено {p.saved}. С этим планом ≈ {p.eta}</span>
        </section>
        <div className="summary">
          <strong>≈ ${perMonth(p.amount, p.freq)} в месяц</strong>
          <span>на {name}</span>
        </div>
      </div>
      <div className="scr__foot scr__foot--bottom">
        <MainButton onClick={() => nav.back()}>Сохранить</MainButton>
        <div className="plan-actions">
          <button type="button" className="muted" onClick={() => nav.back()}>Пауза</button>
          <button type="button" className="accent" onClick={() => nav.back()}>Удалить план</button>
        </div>
      </div>
    </div>
  )
}

/* Новый план */
export function NewPlan({ nav }) {
  const [coin, setCoin] = useState('gram')
  const [p, setP] = useState({ amount: 3, freq: 'month', day: 4 })
  const taken = { btc: true, eth: true }
  return (
    <div className="scr">
      <div className="scr__body">
        <h1 className="title">Новый план</h1>
        <section className="card card--pad">
          <span className="label">Монета</span>
          <div className="coin-pick">
            {['btc', 'eth', 'gram'].map((c) => (
              <button
                key={c}
                type="button"
                disabled={taken[c]}
                className={`coin-pick__item ${coin === c ? 'is-on' : ''}`}
                onClick={() => setCoin(c)}
              >
                <CoinIcon coin={c} size={30} />
                <span className="coin-pick__name">{c === 'gram' ? 'Gram' : COINS[c].ticker}</span>
                <span className="coin-pick__sub">{taken[c] ? 'есть план' : coin === c ? 'выбрано' : ''}</span>
              </button>
            ))}
          </div>
        </section>
        <AmountCard value={p.amount} onChange={(amount) => setP({ ...p, amount })} />
        <ScheduleCard freq={p.freq} day={p.day} onChange={(x) => setP({ ...p, ...x })} />
        <section className="card card--pad coin-goal">
          <div className="coin-goal__head"><span>Цель по монете</span><span className="muted">100 GRAM ›</span></div>
          <SegBar value={0} />
          <span className="muted coin-goal__note">Начнём с нуля. С этим планом ≈ к апрелю 2027</span>
        </section>
        <div className="summary">
          <strong>${perMonth(p.amount, p.freq)} в месяц</strong>
          <span>на {COINS[coin].name}</span>
        </div>
      </div>
      <div className="scr__foot scr__foot--bottom">
        <MainButton onClick={() => nav.back()}>Создать план</MainButton>
      </div>
    </div>
  )
}

/* Тумблер: тёмная дорожка, светлая клавиша с оранжевым диодом */
export function Toggle({ on, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={on} className={`toggle ${on ? 'is-on' : ''}`} onClick={() => { haptic.tick(); onChange(!on) }}>
      <span className="toggle__key"><i /></span>
    </button>
  )
}

/* Шторка «Напоминания» */
export function RemindersSheet({ onClose }) {
  const [all, setAll] = useState(true)
  const [each, setEach] = useState({ btc: true, eth: true, gram: false })
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__grip" />
        <h2 className="sheet__title">Напоминания</h2>
        <p className="sheet__text">Kopitron пришлёт сообщение в день покупки. Покупку ты подтверждаешь сам, в один свайп.</p>
        <div className="toggle-card">
          <strong>Напоминать о покупках</strong>
          <Toggle on={all} onChange={setAll} />
        </div>
        <span className="label section-label">По планам</span>
        <div className={`reminders ${all ? '' : 'is-off'}`}>
          {PLANS.map((p) => (
            <div key={p.coin} className="reminders__row">
              <CoinIcon coin={p.coin} size={36} />
              <span className="row__main">
                <span className="row__title row__title--sm">{COINS[p.coin].name}</span>
                <span className="row__sub">{p.when}</span>
              </span>
              <Toggle on={all && each[p.coin]} onChange={(v) => setEach({ ...each, [p.coin]: v })} />
            </div>
          ))}
        </div>
        <div className="reminders__time"><span>Время напоминания</span><strong>09:00 ›</strong></div>
        <MainButton onClick={onClose}>Готово</MainButton>
      </div>
    </div>
  )
}
