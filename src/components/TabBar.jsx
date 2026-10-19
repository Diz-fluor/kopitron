import DotGrid from './DotGrid.jsx'
import { haptic } from '../telegram.js'
import './TabBar.css'

// Иконки таб-бара: сетка 9×9, точка 2,19, шаг 2,6 — из компонента 114:1538
const TABS = [
  { id: 'home', label: 'Главная', cells: '3,1 4,1 5,1 2,2 6,2 1,3 7,3 0,4 8,4 0,5 8,5 0,6 3,6 4,6 5,6 8,6 0,7 8,7 0,8 1,8 2,8 6,8 7,8 8,8' },
  { id: 'history', label: 'История', cells: '7,1 7,2 4,3 7,3 4,4 7,4 1,5 4,5 7,5 1,6 4,6 7,6 0,7 1,7 2,7 3,7 4,7 5,7 6,7 7,7 8,7' },
  { id: 'goals', label: 'Цели', cells: '2,0 3,0 4,0 5,0 6,0 1,1 7,1 0,2 8,2 0,3 4,3 8,3 0,4 3,4 4,4 5,4 8,4 0,5 4,5 8,5 0,6 8,6 1,7 7,7 2,8 3,8 4,8 5,8 6,8' },
  { id: 'profile', label: 'Профиль', cells: '3,0 4,0 5,0 2,1 6,1 2,2 6,2 2,3 6,3 3,4 4,4 5,4 1,5 2,5 3,5 4,5 5,5 6,5 7,5 0,6 8,6 0,7 8,7' },
]

export default function TabBar({ active, onChange }) {
  return (
    <nav className="tabbar">
      {TABS.map((t) => {
        const on = t.id === active
        return (
          <button
            key={t.id}
            type="button"
            className={`tabbar__item ${on ? 'is-on' : ''}`}
            onClick={() => {
              if (!on) haptic.tick()
              onChange(t.id)
            }}
          >
            <DotGrid
              cols={9}
              rows={9}
              cells={t.cells}
              dim
              dot={2.19}
              step={2.6}
              size={[24, 24]}
              color={on ? 'var(--color-accent)' : '#9e9e9c'}
              dimColor={on ? '#352520' : '#2b2b2b'}
            />
            <span>{t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
