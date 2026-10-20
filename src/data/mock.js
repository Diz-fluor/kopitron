// Примерные данные, пока нет балансов из TonAPI и базы планов.
// Числа как на макетах в Figma.

export const COINS = {
  btc: { id: 'btc', name: 'Bitcoin', ticker: 'BTC', price: 90080, gen: 'биткоина' },
  eth: { id: 'eth', name: 'Ethereum', ticker: 'ETH', price: 2468, gen: 'эфира' },
  gram: { id: 'gram', name: 'Gram', ticker: 'GRAM', price: 1.5, gen: 'Gram' },
}

export const PORTFOLIO = {
  total: 1284,
  change: 4.2,
  holdings: [
    { coin: 'btc', amount: '0,0124', value: 1117, change: 4.1, plan: '$10 по пт' },
    { coin: 'eth', amount: '0,047', value: 116, change: -1.8, plan: '$5 по пн' },
    { coin: 'gram', amount: '34', value: 51, change: 2.3, plan: '$3 раз в месяц' },
  ],
}

export const NEXT_PURCHASE = { days: 5, amount: 10, coin: 'btc', date: 'пт, 21 октября', after: '28 октября' }

export const GOAL = { target: 5000, saved: 1284, eta: 'к июню 2027 при текущем плане' }

export const HISTORY = [
  { id: 1, month: 'Октябрь', date: 'пт, 21 окт', full: 'пт, 21 октября, 09:12', coin: 'btc', usd: 10, amount: '0,000148', rate: '67 400' },
  { id: 2, month: 'Октябрь', date: 'пн, 17 окт', full: 'пн, 17 октября, 09:05', coin: 'eth', usd: 5, amount: '0,0019', rate: '2610' },
  { id: 3, month: 'Октябрь', date: 'пт, 14 окт', full: 'пт, 14 октября, 09:20', coin: 'btc', usd: 10, amount: '0,000151', rate: '66 100' },
  { id: 4, month: 'Октябрь', date: 'сб, 1 окт', full: 'сб, 1 октября, 10:02', coin: 'gram', usd: 3, amount: '2,1', rate: '1,43' },
  { id: 5, month: 'Сентябрь', date: 'пт, 30 сен', coin: 'btc', usd: 10, skipped: true },
  { id: 6, month: 'Сентябрь', date: 'пт, 23 сен', full: 'пт, 23 сентября, 09:01', coin: 'btc', usd: 10, amount: '0,000155', rate: '64 500' },
]

export const WALLET_SHORT = 'UQB3…x4F2'

// Форматирование по правилам текстов: $1284, $12 840, 4,2%
export const money = (n) =>
  '$' + (Math.abs(n) >= 10000 ? Math.round(n).toLocaleString('ru-RU').replace(/\s/g, ' ') : String(Math.round(n * 100) / 100).replace('.', ','))
export const pct = (n) => `${n >= 0 ? '↑' : '↓'} ${String(Math.abs(n)).replace('.', ',')}%`
