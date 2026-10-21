import { useTonAddress } from '@tonconnect/ui-react'

// Короткая запись адреса: UQAb…12cd
export const shortAddress = (a) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '')

// ?demo=wallet — показать экраны так, будто кошелёк подключён (для проверки дизайна)
const DEMO_ADDRESS = 'UQB3kd8z1qPpQm2v7Lr0aYx9F0c2Hn6sTz4WbZx4F2'
export const isDemoWallet = (a) => a === DEMO_ADDRESS
const DEMO = new URLSearchParams(window.location.search).get('demo') === 'wallet'

// «Посмотреть без кошелька»: Главная на примере, пока человек не подключил свой кошелёк
const PREVIEW_KEY = 'kopitron.preview'
const readPreview = () => { try { return localStorage.getItem(PREVIEW_KEY) === '1' } catch { return false } }
export const startPreview = () => { try { localStorage.setItem(PREVIEW_KEY, '1') } catch { /* без хранилища просто покажем пустую Главную */ } }
const endPreview = () => { try { localStorage.removeItem(PREVIEW_KEY) } catch { /* ничего */ } }
export const isPreview = () => !DEMO && readPreview()

export function useWallet() {
  const address = useTonAddress()
  if (address && readPreview()) endPreview() // подключил настоящий кошелёк: пример больше не нужен
  return address || (DEMO || readPreview() ? DEMO_ADDRESS : '')
}
