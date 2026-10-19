import Swipe from '../components/Swipe.jsx'
import MainButton from '../components/MainButton.jsx'
import CoinIcon from '../components/CoinIcon.jsx'
import { DotNumber } from '../components/DotGrid.jsx'
import { COINS, PORTFOLIO, NEXT_PURCHASE, GOAL, money, pct } from '../data/mock.js'
import './Home.css'

// Главная: всё на первом экране, свайп в 16 px над таб-баром
export default function Home({ nav, wallet, plan, purchased, onSwipe, onConnect }) {
  const amount = plan?.amount ?? NEXT_PURCHASE.amount
  const planCoins = plan?.coins ?? ['btc', 'eth', 'gram']
  const empty = !wallet
  const holdings = empty
    ? planCoins.map((c) => ({ coin: c, value: 0, plan: `$${amount} по пт` }))
    : PORTFOLIO.holdings
  const total = empty ? 0 : PORTFOLIO.total + (purchased ? amount : 0)
  const nextCoins = empty ? planCoins.map((c) => COINS[c].ticker).join(', ').replace(/, ([^,]*)$/, ' и $1') : COINS[NEXT_PURCHASE.coin].name
  const goalPct = Math.round((GOAL.saved / GOAL.target) * 100)

  return (
    <div className="scr scr--tab">
      <div className="scr__body home">
        <header className="home__total">
          <span className="home__sum num">{money(total)}</span>
          {!empty && (
            <span className="home__change">
              <span className="chip">{pct(PORTFOLIO.change)}</span>
              <span className="muted">за всё время</span>
            </span>
          )}
        </header>

        <section className="card list">
          {holdings.map((h) => (
            <button key={h.coin} type="button" className="row" onClick={() => nav.push('coin', { coin: h.coin })}>
              <CoinIcon coin={h.coin} size={36} />
              <span className="row__main">
                <span className="row__title">{COINS[h.coin].name}</span>
                <span className="row__sub">{empty ? `Пока пусто, ${h.plan}` : `${h.amount} ${COINS[h.coin].ticker}, ${h.plan}`}</span>
              </span>
              <span className="row__end">
                <span className="row__value">{money(h.value)}</span>
                {!empty && <span className={`row__delta ${h.change >= 0 ? 'up' : 'down'}`}>{pct(h.change)}</span>}
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
