// Планы пользователя: по одному на монету. Пока храним в браузере (localStorage),
// потом переедут в базу на Cloudflare, чтобы бот знал, когда напоминать.
import { useSyncExternalStore } from 'react'
import { DAYS } from '../onboarding/plan.js'

const KEY = 'kopitron.plans'
const listeners = new Set()

const read = () => {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) return JSON.parse(saved)
    // переезд со старого формата: один план онбординга на несколько монет
    const old = JSON.parse(localStorage.getItem('kopitron.plan') || 'null')
    return old ? fromOnboarding(old) : []
  } catch {
    return []
  }
}

let plans = read()

const write = (next) => {
  plans = next
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* без хранилища живём в памяти */ }
  listeners.forEach((l) => l())
}

// Онбординг: «$10 в BTC и ETH» превращаем в два плана по $5
export function fromOnboarding(p) {
  const each = Math.max(1, Math.round((p.amount / p.coins.length) * 100) / 100)
  return p.coins.map((coin) => ({ coin, amount: each, freq: p.freq, day: p.day, paused: false, goal: DEFAULT_GOALS[coin] }))
}

export const DEFAULT_GOALS = { btc: 0.01, eth: 0.1, gram: 100 }

export const setPlansFromOnboarding = (p) => write(fromOnboarding(p))
export const savePlan = (plan) => write([...plans.filter((x) => x.coin !== plan.coin), plan].sort(byCoin))
export const deletePlan = (coin) => write(plans.filter((x) => x.coin !== coin))

const ORDER = ['btc', 'eth', 'gram']
const byCoin = (a, b) => ORDER.indexOf(a.coin) - ORDER.indexOf(b.coin)

export function usePlans() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l) },
    () => plans,
  )
}

/* Тексты */

const EACH = ['каждый понедельник', 'каждый вторник', 'каждую среду', 'каждый четверг', 'каждую пятницу', 'каждую субботу', 'каждое воскресенье']

export function planTitle(p) {
  if (p.freq === 'month') return `$${p.amount} раз в месяц`
  if (p.freq === '2weeks') return `$${p.amount} раз в 2 недели, ${DAYS[p.day]}`
  return `$${p.amount} ${EACH[p.day]}`
}

export function planShort(p) {
  if (p.freq === 'month') return `$${p.amount} раз в месяц`
  return `$${p.amount} по ${DAYS[p.day]}`
}

export function planWhen(p, time = '09:00') {
  if (p.freq === 'month') return `1-го числа, ${time}`
  return `${DAYS[p.day]}, ${time}`
}

// Ближайшая покупка по всем активным планам
export function nextPurchase(list, from = new Date()) {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  let best = null
  for (const p of list.filter((x) => !x.paused)) {
    const d = new Date(today)
    if (p.freq === 'month') {
      d.setDate(1)
      if (d < today) d.setMonth(d.getMonth() + 1)
    } else {
      const dow = (d.getDay() + 6) % 7
      d.setDate(d.getDate() + ((p.day - dow + 7) % 7)) // сегодня тоже считается
    }
    if (!best || d < best.date) best = { date: d, plans: [p] }
    else if (+d === +best.date) best.plans.push(p)
  }
  if (!best) return null
  const days = Math.round((best.date - today) / 86400000)
  const date = best.date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })
  const amount = best.plans.reduce((s, p) => s + p.amount, 0)
  return { plans: best.plans, when: best.date, days, date, amount, coins: best.plans.map((p) => p.coin) }
}
