// Обёртка над Telegram WebApp SDK. Вне Telegram (в обычном браузере) всё тихо работает без него.
const tg = window.Telegram?.WebApp

// Внутри Telegram есть initData, в обычном браузере его нет
export const inTelegram = Boolean(tg?.initData)

export function initTelegram() {
  document.documentElement.classList.add(inTelegram ? 'in-telegram' : 'in-browser')
  if (!tg || !inTelegram) return
  tg.ready()
  tg.expand()
  try {
    tg.setHeaderColor('#263533')
    tg.setBackgroundColor('#263533')
    tg.setBottomBarColor?.('#263533')
    // чтобы свайп по экрану не сворачивал приложение
    tg.disableVerticalSwipes?.()
  } catch {}
}

// Кнопка «Назад» в шапке Telegram. Возвращает функцию отписки для useEffect.
export function backButton(handler) {
  const bb = tg?.BackButton
  if (!bb) return undefined
  if (!handler) {
    bb.hide()
    return undefined
  }
  bb.onClick(handler)
  bb.show()
  return () => {
    bb.offClick(handler)
    bb.hide()
  }
}

// Вибрация: в Telegram через HapticFeedback, в браузере через vibrate, если есть
export const haptic = {
  light() {
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light')
    else navigator.vibrate?.(8)
  },
  tick() {
    if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged()
    else navigator.vibrate?.(4)
  },
  success() {
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success')
    else navigator.vibrate?.([12, 40, 20])
  },
}
