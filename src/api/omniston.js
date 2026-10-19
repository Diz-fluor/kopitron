// Покупка через Omniston (агрегатор ликвидности STON.fi).
// Деньги не проходят через нас: Omniston собирает транзакцию, пользователь подписывает её в своём кошельке.
import { Omniston } from '@ston-fi/omniston-sdk'
import { REFERRER_ADDRESS, REFERRER_FEE_BPS } from '../config.js'

// Токены в сети TON (адреса сверены с api.ston.fi)
export const ASSETS = {
  usdt: { jetton: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs', decimals: 6, ticker: 'USDT' }, // Tether USD
  btc: { jetton: 'EQDhyPzbIjJT_WnY3gGprjSYUK9fiGMjWMezxO8MZiUdfb_B', decimals: 8, ticker: 'BTC' }, // cbBTC
  eth: { jetton: 'EQBTkLAhEteZCRgRe_xMs5ZE0bMrduYxKbyzGCpXXW8dRWOT', decimals: 18, ticker: 'ETH' }, // WETH
  gram: { native: true, decimals: 9, ticker: 'GRAM' }, // бывший Toncoin
}

const SLIPPAGE_PIPS = 10000 // 1%
const QUOTE_TIMEOUT = 12000

let client
const omniston = () => (client ??= new Omniston({ apiUrl: 'wss://omni-ws.ston.fi' }))

const tonAsset = (a) => ({
  chain: { $case: 'ton', value: { kind: a.native ? { $case: 'native', value: {} } : { $case: 'jetton', value: a.jetton } } },
})
const tonAddress = (address) => ({ chain: { $case: 'ton', value: address } })

const toUnits = (amount, decimals) => {
  const [i, f = ''] = String(amount).split('.')
  return (BigInt(i) * 10n ** BigInt(decimals) + BigInt((f + '0'.repeat(decimals)).slice(0, decimals) || '0')).toString()
}
export const fromUnits = (units, decimals) => Number(units) / 10 ** decimals

const hexToBase64 = (hex) => {
  let bin = ''
  for (let i = 0; i < hex.length; i += 2) bin += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16))
  return btoa(bin)
}

export class PurchaseError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code // no-quote | rejected | failed
  }
}

// Котировка: сколько монеты придёт за usd USDT, с нашей комиссией
export function getQuote({ coin, usd, maxRoutes = 4 }) {
  return new Promise((resolve, reject) => {
    const request = {
      inputAsset: tonAsset(ASSETS.usdt),
      outputAsset: tonAsset(ASSETS[coin]),
      amount: { $case: 'inputUnits', value: toUnits(usd, ASSETS.usdt.decimals) },
      integratorAddress: REFERRER_ADDRESS ? tonAddress(REFERRER_ADDRESS) : undefined,
      // bps → pips: 25 bps = 0,25% = 2500 pips (1 pip = 0,0001%)
      integratorFeePips: REFERRER_ADDRESS ? REFERRER_FEE_BPS * 100 : undefined,
      settlementParams: [
        { params: { $case: 'swap', value: { maxPriceSlippagePips: SLIPPAGE_PIPS, maxRoutes, flexibleIntegratorFee: true } } },
      ],
    }
    let sub
    const timer = setTimeout(() => {
      sub?.unsubscribe()
      reject(new PurchaseError('no-quote', 'Не нашли курс, попробуй чуть позже'))
    }, QUOTE_TIMEOUT)
    sub = omniston()
      .requestForQuote(request)
      .subscribe({
        next: (event) => {
          if (event.$case === 'quoteUpdated') {
            clearTimeout(timer)
            sub?.unsubscribe()
            const q = event.value
            const receive = fromUnits(q.outputUnits, ASSETS[coin].decimals)
            resolve({
              coin,
              usd,
              quote: q,
              receive,
              rate: receive ? usd / receive : 0,
              fee: fromUnits(q.integratorFeeUnits ?? '0', ASSETS[coin].decimals) * (receive ? usd / receive : 0),
            })
          } else if (event.$case === 'noQuote') {
            clearTimeout(timer)
            sub?.unsubscribe()
            reject(new PurchaseError('no-quote', 'Сейчас нет курса для этой пары'))
          }
        },
        error: (e) => {
          clearTimeout(timer)
          reject(new PurchaseError('no-quote', e?.message ?? 'Ошибка Omniston'))
        },
      })
  })
}

// Сообщения транзакции для TON Connect
export async function buildMessages(quote, trader) {
  const tx = await omniston().tonBuildSwap({
    quoteId: quote.quoteId,
    transferSrcAddress: tonAddress(trader),
    useRecommendedSlippage: true,
  })
  return tx.messages.map((m) => ({
    address: m.targetAddress,
    amount: m.sendAmount,
    payload: hexToBase64(m.payload),
    ...(m.jettonWalletStateInit ? { stateInit: hexToBase64(m.jettonWalletStateInit) } : {}),
  }))
}

// Следим за обменом: onProgress(0..1), промис завершается успехом или ошибкой
export function trackSwap({ quoteId, trader, boc, onProgress }) {
  return new Promise((resolve, reject) => {
    let sub
    const start = Date.now()
    const tick = setInterval(() => onProgress?.(Math.min(0.9, (Date.now() - start) / 40000)), 500)
    const done = (fn, v) => { clearInterval(tick); sub?.unsubscribe(); fn(v) }
    sub = omniston()
      .swapTrack({ quoteId, traderAddress: tonAddress(trader), outgoingTxQuery: boc })
      .subscribe({
        next: (event) => {
          if (event.$case !== 'progress') return
          const s = event.value.status
          if (s === 'TRADE_STATUS_FULLY_FILLED' || s === 'TRADE_STATUS_PARTIALLY_FILLED') {
            onProgress?.(1)
            done(resolve, event.value)
          } else if (s === 'TRADE_STATUS_FAILED' || s === 'TRADE_STATUS_CANCELLED') {
            done(reject, new PurchaseError('failed', 'Обмен не прошёл, деньги вернутся в кошелёк'))
          }
        },
        error: (e) => done(reject, new PurchaseError('failed', e?.message ?? 'Не удалось отследить обмен')),
      })
  })
}

// Вся покупка: котировки по монетам плана → одна подпись → отслеживание
export async function preparePurchase({ coins, usd }) {
  const each = Math.floor((usd / coins.length) * 100) / 100
  const maxRoutes = Math.max(1, Math.floor(4 / coins.length))
  return Promise.all(coins.map((coin) => getQuote({ coin, usd: each, maxRoutes })))
}

export async function executePurchase({ quotes, trader, tonConnectUI, onProgress }) {
  const messages = (await Promise.all(quotes.map((q) => buildMessages(q.quote, trader)))).flat()
  let result
  try {
    result = await tonConnectUI.sendTransaction({
      validUntil: Math.floor(Date.now() / 1000) + 300,
      messages,
    })
  } catch (e) {
    throw new PurchaseError('rejected', e?.message ?? 'Подпись отклонена')
  }
  const parts = quotes.map(() => 0)
  await Promise.all(
    quotes.map((q, i) =>
      trackSwap({
        quoteId: q.quote.quoteId,
        trader,
        boc: result.boc,
        onProgress: (p) => { parts[i] = p; onProgress?.(parts.reduce((a, b) => a + b, 0) / parts.length) },
      }),
    ),
  )
  return result
}
