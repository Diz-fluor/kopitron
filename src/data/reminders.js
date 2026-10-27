// Настройки напоминаний: общий выключатель, монеты без напоминаний, время и напоминание накануне.
// Храним в браузере и копию в базе вместе с планами: по ним бот присылает напоминания.
import { useSyncExternalStore } from 'react'

const KEY = 'kopitron.reminders'
const DEFAULT = { on: true, off: [], time: '09:00', dayBefore: true }
const listeners = new Set()

const read = () => {
  try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return DEFAULT }
}

let state = read()

const write = (next) => {
  state = next
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* без хранилища живём в памяти */ }
  listeners.forEach((l) => l())
}

export const replaceReminders = (r) => write({ ...DEFAULT, ...r })
export const setRemindersOn = (on) => write({ ...state, on })
export const setCoinReminder = (coin, on) => write({ ...state, off: on ? state.off.filter((c) => c !== coin) : [...new Set([...state.off, coin])] })
export const setReminderTime = (time) => write({ ...state, time })
export const setDayBefore = (dayBefore) => write({ ...state, dayBefore })

/* Напоминание по монете включено: общий выключатель и сама монета */
export const remindsAbout = (s, coin) => s.on && !s.off.includes(coin)

export function useReminders() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l) },
    () => state,
  )
}
