import Swipe from '../components/Swipe.jsx'
import MainButton from '../components/MainButton.jsx'
import CoinIcon from '../components/CoinIcon.jsx'
import { DotNumber } from '../components/DotGrid.jsx'
import { COINS, PORTFOLIO, NEXT_PURCHASE, GOAL, money, pct } from '../data/mock.js'
import { usePortfolio, fmtAmount } from '../api/tonapi.js'
import { usePlans, planShort, nextPurchase } from '../data/plans.js'
import { isDemoWallet } from '../wallet.js'
import './Home.css'

const names = (coins, key = 'name') => coins.map((c) => COINS[c][key]).join(', ').replace(/, ([^,]*)$/, ' и $1')

// Главная: всё на первом экране, свайп в 16 px над таб-баром
export default function Home({ nav, wallet, purchased, onSwipe, onConnect }) {
  const plans = usePlans()
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
  const goalSaved = demo ? GOAL.saved : total
  const goalPct = Math.min(100, Math.round((goalSaved / GOAL.target) * 100))

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
        ) : (
          <button type="button" className="card card--pad goal" onClick={() => nav.tab('goals')}>
            <span className="goal__head">
              <span>Цель {money(GOAL.target)}</span>
              <span>{goalPct}%</span>
            </span>
            <span className="segbar">
              {Array.from({ length: 20 }, (_, i) => <i key={i} className={i < Math.round(goalPct / 5) ? 'is-on' : ''} />)}
            </span>
            <span className="muted goal__eta">{demo ? `≈ ${GOAL.eta}` : `Собрано ${money(Math.round(goalSaved))}`}</span>
          </button>
        )}
      </div>

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
