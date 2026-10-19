import { useCallback, useEffect, useRef, useState } from 'react'
import KopitronFace from './KopitronFace.jsx'
import { haptic } from '../telegram.js'
import './Swipe.css'

// Свайп покупки. Состояния как в Figma (114:1692):
// Покой → Касание → Середина → У цели → Готово
const KNOB = 56
const INSET = 4
const DOT_STEP = 10
const NEAR_GOAL = 0.85

function DotArrow() {
  // стрелка из тёмных точек на ползунке
  const cells = [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [4, 0], [5, 1], [5, 3], [4, 4]]
  return (
    <svg width="24" height="17" viewBox="0 0 24 17" aria-hidden="true">
      {cells.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={1.5 + x * 3.5} cy={1.5 + y * 3.5} r={1.4} fill="var(--color-text-on-accent)" />
      ))}
    </svg>
  )
}

export default function Swipe({ label = 'Сдвинь, чтобы положить $10', doneLabel = 'Готово, $10 → Bitcoin', onDone }) {
  const trackRef = useRef(null)
  const startRef = useRef(0)
  const lastDotsRef = useRef(0)
  const [x, setX] = useState(0)
  const [max, setMax] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const measure = () => {
      const w = trackRef.current?.offsetWidth ?? 0
      // ползунок останавливается перед гнездом с лицом
      setMax(Math.max(0, w - KNOB * 2 - INSET * 3))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const progress = max ? x / max : 0
  const state = done
    ? 'done'
    : !dragging && x === 0
      ? 'rest'
      : progress >= NEAR_GOAL
        ? 'goal'
        : progress > 0.3
          ? 'middle'
          : 'touch'

  const emotion = { rest: 'sleep', touch: 'awake', middle: 'attention', goal: 'waiting', done: 'wink' }[state]

  const finish = useCallback(() => {
    setDone(true)
    setDragging(false)
    setX(max)
    haptic.success()
    onDone?.()
    // через ~1,5 с Kopitron засыпает обратно
    setTimeout(() => {
      setDone(false)
      setX(0)
    }, 1600)
  }, [max, onDone])

  const onPointerDown = (e) => {
    if (done) return
    e.currentTarget.setPointerCapture(e.pointerId)
    startRef.current = e.clientX - x
    lastDotsRef.current = 0
    setDragging(true)
    haptic.light()
  }

  const onPointerMove = (e) => {
    if (!dragging || done) return
    const next = Math.min(max, Math.max(0, e.clientX - startRef.current))
    setX(next)
    const dots = Math.floor(next / (DOT_STEP * 3))
    if (dots !== lastDotsRef.current) {
      lastDotsRef.current = dots
      haptic.tick()
    }
    if (next >= max) finish()
  }

  const onPointerUp = () => {
    if (done) return
    setDragging(false)
    // отпустил раньше — пружина назад
    setX(0)
  }

  const trailCount = Math.max(0, Math.floor((x - 4) / DOT_STEP))

  return (
    <div ref={trackRef} className={`swipe swipe--${state}`}>
      <div className="swipe__progress" style={{ width: done ? '100%' : state === 'rest' ? 0 : x + INSET + KNOB / 2 }} />

      <div className="swipe__trail" aria-hidden="true">
        {Array.from({ length: trailCount }, (_, i) => (
          <span key={i} style={{ left: 14 + i * DOT_STEP }} />
        ))}
      </div>

      <span className="swipe__label mono-label">{label}</span>
      <span className="swipe__done mono-label">{doneLabel}</span>

      <div className="swipe__socket">
        <KopitronFace emotion={emotion} />
      </div>

      <button
        type="button"
        className="swipe__knob"
        aria-label={label}
        style={{ transform: `translateX(${x}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <DotArrow />
      </button>
    </div>
  )
}
