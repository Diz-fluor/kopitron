// «Добавим $5?» по мотивам Save More Tomorrow: после нескольких покупок подряд
// предлагаем чуть увеличить сумму со следующей покупки, заранее и с отменой в одно касание.
// Пока храним в браузере, как и планы.
import { useSyncExternalStore } from 'react'
import { savePlan } from './plans.js'

const KEY = 'kopitron.raise'
const EVERY = 4 // предлагаем после 4, 8, 12… покупок подряд
const DAY = 86400000
const PERIOD = { week: 7, '2weeks': 14, month: 31 }
const TIMES = { week: 52, '2weeks': 26, month: 12 }
const listeners = new Set()

const read = () => {
  try { return { streak: 0, last: 0, pending: null, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return { streak: 0, last: 0, pending: null } }
}
let state = read()
const write = (next) => {
  state = next
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* без хранилища живём в памяти */ }
  listeners.forEach((l) => l())
}

export function useRaise() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => state)
}

/* Шаг суммы как в плане: по $1 до $5, дальше по $5 */
export const nextAmount = (a) => (a < 5 ? a + 1 : a + 5)

/* Покупка прошла: считаем серию. Пропуск дольше полутора периодов плана обнуляет серию.
   Увеличение уже сработало, поэтому плашку «Вернуть» убираем. */
export function recordPurchase(plans, now = Date.now()) {
  const period = Math.max(7, ...plans.map((p) => PERIOD[p.freq] ?? 7))
  const inRow = state.last && now - state.last <= period * 1.5 * DAY
  write({ ...state, streak: inRow ? state.streak + 1 : 1, last: now, pending: null })
}

/* Показать предложение? Только для активных планов и на каждой EVERY-й покупке подряд */
export function shouldOffer(plans) {
  if (new URLSearchParams(window.location.search).has('raise')) return plans.length > 0
  return plans.length > 0 && plans.every((p) => !p.paused) && state.streak >= EVERY && state.streak % EVERY === 0
}

/* Варианты увеличения: на 1 или 2 шага по каждому плану покупки */
export function raiseOptions(plans) {
  const total = plans.reduce((s, p) => s + p.amount, 0)
  return [1, 2].map((steps) => {
    const next = plans.map((p) => {
      let a = p.amount
      for (let i = 0; i < steps; i++) a = nextAmount(a)
      return { ...p, amount: a }
    })
    const to = next.reduce((s, p) => s + p.amount, 0)
    // прибавка за год с учётом частоты каждого плана
    const perYear = next.reduce((s, p, i) => s + (p.amount - plans[i].amount) * (TIMES[p.freq] ?? 52), 0)
    return { steps, from: total, to, add: to - total, perYear, plans: next }
  })
}

/* Согласился: новые суммы со следующей покупки, старые помним для «Вернуть» */
export function acceptRaise(plans, option) {
  write({ ...state, pending: { from: option.from, to: option.to, before: plans.map((p) => ({ ...p })) } })
  option.plans.forEach(savePlan)
}

/* «Вернуть» в одно касание: возвращаем только суммы, остальные правки плана не трогаем */
export function undoRaise(current) {
  if (!state.pending) return
  for (const b of state.pending.before) {
    const now = current.find((p) => p.coin === b.coin)
    if (now) savePlan({ ...now, amount: b.amount })
  }
  write({ ...state, pending: null })
}
