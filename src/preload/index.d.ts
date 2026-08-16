import { ElectronAPI } from '@electron-toolkit/preload'

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

export interface SessionData {
  pid: number
  name: string
  volume: number
  peak: number
  isMuted: boolean
}

export interface SessionsEvent {
  duckingActive: boolean
  data: SessionData[]
}

export interface AudioApi {
  getConfig: () => Promise<SwaySettings>
  saveConfig: (settings: SwaySettings) => Promise<boolean>
  setVolume: (pid: number, volume: number) => void
  setMute: (pid: number, mute: boolean) => void
  
  openLogFolder: () => Promise<boolean>
  clearLogs: () => Promise<boolean>
  testDucking: () => Promise<boolean>
  
  openSettings: () => void
  hideLauncher: () => void
  exitApp: () => void

  onSessions: (callback: (data: SessionsEvent) => void) => () => void
  onConfigUpdated: (callback: (data: SwaySettings) => void) => () => void
  onAck: (callback: (data: { command: string }) => void) => () => void
  onError: (callback: (data: { message: string }) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: AudioApi
  }
}

