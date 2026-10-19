// Балансы и курсы из TonAPI (бесплатный лимит, без ключа). Деньги не трогаем, только читаем.
import { useEffect, useState } from 'react'

const API = 'https://tonapi.io/v2'

// BTC и ETH в сети TON — жетоны 1:1 к оригиналу. Узнаём их по символу, чтобы не зависеть от моста
const SYMBOLS = {
  btc: ['TGBTC', 'BTC', 'WBTC', 'JWBTC', 'OWBTC', 'CBBTC'],
  eth: ['ETH', 'WETH', 'JWETH', 'OWETH', 'JETH'],
  usdt: ['USD₮', 'USDT', 'JUSDT'],
}

const coinOf = (symbol = '') => {
  const s = symbol.toUpperCase()
  return Object.keys(SYMBOLS).find((k) => SYMBOLS[k].includes(s))
}

const units = (raw, decimals) => Number(raw) / 10 ** decimals
const diff = (s) => (s ? parseFloat(String(s).replace('%', '').replace('−', '-')) || 0 : 0)

// TonAPI без ключа держит примерно 1 запрос в секунду. Поэтому: одинаковые запросы
// склеиваем, ответы кэшируем на 30 с, запросы идут по очереди, на 429 повторяем
const cache = new Map()
let queue = Promise.resolve()
const GAP = 350
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function load(url) {
  for (let i = 0; ; i++) {
    const r = await fetch(url)
    if (r.status === 429 && i < 3) { await sleep(1200 * (i + 1)); continue }
    if (!r.ok) throw new Error(`TonAPI ${r.status}`)
    return r.json()
  }
}

export function getJSON(url, ttl = 30000) {
  const hit = cache.get(url)
  if (hit?.data && Date.now() - hit.time < ttl) return Promise.resolve(hit.data)
  if (hit?.pending) return hit.pending
  const pending = queue.then(() => load(url)).then(
    (data) => { cache.set(url, { data, time: Date.now() }); return data },
    (e) => { cache.delete(url); throw e },
  )
  queue = pending.catch(() => {}).then(() => sleep(GAP))
  cache.set(url, { ...hit, pending })
  return pending
}

export async function fetchPortfolio(address) {
  const [account, jettons, rates] = await Promise.all([
    getJSON(`${API}/accounts/${address}`),
    getJSON(`${API}/accounts/${address}/jettons?currencies=usd`),
    getJSON(`${API}/rates?tokens=ton&currencies=usd`),
  ])

  const tonPrice = rates.rates?.TON?.prices?.USD ?? 0
  const gram = units(account.balance ?? 0, 9)
  const out = {
    gram: { coin: 'gram', amount: gram, value: gram * tonPrice, change: diff(rates.rates?.TON?.diff_24h?.USD), price: tonPrice },
  }

  for (const j of jettons.balances ?? []) {
    const coin = coinOf(j.jetton?.symbol)
    if (!coin) continue
    const amount = units(j.balance, j.jetton.decimals ?? 9)
    const price = j.price?.prices?.USD ?? (coin === 'usdt' ? 1 : 0)
    const prev = out[coin]
    out[coin] = {
      coin,
      amount: (prev?.amount ?? 0) + amount,
      value: (prev?.value ?? 0) + amount * price,
      change: diff(j.price?.diff_24h?.USD),
      price,
    }
  }
  return out
}

// Хук для экранов: { data, loading, error }, обновление раз в минуту
export function usePortfolio(address) {
  const [state, setState] = useState({ data: null, loading: Boolean(address), error: null })
  useEffect(() => {
    if (!address) return setState({ data: null, loading: false, error: null })
    let alive = true
    const load = () =>
      fetchPortfolio(address)
        .then((data) => alive && setState({ data, loading: false, error: null }))
        .catch((error) => alive && setState((s) => ({ ...s, loading: false, error })))
    setState((s) => ({ ...s, loading: true }))
    load()
    const t = setInterval(load, 60000)
    return () => { alive = false; clearInterval(t) }
  }, [address])
  return state
}

// 0,0124 · 34 · 0,000148 — без лишних нулей, запятая
export function fmtAmount(n) {
  if (!n) return '0'
  const digits = n >= 100 ? 0 : n >= 1 ? 2 : Math.min(8, 2 - Math.floor(Math.log10(n)) + 1)
  return n.toFixed(digits).replace(/\.?0+$/, '').replace('.', ',')
}
