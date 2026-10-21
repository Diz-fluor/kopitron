import { useState } from 'react'
import Swipe from '../components/Swipe.jsx'
import KopitronFace from '../components/KopitronFace.jsx'
import { useLiveHistory } from './History.jsx'
import MainButton from '../components/MainButton.jsx'
import CoinIcon from '../components/CoinIcon.jsx'
import { DotNumber } from '../components/DotGrid.jsx'
import { COINS, PORTFOLIO, NEXT_PURCHASE, GOAL, money, pct } from '../data/mock.js'
import { usePortfolio, fmtAmount } from '../api/tonapi.js'
import { usePlans, planShort, nextPurchase, useGoal, perMonthUsd, etaText, setPlansFromOnboarding } from '../data/plans.js'
import { DeviceHero } from '../onboarding/Onboarding.jsx'
import { PRESETS, perMonth, freqText, coinsText } from '../onboarding/plan.js'
import { CoinStack } from '../components/CoinIcon.jsx'
import { haptic } from '../telegram.js'
import { isDemoWallet } from '../wallet.js'
import './Home.css'
import Sheet from '../components/Sheet.jsx'

const names = (coins, key = 'name') => coins.map((c) => COINS[c][key]).join(', ').replace(/, ([^,]*)$/, ' и $1')

// Главная: всё на первом экране, свайп в 16 px над таб-баром
export default function Home({ nav, wallet, purchased, onSwipe, onConnect }) {
  const plans = usePlans()
  const userGoal = useGoal()
  const demo = isDemoWallet(wallet)
  const empty = !wallet
  const live = usePortfolio(wallet && !demo ? wallet : null)

  // показываем только монеты из планов: копишь в биткоин — видишь биткоин
  let holdings, total, change, loading = false
  if (demo) {
    holdings = PORTFOLIO.holdings
    total = PORTFOLIO.total
    change = PORTFOLIO.change
  } else {
    loading = live.loading && !live.data
    const d = live.data ?? {}
    holdings = plans.map((p) => ({
      coin: p.coin,
      amount: fmtAmount(d[p.coin]?.amount ?? 0),
      value: d[p.coin]?.value ?? 0,
      change: d[p.coin]?.amount > 0 ? d[p.coin].change : null,
      plan: p.paused ? 'на паузе' : planShort(p),
    }))
    total = holdings.reduce((s, h) => s + h.value, 0)
    change = total ? holdings.reduce((s, h) => s + (h.change ?? 0) * h.value, 0) / total : 0
  }

  const next = demo
    ? { days: NEXT_PURCHASE.days, date: NEXT_PURCHASE.date, amount: 10, coins: ['btc'] }
    : nextPurchase(plans)
  const after = next?.when ? nextPurchase(plans, new Date(+next.when + 86400000)) : null
  const goalTarget = demo ? GOAL.target : userGoal
  const goalSaved = demo ? GOAL.saved : total
  const goalPct = goalTarget ? Math.min(100, Math.round((goalSaved / goalTarget) * 100)) : 0

  const drop = useMarketDrop(plans, demo, live.data)
  const [why, setWhy] = useState(false)
  const [, rerender] = useState(0)
  const showDrop = drop && !dropSeen(drop)

  // кошелёк есть, а планов нет: копилка ждёт первый план
  if (!demo && !empty && !plans.length) return <EmptyHome nav={nav} />

  return (
    <div className="scr scr--tab">
      <div className="scr__body home">
        <header className="home__total">
          <span className={`home__sum num ${loading ? 'is-loading' : ''}`}>{money(Math.round(total))}</span>
          {!empty && total > 0 && (
            <span className="home__change">
              <span className="chip">{pct(Math.round(change * 10) / 10)}</span>
              <span className="muted">{demo ? 'за всё время' : 'за сутки'}</span>
            </span>
          )}
        </header>

        {showDrop && (
          <button type="button" className="card drop" onClick={() => { haptic.tick(); setWhy(true) }}>
            <span className="drop__nest"><KopitronFace emotion="attention" size={28} /></span>
            <span className="drop__text">
              <strong>Рынок просел на&nbsp;{drop.pct}%</strong>
              <span>Твои ${next?.amount ?? 10} купят больше {COINS[drop.coin].gen}</span>
            </span>
            <span className="row__chevron">›</span>
          </button>
        )}

        {holdings.length > 0 ? (
          <section className="card list">
            {holdings.map((h) => (
              <button key={h.coin} type="button" className="row" onClick={() => nav.push('coin', { coin: h.coin })}>
                <CoinIcon coin={h.coin} size={36} />
                <span className="row__main">
                  <span className="row__title">{COINS[h.coin].name}</span>
                  <span className="row__sub">{h.amount === '0' ? `Пока пусто, ${h.plan}` : `${h.amount} ${COINS[h.coin].ticker}, ${h.plan}`}</span>
                </span>
                <span className="row__end">
                  <span className="row__value">{money(Math.round(h.value))}</span>
                  {h.change != null && <span className={`row__delta ${h.change >= 0 ? 'up' : 'down'}`}>{pct(Math.round(h.change * 10) / 10)}</span>}
                </span>
              </button>
            ))}
          </section>
        ) : (
          <button type="button" className="card card--pad home__noplan" onClick={() => nav.push('newplan')}>
            <strong>Плана пока нет</strong>
            <span className="muted">Выбери монету и сумму, и Kopitron начнёт напоминать ›</span>
          </button>
        )}

        {next && (
          <section className="card card--pad next">
            <div className="next__head">
              <span className="label">Следующая покупка</span>
              <span className="chip"><i className="chip__dot" />Напоминание</span>
            </div>
            <div className="next__body">
              <DotNumber value={purchased && after ? after.days : next.days} />
              <div className="next__info">
                <span className="label">Дней до покупки</span>
                <strong>${next.amount} → {names(next.coins, next.coins.length > 1 ? 'ticker' : 'name')}</strong>
                <span className="accent next__date">{purchased && after ? after.date : next.date}</span>
              </div>
            </div>
          </section>
        )}

        {empty ? (
          <section className="card card--pad">
            <strong className="home__nowallet">Кошелёк не подключён</strong>
            <p className="muted home__nowallet-sub">Подключи, и Kopitron начнёт копить по плану</p>
          </section>
        ) : !plans.length && !demo ? null : !goalTarget ? (
          <button type="button" className="card card--pad goal goal--empty" onClick={() => nav.push('goal')}>
            <span className="goal__head"><span>Поставь цель</span><span className="row__chevron">›</span></span>
            <span className="muted goal__eta">Сколько хочешь накопить. С целью проще не бросить</span>
          </button>
        ) : (
          <button type="button" className="card card--pad goal" onClick={() => nav.push('goal')}>
            <span className="goal__head">
              <span>Цель {money(goalTarget)}</span>
              <span>{goalPct}%</span>
            </span>
            <span className="segbar">
              {Array.from({ length: 20 }, (_, i) => <i key={i} className={i < Math.round(goalPct / 5) ? 'is-on' : ''} />)}
            </span>
            <span className="muted goal__eta">{demo ? `≈ ${GOAL.eta}` : [`Собрано ${money(Math.round(goalSaved))}`, etaText(goalTarget - goalSaved, perMonthUsd(plans))].filter(Boolean).join(', ≈ ').replace('≈ цель', 'цель')}</span>
          </button>
        )}
      </div>

      {why && drop && (
        <WhyDropSheet
          drop={drop}
          onClose={() => { markDropSeen(drop); setWhy(false); rerender((n) => n + 1) }}
        />
      )}

      <div className="scr__foot">
        {empty ? (
          <MainButton onClick={onConnect}>Подключить кошелёк</MainButton>
        ) : !next ? null : purchased ? (
          <Swipe disabled label={`Следующая ${(after ?? next).date.replace(/^[а-я]+, /, '')}`} />
        ) : (
          <Swipe
            label={`Сдвинь, чтобы положить $${next.amount}`}
            doneLabel={`Готово, $${next.amount} → ${names(next.coins, 'ticker')}`}
            onDone={() => onSwipe(next)}
          />
        )}
      </div>
    </div>
  )
}

/* Главная без плана: Kopitron ждёт, пресеты создают план в одно касание */
function EmptyHome({ nav }) {
  return (
    <div className="scr scr--tab">
      <div className="scr__body home home--empty">
        <DeviceHero className="home__hero" />
        <h1 className="title home__empty-title">Копилка пустая</h1>
        <p className="lead">Выбери план, и я начну напоминать</p>
        <div className="plans home__plans">
          {Object.values(PRESETS).map((p) => (
            <button key={p.id} type="button" className={`card plan ${p.id === 'balance' ? 'is-selected' : ''}`} onClick={() => { haptic.success(); setPlansFromOnboarding(p) }}>
              <span className="plan__head">
                <span className="plan__name">
                  {p.title}
                  {p.id === 'balance' && <span className="tag">Рекомендуем</span>}
                </span>
              </span>
              <span className="plan__coins">
                <CoinStack coins={p.coins} />
                <span>${p.amount} {freqText(p)} в {coinsText(p.coins)}</span>
              </span>
              <span className="plan__month">≈ ${perMonth(p)} в месяц</span>
            </button>
          ))}
          <button type="button" className="card plan plan--own" onClick={() => nav.push('newplan')}>
            <span>
              <span className="plan__own-title">Свой план</span>
              <span className="plan__own-sub">Сам выберу монеты, сумму и день</span>
            </span>
            <span className="plan__chevron">›</span>
          </button>
        </div>
      </div>
    </div>
  )
}

/* Просадка рынка: курс монеты ниже твоей средней цены покупки больше чем на 10%.
   В демо и по ?drop — пример из макета. */
const DROP_LIMIT = -0.1
const DROP_STEP = 10 // п.п.: плашка вернётся, если падение углубится ещё на столько
const DROP_KEY = 'kopitron.dropSeen'
let demoSeen = {} // для ?drop помним только до перезагрузки, чтобы пример можно было смотреть снова

const readSeen = (demo) => {
  if (demo) return demoSeen
  try { return JSON.parse(localStorage.getItem(DROP_KEY)) ?? {} } catch { return {} }
}
const writeSeen = (demo, v) => {
  if (demo) { demoSeen = v; return }
  try { localStorage.setItem(DROP_KEY, JSON.stringify(v)) } catch { /* без хранилища плашка просто покажется снова */ }
}

/* Плашку видели: прячем, пока падение не углубится на DROP_STEP или цена не восстановится и не упадёт заново */
function dropSeen(drop) {
  const seen = readSeen(drop.demo)[drop.coin]
  return seen != null && drop.pct < seen + DROP_STEP
}
function markDropSeen(drop) {
  writeSeen(drop.demo, { ...readSeen(drop.demo), [drop.coin]: drop.pct })
}

function useMarketDrop(plans, demo, data) {
  const { items } = useLiveHistory()
  if (new URLSearchParams(window.location.search).has('drop')) return { coin: 'btc', pct: 12, avg: 68200, now: 60100, demo: true }
  if (demo || !data) return null
  let worst = null
  const seen = readSeen(false)
  let cleared = false
  for (const p of plans) {
    const buys = items.filter((x) => x.coin === p.coin && !x.pending && x.amount > 0)
    const spent = buys.reduce((s, b) => s + b.usd, 0)
    const got = buys.reduce((s, b) => s + b.amount, 0)
    const now = data[p.coin]?.price
    if (!got || !now) continue
    const avg = spent / got
    const d = (now - avg) / avg
    // цена восстановилась: следующее падение покажем заново
    if (d > DROP_LIMIT && seen[p.coin] != null) { delete seen[p.coin]; cleared = true }
    if (d <= DROP_LIMIT && (!worst || d < worst.d)) worst = { coin: p.coin, d, pct: Math.round(-d * 100), avg, now }
  }
  if (cleared) writeSeen(false, seen)
  return worst
}

/* Шторка «Почему цена падает»: факты без обещаний, решение за пользователем */
function WhyDropSheet({ drop, onClose }) {
  const c = COINS[drop.coin]
  const facts = [
    ['01', 'Крипта волатильна', 'Падения на\u00a020–30% бывают регулярно'],
    ['02', 'Ты не угадываешь момент', 'Покупаешь по\u00a0плану, а\u00a0не по\u00a0курсу'],
    ['03', 'На падении больше монет', `За\u00a0те\u00a0же деньги выходит больше ${c.gen}`],
  ]
  return (
    <Sheet className="low" onClose={onClose}>
      <div className="low__face"><KopitronFace emotion="attention" size={52} /></div>
      <h2 className="low__title">Почему цена падает</h2>
      <p className="sheet__text topup__lead">Это нормально для крипты.<br />Решение за&nbsp;тобой</p>
      <ol className="topup__steps">
        {facts.map(([n, title, sub]) => (
          <li key={n} className="topup__step">
            <span className="topup__num mono-label">{n}</span>
            <span className="topup__body"><strong>{title}</strong><span>{sub}</span></span>
          </li>
        ))}
      </ol>
      <div className="drop__prices">
        <span><span className="mono-label">Твоя средняя цена</span><b className="num">{money(drop.avg)}</b></span>
        <i />
        <span><span className="mono-label">{c.name} сейчас</span><b className="num">{money(drop.now)}</b></span>
      </div>
      <p className="drop__note">Это не прогноз. Цена может падать и&nbsp;дальше</p>
      <div className="low__actions">
        <MainButton onClick={onClose}>Продолжить план</MainButton>
        <p className="drop__pause">Паузу можно поставить в&nbsp;настройках плана</p>
      </div>
    </Sheet>
  )
}
