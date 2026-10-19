import { useState } from 'react'
import Swipe from './components/Swipe.jsx'
import KopitronFace from './components/KopitronFace.jsx'
import './App.css'

const EMOTIONS = [
  ['sleep', 'Спит'],
  ['awake', 'Проснулся'],
  ['attention', 'Внимание'],
  ['waiting', 'Ждёт'],
  ['wink', 'Подмигивает'],
  ['joy', 'Радость'],
  ['sad', 'Грусть'],
]

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <main className="screen">
      <header className="screen__head">
        <span className="mono-label screen__step">Прототип / Свайп</span>
        <h1 className="screen__title">Следующая покупка</h1>
        <p className="screen__amount">$10 → Bitcoin</p>
        <p className="screen__note">Сдвинь ползунок до конца. Отпустишь раньше, он вернётся.</p>
      </header>

      <section className="faces" aria-label="Эмоции Kopitron">
        {EMOTIONS.map(([id, name]) => (
          <figure key={id} className="faces__item">
            <div className="faces__socket">
              <KopitronFace emotion={id} />
            </div>
            <figcaption>{name}</figcaption>
          </figure>
        ))}
      </section>

      <footer className="screen__foot">
        <p className="screen__count mono-label">
          Положено: <span>{count}</span>
        </p>
        <Swipe onDone={() => setCount((c) => c + 1)} />
      </footer>
    </main>
  )
}
