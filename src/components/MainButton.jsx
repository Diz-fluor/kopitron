import DotArrow from './DotArrow.jsx'
import { haptic } from '../telegram.js'
import './MainButton.css'

// Главная кнопка: оранжевая клавиша с тёмным торцом, подпись капсом слева, точечная стрелка справа
export default function MainButton({ children, onClick, disabled }) {
  return (
    <button
      type="button"
      className="main-button"
      disabled={disabled}
      onClick={() => {
        haptic.light()
        onClick?.()
      }}
    >
      <span>{children}</span>
      <DotArrow />
    </button>
  )
}

// Второстепенное действие под главной кнопкой: текст капсом
export function TextButton({ children, onClick }) {
  return (
    <button type="button" className="text-button" onClick={onClick}>
      {children}
    </button>
  )
}
