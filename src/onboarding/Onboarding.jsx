import { useEffect, useRef, useState } from 'react'
import MainButton, { TextButton } from '../components/MainButton.jsx'
import KopitronFace from '../components/KopitronFace.jsx'
import CoinIcon, { CoinStack } from '../components/CoinIcon.jsx'
import { haptic, backButton } from '../telegram.js'
import {
  PRESETS, FREQS, DAYS, coinNames, coinsText, perMonth, freqText, dayEach, dayNearest, dayText, firstPurchaseDate, shares,
} from './plan.js'
import './Onboarding.css'

// Шаги онбординга. «Свой план» — ветка от шага «План», в метке остаётся 03.
const STEPS = ['hello', 'distance', 'plan', 'wallet', 'done']
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

  return (
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
    </div>
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

function Foot({ children }) {
  return <footer className="onb__foot">{children}</footer>
}

/* 01 Привет */

function Hello({ go }) {
  const [blink, setBlink] = useState(false)
  const [hasRender, setHasRender] = useState(true)

  // Kopitron моргает раз в несколько секунд, иногда дважды
  useEffect(() => {
    let t1, t2
    const loop = () => {
      t1 = setTimeout(() => {
        setBlink(true)
        t2 = setTimeout(() => {
          setBlink(false)
          if (Math.random() < 0.3) setTimeout(() => { setBlink(true); setTimeout(() => setBlink(false), 130) }, 180)
          loop()
        }, 140)
      }, 2600 + Math.random() * 2400)
    }
    t1 = setTimeout(loop, 600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <>
      <Head title={<>Привет,<br />я Kopitron</>}>
        Страшно начинать в крипте?<br />Со мной это как откладывать в копилку
      </Head>

      <div className="hero">
        {hasRender ? (
          <div className="hero__device">
            <span className="hero__shadow hero__shadow--soft" />
            <span className="hero__shadow hero__shadow--contact" />
            <span className="hero__shadow hero__shadow--cord" />
            <img
              src={`${import.meta.env.BASE_URL}kopitron-k01.png`}
              alt="Kopitron K-01"
              onError={() => setHasRender(false)}
              draggable="false"
            />
            <span className={`hero__lid hero__lid--left ${blink ? 'is-closed' : ''}`} />
            <span className={`hero__lid hero__lid--right ${blink ? 'is-closed' : ''}`} />
          </div>
        ) : (
          <div className="hero__fallback">
            <KopitronFace emotion={blink ? 'wink' : 'attention'} size={128} />
          </div>
        )}
      </div>

      <p className="hero__caption">
        <span>Kopitron K-01</span> / Копилка для крипты
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

function Distance({ go }) {
  return (
    <>
      <Head title="На дистанции">
        Kopitron не угадывает курс. Он покупает понемногу, и средняя цена выходит ровнее
      </Head>

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

function Diode({ on }) {
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
    setDraft((d) => ({ ...d, amount: Math.min(500, Math.max(5, d.amount + delta)) }))
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

const SHIELD = '1,0 2,0 3,0 4,0 5,0 6,0 7,0 0,1 8,1 0,2 8,2 0,3 5,3 8,3 0,4 2,4 4,4 8,4 1,5 3,5 7,5 2,6 6,6 3,7 5,7 4,8'

function DotIcon({ cells, size = 28, color = 'var(--color-accent)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
      {cells.split(' ').map((p) => {
        const [x, y] = p.split(',').map(Number)
        return <circle key={p} cx={1.8 + x * 3.55} cy={1.8 + y * 3.55} r={1.3} fill={color} />
      })}
    </svg>
  )
}

function WalletGlyph({ kind }) {
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

function Wallet({ go, wallet, setWallet }) {
  const [choice, setChoice] = useState(wallet ?? 'telegram')
  const pick = (w) => {
    haptic.tick()
    setChoice(w)
  }

  return (
    <>
      <Head title="Кошелёк">Монеты хранятся у тебя, а не у нас</Head>

      <div className="wallets">
        <button type="button" className={`card wallet ${choice === 'telegram' ? 'is-selected' : ''}`} onClick={() => pick('telegram')}>
          <WalletGlyph kind="telegram" />
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
        <MainButton
          onClick={() => {
            // подключение через TON Connect добавим на следующем шаге, пока имитируем
            setWallet(choice)
            go('done')
          }}
        >
          Подключить
        </MainButton>
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
    ['Кошелёк', wallet ? 'подключён' : 'не подключён', wallet ? '' : 'muted'],
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
