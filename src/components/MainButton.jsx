import DotArrow from './DotArrow.jsx'
import { haptic } from '../telegram.js'
import './MainButton.css'

// Главная кнопка: оранжевая клавиша с тёмным торцом, подпись капсом слева, точечная стрелка справа
export default function MainButton({ children, onClick, disabled, variant, arrow = true, center }) {
  return (
    <button
      type="button"
      className={`main-button ${variant ? `main-button--${variant}` : ''} ${center ? 'main-button--center' : ''}`}
      disabled={disabled}
      onClick={() => {
        haptic.light()
        onClick?.()
      }}
    >
      <span>{children}</span>
      {arrow && <DotArrow color={variant === 'dark' ? 'var(--color-text)' : undefined} />}
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
