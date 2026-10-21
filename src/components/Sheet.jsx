import { useEffect, useRef, useState } from 'react'

/* Шторка поверх экрана: тап по фону или свайп вниз закрывают её.
   Свайп начинается, только если содержимое шторки прокручено до верха,
   поэтому длинные тексты (условия) скроллятся как обычно. */
const CLOSE_DISTANCE = 90 // px
const CLOSE_SPEED = 0.5 // px/ms, быстрый смахивающий жест
const START = 6 // px, до этого порога считаем касание тапом

export default function Sheet({ className = '', onClose, children }) {
  const ref = useRef(null)
  const [closing, setClosing] = useState(false)
  const close = useRef(onClose)
  close.current = onClose

  const dismiss = () => {
    if (closing) return
    setClosing(true)
    setTimeout(() => close.current?.(), 200)
  }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let y0 = 0, t0 = 0, dy = 0, active = false, dragging = false

    const begin = (y) => {
      // тянем шторку только от верха её прокрутки
      active = el.scrollTop <= 0
      dragging = false
      y0 = y; t0 = performance.now(); dy = 0
    }
    const move = (y, e) => {
      if (!active) return
      dy = y - y0
      if (!dragging) {
        if (dy < -START) { active = false; return } // жест вверх отдаём прокрутке
        if (dy < START) return
        dragging = true
        el.style.transition = 'none'
        el.style.animation = 'none'
      }
      e?.cancelable && e.preventDefault()
      el.style.transform = `translateY(${Math.max(0, dy - START)}px)`
    }
    const end = () => {
      if (!active) return
      active = false
      if (!dragging) return
      const speed = dy / (performance.now() - t0)
      el.style.transition = 'transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1)'
      if (dy > CLOSE_DISTANCE || speed > CLOSE_SPEED) {
        el.style.transform = 'translateY(100%)'
        setClosing(true)
        setTimeout(() => close.current?.(), 200)
      } else {
        el.style.transform = ''
      }
      // после перетаскивания не даём сработать клику по кнопке под пальцем
      const stop = (ev) => { ev.stopPropagation(); ev.preventDefault() }
      el.addEventListener('click', stop, { capture: true, once: true })
      setTimeout(() => el.removeEventListener('click', stop, { capture: true }), 50)
    }

    const ts = (e) => begin(e.touches[0].clientY)
    const tm = (e) => move(e.touches[0].clientY, e)
    const md = (e) => { if (e.button === 0) begin(e.clientY) }
    const mm = (e) => move(e.clientY, e)

    el.addEventListener('touchstart', ts, { passive: true })
    el.addEventListener('touchmove', tm, { passive: false })
    el.addEventListener('touchend', end)
    el.addEventListener('touchcancel', end)
    el.addEventListener('mousedown', md)
    window.addEventListener('mousemove', mm)
    window.addEventListener('mouseup', end)
    return () => {
      el.removeEventListener('touchstart', ts)
      el.removeEventListener('touchmove', tm)
      el.removeEventListener('touchend', end)
      el.removeEventListener('touchcancel', end)
      el.removeEventListener('mousedown', md)
      window.removeEventListener('mousemove', mm)
      window.removeEventListener('mouseup', end)
    }
  }, [])

  return (
    <div className={`sheet-backdrop ${closing ? 'is-closing' : ''}`} onClick={dismiss}>
      <div ref={ref} className={`sheet ${className}`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet__grip" />
        {children}
      </div>
    </div>
  )
}
