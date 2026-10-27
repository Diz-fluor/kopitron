// Расписание напоминаний. Всё считаем в местном времени пользователя (часовой пояс из приложения).
// Дни недели как в приложении: 0 = пн … 6 = вс. Месячный план — 1-го числа.

const PERIOD = { week: 7, '2weeks': 14, month: 28 }
const DAY = 86400000

// Местная дата и время: { date: 'YYYY-MM-DD', minutes, dow }
export function localNow(tz, now = Date.now()) {
  let parts
  try {
    parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(now))
  } catch {
    return localNow('Europe/Moscow', now)
  }
  const get = (t) => parts.find((p) => p.type === t).value
  const date = `${get('year')}-${get('month')}-${get('day')}`
  return { date, minutes: Number(get('hour')) * 60 + Number(get('minute')), dow: dow(date) }
}

const toMs = (date) => Date.parse(`${date}T00:00:00Z`)
const fromMs = (ms) => new Date(ms).toISOString().slice(0, 10)
export const addDays = (date, n) => fromMs(toMs(date) + n * DAY)
const dow = (date) => (new Date(toMs(date)).getUTCDay() + 6) % 7
export const minutesOf = (time) => { const [h, m] = String(time).split(':').map(Number); return (h || 0) * 60 + (m || 0) }

// Покупка по плану приходится на этот день?
export function isDue(plan, date) {
  if (plan.freq === 'month') return date.endsWith('-01')
  if (dow(date) !== plan.day) return false
  if (plan.freq === '2weeks') {
    // чётность недели от даты создания плана
    const weeks = Math.floor((toMs(date) - toMs(fromMs(plan.created_at))) / (7 * DAY))
    return weeks % 2 === 0
  }
  return true
}

// Последний день покупки по плану, не позже date (в пределах периода)
export function lastDue(plan, date) {
  for (let i = 0; i < (PERIOD[plan.freq] ?? 7) + 3; i++) {
    const d = addDays(date, -i)
    if (isDue(plan, d)) return d
  }
  return null
}

// Уже купил в этом периоде: покупка по монете в течение периода до дня покупки включительно.
// Купил во вторник при плане на пятницу — пятничное напоминание не нужно.
export function boughtFor(plan, dueDate, purchases, tz) {
  const from = addDays(dueDate, -((PERIOD[plan.freq] ?? 7) - 1))
  return purchases.some((p) => p.coin === plan.coin && localNow(tz, p.ts).date >= from && localNow(tz, p.ts).date <= dueDate)
}

/* Что отправить пользователю сейчас: список { kind, date, plans } */
export function whatToSend(user, plans, purchases, sent, now = Date.now()) {
  const tz = user.tz
  const { date, minutes } = localNow(tz, now)
  const at = minutesOf(user.remind_time)
  // окно 3 часа после выбранного времени: cron может опоздать, а ночью не пишем
  if (minutes < at || minutes > at + 180) return []

  const active = plans.filter((p) => !p.paused && p.remind)
  const wasSent = (kind, d) => sent.some((s) => s.kind === kind && s.date === d)
  const out = []

  if (user.snooze_date && user.snooze_date <= date && !wasSent('snooze', date)) {
    const pending = active.filter((p) => {
      const d = lastDue(p, date)
      return d && !boughtFor(p, d, purchases, tz)
    })
    if (pending.length) out.push({ kind: 'snooze', date, plans: pending })
    return out // после «Напомнить завтра» одного сообщения в день достаточно
  }

  const due = active.filter((p) => isDue(p, date) && !boughtFor(p, date, purchases, tz))
  if (due.length && !wasSent('due', date)) out.push({ kind: 'due', date, plans: due })

  if (user.day_before) {
    const tomorrow = addDays(date, 1)
    const soon = active.filter((p) => isDue(p, tomorrow) && !boughtFor(p, tomorrow, purchases, tz))
    if (soon.length && !wasSent('before', date) && !out.length) out.push({ kind: 'before', date, plans: soon })
  }
  return out
}
