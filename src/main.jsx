import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TonConnectUIProvider, THEME } from '@tonconnect/ui-react'
import App from './App.jsx'
import { initTelegram } from './telegram.js'
import './styles/tokens.css'

initTelegram()

// Окно TON Connect рисует библиотека: задаём ему наши цвета, скругления и язык
const tonConnectUi = {
  theme: THEME.DARK,
  borderRadius: 'm',
  colorsSet: {
    [THEME.DARK]: {
      connectButton: { background: '#FF5A2E', foreground: '#191919' },
      accent: '#FF5A2E',
      telegramButton: '#FF5A2E',
      background: { primary: '#191919', secondary: '#262626', segment: '#262626', tint: '#0D0D0D', qr: '#F5F5F2' },
      text: { primary: '#F5F5F2', secondary: '#8F8F8C' },
      icon: { primary: '#F5F5F2', secondary: '#8F8F8C', tertiary: '#262626' },
    },
  },
}

// Манифест всегда с боевого адреса: кошельки не могут прочитать его с localhost
const MANIFEST_URL = 'https://diz-fluor.github.io/kopitron/tonconnect-manifest.json'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TonConnectUIProvider
      manifestUrl={MANIFEST_URL}
      language="ru"
      uiPreferences={tonConnectUi}
      actionsConfiguration={{ twaReturnUrl: 'https://t.me/kopitronbot' }}
    >
      <App />
    </TonConnectUIProvider>
  </StrictMode>,
)
