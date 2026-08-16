import { app } from 'electron'
import { join } from 'path'
import * as fs from 'fs'

export interface SwaySettings {
  enabled: boolean
  duckFactor: number
  restoreDelayMs: number
  fadeDownMs: number
  fadeUpMs: number
  restoreAutomatically: boolean
  showDuckingNotification: boolean
  showRestoreNotification: boolean
  showPlaybackNotification: boolean
  playNotificationSound: boolean
  notificationDuration: number
  launchOnStartup: boolean
  startMinimized: boolean
  minimizeToTray: boolean
  rememberWindowPosition: boolean
  autoCheckUpdates: boolean
  globalShortcut: string
  triggers: string[]
  targets: string[]
  duckAllOther: boolean
  excludeSystemSounds: boolean
  excludeCommunicationApps: boolean
  excludeMediaPlayers: boolean
  youtubeExtensionId: string
  detectionInterval: number
  transitionSmoothing: number
  debugLogging: boolean
  verboseLogging: boolean
}

const DEFAULT_SETTINGS: SwaySettings = {
  enabled: true,
  duckFactor: 0.25,
  restoreDelayMs: 1500,
  fadeDownMs: 1000,
  fadeUpMs: 1000,
  restoreAutomatically: true,
  showDuckingNotification: true,
  showRestoreNotification: true,
  showPlaybackNotification: false,
  playNotificationSound: false,
  notificationDuration: 3,
  launchOnStartup: false,
  startMinimized: false,
  minimizeToTray: true,
  rememberWindowPosition: true,
  autoCheckUpdates: true,
  globalShortcut: 'Alt+Space',
  triggers: ['chrome', 'msedge', 'firefox', 'brave', 'opera'],
  targets: ['spotify', 'itunes', 'vlc', 'foobar2000', 'wmplayer', 'musicbee', 'aimp', 'winamp', 'applemusic', 'tidal', 'deezer', 'amazonmusic', 'soundcloud', 'groove'],
  duckAllOther: false,
  excludeSystemSounds: true,
  excludeCommunicationApps: true,
  excludeMediaPlayers: false,
  youtubeExtensionId: '',
  detectionInterval: 50,
  transitionSmoothing: 50,
  debugLogging: false,
  verboseLogging: false
}

const CONFIG_FILE = join(app.getPath('userData'), 'settings.json')

export function loadSettings(): SwaySettings {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8')
      const parsed = JSON.parse(data)
      return { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch (e) {
    console.error('Failed to load settings, using defaults:', e)
  }
  return { ...DEFAULT_SETTINGS }
}

export function saveSettings(settings: SwaySettings): void {
  try {
    const dir = join(app.getPath('userData'))
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(settings, null, 2), 'utf-8')
  } catch (e) {
    console.error('Failed to save settings:', e)
  }
}
