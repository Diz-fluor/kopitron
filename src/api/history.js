// История покупок из блокчейна (TonAPI events). Только читаем.
// Покупка = событие, где из кошелька ушли USDT, а пришли BTC, ETH или Gram.
import { useEffect, useState } from 'react'
import { getJSON } from './tonapi.js'

const API = 'https://tonapi.io/v2'

const SYMBOLS = {
  btc: ['TGBTC', 'BTC', 'WBTC', 'JWBTC', 'OWBTC', 'CBBTC'],
  eth: ['ETH', 'WETH', 'JWETH', 'OWETH', 'JETH'],
  usdt: ['USD₮', 'USDT', 'JUSDT'],
}
const coinOf = (symbol = '') => Object.keys(SYMBOLS).find((k) => SYMBOLS[k].includes(symbol.toUpperCase()))
const units = (raw, decimals = 9) => Number(raw ?? 0) / 10 ** decimals

// Разбираем одно событие: сколько USDT ушло и что пришло по монетам
function parseEvent(ev, me) {
  const isMe = (a) => a?.address === me
  const got = {}
  let usdt = 0
  const swaps = ev.actions.filter((a) => a.type === 'JettonSwap' && a.status === 'ok')

  if (swaps.length) {
    for (const { JettonSwap: s } of swaps) {
      const inCoin = s.jetton_master_in ? coinOf(s.jetton_master_in.symbol) : 'gram'
      if (inCoin !== 'usdt') continue
      const outCoin = s.jetton_master_out ? coinOf(s.jetton_master_out.symbol) : 'gram'
      if (!['btc', 'eth', 'gram'].includes(outCoin)) continue
      const usd = units(s.amount_in, s.jetton_master_in.decimals)
      const amount = s.jetton_master_out ? units(s.amount_out, s.jetton_master_out.decimals) : units(s.ton_out)
      usdt += usd
      got[outCoin] = { usd: (got[outCoin]?.usd ?? 0) + usd, amount: (got[outCoin]?.amount ?? 0) + amount }
    }
  } else {
    // Маршрут не распознан как обмен: смотрим на переводы в кошелёк и из него
    for (const a of ev.actions) {
      if (a.status !== 'ok') continue
      if (a.type === 'JettonTransfer') {
        const t = a.JettonTransfer
        const coin = coinOf(t.jetton?.symbol)
        const amount = units(t.amount, t.jetton?.decimals)
        if (coin === 'usdt' && isMe(t.sender)) usdt += amount
        if ((coin === 'btc' || coin === 'eth') && isMe(t.recipient)) got[coin] = { amount: (got[coin]?.amount ?? 0) + amount }
      }
      if (a.type === 'TonTransfer' && isMe(a.TonTransfer.recipient) && usdt) {
        got.gram = { amount: (got.gram?.amount ?? 0) + units(a.TonTransfer.amount) }
      }
    }
    // делим потраченные USDT поровну между монетами — точнее без обмена в событии не узнать
    const coins = Object.keys(got)
    for (const c of coins) got[c].usd = usdt / coins.length
  }

  if (!usdt || !Object.keys(got).length) return []
  const fee = ev.extra < 0 ? units(-ev.extra) : 0 // комиссия сети в Gram
  return Object.entries(got).map(([coin, g]) => ({
    id: `${ev.event_id}:${coin}`,
    hash: ev.event_id,
    time: ev.timestamp * 1000,
    coin,
    usd: Math.round(g.usd * 100) / 100,
    amount: g.amount,
    rate: g.amount ? g.usd / g.amount : 0,
    fee,
    pending: ev.in_progress,
  }))
}

export async function fetchHistory(address) {
  const [account, data] = await Promise.all([
    getJSON(`${API}/accounts/${address}`),
    getJSON(`${API}/accounts/${address}/events?limit=100`, 20000),
  ])
  return (data.events ?? []).flatMap((ev) => parseEvent(ev, account.address))
}

const cache = new Map()

// { data, loading, error }, обновление раз в минуту
export function useHistory(address) {
  const [state, setState] = useState(() => ({ data: cache.get(address) ?? null, loading: Boolean(address), error: null }))
  useEffect(() => {
    if (!address) return setState({ data: null, loading: false, error: null })
    let alive = true
    const load = () =>
      fetchHistory(address)
        .then((data) => { cache.set(address, data); if (alive) setState({ data, loading: false, error: null }) })
        .catch((error) => alive && setState((s) => ({ ...s, loading: false, error })))
    load()
    const t = setInterval(load, 60000)
    return () => { alive = false; clearInterval(t) }
  }, [address])
  return state
}

// Курс монеты в долларах за период: [[ms, price], ...] по возрастанию времени
const TOKENS = {
  btc: 'EQDhyPzbIjJT_WnY3gGprjSYUK9fiGMjWMezxO8MZiUdfb_B',
  eth: 'EQBTkLAhEteZCRgRe_xMs5ZE0bMrduYxKbyzGCpXXW8dRWOT',
  gram: 'ton',
}

export async function fetchChart(coin, from, to = Date.now(), points = 52) {
  const q = `token=${TOKENS[coin]}&currency=usd&start_date=${Math.floor(from / 1000)}&end_date=${Math.floor(to / 1000)}&points_count=${points}`
  const data = await getJSON(`${API}/rates/chart?${q}`, 300000)
  return (data.points ?? []).map(([t, p]) => [t * 1000, p]).sort((a, b) => a[0] - b[0])
}
