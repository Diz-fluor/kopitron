// План накоплений: пресеты онбординга и расчёты для подписей

export const PRESETS = {
  start: { id: 'start', title: 'Старт', coins: ['btc'], amount: 5, freq: 'week', day: 4 },
  balance: { id: 'balance', title: 'Баланс', coins: ['btc', 'eth'], amount: 10, freq: 'week', day: 4 },
}

export const FREQS = [
  { id: 'week', label: 'Неделя', weeks: 1 },
  { id: '2weeks', label: '2 недели', weeks: 2 },
  { id: 'month', label: 'Месяц', weeks: 52 / 12 },
]

// 0 — понедельник
export const DAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
const DAYS_EACH = ['каждый понедельник', 'каждый вторник', 'каждую среду', 'каждый четверг', 'каждую пятницу', 'каждую субботу', 'каждое воскресенье']
const DAYS_NEAREST = ['в ближайший понедельник', 'в ближайший вторник', 'в ближайшую среду', 'в ближайший четверг', 'в ближайшую пятницу', 'в ближайшую субботу', 'в ближайшее воскресенье']

export const coinNames = { btc: 'Bitcoin', eth: 'Ethereum', gram: 'Gram' }

export function coinsText(coins) {
  const names = coins.map((c) => coinNames[c])
  if (names.length <= 1) return names[0] ?? ''
  return names.slice(0, -1).join(', ') + ' и ' + names.at(-1)
}

export function perMonth(plan) {
  const weeks = FREQS.find((f) => f.id === plan.freq)?.weeks ?? 1
  return Math.round((plan.amount * 52) / 12 / weeks)
}

export function freqText(plan) {
  if (plan.freq === 'week') return 'в неделю'
  if (plan.freq === '2weeks') return 'раз в 2 недели'
  return 'в месяц'
}

export function dayText(plan) {
  if (plan.freq === 'month') return 'раз в месяц'
  if (plan.freq === '2weeks') return `${DAYS[plan.day]}, раз в 2 недели`
  return DAYS_EACH[plan.day]
}

export const dayEach = (d) => DAYS_EACH[d]
export const dayNearest = (d) => DAYS_NEAREST[d]

// Ближайшая дата покупки в формате «пт, 23 октября»
export function firstPurchaseDate(plan, from = new Date()) {
  const date = new Date(from)
  const today = (date.getDay() + 6) % 7
  let diff = (plan.day - today + 7) % 7
  if (diff === 0) diff = 7
  date.setDate(date.getDate() + diff)
  const weekday = DAYS[plan.day]
  const rest = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  return `${weekday}, ${rest}`
}

// Доли монет: поровну, остаток первой монете
export function shares(coins) {
  if (!coins.length) return {}
  const base = Math.floor(100 / coins.length / 10) * 10
  const out = Object.fromEntries(coins.map((c) => [c, base]))
  out[coins[0]] += 100 - base * coins.length
  return out
}
