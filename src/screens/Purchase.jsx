import { useEffect, useState } from 'react'
import MainButton, { TextButton } from '../components/MainButton.jsx'
import KopitronFace from '../components/KopitronFace.jsx'
import { haptic } from '../telegram.js'
import { COINS, GOAL, NEXT_PURCHASE, money } from '../data/mock.js'
import './Purchase.css'

// Сценарий покупки: подпись в кошельке → ждём подтверждения → успех → (первый раз) поставим цель.
// Пока без Omniston: подпись имитируем шторкой, как её показывает кошелёк.

const RECEIVE = '0,000148'

function Hero({ emotion, color, title, children }) {
  return (
    <div className="hero-state">
      <KopitronFace emotion={emotion} size={128} color={color} />
      <h1 className="hero-state__title">{title}</h1>
      {children}
    </div>
  )
}

/* Шторка «Подтвердите транзакцию» (так её рисует кошелёк) */
export function SignSheet({ amount = 10, onConfirm, onCancel }) {
  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <div className="sheet sheet--wallet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__grip" />
        <h2 className="wallet-sheet__title">Подтвердите транзакцию</h2>
        <p className="wallet-sheet__from">Запрос от Kopitron</p>
        <dl className="wallet-sheet__table">
          <div><dt>Отправляете</dt><dd>{amount} USDT</dd></div>
          <div><dt>Получите</dt><dd className="accent">≈ {RECEIVE} BTC</dd></div>
          <div><dt>Курс</dt><dd>1 BTC ≈ $67 400</dd></div>
          <div><dt>Комиссия Kopitron 0,25%</dt><dd>≈ $0,03</dd></div>
          <div><dt>Комиссия сети</dt><dd>≈ $0,04</dd></div>
        </dl>
        <div className="wallet-sheet__actions">
          <button type="button" className="wallet-btn" onClick={onCancel}>Отмена</button>
          <button type="button" className="wallet-btn wallet-btn--primary" onClick={onConfirm}>Подтвердить</button>
        </div>
      </div>
    </div>
  )
}

/* Шторка «Не хватает USDT» */
export function LowBalanceSheet({ amount = 10, balance = 4, onClose }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet low" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__grip" />
        <div className="low__face"><KopitronFace emotion="sad" size={56} color="var(--color-accent)" /></div>
        <h2 className="low__title">Не хватает USDT</h2>
        <p className="sheet__text low__text">
          В кошельке {balance} USDT, а для покупки нужно {amount}. Пополни кошелёк или купи на ту сумму, что есть.
        </p>
        <div className="low__actions">
          <MainButton variant="dark" onClick={onClose}>Пополнить кошелёк</MainButton>
          <MainButton variant="dark" arrow={false} center onClick={onClose}>Купить на ${balance}</MainButton>
          <button type="button" className="low__skip" onClick={onClose}>Пропустить эту покупку</button>
        </div>
      </div>
    </div>
  )
}

/* 04a Ждём подтверждения */
export function Waiting({ amount = 10, onDone }) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setStep((s) => s + 1), 220)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    if (step === 20) {
      haptic.success()
      setTimeout(onDone, 300)
    }
  }, [step])
  const filled = Math.min(20, step)
  const conf = filled < 10 ? 1 : 2

  return (
    <div className="scr">
      <div className="scr__body scr__body--center">
        <Hero emotion="waiting" title="Покупаем Bitcoin">
          <p className="hero-state__sub accent">${amount} → {RECEIVE} BTC</p>
        </Hero>
        <section className="card card--pad progress">
          <div className="progress__head"><span>Подтверждение сети</span><span>{conf} из 2</span></div>
          <div className="segbar segbar--accent">
            {Array.from({ length: 20 }, (_, i) => <i key={i} className={i < filled ? 'is-on' : ''} />)}
          </div>
          <span className="muted progress__note">Обычно до минуты. Приложение можно закрыть</span>
        </section>
      </div>
    </div>
  )
}

/* 05 Успех */
export function Success({ amount = 10, onHome }) {
  const [emotion, setEmotion] = useState('wink')
  useEffect(() => {
    const t = setTimeout(() => setEmotion('joy'), 900)
    return () => clearTimeout(t)
  }, [])
  const fmt = (n) => n.toFixed(1).replace('.', ',')
  const before = fmt((GOAL.saved / GOAL.target) * 100)
  const after = fmt(((GOAL.saved + amount) / GOAL.target) * 100)
  const lit = Math.floor((GOAL.saved / GOAL.target) * 20)

  return (
    <div className="scr">
      <div className="scr__body scr__body--center">
        <Hero emotion={emotion} title="Монета в копилке">
          <p className="hero-state__sub accent">+{RECEIVE} BTC, ${amount}</p>
        </Hero>
        <section className="card card--pad progress">
          <div className="progress__head"><span>Цель {money(GOAL.target)}</span><span>{before}% → {after}%</span></div>
          <div className="segbar">
            {Array.from({ length: 20 }, (_, i) => (
              <i key={i} className={i < lit ? 'is-on' : i === lit ? 'is-new' : ''} />
            ))}
          </div>
          <span className="muted progress__note">Следующая покупка: пт, {NEXT_PURCHASE.after}</span>
        </section>
      </div>
      <div className="scr__foot scr__foot--bottom">
        <MainButton onClick={onHome}>На главную</MainButton>
      </div>
    </div>
  )
}

/* 06 Поставим цель? (только после первой покупки) */
const PRESETS = [1000, 5000, 10000]

export function SetGoal({ onSave, onSkip }) {
  const [value, setValue] = useState(5000)
  const [own, setOwn] = useState(false)
  return (
    <div className="scr">
      <div className="scr__body">
        <span className="label accent">После первой покупки</span>
        <h1 className="title">Поставим цель?</h1>
        <p className="lead">Первая монета в копилке. Цель поможет не бросить.</p>
        <label className="goal-input">
          <span className="goal-input__sign num">$</span>
          <input
            className="num"
            inputMode="numeric"
            value={value ? String(value) : ''}
            onChange={(e) => {
              setOwn(true)
              setValue(Number(e.target.value.replace(/\D/g, '').slice(0, 7)))
            }}
          />
        </label>
        <div className="goal-chips">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              className={`chip chip--btn ${!own && value === p ? 'is-on' : ''}`}
              onClick={() => { haptic.tick(); setOwn(false); setValue(p) }}
            >
              {money(p)}
            </button>
          ))}
          <button type="button" className={`chip chip--btn ${own ? 'is-on' : ''}`} onClick={() => { setOwn(true); setValue(0) }}>
            Своя
          </button>
        </div>
        <p className="muted goal-hint">В долларах, так проще сравнивать. Поменять можно в любой момент.</p>
      </div>
      <div className="scr__foot scr__foot--bottom">
        <MainButton disabled={!value} onClick={() => onSave(value)}>Поставить цель</MainButton>
        <TextButton onClick={onSkip}>Не сейчас</TextButton>
      </div>
    </div>
  )
}

/* 04b Подпись отклонена */
export function Cancelled({ onRetry, onHome }) {
  return (
    <div className="scr">
      <div className="scr__body scr__body--center">
        <Hero emotion="sad" color="var(--color-text-secondary)" title="Покупка отменена">
          <p className="hero-state__sub muted">Подпись отклонена в кошельке</p>
        </Hero>
        <section className="card card--pad">
          <strong className="note-title">Деньги остались у тебя</strong>
          <p className="muted note-text">Можно попробовать снова или купить в следующую пятницу</p>
        </section>
      </div>
      <div className="scr__foot scr__foot--bottom">
        <MainButton onClick={onRetry}>Попробовать снова</MainButton>
        <TextButton onClick={onHome}>На главную</TextButton>
      </div>
    </div>
  )
}

export { COINS }
