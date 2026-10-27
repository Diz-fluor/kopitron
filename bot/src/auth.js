// Проверка initData мини-приложения: подпись Telegram по токену бота.
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app

const enc = new TextEncoder()
const hmac = async (key, data) => {
  const k = await crypto.subtle.importKey('raw', typeof key === 'string' ? enc.encode(key) : key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(data)))
}
const hex = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('')

const MAX_AGE = 7 * 86400 // мини-приложение может долго висеть открытым

// Возвращает пользователя Telegram или null
export async function checkInitData(initData, botToken) {
  if (!initData) return null
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null
  params.delete('hash')
  const check = [...params.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('\n')
  const secret = await hmac('WebAppData', botToken)
  if (hex(await hmac(secret, check)) !== hash) return null
  const age = Date.now() / 1000 - Number(params.get('auth_date'))
  if (!(age < MAX_AGE)) return null
  try {
    const user = JSON.parse(params.get('user'))
    return user?.id ? user : null
  } catch {
    return null
  }
}
