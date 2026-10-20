import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import MainButton, { TextButton } from '../components/MainButton.jsx'
import KopitronFace from '../components/KopitronFace.jsx'
import DeviceScreen from '../components/DeviceScreen.jsx'
import CoinIcon, { CoinStack } from '../components/CoinIcon.jsx'
import { haptic, backButton } from '../telegram.js'
import { useTonAddress, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react'
import { shortAddress } from '../wallet.js'
import {
  PRESETS, FREQS, DAYS, coinNames, coinsText, perMonth, freqText, dayEach, dayNearest, dayText, firstPurchaseDate, shares,
} from './plan.js'
import './Onboarding.css'

// Шаги онбординга. «Свой план» — ветка от шага «План», в метке остаётся 03.
const STEPS = ['hello', 'distance', 'plan', 'wallet', 'done']

// Низ с кнопками живёт вне анимированного экрана, поэтому кнопка не двигается при переходах
const FootContext = createContext(null)
const LABELS = {
  hello: '01 / Знакомство',
  distance: '02 / На дистанции',
  plan: '03 / План',
  custom: '03 / Свой план',
  wallet: '04 / Кошелёк',
  done: '05 / Готово',
}

export default function Onboarding({ onFinish }) {
  const [screen, setScreen] = useState('hello')
  const [dir, setDir] = useState('forward')
  const [plan, setPlan] = useState({ ...PRESETS.balance, coins: [...PRESETS.balance.coins] })
  const [wallet, setWallet] = useState(null)
  const historyRef = useRef([])

  const go = (next) => {
    historyRef.current.push(screen)
    setDir('forward')
    setScreen(next)
  }
  const back = () => {
    const prev = historyRef.current.pop()
    if (!prev) return
    setDir('back')
    setScreen(prev)
  }

  // Кнопка «Назад» в шапке Telegram
  useEffect(() => backButton(screen !== 'hello' && screen !== 'done' ? back : null), [screen])

  const props = { plan, setPlan, go, back, wallet, setWallet, onFinish }
  const [footNode, setFootNode] = useState(null)

  return (
    <FootContext.Provider value={footNode}>
      <div className="onb">
        <div key={screen} className={`onb__screen onb__screen--${dir}`}>
          <span className="onb__label mono-label">{LABELS[screen]}</span>
          {screen === 'hello' && <Hello {...props} />}
          {screen === 'distance' && <Distance {...props} />}
          {screen === 'plan' && <Plan {...props} />}
          {screen === 'custom' && <CustomPlan {...props} />}
          {screen === 'wallet' && <Wallet {...props} />}
          {screen === 'done' && <Done {...props} />}
        </div>
        <footer ref={setFootNode} className="onb__foot" />
      </div>
    </FootContext.Provider>
  )
}

function Head({ title, children }) {
  return (
    <header className="onb__head">
      <h1 className="onb__title">{title}</h1>
      {children && <p className="onb__lead">{children}</p>}
    </header>
  )
}

// Главная кнопка всегда в одной точке у нижнего края, второстепенная — над ней
function Foot({ children }) {
  const node = useContext(FootContext)
  return node ? createPortal(children, node) : null
}

/* 01 Привет */

// Интро на онбординге: спит, просыпается, моргает, подмигивает, радуется
const INTRO = [
  ['sleep', 1400],
  ['awake', 900],
  ['blink', 140],
  ['awake', 800],
  ['wink', 700],
  ['joy', 1600],
]

/* Рендер K-02 с живым точечным экраном. intro — проиграть знакомство, потом только моргать */
export function DeviceHero({ className = '', intro = false }) {
  const [emotion, setEmotion] = useState(intro ? 'sleep' : 'awake')
  const [hasRender, setHasRender] = useState(true)

  useEffect(() => {
    const timers = new Set()
    const later = (fn, ms) => {
      const t = setTimeout(() => { timers.delete(t); fn() }, ms)
      timers.add(t)
    }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    // Моргает раз в несколько секунд, иногда дважды
    const blinkLoop = () => {
      later(() => {
        setEmotion('blink')
        later(() => {
          setEmotion('awake')
          if (Math.random() < 0.3) {
            later(() => { setEmotion('blink'); later(() => setEmotion('awake'), 130) }, 180)
          }
          blinkLoop()
        }, 140)
      }, 2600 + Math.random() * 2400)
    }

    if (intro && !reduce) {
      let at = 0
      INTRO.forEach(([e, ms]) => { later(() => setEmotion(e), at); at += ms })
      later(() => { setEmotion('awake'); blinkLoop() }, at)
    } else {
      setEmotion('awake')
      if (!reduce) blinkLoop()
    }
    return () => timers.forEach(clearTimeout)
  }, [intro])

  return (
    <div className={`hero ${className}`}>
      {hasRender ? (
        <div className="hero__device">
          <img
            src={`${import.meta.env.BASE_URL}kopitron-k02.webp`}
            alt="Kopitron K-02"
            onError={() => setHasRender(false)}
            draggable="false"
          />
          <DeviceScreen emotion={emotion} />
        </div>
      ) : (
        <div className="hero__fallback">
          <KopitronFace emotion={emotion === 'blink' ? 'wink' : 'attention'} size={128} />
        </div>
      )}
    </div>
  )
}

function Hello({ go }) {

  return (
    <>
      <Head title={<>Привет,<br />я Kopitron</>}>
        Страшно начинать в крипте?<br />Со мной это как откладывать в копилку
      </Head>

      <DeviceHero intro />

      <p className="hero__caption">
        <span>Kopitron K-02</span> / Копилка для крипты
      </p>

      <Foot>
        <MainButton onClick={() => go('distance')}>Начать</MainButton>
      </Foot>
    </>
  )
}

/* 02 На дистанции */

const COLS = 26
const ROWS = 9
// условная цена по столбцам: рост, пик, просадка, восстановление (строка 0 — верх)
const PRICE = [6, 6, 5, 5, 4, 4, 3, 2, 2, 3, 4, 5, 6, 7, 7, 6, 6, 5, 4, 4, 3, 3, 2, 2, 1, 0]

export function DcaChart() {
  return (
  <section className="card chart">
      <div className="chart__top">
        <span>$10 каждую неделю, 3 года</span>
        <span className="chart__hint">пример</span>
      </div>
      <div className="chart__grid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
        {Array.from({ length: ROWS }).flatMap((_, r) =>
          Array.from({ length: COLS }, (_, c) => {
            const lit = PRICE[c] === r
            const buy = lit && c % 3 === 1
            return (
              <i
                key={`${r}-${c}`}
                className={lit ? (buy ? 'is-buy' : 'is-price') : ''}
                style={lit ? { animationDelay: `${120 + c * 45}ms` } : undefined}
              />
            )
          }),
        )}
      </div>
      <div className="chart__years">
        <span>2024</span><span>2025</span><span>2026</span><span>2027</span>
      </div>
      <div className="chart__compare">
        <div className="compare">
          <span className="compare__title">Купил всё на пике</span>
          <strong>$69k</strong>
          <span className="compare__sub">цена за 1 BTC</span>
        </div>
        <div className="compare compare--accent">
          <span className="compare__title">Покупал понемногу</span>
          <strong>$48k</strong>
          <span className="compare__sub">средняя цена</span>
        </div>
      </div>
    </section>
  )
}

function Distance({ go }) {
  return (
    <>
      <Head title="На дистанции">
        Kopitron не угадывает курс. Он покупает понемногу, и средняя цена выходит ровнее
      </Head>

      <DcaChart />

      <ul className="bullets">
        <li>Не нужно разбираться в графиках, достаточно не забывать</li>
        <li>На просадках получаешь больше монет</li>
        <li>Чем дольше, тем ровнее средняя цена</li>
      </ul>
      <p className="onb__note">Пример для наглядности, не прогноз. Доход не гарантирован</p>

      <Foot>
        <MainButton onClick={() => go('plan')}>Понятно</MainButton>
      </Foot>
    </>
  )
}

/* 03 План */

export function Diode({ on }) {
  return <span className={`diode ${on ? 'is-on' : ''}`} aria-hidden="true" />
}

function Plan({ plan, setPlan, go }) {
  const choose = (preset) => {
    haptic.tick()
    setPlan({ ...preset, coins: [...preset.coins] })
  }

  return (
    <>
      <Head title="Твой план">
        Выбери готовый.<br />Поменять можно в любой момент
      </Head>

      <div className="plans">
        {Object.values(PRESETS).map((p) => {
          const on = plan.id === p.id
          return (
            <button key={p.id} type="button" className={`card plan ${on ? 'is-selected' : ''}`} onClick={() => choose(p)}>
              <span className="plan__head">
                <span className="plan__name">
                  {p.title}
                  {p.id === 'balance' && <span className="tag">Рекомендуем</span>}
                </span>
                <Diode on={on} />
              </span>
              <span className="plan__coins">
                <CoinStack coins={p.coins} />
                <span>${p.amount} {freqText(p)} в {coinsText(p.coins)}</span>
              </span>
              <span className="plan__month">≈ ${perMonth(p)} в месяц</span>
            </button>
          )
        })}

        <button type="button" className={`card plan plan--own ${plan.id === 'custom' ? 'is-selected' : ''}`} onClick={() => go('custom')}>
          <span>
            <span className="plan__own-title">Свой план</span>
            <span className="plan__own-sub">
              {plan.id === 'custom' ? `$${plan.amount} ${freqText(plan)}, ${coinsText(plan.coins)}` : 'Сам выберу монеты, сумму и день'}
            </span>
          </span>
          <span className="plan__chevron">›</span>
        </button>
      </div>

      <p className="onb__note">
        Первая покупка {dayNearest(plan.day)}.<br />День можно поменять.
      </p>

      <Foot>
        <MainButton onClick={() => go('wallet')}>Дальше</MainButton>
      </Foot>
    </>
  )
}

/* 03a Свой план */

function CustomPlan({ plan, setPlan, back }) {
  const [draft, setDraft] = useState(() => ({ ...plan, id: 'custom', coins: [...plan.coins] }))
  const split = shares(draft.coins)

  const toggleCoin = (c) => {
    haptic.tick()
    setDraft((d) => {
      const has = d.coins.includes(c)
      if (has && d.coins.length === 1) return d
      const order = ['btc', 'eth', 'gram']
      const coins = has ? d.coins.filter((x) => x !== c) : order.filter((x) => d.coins.includes(x) || x === c)
      return { ...d, coins }
    })
  }
  const step = (delta) => {
    haptic.tick()
    // до $5 шаг $1 (минимум $1, удобно для тестов), дальше шаг $5
    setDraft((d) => {
      const a = d.amount
      const next = delta > 0 ? (a < 5 ? a + 1 : a + 5) : a <= 5 ? a - 1 : a - 5
      return { ...d, amount: Math.min(500, Math.max(1, next)) }
    })
  }
  const set = (patch) => {
    haptic.tick()
    setDraft((d) => ({ ...d, ...patch }))
  }

  return (
    <>
      <Head title="Монеты и сумма">Во что копим и сколько за раз</Head>

      <div className="coins">
        {['btc', 'eth', 'gram'].map((c) => {
          const on = draft.coins.includes(c)
          return (
            <button key={c} type="button" className={`card coin ${on ? 'is-selected' : ''}`} onClick={() => toggleCoin(c)}>
              <CoinIcon coin={c} size={34} />
              <span className="coin__name">{coinNames[c]}</span>
              <span className="coin__share">{on ? `${split[c]}%` : 'нет'}</span>
            </button>
          )
        })}
      </div>

      <section className="card amount">
        <span className="mono-label amount__label">За одну покупку</span>
        <div className="amount__row">
          <button type="button" className="round" onClick={() => step(-5)} aria-label="Меньше">−</button>
          <strong key={draft.amount} className="amount__value">${draft.amount}</strong>
          <button type="button" className="round" onClick={() => step(5)} aria-label="Больше">+</button>
        </div>
      </section>

      <section className="card schedule">
        <div className="segment">
          {FREQS.map((f) => (
            <button key={f.id} type="button" className={draft.freq === f.id ? 'is-on' : ''} onClick={() => set({ freq: f.id })}>
              {f.label}
            </button>
          ))}
        </div>
        {draft.freq !== 'month' && (
          <div className="days">
            {DAYS.map((d, i) => (
              <button key={d} type="button" className={`chip ${draft.day === i ? 'is-on' : ''}`} onClick={() => set({ day: i })}>
                {d}
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="summary">
        <strong>≈ ${perMonth(draft)} в месяц</strong>
        <span>{draft.freq === 'week' ? dayEach(draft.day) : dayText(draft)}</span>
      </div>

      <Foot>
        <MainButton
          onClick={() => {
            setPlan(draft)
            back()
          }}
        >
          Готово
        </MainButton>
      </Foot>
    </>
  )
}

/* 04 Кошелёк */

export const SHIELD = '1,0 2,0 3,0 4,0 5,0 6,0 7,0 0,1 8,1 0,2 6,2 8,2 0,3 5,3 8,3 0,4 2,4 4,4 8,4 0,5 3,5 8,5 1,6 7,6 2,7 6,7 3,8 4,8 5,8'

// сетка 9×9: точка 2,8, шаг 3,4, поле 31×31 — как иконка в Figma
export function DotIcon({ cells, size = 31, color = 'var(--color-accent)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 31 31" aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
      {cells.split(' ').map((p) => {
        const [x, y] = p.split(',').map(Number)
        return <circle key={p} cx={1.7 + x * 3.4} cy={1.7 + y * 3.4} r={1.4} fill={color} />
      })}
    </svg>
  )
}

// Логотип кошелька: подключённого (из TON Connect) или Кошелька в Telegram
const TG_WALLET_LOGO = 'https://wallet.tg/images/logo-288.png'

export function useWalletInfo() {
  const w = useTonWallet()
  const tg = !w || w.appName === 'telegram-wallet' || /wallet/i.test(w.name ?? '') && /telegram/i.test(w.name ?? '')
  return { name: tg ? 'Кошелёк в Telegram' : w.name ?? 'Кошелёк TON', logo: w?.imageUrl ?? (tg ? TG_WALLET_LOGO : null), tg }
}

export function WalletLogo({ src, kind = 'telegram' }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken) return <WalletGlyph kind={kind} />
  return <img className="wallet__icon wallet__icon--img" src={src} alt="" onError={() => setBroken(true)} draggable="false" />
}

export function WalletGlyph({ kind }) {
  // нейтральные значки; настоящие логотипы кошельков добавим отдельно
  return (
    <span className={`wallet__icon wallet__icon--${kind}`} aria-hidden="true">
      {kind === 'telegram' ? (
        <svg width="20" height="20" viewBox="0 0 20 20"><rect x="2" y="5" width="16" height="11" rx="3" fill="none" stroke="#fff" strokeWidth="1.8" /><path d="M4 5.5 13 2.5l1.2 2.5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="14" cy="10.5" r="1.4" fill="#fff" /></svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 20 20"><path d="M8.5 11.5 11.5 8.5M7 9.5 5.2 11.3a2.6 2.6 0 0 0 3.6 3.6L10.6 13M13 10.5l1.8-1.8a2.6 2.6 0 0 0-3.6-3.6L9.4 7" fill="none" stroke="var(--color-text)" strokeWidth="1.8" strokeLinecap="round" /></svg>
      )}
    </span>
  )
}

function Wallet({ go, setWallet }) {
  const [choice, setChoice] = useState('telegram')
  const [tonConnectUI] = useTonConnectUI()
  const address = useTonAddress()
  const waitingRef = useRef(false)

  // кошелёк подключился после нашего запроса: идём к итогу
  useEffect(() => {
    if (address && waitingRef.current) {
      waitingRef.current = false
      setWallet(address)
      haptic.success()
      go('done')
    }
  }, [address])

  const connect = async () => {
    if (address) {
      setWallet(address)
      go('done')
      return
    }
    waitingRef.current = true
    try {
      if (choice === 'telegram') await tonConnectUI.openSingleWalletModal('telegram-wallet')
      else await tonConnectUI.openModal()
    } catch {
      await tonConnectUI.openModal()
    }
  }
  const pick = (w) => {
    haptic.tick()
    setChoice(w)
  }

  return (
    <>
      <Head title="Кошелёк">Монеты хранятся у тебя, а не у нас</Head>

      <div className="wallets">
        <button type="button" className={`card wallet ${choice === 'telegram' ? 'is-selected' : ''}`} onClick={() => pick('telegram')}>
          <WalletLogo src={TG_WALLET_LOGO} />
          <span className="wallet__text">
            <span className="wallet__name">Кошелёк в Telegram</span>
            <span className="wallet__sub wallet__sub--accent">Рекомендуем, уже есть в Telegram</span>
          </span>
          <Diode on={choice === 'telegram'} />
        </button>
        <button type="button" className={`card wallet ${choice === 'other' ? 'is-selected' : ''}`} onClick={() => pick('other')}>
          <WalletGlyph kind="other" />
          <span className="wallet__text">
            <span className="wallet__name">Другой кошелёк TON</span>
            <span className="wallet__sub">Через TON Connect</span>
          </span>
          <Diode on={choice === 'other'} />
        </button>
      </div>

      <section className="card safe">
        <div className="safe__head">
          <DotIcon cells={SHIELD} />
          <strong>Это безопасно</strong>
        </div>
        <ul className="bullets bullets--small">
          <li>Деньги и ключи остаются у тебя</li>
          <li>Каждую покупку подтверждаешь сам</li>
        </ul>
      </section>

      <Foot>
        <MainButton onClick={connect}>{address ? 'Дальше' : 'Подключить'}</MainButton>
        <TextButton
          onClick={() => {
            setWallet(null)
            go('done')
          }}
        >
          Сначала осмотрюсь
        </TextButton>
      </Foot>
    </>
  )
}

/* 05 Готово */

function Done({ plan, wallet, onFinish, go }) {
  const [emotion, setEmotion] = useState('awake')

  // проснулся → подмигнул → радуется
  useEffect(() => {
    const a = setTimeout(() => { setEmotion('wink'); haptic.success() }, 350)
    const b = setTimeout(() => setEmotion('joy'), 1300)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [])

  const rows = [
    ['План', `$${plan.amount} ${freqText(plan)}`],
    ['Монеты', coinsText(plan.coins)],
    ['День', plan.freq === 'week' ? dayEach(plan.day) : dayText(plan)],
    ['Первая покупка', firstPurchaseDate(plan), 'accent'],
    ['Кошелёк', wallet ? shortAddress(wallet) : 'не подключён', wallet ? 'mono' : 'muted'],
  ]

  return (
    <>
      <Head title="Всё готово">
        Kopitron напомнит, когда пора.<br />Тебе останется сдвинуть ползунок
      </Head>

      <div className="done__face">
        <KopitronFace emotion={emotion} size={128} />
      </div>

      <dl className="card table">
        {rows.map(([k, v, tone], i) => (
          <div key={k} className="table__row" style={{ animationDelay: `${200 + i * 60}ms` }}>
            <dt>{k}</dt>
            <dd className={tone ? `is-${tone}` : ''}>{v}</dd>
          </div>
        ))}
      </dl>

      <Foot>
        <MainButton onClick={() => onFinish?.({ plan, wallet })}>На главную</MainButton>
        <TextButton onClick={() => go('plan')}>Изменить план</TextButton>
      </Foot>
    </>
  )
}
