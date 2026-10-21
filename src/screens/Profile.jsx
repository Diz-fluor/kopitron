import LegalBody from '../components/LegalBody.jsx'
import { useState } from 'react'
import { useTonConnectUI } from '@tonconnect/ui-react'
import MainButton from '../components/MainButton.jsx'
import KopitronFace from '../components/KopitronFace.jsx'
import { useLiveHistory } from './History.jsx'
import { DcaChart, Diode, DotIcon, SHIELD, WalletChoiceIcon, WalletLogo, connectWallet, useWalletInfo } from '../onboarding/Onboarding.jsx'
import { shortAddress, useWallet, isDemoWallet } from '../wallet.js'
import { usePortfolio, fmtAmount } from '../api/tonapi.js'
import { haptic } from '../telegram.js'
import './Profile.css'
import Sheet from '../components/Sheet.jsx'

const plural = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'покупку' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'покупки' : 'покупок')

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
  const info = useWalletInfo()
  const { items, demo } = useLiveHistory()
  const buys = items.filter((h) => !h.skipped)
  const first = buys.length ? new Date(Math.min(...buys.map((h) => h.time ?? Date.now()))) : null
  const since = demo ? 'копит с 14 сентября, 6 покупок' : !address ? 'кошелёк не подключён' : first ? `копит с ${first.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}, ${buys.length} ${purchasesWord(buys.length)}` : 'первая покупка впереди'
  const user = tgUser()
  const name = user?.first_name ?? 'Гость'
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
            <span className="muted me__sub">{since}</span>
          </span>
        </div>

        <button type="button" className="card card--pad wallet-card" onClick={() => nav.push('wallet')}>
          <span className="wallet-card__top">
            {address ? <WalletLogo src={info.logo} /> : <WalletChoiceIcon kind="other" />}
            <span className="row__main">
              <span className="row__title">{address ? info.name : 'Кошелёк не подключён'}</span>
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
  const info = useWalletInfo()
  const live = usePortfolio(address && !isDemoWallet(address) ? address : null)
  const usdt = live.data ? live.data.usdt?.amount ?? 0 : isDemoWallet(address) ? 48 : null
  const plan = (() => { try { return JSON.parse(localStorage.getItem('kopitron.plan')) } catch { return null } })()
  const per = plan?.amount ?? 10
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
              ['other', 'Другой кошелёк TON', 'Tonkeeper, MyTonWallet и другие'],
            ].map(([id, t, sub]) => (
              <button key={id} type="button" className={`card wallet ${choice === id ? 'is-selected' : ''}`} onClick={() => { haptic.tick(); setChoice(id) }}>
                <WalletChoiceIcon kind={id} />
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
            onClick={() => connectWallet(tonConnectUI, choice)}
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
            <WalletLogo src={info.logo} />
          </div>
          <strong className="wallet-on__name">{info.name}</strong>
          <span className="muted wallet-on__addr num">{shortAddress(address)}</span>
          <div className="wallet-on__balance"><span className="muted">Доступно для покупок</span><strong className="num">{usdt == null ? '…' : `${fmtAmount(usdt)} USDT`}</strong></div>
          <span className="muted wallet-on__note">
            {usdt == null ? 'Загружаем баланс' : usdt < per ? `Для покупки нужно ${per} USDT, пополни кошелёк` : `Хватит примерно на ${Math.floor(usdt / per)} ${plural(Math.floor(usdt / per))}`}
          </span>
        </section>
        <div className="two-keys">
          <MainButton variant="dark" arrow={false} center onClick={() => window.open('https://t.me/wallet', '_blank')}>Пополнить</MainButton>
          <MainButton variant="dark" arrow={false} center onClick={async () => { if (tonConnectUI.connected) await tonConnectUI.disconnect(); await tonConnectUI.openModal() }}>Сменить</MainButton>
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
    <Sheet onClose={onClose}>
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
    </Sheet>
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
        <MainButton onClick={() => window.Telegram?.WebApp?.openTelegramLink?.('https://t.me/kopitronbot') ?? window.open('https://t.me/kopitronbot')}>
          Написать в поддержку
        </MainButton>
      </div>
    </div>
  )
}

/* О Kopitron */
export function About({ nav }) {
  return (
    <div className="scr">
      <div className="scr__body">
        <h1 className="title">О Kopitron</h1>
        <section className="card about-hero">
          <KopitronFace emotion="joy" size={88} />
          <strong>Копить в крипте так же просто, как откладывать в копилку</strong>
          <span className="label">Kopitron K-02 / Копилка для крипты</span>
        </section>
        <section className="card list settings">
          <div className="row"><span className="row__main row__title--set">Версия</span><span className="muted">0.1</span></div>
          <div className="row"><span className="row__main row__title--set">Комиссия Kopitron</span><span className="muted">0,25%</span></div>
          <button type="button" className="row" onClick={() => nav.push('legal', { doc: 'terms' })}><span className="row__main row__title--set">Условия использования</span><span className="row__chevron">›</span></button>
          <button type="button" className="row" onClick={() => nav.push('legal', { doc: 'privacy' })}><span className="row__main row__title--set">Конфиденциальность</span><span className="row__chevron">›</span></button>
        </section>
        <p className="muted small-note">Kopitron не хранит деньги и ключи. Каждую покупку ты подтверждаешь сам в своём кошельке</p>
      </div>
    </div>
  )
}

function purchasesWord(n) {
  const a = n % 10, b = n % 100
  if (a === 1 && b !== 11) return 'покупка'
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return 'покупки'
  return 'покупок'
}

export function Legal({ doc }) {
  return (
    <div className="scr">
      <div className="scr__body">
        <LegalBody doc={doc} />
      </div>
    </div>
  )
}
