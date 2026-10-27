// Связь с ботом на Cloudflare: планы и настройки напоминаний живут в базе,
// чтобы бот знал, когда напомнить. Деньги и ключи сюда не попадают.
// Вне Telegram (нет initData) ничего не отправляем: сервер всё равно не пустит.
import { useEffect, useState } from 'react'
import { usePlans, useGoal, getPlans, replacePlans, setGoal } from '../data/plans.js'
import { useReminders, replaceReminders } from '../data/reminders.js'

const API = 'https://kopitron-bot.dizfluor.workers.dev'
const initData = () => window.Telegram?.WebApp?.initData || ''

async function call(path, body) {
  const data = initData()
  if (!data) {
    // вне Telegram сервер не пустит; один раз отметимся, чтобы видеть это в журнале
    if (!call.pinged) { call.pinged = true; fetch(`${API}/api/hello?no-initdata`).catch(() => {}) }
    return null
  }
  const res = await fetch(`${API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'x-init-data': data, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`api ${path}: ${res.status}`)
  return res.json()
}

const timeZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return undefined } }

// Покупка прошла: бот не напомнит о ней в этом периоде
export function reportPurchase(items) {
  call('/api/purchase', { items }).catch((e) => console.warn(e))
}

/* Синхронизация: при старте забираем с сервера (новое устройство), дальше отправляем изменения */
export function useBackendSync(wallet) {
  const plans = usePlans()
  const reminders = useReminders()
  const goal = useGoal()
  const [ready, setReady] = useState(false)

  // 1. При старте: если в браузере пусто, а на сервере есть планы — восстанавливаем
  useEffect(() => {
    if (!wallet) return
    let alive = true
    call('/api/state')
      .then((s) => {
        if (!alive || !s) return
        if (!getPlans().length && s.plans?.length) {
          replacePlans(s.plans)
          if (s.reminders) replaceReminders(s.reminders)
          if (s.goal) setGoal(s.goal)
        }
      })
      .catch((e) => console.warn(e))
      .finally(() => { if (alive) setReady(true) })
    return () => { alive = false }
  }, [wallet])

  // 2. Любое изменение планов, напоминаний или цели — на сервер, с задержкой
  useEffect(() => {
    if (!wallet || !ready) return
    const t = setTimeout(() => {
      call('/api/sync', { plans, reminders, goal, tz: timeZone(), wallet }).catch((e) => console.warn(e))
    }, 1200)
    return () => clearTimeout(t)
  }, [wallet, ready, plans, reminders, goal])
}
