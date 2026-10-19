import { useTonAddress } from '@tonconnect/ui-react'

// Короткая запись адреса: UQAb…12cd
export const shortAddress = (a) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '')

// ?demo=wallet — показать экраны так, будто кошелёк подключён (для проверки дизайна)
const DEMO = new URLSearchParams(window.location.search).get('demo') === 'wallet'
export function useWallet() {
  const address = useTonAddress()
  return address || (DEMO ? 'UQB3kd8z1qPpQm2v7Lr0aYx9F0c2Hn6sTz4WbZx4F2' : '')
}
