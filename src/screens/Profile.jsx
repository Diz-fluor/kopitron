import { useState } from 'react'
import { useTonConnectUI } from '@tonconnect/ui-react'
import MainButton from '../components/MainButton.jsx'
import KopitronFace from '../components/KopitronFace.jsx'
import { DcaChart, Diode, DotIcon, SHIELD, WalletGlyph } from '../onboarding/Onboarding.jsx'
import { shortAddress, useWallet } from '../wallet.js'
import { haptic } from '../telegram.js'
import './Profile.css'

const tgUser = () => window.Telegram?.WebApp?.initDataUnsafe?.user

function SafeCard({ more }) {
  return (
    <section className="card safe">
      <div className="safe__head">
        <DotIcon cells={SHIELD} />
        <strong>Это безопасно</strong>
      </div>
      <ul className="bullets bullets--small">
        <li>Деньги и ключи остаются у тебя</li>
        <li>Каждую покупку подтверждаешь сам</li>
      </ul>
      {more && <button type="button" className="more-link" onClick={more}>Подробнее ›</button>}
    </section>
  )
}

/* Вкладка «Профиль» */
export function Profile({ nav, settings, openSheet }) {
  const address = useWallet()
  const user = tgUser()
  const name = user?.first_name ?? 'Дмитрий'
  const rows = [
    ['Уведомления', settings.notify ? 'вкл' : 'выкл', () => openSheet('reminders')],
    ['Валюта', settings.currency, () => openSheet('currency')],
    ['Язык', settings.lang === 'ru' ? 'Русский' : 'English', () => openSheet('language')],
    ['Что такое DCA', '', () => nav.push('dca')],
    ['Поддержка', '', () => nav.push('support')],
    ['О Kopitron', '', () => nav.push('about')],
  ]
  return (
    <div className="scr scr--tab">
      <div className="scr__body">
        <h1 className="title">Профиль</h1>
        <div className="me">
          {user?.photo_url ? <img className="me__photo" src={user.photo_url} alt="" /> : <span className="me__photo me__photo--empty">{name[0]}</span>}
          <span>
            <strong className="me__name">{name}</strong>
            <span className="muted me__sub">копит с 14 сентября, 6 покупок</span>
          </span>
        </div>

        <button type="button" className="card card--pad wallet-card" onClick={() => nav.push('wallet')}>
          <span className="wallet-card__top">
            <WalletGlyph kind="telegram" />
            <span className="row__main">
              <span className="row__title">{address ? 'Кошелёк в Telegram' : 'Кошелёк не подключён'}</span>
              <span className="row__sub">{address ? `${shortAddress(address)}, подключён` : 'Подключение займёт 10 секунд'}</span>
            </span>
            <span className="row__chevron">›</span>
          </span>
          <span className="wallet-card__safe">
            <DotIcon cells={SHIELD} size={16} />
            Деньги и ключи остаются у тебя
          </span>
        </button>

        <section className="card list settings">
          {rows.map(([k, v, on]) => (
            <button key={k} type="button" className="row" onClick={on}>
              <span className="row__main"><span className="row__title row__title--set">{k}</span></span>
              <span className="muted">{v}</span>
              <span className="row__chevron">›</span>
            </button>
          ))}
        </section>
      </div>
    </div>
  )
}

/* Профиль / Кошелёк */
export function WalletScreen({ nav }) {
  const address = useWallet()
  const [tonConnectUI] = useTonConnectUI()
  const [choice, setChoice] = useState('telegram')

  if (!address) {
    return (
      <div className="scr">
        <div className="scr__body">
          <h1 className="title">Кошелёк</h1>
          <p className="lead">Не подключён. Подключение займёт 10 секунд.</p>
          <div className="wallets">
            {[
              ['telegram', 'Кошелёк в Telegram', 'Рекомендуем, уже есть в Telegram'],
              ['other', 'Другой кошелёк TON', 'Tonkeeper, MyTonWallet и другие через TON Connect'],
            ].map(([id, t, sub]) => (
              <button key={id} type="button" className={`card wallet ${choice === id ? 'is-selected' : ''}`} onClick={() => { haptic.tick(); setChoice(id) }}>
                <WalletGlyph kind={id} />
                <span className="wallet__text">
                  <span className="wallet__name">{t}</span>
                  <span className={`wallet__sub ${id === 'telegram' ? 'wallet__sub--accent' : ''}`}>{sub}</span>
                </span>
                <Diode on={choice === id} />
              </button>
            ))}
          </div>
          <SafeCard more={() => nav.push('dca')} />
        </div>
        <div className="scr__foot scr__foot--bottom">
          <MainButton
            onClick={async () => {
              try {
                if (choice === 'telegram') await tonConnectUI.openSingleWalletModal('telegram-wallet')
                else await tonConnectUI.openModal()
              } catch {
                await tonConnectUI.openModal()
              }
            }}
          >
            Подключить
          </MainButton>
        </div>
      </div>
    )
  }

  return (
    <div className="scr">
      <div className="scr__body">
        <h1 className="title">Кошелёк</h1>
        <section className="card card--pad wallet-on">
          <div className="wallet-on__top">
            <span className="chip chip--plain"><i className="chip__dot" />Подключён</span>
            <WalletGlyph kind="telegram" />
          </div>
          <strong className="wallet-on__name">Кошелёк в Telegram</strong>
          <span className="muted wallet-on__addr num">{shortAddress(address)}</span>
          <div className="wallet-on__balance"><span className="muted">Доступно для покупок</span><strong className="num">48 USDT</strong></div>
          <span className="muted wallet-on__note">Хватит примерно на 4 покупки</span>
        </section>
        <div className="two-keys">
          <MainButton variant="dark" arrow={false} center onClick={() => window.open('https://t.me/wallet', '_blank')}>Пополнить</MainButton>
          <MainButton variant="dark" arrow={false} center onClick={() => tonConnectUI.openModal()}>Сменить</MainButton>
        </div>
        <SafeCard more={() => nav.push('dca')} />
      </div>
      <div className="scr__foot scr__foot--bottom">
        <button type="button" className="danger-link" onClick={() => tonConnectUI.disconnect()}>Отключить кошелёк</button>
      </div>
    </div>
  )
}

/* Шторка выбора: валюта и язык */
export function ChoiceSheet({ title, text, options, value, onPick, onClose }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__grip" />
        <h2 className="sheet__title">{title}</h2>
        {text && <p className="sheet__text">{text}</p>}
        <div className="choice">
          {options.map(([id, label, hint]) => (
            <button
              key={id}
              type="button"
              className="choice__row"
              onClick={() => {
                haptic.tick()
                onPick(id)
                setTimeout(onClose, 180)
              }}
            >
              <span>{label}</span>
              <span className="muted num choice__hint">{hint}</span>
              <Diode on={value === id} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* Что такое DCA */
export function Dca() {
  const steps = [
    ['Одна сумма, один день', 'Например, $10 каждую пятницу'],
    ['Цена усредняется сама', 'Когда курс ниже, на те же $10 приходит больше монет'],
    ['Работает на дистанции', 'Результат видно через годы, а не через дни'],
  ]
  return (
    <div className="scr">
      <div className="scr__body">
        <h1 className="title">Что такое DCA</h1>
        <p className="lead">Покупать на одну и ту же сумму через равные промежутки времени. Курс угадывать не нужно</p>
        <DcaChart />
        <section className="card card--pad steps">
          {steps.map(([t, s], i) => (
            <div key={t} className="steps__item">
              <span className="steps__n num accent">0{i + 1}</span>
              <span>
                <strong>{t}</strong>
                <span className="muted">{s}</span>
              </span>
            </div>
          ))}
        </section>
        <p className="muted small-note">Пример для наглядности, не прогноз. Доход не гарантирован</p>
      </div>
    </div>
  )
}

/* Поддержка */
const FAQ = [
  ['Где хранятся мои монеты?', 'В твоём кошельке. У Kopitron нет доступа к деньгам и ключам'],
  ['Сколько стоит покупка?', 'Комиссия Kopitron 0,25% от суммы, плюс комиссия обмена и сети. Всё видно перед подписью'],
  ['Как вывести монеты?', 'Монеты уже в твоём кошельке. Отправить их можно прямо из кошелька, как обычно'],
  ['Что если я пропущу покупку?', 'Ничего страшного. Kopitron напомнит в следующий раз, а DCA работает на длинной дистанции'],
]

export function Support() {
  const [open, setOpen] = useState(0)
  return (
    <div className="scr">
      <div className="scr__body">
        <h1 className="title">Поддержка</h1>
        <p className="lead">Отвечаем в Telegram, обычно в течение дня</p>
        <span className="label section-label">Частые вопросы</span>
        <section className="card faq">
          {FAQ.map(([q, a], i) => (
            <div key={q} className={`faq__item ${open === i ? 'is-open' : ''}`}>
              <button type="button" className="faq__q" onClick={() => { haptic.tick(); setOpen(open === i ? -1 : i) }}>
                <span>{q}</span>
                <span className={open === i ? 'accent' : 'muted'}>{open === i ? '−' : '+'}</span>
              </button>
              {open === i && <p className="faq__a muted">{a}</p>}
            </div>
          ))}
        </section>
      </div>
      <div className="scr__foot scr__foot--bottom">
        <MainButton onClick={() => window.Telegram?.WebApp?.openTelegramLink?.('https://t.me/DmitryLu4') ?? window.open('https://t.me/DmitryLu4')}>
          Написать в поддержку
        </MainButton>
      </div>
    </div>
  )
}

/* О Kopitron */
export function About() {
  return (
    <div className="scr">
      <div className="scr__body">
        <h1 className="title">О Kopitron</h1>
        <section className="card about-hero">
          <KopitronFace emotion="joy" size={88} />
          <strong>Копить в крипте так же просто, как откладывать в копилку</strong>
          <span className="label">Kopitron K-01 / Копилка для крипты</span>
        </section>
        <section className="card list settings">
          <div className="row"><span className="row__main row__title--set">Версия</span><span className="muted">0.1</span></div>
          <div className="row"><span className="row__main row__title--set">Комиссия Kopitron</span><span className="muted">0,25%</span></div>
          <button type="button" className="row"><span className="row__main row__title--set">Условия использования</span><span className="row__chevron">›</span></button>
          <button type="button" className="row"><span className="row__main row__title--set">Конфиденциальность</span><span className="row__chevron">›</span></button>
        </section>
        <p className="muted small-note">Kopitron не хранит деньги и ключи. Каждую покупку ты подтверждаешь сам в своём кошельке</p>
      </div>
    </div>
  )
}
