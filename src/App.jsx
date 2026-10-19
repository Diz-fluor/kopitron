import { useState } from 'react'
import Onboarding from './onboarding/Onboarding.jsx'
import Home from './home/Home.jsx'

export default function App() {
  // ?screen=home — кнопка «Положить» из напоминания бота открывает сразу Главную
  const [route, setRoute] = useState(() =>
    new URLSearchParams(window.location.search).get('screen') === 'home' ? 'home' : 'onboarding',
  )
  const [plan, setPlan] = useState(null)
  const [run, setRun] = useState(0)

  if (route === 'onboarding') {
    return (
      <Onboarding
        key={run}
        onFinish={({ plan }) => {
          setPlan(plan)
          setRoute('home')
        }}
      />
    )
  }
  return (
    <Home
      plan={plan}
      onRestart={() => {
        setRun((r) => r + 1)
        setRoute('onboarding')
      }}
    />
  )
}
