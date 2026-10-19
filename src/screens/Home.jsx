import Swipe from '../components/Swipe.jsx'
import MainButton from '../components/MainButton.jsx'
import CoinIcon from '../components/CoinIcon.jsx'
import { DotNumber } from '../components/DotGrid.jsx'
import { COINS, PORTFOLIO, NEXT_PURCHASE, GOAL, money, pct } from '../data/mock.js'
import { usePortfolio, fmtAmount } from '../api/tonapi.js'
import { isDemoWallet } from '../wallet.js'
import './Home.css'

// Главная: всё на первом экране, свайп в 16 px над таб-баром
export default function Home({ nav, wallet, plan, purchased, onSwipe, onConnect }) {
  const amount = plan?.amount ?? NEXT_PURCHASE.amount
  const planCoins = plan?.coins ?? ['btc', 'eth', 'gram']
  const empty = !wallet
  // настоящие балансы из кошелька; в демо-режиме — примерные из макета
  const live = usePortfolio(wallet && !isDemoWallet(wallet) ? wallet : null)
  const planLabel = `$${amount} ${plan?.freq === 'month' ? 'раз в месяц' : 'по пт'}`
  let holdings, total, change, loading = false
  if (live.data || live.loading) {
    loading = !live.data
    const d = live.data ?? {}
    const coins = [...new Set([...planCoins, ...['btc', 'eth', 'gram'].filter((c) => d[c]?.amount > 0)])]
    holdings = coins.map((c) => ({
      coin: c,
      amount: fmtAmount(d[c]?.amount ?? 0),
      value: d[c]?.value ?? 0,
      change: d[c]?.amount > 0 ? d[c].change : null,
      plan: planCoins.includes(c) ? planLabel : 'без плана',
    }))
    total = holdings.reduce((s, h) => s + h.value, 0)
    change = total ? holdings.reduce((s, h) => s + (h.change ?? 0) * h.value, 0) / total : 0
  } else if (empty) {
    holdings = planCoins.map((c) => ({ coin: c, value: 0, plan: planLabel }))
    total = 0
  } else {
    holdings = PORTFOLIO.holdings
    total = PORTFOLIO.total + (purchased ? amount : 0)
    change = PORTFOLIO.change
  }
  const isLive = Boolean(live.data || live.loading)
  const nextCoins = empty ? planCoins.map((c) => COINS[c].ticker).join(', ').replace(/, ([^,]*)$/, ' и $1') : COINS[NEXT_PURCHASE.coin].name
  const goalPct = Math.round((GOAL.saved / GOAL.target) * 100)

  return (
    <div className="scr scr--tab">
      <div className="scr__body home">
        <header className="home__total">
          <span className={`home__sum num ${loading ? 'is-loading' : ''}`}>{money(Math.round(total))}</span>
          {!empty && total > 0 && (
            <span className="home__change">
              <span className="chip">{pct(Math.round(change * 10) / 10)}</span>
              <span className="muted">{isLive ? 'за сутки' : 'за всё время'}</span>
            </span>
          )}
        </header>

        <section className="card list">
          {holdings.map((h) => (
            <button key={h.coin} type="button" className="row" onClick={() => nav.push('coin', { coin: h.coin })}>
              <CoinIcon coin={h.coin} size={36} />
              <span className="row__main">
                <span className="row__title">{COINS[h.coin].name}</span>
                <span className="row__sub">{empty || h.amount === '0' ? `Пока пусто, ${h.plan}` : `${h.amount} ${COINS[h.coin].ticker}, ${h.plan}`}</span>
              </span>
              <span className="row__end">
                <span className="row__value">{money(Math.round(h.value))}</span>
                {!empty && h.change != null && <span className={`row__delta ${h.change >= 0 ? 'up' : 'down'}`}>{pct(Math.round(h.change * 10) / 10)}</span>}
              </span>
            </button>
          ))}
        </section>

        <section className="card card--pad next">
          <div className="next__head">
            <span className="label">Следующая покупка</span>
            <span className="chip"><i className="chip__dot" />Напоминание</span>
          </div>
          <div className="next__body">
            <DotNumber value={purchased ? 7 : NEXT_PURCHASE.days} />
            <div className="next__info">
              <span className="label">Дней до покупки</span>
              <strong>${amount} → {nextCoins}</strong>
              <span className="accent next__date">{purchased ? 'пт, 28 октября' : NEXT_PURCHASE.date}</span>
            </div>
          </div>
        </section>

        {empty ? (
          <section className="card card--pad">
            <strong className="home__nowallet">Кошелёк не подключён</strong>
            <p className="muted home__nowallet-sub">Подключи, и Kopitron начнёт копить по плану</p>
          </section>
        ) : (
          <button type="button" className="card card--pad goal" onClick={() => nav.tab('goals')}>
            <span className="goal__head">
              <span>Цель {money(GOAL.target)}</span>
              <span>{goalPct}%</span>
            </span>
            <span className="segbar">
              {Array.from({ length: 20 }, (_, i) => <i key={i} className={i < Math.round(goalPct / 5) ? 'is-on' : ''} />)}
            </span>
            <span className="muted goal__eta">≈ {GOAL.eta}</span>
          </button>
        )}
      </div>

      <div className="scr__foot">
        {empty ? (
          <MainButton onClick={onConnect}>Подключить кошелёк</MainButton>
        ) : purchased ? (
          <Swipe disabled label={`Следующая ${NEXT_PURCHASE.after}`} />
        ) : (
          <Swipe
            label={`Сдвинь, чтобы положить $${amount}`}
            doneLabel={`Готово, $${amount} → ${COINS[NEXT_PURCHASE.coin].ticker}`}
            onDone={onSwipe}
          />
        )}
      </div>
    </div>
  )
}
