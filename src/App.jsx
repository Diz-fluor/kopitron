import { useState } from 'react'
import Onboarding from './onboarding/Onboarding.jsx'
import Home from './home/Home.jsx'

export default function App() {
  const [route, setRoute] = useState('onboarding')
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
