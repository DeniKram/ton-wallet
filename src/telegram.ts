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
  requestFullscreen?(): void // Bot API 8.0+: во весь экран, без шапки Telegram
  disableVerticalSwipes?(): void // Bot API 7.7+: не закрывать приложение свайпом вниз
  isFullscreen?: boolean
  platform: string // 'ios' | 'android' | 'tdesktop' | 'web' | ... ; 'unknown' вне Telegram
  version: string // версия Bot API, например '9.6'
  colorScheme: 'light' | 'dark'
  initDataUnsafe: { user?: TelegramUser }
  isVersionAtLeast(version: string): boolean
}

// Низкоуровневый канал к клиенту Telegram: все методы WebApp внутри вызывают именно его
interface TelegramWebView {
  postEvent(eventType: string, callback?: unknown, eventData?: unknown): void
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp; WebView?: TelegramWebView }
  }
}

/** Отправить событие клиенту напрямую (на случай, если загружен старый telegram-web-app.js) */
function postEvent(eventType: string, eventData?: unknown): void {
  try {
    window.Telegram?.WebView?.postEvent(eventType, false, eventData)
  } catch {
    // клиент не поддерживает событие: игнорируем
  }
}

// Скрипт telegram-web-app.js создаёт объект и в обычном браузере, но с platform = 'unknown'
const webApp = window.Telegram?.WebApp
export const tg: TelegramWebApp | null =
  webApp && webApp.platform !== 'unknown' ? webApp : null

const isMobile = (platform: string) => platform === 'ios' || platform === 'android'

export function initTelegram(): void {
  if (!tg) return
  tg.ready() // сообщаем Telegram, что приложение загрузилось (убирает лоадер)
  tg.expand() // разворачиваем на всю высоту

  // На телефоне открываемся во весь экран. На компьютере оставляем окно:
  // там fullscreen растягивает приложение на весь монитор.
  if (isMobile(tg.platform) && tg.isVersionAtLeast('8.0')) {
    try {
      if (tg.requestFullscreen) tg.requestFullscreen()
      else postEvent('web_app_request_fullscreen')
    } catch {
      // старый клиент или запрет: остаёмся в обычном режиме
    }
  }

  // Чтобы прокрутка истории вниз не закрывала кошелёк
  if (tg.isVersionAtLeast('7.7')) {
    if (tg.disableVerticalSwipes) tg.disableVerticalSwipes()
    else postEvent('web_app_setup_swipe_behavior', { allow_vertical_swipe: false })
  }
}

/** Открыть внешнюю ссылку: в Telegram через его браузер, иначе в новой вкладке */
export function openExternal(url: string): void {
  if (tg) tg.openLink(url)
  else window.open(url, '_blank', 'noopener')
}
