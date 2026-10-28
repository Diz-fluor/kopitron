// Бот Kopitron на Cloudflare Workers.
// /telegram — вебхук: приветствие, напоминание по /remind, «Напомнить завтра».
// /api/*    — приложение присылает планы и настройки напоминаний (проверка initData).
// cron      — каждые 15 минут: кому пора напомнить о покупке.

import { checkInitData } from './auth.js'
import { localNow, addDays, whatToSend } from './schedule.js'

const api = (env, method, body) =>
  fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => r.json())

// Секрет вебхука выводим из токена, чтобы не заводить отдельный (тот же расчёт в bot.yml)
async function webhookSecret(token) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
}

const openApp = (env, label, screen) => ({
  text: label,
  web_app: { url: screen ? `${env.APP_URL}?screen=${screen}` : env.APP_URL },
})

const TICKER = { btc: 'BTC', eth: 'ETH', gram: 'GRAM' }
const COINS = Object.keys(TICKER)
const fmtMoney = (n) => {
  const r = Math.round(n * 100) / 100
  return r >= 10000 ? Math.round(r).toLocaleString('ru-RU').replace(/,/g, ' ') : String(r).replace('.', ',')
}
const sum = (plans) => plans.reduce((s, p) => s + p.amount, 0)

/* Сообщения */

async function sendWelcome(env, chatId) {
  return api(env, 'sendPhoto', {
    chat_id: chatId,
    photo: `${env.ASSETS_URL}welcome.jpg?v=4`, // версия в адресе: Telegram кэширует фото по ссылке
    parse_mode: 'HTML',
    // ручные переносы ровными строками, неразрывные пробелы после коротких слов: без висячих предлогов
    caption: [
      '<b>Привет, я Kopitron,</b>',
      '<b>твоя криптокопилка</b>',
      '',
      'Копить в крипте так же просто,',
      'как откладывать в копилку.',
      'Раз в неделю напомню,',
      'останется сдвинуть ползунок.',
      '',
      'Монеты хранятся',
      'в твоём кошельке, не у нас.',
    ].join('\n'),
    reply_markup: { inline_keyboard: [[openApp(env, 'Открыть Kopitron')]] },
  })
}

// Пример для /remind, если планов в базе ещё нет
const SAMPLE = { plans: [{ coin: 'btc', amount: 10 }], goal: 5000, saved: 1300 }

// Шкала цели из точек: 20 делений, как на карточке
function goalBar(saved, goal, size = 20) {
  const filled = Math.max(0, Math.min(size, Math.round((saved / goal) * size)))
  return '●'.repeat(filled) + '○'.repeat(size - filled)
}

const planLines = (plans) => plans.map((p) => `<code>$${fmtMoney(p.amount)} → ${TICKER[p.coin]}</code>`)

function reminderCaption({ plans, goal, saved }) {
  const lines = ['<b>Пора пополнить копилку</b>', ...planLines(plans)]
  if (goal > 0 && saved > 0) {
    const pct = Math.min(100, Math.round((saved / goal) * 100))
    lines.push(`Цель <code>$${fmtMoney(goal)}</code>, собрано ${pct}%`, `<code>${goalBar(saved, goal)}</code>`)
  }
  return lines.join('\n')
}

function sendReminder(env, chatId, data = SAMPLE) {
  return api(env, 'sendPhoto', {
    chat_id: chatId,
    photo: `${env.ASSETS_URL}reminder.png?v=2`,
    parse_mode: 'HTML',
    caption: reminderCaption(data),
    reply_markup: {
      inline_keyboard: [
        [openApp(env, `Положить $${fmtMoney(sum(data.plans))}`, 'home')],
        [{ text: 'Напомнить завтра', callback_data: 'snooze' }],
      ],
    },
  })
}

function sendDayBefore(env, chatId, plans) {
  return api(env, 'sendMessage', {
    chat_id: chatId,
    parse_mode: 'HTML',
    text: ['<b>Завтра покупка</b>', ...planLines(plans), 'Проверь, что в кошельке есть USDT', 'и немного Gram на сеть.'].join('\n'),
    reply_markup: { inline_keyboard: [[openApp(env, 'Открыть Kopitron', 'home')]] },
  })
}

/* База */

const now = () => Date.now()

async function ensureUser(env, tgId) {
  await env.DB.prepare('INSERT INTO users (tg_id, created_at, updated_at) VALUES (?1, ?2, ?2) ON CONFLICT(tg_id) DO UPDATE SET blocked = 0')
    .bind(tgId, now()).run()
}

async function savedUsd(env, tgId) {
  const r = await env.DB.prepare('SELECT COALESCE(SUM(usd), 0) AS s FROM purchases WHERE tg_id = ?1').bind(tgId).first()
  return r?.s ?? 0
}

async function userReminder(env, tgId, plans) {
  const user = await env.DB.prepare('SELECT goal_usd FROM users WHERE tg_id = ?1').bind(tgId).first()
  return { plans, goal: user?.goal_usd, saved: await savedUsd(env, tgId) }
}

/* Telegram */

async function handleUpdate(env, update) {
  const msg = update.message
  if (msg?.text) {
    const chatId = msg.chat.id
    const cmd = msg.text.split(/[\s@]/)[0]
    if (cmd === '/start') {
      await ensureUser(env, msg.from.id)
      return sendWelcome(env, chatId)
    }
    if (cmd === '/remind') {
      const { results } = await env.DB.prepare('SELECT coin, amount FROM plans WHERE tg_id = ?1 AND paused = 0').bind(msg.from.id).all()
      return sendReminder(env, chatId, results.length ? await userReminder(env, msg.from.id, results) : SAMPLE)
    }
    return api(env, 'sendMessage', {
      chat_id: chatId,
      text: 'Всё самое важное внутри Kopitron.',
      reply_markup: { inline_keyboard: [[openApp(env, 'Открыть Kopitron')]] },
    })
  }

  const cb = update.callback_query
  if (cb?.data === 'snooze') {
    await api(env, 'answerCallbackQuery', { callback_query_id: cb.id })
    const user = await env.DB.prepare('SELECT tz, remind_time FROM users WHERE tg_id = ?1').bind(cb.from.id).first()
    const time = user?.remind_time ?? '09:00'
    if (user) {
      const tomorrow = addDays(localNow(user.tz).date, 1)
      await env.DB.prepare('UPDATE users SET snooze_date = ?2 WHERE tg_id = ?1').bind(cb.from.id, tomorrow).run()
    }
    await api(env, 'sendMessage', {
      chat_id: cb.message.chat.id,
      parse_mode: 'HTML',
      text: `<b>Хорошо, напомню завтра в ${time}</b>\nПропустить день не страшно:\nDCA работает на длинной дистанции.`,
    })
    // убираем кнопку «Напомнить завтра», оставляем «Положить»
    const keep = cb.message?.reply_markup?.inline_keyboard?.[0]
    return api(env, 'editMessageReplyMarkup', {
      chat_id: cb.message.chat.id,
      message_id: cb.message.message_id,
      reply_markup: { inline_keyboard: keep ? [keep] : [] },
    })
  }
}

/* API для мини-приложения */

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, x-init-data',
  'access-control-max-age': '86400',
}
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...CORS } })

const validTz = (tz) => { try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true } catch { return false } }
const validTime = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t)

function cleanPlan(p) {
  if (!COINS.includes(p?.coin)) return null
  const amount = Number(p.amount)
  if (!(amount >= 1 && amount <= 100000)) return null
  if (!['week', '2weeks', 'month'].includes(p.freq)) return null
  const day = Number(p.day ?? 0)
  return { coin: p.coin, amount, freq: p.freq, day: day >= 0 && day <= 6 ? day : 0, paused: p.paused ? 1 : 0, goal: Number(p.goal) > 0 ? Number(p.goal) : null }
}

async function handleApi(request, env, path) {
  const why = {}
  const user = await checkInitData(request.headers.get('x-init-data'), env.BOT_TOKEN, why)
  if (!user) return json({ error: 'unauthorized', reason: why.reason }, 401)
  const id = user.id

  if (path === '/api/state' && request.method === 'GET') {
    const u = await env.DB.prepare('SELECT * FROM users WHERE tg_id = ?1').bind(id).first()
    const { results } = await env.DB.prepare('SELECT coin, amount, freq, day, paused, remind, goal FROM plans WHERE tg_id = ?1').bind(id).all()
    return json({
      plans: results.map((p) => ({ coin: p.coin, amount: p.amount, freq: p.freq, day: p.day, paused: !!p.paused, goal: p.goal ?? undefined })),
      reminders: u ? { on: !!u.remind_on, off: results.filter((p) => !p.remind).map((p) => p.coin), time: u.remind_time, dayBefore: !!u.day_before } : null,
      goal: u?.goal_usd ?? null,
    })
  }

  if (path === '/api/sync' && request.method === 'POST') {
    const body = await request.json().catch(() => null)
    if (!body || !Array.isArray(body.plans)) return json({ error: 'bad request' }, 400)
    const plans = body.plans.map(cleanPlan).filter(Boolean)
    const r = body.reminders ?? {}
    const off = Array.isArray(r.off) ? r.off : []
    const tz = validTz(body.tz) ? body.tz : 'Europe/Moscow'
    const t = now()
    const db = env.DB
    // created_at плана сохраняем: от него считается чётность недели для «раз в 2 недели»
    const old = await db.prepare('SELECT coin, created_at FROM plans WHERE tg_id = ?1').bind(id).all()
    const created = Object.fromEntries(old.results.map((p) => [p.coin, p.created_at]))
    await db.batch([
      db.prepare(`INSERT INTO users (tg_id, wallet, tz, remind_on, remind_time, day_before, goal_usd, created_at, updated_at)
                  VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
                  ON CONFLICT(tg_id) DO UPDATE SET wallet = ?2, tz = ?3, remind_on = ?4, remind_time = ?5, day_before = ?6, goal_usd = ?7, updated_at = ?8`)
        .bind(id, typeof body.wallet === 'string' ? body.wallet.slice(0, 80) : null, tz, r.on === false ? 0 : 1, validTime(r.time) ? r.time : '09:00', r.dayBefore === false ? 0 : 1, Number(body.goal) > 0 ? Number(body.goal) : null, t),
      db.prepare('DELETE FROM plans WHERE tg_id = ?1').bind(id),
      ...plans.map((p) => db.prepare('INSERT INTO plans (tg_id, coin, amount, freq, day, paused, remind, goal, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)')
        .bind(id, p.coin, p.amount, p.freq, p.day, p.paused, off.includes(p.coin) ? 0 : 1, p.goal, created[p.coin] ?? t)),
    ])
    return json({ ok: true, plans: plans.length })
  }

  if (path === '/api/purchase' && request.method === 'POST') {
    const body = await request.json().catch(() => null)
    const items = (Array.isArray(body?.items) ? body.items : []).filter((i) => COINS.includes(i?.coin)).slice(0, 3)
    if (!items.length) return json({ error: 'bad request' }, 400)
    await ensureUser(env, id)
    const t = now()
    await env.DB.batch([
      ...items.map((i) => env.DB.prepare('INSERT INTO purchases (tg_id, coin, usd, ts) VALUES (?1, ?2, ?3, ?4)').bind(id, i.coin, Number(i.usd) || null, t)),
      env.DB.prepare('UPDATE users SET snooze_date = NULL WHERE tg_id = ?1').bind(id), // купил — откладывать нечего
    ])
    return json({ ok: true })
  }

  return json({ error: 'not found' }, 404)
}

/* Рассылка по расписанию */

async function runReminders(env, at = now()) {
  const db = env.DB
  const [users, plans, purchases, sent] = await db.batch([
    db.prepare('SELECT * FROM users WHERE remind_on = 1 AND blocked = 0 AND tg_id IN (SELECT tg_id FROM plans WHERE paused = 0)'),
    db.prepare('SELECT * FROM plans WHERE paused = 0'),
    db.prepare('SELECT tg_id, coin, ts FROM purchases WHERE ts > ?1').bind(at - 40 * 86400000),
    db.prepare('SELECT tg_id, kind, date FROM sent WHERE ts > ?1').bind(at - 3 * 86400000),
  ])
  const by = (rows, id) => rows.results.filter((r) => r.tg_id === id)
  let count = 0

  for (const u of users.results) {
    const jobs = whatToSend(u, by(plans, u.tg_id), by(purchases, u.tg_id), by(sent, u.tg_id), at)
    for (const job of jobs) {
      // сначала отмечаем, потом шлём: лучше пропустить одно сообщение, чем прислать два
      const mark = await db.prepare('INSERT OR IGNORE INTO sent (tg_id, kind, date, ts) VALUES (?1, ?2, ?3, ?4)').bind(u.tg_id, job.kind, job.date, at).run()
      if (!mark.meta.changes) continue
      const res = job.kind === 'before'
        ? await sendDayBefore(env, u.tg_id, job.plans)
        : await sendReminder(env, u.tg_id, await userReminder(env, u.tg_id, job.plans))
      if (job.kind === 'snooze') await db.prepare('UPDATE users SET snooze_date = NULL WHERE tg_id = ?1').bind(u.tg_id).run()
      if (!res.ok && res.error_code === 403) await db.prepare('UPDATE users SET blocked = 1 WHERE tg_id = ?1').bind(u.tg_id).run()
      if (res.ok) count++
    }
  }
  return count
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS })

    if (request.method === 'POST' && url.pathname === '/telegram') {
      const secret = request.headers.get('x-telegram-bot-api-secret-token')
      if (secret !== (await webhookSecret(env.BOT_TOKEN))) return new Response('forbidden', { status: 403 })
      const update = await request.json()
      try {
        await handleUpdate(env, update)
      } catch (e) {
        console.error('update failed', e)
      }
      return new Response('ok')
    }

    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url.pathname)
      } catch (e) {
        console.error('api failed', e)
        return json({ error: 'server error' }, 500)
      }
    }

    return new Response('Kopitron bot', { status: 200 })
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runReminders(env, event.scheduledTime).then((n) => console.log('reminders sent', n)))
  },
}
