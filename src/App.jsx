import { useEffect, useState } from 'react'
import { useWallet } from './wallet.js'
import Onboarding from './onboarding/Onboarding.jsx'
import TabBar from './components/TabBar.jsx'
import Home from './screens/Home.jsx'
import { History, PurchaseDetails } from './screens/History.jsx'
import Coin from './screens/Coin.jsx'
import { Goals, PlanEdit, NewPlan, RemindersSheet } from './screens/Goals.jsx'
import { Profile, WalletScreen, ChoiceSheet, Dca, Support, About, Legal } from './screens/Profile.jsx'
import { SignSheet, LowBalanceSheet, Waiting, Success, SetGoal, Cancelled, SignPending, Quoting, fmtCoin } from './screens/Purchase.jsx'
import { useTonConnectUI } from '@tonconnect/ui-react'
import { usePortfolio } from './api/tonapi.js'
import { preparePurchase, executePurchase } from './api/omniston.js'
import { isDemoWallet } from './wallet.js'
import { COINS } from './data/mock.js'
import { setPlansFromOnboarding, setGoal, useGoal, getGoal, usePlans, nextPurchase } from './data/plans.js'
import { backButton } from './telegram.js'
import './styles/ui.css'

const params = new URLSearchParams(window.location.search)
const store = {
  get: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, v) } catch { /* без хранилища тоже работаем */ } },
}

// Экраны поверх вкладок. withTabs — показывать ли таб-бар (по спеке: Монета и Детали покупки)
// Экран цели поверх вкладки: поставить или поменять общую цель
function GoalScreen({ nav }) {
  const goal = useGoal()
  return <SetGoal first={false} initial={goal ?? undefined} onSave={(v) => { setGoal(v); nav.back() }} onSkip={nav.back} />
}

const SCREENS = {
  goal: { C: GoalScreen },
  coin: { C: Coin, withTabs: true },
  purchase: { C: PurchaseDetails, withTabs: true },
  plan: { C: PlanEdit },
  newplan: { C: NewPlan },
  wallet: { C: WalletScreen },
  dca: { C: Dca },
  support: { C: Support },
  about: { C: About },
  legal: { C: Legal },
}

export default function App() {
  const [onboarded, setOnboarded] = useState(
    () => params.get('screen') === 'home' || (store.get('kopitron.onboarded') === '1' && params.get('onboarding') !== '1'),
  )
  const [plan, setPlan] = useState(() => { try { return JSON.parse(store.get('kopitron.plan')) } catch { return null } })

  if (!onboarded) {
    return (
      <Onboarding
        onFinish={({ plan }) => {
          setPlan(plan)
          store.set('kopitron.plan', JSON.stringify(plan))
          setPlansFromOnboarding(plan)
          store.set('kopitron.onboarded', '1')
          setOnboarded(true)
        }}
      />
    )
  }
  return <Main plan={plan} />
}

function Main({ plan }) {
  const wallet = useWallet()
  const [tab, setTab] = useState('home')
  const [stack, setStack] = useState([])
  const [dir, setDir] = useState('forward')
  const [sheet, setSheet] = useState(null)
  const [flow, setFlow] = useState(null) // waiting | success | setgoal | cancelled
  const [purchased, setPurchased] = useState(false)
  const [firstDone, setFirstDone] = useState(() => store.get('kopitron.firstPurchase') === '1')
  const [settings, setSettings] = useState({ currency: 'USD', lang: 'ru' })

  const nav = {
    push: (name, p = {}) => { setDir('forward'); setStack((s) => [...s, { name, p }]) },
    back: () => { setDir('back'); setStack((s) => s.slice(0, -1)) },
    tab: (id) => { setStack([]); setTab(id) },
  }

  // «Назад» в шапке Telegram, когда открыт экран поверх вкладки
  useEffect(() => backButton(stack.length && !flow ? nav.back : null), [stack.length, flow])

  const amount = plan?.amount ?? 10
  const [tonConnectUI] = useTonConnectUI()
  const real = wallet && !isDemoWallet(wallet)
  const portfolio = usePortfolio(real ? wallet : null)
  const goal = useGoal()
  const myPlans = usePlans()
  // сколько уже в копилке: только монеты из планов
  const saved = myPlans.reduce((s, p) => s + (portfolio.data?.[p.coin]?.value ?? 0), 0)
  const [buy, setBuy] = useState({ quotes: [], progress: 0, received: '', error: null, usd: amount })
  const [low, setLow] = useState(null)

  // Настоящая покупка: проверяем баланс → котировка → подпись → отслеживание
  const startPurchase = async (usd = amount, planCoins) => {
    const d = portfolio.data
    const usdt = d?.usdt?.amount ?? 0
    const gram = d?.gram?.amount ?? 0
    if (d && usdt < usd) { setBuy((b) => ({ ...b, coins: planCoins })); setLow({ balance: Math.floor(usdt * 100) / 100 }); setSheet('low'); return }
    if (d && gram < 0.3) { setLow({ gas: true }); setSheet('low'); return }
    const coins = planCoins?.length ? planCoins : buy.coins?.length ? buy.coins : ['btc']
    setBuy({ quotes: [], progress: 0, received: '', error: null, usd, coins })
    setFlow('quoting')
    try {
      const quotes = await preparePurchase({ coins, usd })
      setBuy((b) => ({ ...b, quotes }))
      setFlow('signing')
      await executePurchase({
        quotes,
        trader: wallet,
        tonConnectUI,
        onProgress: (p) => { setFlow('waiting'); setBuy((b) => ({ ...b, progress: p })) },
      })
      setBuy((b) => ({ ...b, progress: 1, received: quotes.map((q) => `+${fmtCoin(q.receive)} ${COINS[q.coin].ticker}`).join(', ') }))
      setFlow('success')
    } catch (e) {
      if (e.code === 'rejected') setFlow('cancelled')
      else { setBuy((b) => ({ ...b, error: e })); setFlow('error') }
    }
  }

  const finishPurchase = () => {
    setFlow(null)
    setPurchased(true)
    setTab('home')
    setStack([])
  }

  // полноэкранные шаги покупки
  if (flow === 'quoting') return <div className="app"><Quoting /></div>
  if (flow === 'signing') return <div className="app"><SignPending quotes={buy.quotes} onCancel={() => setFlow('cancelled')} /></div>
  if (flow === 'waiting') {
    const q = buy.quotes
    return (
      <div className="app">
        {real && q.length ? (
          <Waiting
            amount={buy.usd}
            progress={buy.progress}
            title={`Покупаем ${q.map((x) => COINS[x.coin].name).join(' и ')}`}
            summary={`$${buy.usd} → ${q.map((x) => `${fmtCoin(x.receive)} ${COINS[x.coin].ticker}`).join(' + ')}`}
          />
        ) : (
          <Waiting amount={amount} onDone={() => setFlow('success')} />
        )}
      </div>
    )
  }
  if (flow === 'error')
    return (
      <div className="app">
        <Cancelled
          title="Не получилось"
          sub={buy.error?.message ?? 'Что-то пошло не так'}
          note="Если транзакция ушла, а обмен не прошёл, деньги вернутся в кошелёк автоматически"
          onRetry={() => startPurchase(buy.usd, buy.coins)}
          onHome={() => setFlow(null)}
        />
      </div>
    )
  if (flow === 'success')
    return (
      <div className="app">
        <Success
          amount={real ? buy.usd : amount}
          received={real ? buy.received : undefined}
          goal={real ? goal : undefined}
          saved={real ? Math.max(0, saved - buy.usd) : undefined}
          nextDate={real ? nextPurchase(myPlans, new Date(Date.now() + 86400000))?.date : undefined}
          onHome={() => {
            if (!firstDone) {
              setFirstDone(true)
              store.set('kopitron.firstPurchase', '1')
              if (getGoal()) finishPurchase()
              else setFlow('setgoal')
            } else finishPurchase()
          }}
        />
      </div>
    )
  if (flow === 'setgoal') return <div className="app"><SetGoal onSave={(v) => { setGoal(v); finishPurchase() }} onSkip={finishPurchase} /></div>
  if (flow === 'cancelled')
    return (
      <div className="app">
        <Cancelled
          onRetry={() => { if (real) startPurchase(buy.usd, buy.coins); else { setFlow(null); setSheet('sign') } }}
          onHome={() => setFlow(null)}
        />
      </div>
    )

  const top = stack.at(-1)
  const Screen = top && SCREENS[top.name]
  const showTabs = !top || Screen.withTabs

  return (
    <div className="app">
      <div key={top ? `${stack.length}-${top.name}` : tab} className={`scr-wrap ${dir === 'back' ? 'scr--back' : ''}`}>
        {top ? (
          <Screen.C {...top.p} nav={nav} />
        ) : tab === 'home' ? (
          <Home
            nav={nav}
            wallet={wallet}
            plan={plan}
            purchased={purchased}
            onConnect={() => nav.push('wallet')}
            onReminders={() => setSheet('reminders')}
            onSwipe={(next) => (real ? startPurchase(next.amount, next.coins) : setSheet(params.get('demo') === 'low' ? 'low' : 'sign'))}
          />
        ) : tab === 'history' ? (
          <History nav={nav} />
        ) : tab === 'goals' ? (
          <Goals nav={nav} />
        ) : (
          <Profile nav={nav} settings={settings} openSheet={setSheet} />
        )}
      </div>

      {showTabs && <TabBar active={tab} onChange={nav.tab} />}

      {sheet === 'sign' && (
        <SignSheet
          amount={amount}
          onConfirm={() => { setSheet(null); setFlow('waiting') }}
          onCancel={() => { setSheet(null); setFlow('cancelled') }}
        />
      )}
      {sheet === 'low' && (
        <LowBalanceSheet
          amount={amount}
          balance={low?.balance ?? 4}
          gas={low?.gas}
          onClose={() => setSheet(null)}
          onBuyAvailable={() => { setSheet(null); startPurchase(Math.floor(low?.balance ?? 0), buy.coins) }}
        />
      )}
      {sheet === 'reminders' && <RemindersSheet onClose={() => setSheet(null)} />}
      {sheet === 'currency' && (
        <ChoiceSheet
          title="Валюта"
          text="В этой валюте показываем суммы и цели. Покупка всё равно идёт в USDT"
          options={[['USD', 'Доллар', 'USD'], ['EUR', 'Евро', 'EUR'], ['RUB', 'Рубль', 'RUB']]}
          value={settings.currency}
          onPick={(currency) => setSettings({ ...settings, currency })}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'language' && (
        <ChoiceSheet
          title="Язык"
          options={[['ru', 'Русский', ''], ['en', 'English', '']]}
          value={settings.lang}
          onPick={(lang) => setSettings({ ...settings, lang })}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  )
}
