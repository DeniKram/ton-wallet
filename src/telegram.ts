// Минимальные типы для того, что используем сейчас; будем расширять по мере надобности
interface TelegramUser {
  id: number
  first_name: string
  username?: string
}

interface TelegramWebApp {
  ready(): void
  expand(): void
  platform: string // 'ios' | 'android' | 'tdesktop' | 'web' | ... ; 'unknown' вне Telegram
  version: string // версия Bot API, например '9.1'
  colorScheme: 'light' | 'dark'
  initDataUnsafe: { user?: TelegramUser }
  isVersionAtLeast(version: string): boolean
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp }
  }
}

// Скрипт telegram-web-app.js создаёт объект и в обычном браузере, но с platform = 'unknown'
const webApp = window.Telegram?.WebApp
export const tg: TelegramWebApp | null =
  webApp && webApp.platform !== 'unknown' ? webApp : null

export function initTelegram(): void {
  if (!tg) return
  tg.ready() // сообщаем Telegram, что приложение загрузилось (убирает лоадер)
  tg.expand() // разворачиваем на всю высоту
}
