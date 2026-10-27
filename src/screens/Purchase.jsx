import { useEffect, useState } from 'react'
import { useTonAddress, useTonWallet } from '@tonconnect/ui-react'
import MainButton, { TextButton } from '../components/MainButton.jsx'
import KopitronFace from '../components/KopitronFace.jsx'
import { haptic } from '../telegram.js'
import { shortAddress } from '../wallet.js'
import { COINS, GOAL, NEXT_PURCHASE, money } from '../data/mock.js'
import './Purchase.css'
import Sheet from '../components/Sheet.jsx'

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
    <Sheet className="sheet--wallet" onClose={onCancel}>
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
    </Sheet>
  )
}

// Открыть кошелёк пользователя: Wallet в Telegram или подключённый через TON Connect
function openWallet(wallet) {
  const tg = window.Telegram?.WebApp
  const link = wallet && wallet.appName !== 'telegram-wallet' ? wallet.universalLink : null
  if (link) {
    if (tg?.openLink) tg.openLink(link)
    else window.open(link, '_blank')
  } else if (tg?.openTelegramLink) tg.openTelegramLink('https://t.me/wallet')
  else window.open('https://t.me/wallet', '_blank')
}

/* Шторка «Не хватает USDT» и вторым шагом «Как пополнить кошелёк» */
export function LowBalanceSheet({ amount = 10, balance = 4, gas, onClose, onBuyAvailable }) {
  const [step, setStep] = useState('low')
  return (
    <Sheet className="low" onClose={onClose}>
      {step === 'guide' ? (
        <TopUpGuide amount={amount} gas={gas} onBack={() => setStep('low')} />
      ) : (
        <>
          <div className="low__face"><KopitronFace emotion="sad" size={56} color="var(--color-accent)" /></div>
          <h2 className="low__title">{gas ? 'Не хватает Gram на сеть' : 'Не хватает USDT'}</h2>
          <p className="sheet__text low__text">
            {gas
              ? 'Для обмена нужно около 0,3 Gram на комиссию сети. Пополни кошелёк на пару Gram и попробуй снова.'
              : <>В кошельке {balance}{'\u00a0'}USDT, а{'\u00a0'}для покупки нужно {amount}. Пополни кошелёк или купи на{'\u00a0'}ту сумму, что есть.<br />Основной баланс Walt мы{'\u00a0'}не{'\u00a0'}видим, только DeFi Счёт.</>}
          </p>
          <div className="low__actions">
            <MainButton variant="dark" onClick={() => { haptic.tick(); setStep('guide') }}>Пополнить кошелёк</MainButton>
            {!gas && balance >= 1 && (
              <MainButton variant="dark" arrow={false} center onClick={onBuyAvailable ?? onClose}>Купить на ${balance}</MainButton>
            )}
            <button type="button" className="low__skip" onClick={onClose}>Пропустить эту покупку</button>
          </div>
        </>
      )}
    </Sheet>
  )
}

/* Как пополнить кошелёк: три шага, адрес с копированием, переход в кошелёк */
function TopUpGuide({ amount, gas, onBack }) {
  const address = useTonAddress()
  const wallet = useTonWallet()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address)
      haptic.success()
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* буфер недоступен: ничего не делаем */ }
  }

  const steps = [
    ['01', 'Открой DeFi Счёт в\u00a0Walt', 'Или другой кошелёк, который подключён'],
    ['02', gas ? 'Купи немного Gram' : 'Купи USDT и\u00a0немного Gram', 'Переведи с\u00a0основного баланса Walt или купи картой. Сеть только TON'],
    ['03', 'Вернись и сдвинь свайп', 'Баланс обновится сам, обычно за\u00a0минуту'],
  ]

  return (
    <div className="topup">
      <div className="low__face"><KopitronFace emotion="waiting" size={52} color="var(--color-accent)" /></div>
      <h2 className="low__title">Как пополнить кошелёк</h2>
      <p className="sheet__text topup__lead">
        {gas
          ? <>Нужно около 0,3{'\u00a0'}Gram<br />на{'\u00a0'}комиссию сети</>
          : <>Нужно {amount}{'\u00a0'}USDT на{'\u00a0'}покупку<br />и{'\u00a0'}0,3{'\u00a0'}Gram на{'\u00a0'}комиссию сети</>}
      </p>
      <ol className="topup__steps">
        {steps.map(([n, title, sub]) => (
          <li key={n} className="topup__step">
            <span className="topup__num mono-label">{n}</span>
            <span className="topup__body">
              <strong>{title}</strong>
              <span>{sub}</span>
            </span>
          </li>
        ))}
      </ol>
      {address && (
        <div className="topup__addr">
          <span className="topup__addr-text">
            <span className="mono-label">Твой адрес в сети TON</span>
            <span className="topup__addr-value">{shortAddress(address)}</span>
          </span>
          <button type="button" className="topup__copy mono-label" onClick={copy}>{copied ? 'Скопировано' : 'Копировать'}</button>
        </div>
      )}
      <div className="low__actions">
        <MainButton onClick={() => { haptic.tick(); openWallet(wallet) }}>Открыть кошелёк</MainButton>
        <button type="button" className="low__skip" onClick={onBack}>Назад</button>
      </div>
    </div>
  )
}

/* Подпись в кошельке: кошелёк открыт, показываем, что именно подписываем */
export function SignPending({ quotes, onCancel }) {
  const usd = quotes.reduce((a, q) => a + q.usd, 0)
  const fee = usd * 0.0025
  return (
    <div className="scr">
      <div className="scr__body scr__body--center">
        <Hero emotion="attention" title="Подтверди в кошельке">
          <p className="hero-state__sub muted">Кошелёк открылся, проверь и подпиши</p>
        </Hero>
        <dl className="card card--pad kv">
          <div><dt>Отправляешь</dt><dd>{usd} USDT</dd></div>
          {quotes.map((q) => (
            <div key={q.coin}><dt>Получишь</dt><dd className="accent">≈ {fmtCoin(q.receive)} {COINS[q.coin].ticker}</dd></div>
          ))}
          {quotes.length === 1 && <div><dt>Курс</dt><dd>1 {COINS[quotes[0].coin].ticker} ≈ ${Math.round(quotes[0].rate).toLocaleString('ru-RU')}</dd></div>}
          <div><dt>Комиссия Kopitron 0,25%</dt><dd>≈ ${fee < 0.01 ? '0,01' : fee.toFixed(2).replace('.', ',')}</dd></div>
        </dl>
      </div>
      <div className="scr__foot scr__foot--bottom">
        <TextButton onClick={onCancel}>Отменить</TextButton>
      </div>
    </div>
  )
}

export const fmtCoin = (n) => (n >= 1 ? n.toFixed(2) : n.toPrecision(3)).replace(/\.?0+$/, '').replace('.', ',')

/* Поиск курса */
export function Quoting() {
  return (
    <div className="scr">
      <div className="scr__body scr__body--center">
        <Hero emotion="awake" title="Ищем лучший курс">
          <p className="hero-state__sub muted">Kopitron сравнивает обменники в сети TON</p>
        </Hero>
      </div>
    </div>
  )
}

/* 04a Ждём подтверждения */
export function Waiting({ amount = 10, onDone, progress, title = 'Покупаем Bitcoin', summary }) {
  const demo = progress == null
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!demo) return
    const t = setInterval(() => setStep((s) => s + 1), 220)
    return () => clearInterval(t)
  }, [demo])
  useEffect(() => {
    if (demo && step === 20) {
      haptic.success()
      setTimeout(onDone, 300)
    }
  }, [step])
  const filled = demo ? Math.min(20, step) : Math.round(progress * 20)
  const conf = filled < 10 ? 1 : 2

  return (
    <div className="scr">
      <div className="scr__body scr__body--center">
        <Hero emotion="waiting" title={title}>
          <p className="hero-state__sub accent">{summary ?? `$${amount} → ${RECEIVE} BTC`}</p>
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
export function Success({ amount = 10, onHome, received, goal, saved, nextDate }) {
  const [emotion, setEmotion] = useState('wink')
  useEffect(() => {
    const t = setTimeout(() => setEmotion('joy'), 900)
    return () => clearTimeout(t)
  }, [])
  const fmt = (n) => n.toFixed(1).replace('.', ',')
  const target = goal ?? GOAL.target
  const was = saved ?? GOAL.saved
  const before = fmt(Math.min(100, (was / target) * 100))
  const after = fmt(Math.min(100, ((was + amount) / target) * 100))
  const lit = Math.min(20, Math.floor((was / target) * 20))
  const showGoal = goal !== null

  return (
    <div className="scr">
      <div className="scr__body scr__body--center">
        <Hero emotion={emotion} title="Монета в копилке">
          <p className="hero-state__sub accent">{received ?? `+${RECEIVE} BTC`}, ${amount}</p>
        </Hero>
        {showGoal && <section className="card card--pad progress">
          <div className="progress__head"><span>Цель {money(target)}</span><span>{before}% → {after}%</span></div>
          <div className="segbar">
            {Array.from({ length: 20 }, (_, i) => (
              <i key={i} className={i < lit ? 'is-on' : i === lit ? 'is-new' : ''} />
            ))}
          </div>
          <span className="muted progress__note">Следующая покупка: {nextDate ?? `пт, ${NEXT_PURCHASE.after}`}</span>
        </section>}
      </div>
      <div className="scr__foot scr__foot--bottom">
        <MainButton onClick={onHome}>На главную</MainButton>
      </div>
    </div>
  )
}

/* 06 Поставим цель? (только после первой покупки) */
const PRESETS = [1000, 5000, 10000]

export function SetGoal({ onSave, onSkip, first = true, initial }) {
  const [value, setValue] = useState(initial ?? 5000)
  const [own, setOwn] = useState(initial != null && !PRESETS.includes(initial))
  return (
    <div className="scr">
      <div className="scr__body">
        {first && <span className="label accent">После первой покупки</span>}
        <h1 className="title">{first ? 'Поставим цель?' : initial ? 'Цель' : 'Поставим цель'}</h1>
        <p className="lead">{first ? 'Первая монета в копилке. Цель поможет не бросить.' : 'Сколько хочешь накопить. Цель поможет не бросить.'}</p>
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
        <MainButton disabled={!value} onClick={() => onSave(value)}>{initial ? 'Сохранить' : 'Поставить цель'}</MainButton>
        <TextButton onClick={onSkip}>{first ? 'Не сейчас' : 'Отмена'}</TextButton>
      </div>
    </div>
  )
}

const buysWord = (n) => (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'покупки' : 'покупок')

/* 06b «Добавим $5?»: после нескольких покупок подряд, со следующей покупки, с отменой */
export function RaiseOffer({ streak, options, onAccept, onSkip }) {
  const [pick, setPick] = useState(0)
  const o = options[pick]
  return (
    <div className="scr">
      <div className="scr__body">
        <span className="label accent">После {streak} покупок подряд</span>
        <h1 className="title">Добавим ${options[0].add}?</h1>
        <p className="lead">{streak} {buysWord(streak)} подряд по&nbsp;${o.from}. Если было легко, можно чуть больше.</p>
        <div className="goal-input raise__value"><span className="num">${o.to}</span></div>
        <div className="goal-chips">
          {options.map((x, i) => (
            <button key={x.steps} type="button" className={`chip chip--btn ${pick === i ? 'is-on' : ''}`} onClick={() => { haptic.tick(); setPick(i) }}>
              +${x.add}
            </button>
          ))}
        </div>
        <p className="muted goal-hint">Со&nbsp;следующей покупки. За&nbsp;год это +${o.perYear} в&nbsp;копилке. Вернуть ${o.from} можно в&nbsp;одно касание.</p>
      </div>
      <div className="scr__foot scr__foot--bottom">
        <MainButton onClick={() => { haptic.success(); onAccept(o) }}>Добавить ${o.add}</MainButton>
        <TextButton onClick={onSkip}>Оставить ${o.from}</TextButton>
      </div>
    </div>
  )
}

/* 04b Подпись отклонена */
export function Cancelled({ onRetry, onHome, title = 'Покупка отменена', sub = 'Подпись отклонена в кошельке', note = 'Можно попробовать снова или купить в следующую пятницу' }) {
  return (
    <div className="scr">
      <div className="scr__body scr__body--center">
        <Hero emotion="sad" color="var(--color-text-secondary)" title={title}>
          <p className="hero-state__sub muted">{sub}</p>
        </Hero>
        <section className="card card--pad">
          <strong className="note-title">Деньги остались у тебя</strong>
          <p className="muted note-text">{note}</p>
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
