import { useEffect, useState } from 'react'
import { useWallet } from './wallet.js'
import Onboarding from './onboarding/Onboarding.jsx'
import TabBar from './components/TabBar.jsx'
import Home from './screens/Home.jsx'
import { History, PurchaseDetails } from './screens/History.jsx'
import Coin from './screens/Coin.jsx'
import { Goals, PlanEdit, NewPlan, RemindersSheet } from './screens/Goals.jsx'
import { Profile, WalletScreen, ChoiceSheet, Dca, Support, About } from './screens/Profile.jsx'
import { SignSheet, LowBalanceSheet, Waiting, Success, SetGoal, Cancelled } from './screens/Purchase.jsx'
import { backButton } from './telegram.js'
import './styles/ui.css'

const params = new URLSearchParams(window.location.search)
const store = {
  get: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, v) } catch { /* без хранилища тоже работаем */ } },
}

// Экраны поверх вкладок. withTabs — показывать ли таб-бар (по спеке: Монета и Детали покупки)
const SCREENS = {
  coin: { C: Coin, withTabs: true },
  purchase: { C: PurchaseDetails, withTabs: true },
  plan: { C: PlanEdit },
  newplan: { C: NewPlan },
  wallet: { C: WalletScreen },
  dca: { C: Dca },
  support: { C: Support },
  about: { C: About },
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
  const [settings, setSettings] = useState({ currency: 'USD', lang: 'ru', notify: true })

  const nav = {
    push: (name, p = {}) => { setDir('forward'); setStack((s) => [...s, { name, p }]) },
    back: () => { setDir('back'); setStack((s) => s.slice(0, -1)) },
    tab: (id) => { setStack([]); setTab(id) },
  }

  // «Назад» в шапке Telegram, когда открыт экран поверх вкладки
  useEffect(() => backButton(stack.length && !flow ? nav.back : null), [stack.length, flow])

  const amount = plan?.amount ?? 10

  const finishPurchase = () => {
    setFlow(null)
    setPurchased(true)
    setTab('home')
    setStack([])
  }

  // полноэкранные шаги покупки
  if (flow === 'waiting') return <div className="app"><Waiting amount={amount} onDone={() => setFlow('success')} /></div>
  if (flow === 'success')
    return (
      <div className="app">
        <Success
          amount={amount}
          onHome={() => {
            if (!firstDone) {
              setFirstDone(true)
              store.set('kopitron.firstPurchase', '1')
              setFlow('setgoal')
            } else finishPurchase()
          }}
        />
      </div>
    )
  if (flow === 'setgoal') return <div className="app"><SetGoal onSave={finishPurchase} onSkip={finishPurchase} /></div>
  if (flow === 'cancelled')
    return (
      <div className="app">
        <Cancelled onRetry={() => { setFlow(null); setSheet('sign') }} onHome={() => setFlow(null)} />
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
            onSwipe={() => setSheet(params.get('demo') === 'low' ? 'low' : 'sign')}
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
      {sheet === 'low' && <LowBalanceSheet amount={amount} onClose={() => setSheet(null)} />}
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
