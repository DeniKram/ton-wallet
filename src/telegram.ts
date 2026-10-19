// Минимальные типы для того, что используем; расширяем по мере надобности
interface TelegramUser {
  id: number
  first_name: string
  username?: string
}

interface TelegramWebApp {
  ready(): void
  expand(): void
  openLink(url: string): void // открыть внешнюю ссылку (браузер поверх Telegram)
  platform: string // 'ios' | 'android' | 'tdesktop' | 'web' | ... ; 'unknown' вне Telegram
  version: string // версия Bot API, например '9.6'
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

/** Открыть внешнюю ссылку: в Telegram через его браузер, иначе в новой вкладке */
export function openExternal(url: string): void {
  if (tg) tg.openLink(url)
  else window.open(url, '_blank', 'noopener')
}
