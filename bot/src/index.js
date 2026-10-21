// Бот Kopitron. Принимает обновления от Telegram (webhook) и отвечает сообщениями в стиле приложения.
// Пока без базы: приветствие, тестовое напоминание по команде /remind, «Напомнить завтра».

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

/* Сообщения */

async function sendWelcome(env, chatId) {
  return api(env, 'sendPhoto', {
    chat_id: chatId,
    photo: `${env.ASSETS_URL}welcome.jpg?v=3`, // версия в адресе: Telegram кэширует фото по ссылке
    parse_mode: 'HTML',
    caption: [
      '<b>Привет, я Kopitron, твоя криптокопилка</b>',
      '',
      'Копить в крипте так же просто, как откладывать в копилку.',
      'Раз в неделю напомню, тебе останется сдвинуть ползунок.',
      '',
      'Монеты хранятся в твоём кошельке, не у нас.',
    ].join('\n'),
    reply_markup: { inline_keyboard: [[openApp(env, 'Открыть Kopitron')]] },
  })
}

// Пример плана, пока нет базы. Потом данные придут из D1 для каждого пользователя.
const SAMPLE_PLAN = { amount: 10, coin: 'BTC', goal: 5000, saved: 1300, timeZone: 'Europe/Moscow' }

const fmtMoney = (n) => (n >= 10000 ? n.toLocaleString('ru-RU') : String(n)) // $1284, $12 840

// Шкала цели из точек: 20 делений, как на карточке
function goalBar(saved, goal, size = 20) {
  const filled = Math.max(0, Math.min(size, Math.round((saved / goal) * size)))
  return '●'.repeat(filled) + '○'.repeat(size - filled)
}

function reminderCaption(plan = SAMPLE_PLAN) {
  const lines = ['<b>Пора пополнить копилку</b>', `<code>$${fmtMoney(plan.amount)} → ${plan.coin}</code>`]
  if (plan.goal) {
    const pct = Math.round((plan.saved / plan.goal) * 100)
    lines.push(`Цель <code>$${fmtMoney(plan.goal)}</code>, собрано ${pct}%`, `<code>${goalBar(plan.saved, plan.goal)}</code>`)
  }
  return lines.join('\n')
}

async function sendReminder(env, chatId, plan) {
  plan = plan ?? SAMPLE_PLAN
  const amount = plan.amount
  return api(env, 'sendPhoto', {
    chat_id: chatId,
    photo: `${env.ASSETS_URL}reminder.png?v=2`,
    parse_mode: 'HTML',
    caption: reminderCaption(plan),
    reply_markup: {
      inline_keyboard: [
        [openApp(env, `Положить $${amount}`, 'home')],
        [{ text: 'Напомнить завтра', callback_data: 'snooze' }],
      ],
    },
  })
}

/* Обработка обновлений */

async function handleUpdate(env, update) {
  const msg = update.message
  if (msg?.text) {
    const chatId = msg.chat.id
    const cmd = msg.text.split(/[\s@]/)[0]
    if (cmd === '/start') return sendWelcome(env, chatId)
    if (cmd === '/remind') return sendReminder(env, chatId)
    return api(env, 'sendMessage', {
      chat_id: chatId,
      text: 'Всё самое важное внутри Kopitron.',
      reply_markup: { inline_keyboard: [[openApp(env, 'Открыть Kopitron')]] },
    })
  }

  const cb = update.callback_query
  if (cb?.data === 'snooze') {
    await api(env, 'answerCallbackQuery', { callback_query_id: cb.id })
    await api(env, 'sendMessage', {
      chat_id: cb.message.chat.id,
      parse_mode: 'HTML',
      text: '<b>Хорошо, напомню завтра в 09:00</b>\nПропустить день не страшно: DCA работает на длинной дистанции.',
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

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

    return new Response('Kopitron bot', { status: 200 })
  },
}
