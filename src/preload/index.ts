import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for SWAY renderer
const api = {
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (settings) => ipcRenderer.invoke('config:save', settings),
  setVolume: (pid, volume) => ipcRenderer.send('audio:set-volume', { pid, volume }),
  setMute: (pid, mute) => ipcRenderer.send('audio:set-mute', { pid, mute }),
  
  openLogFolder: () => ipcRenderer.invoke('action:open-log-folder'),
  clearLogs: () => ipcRenderer.invoke('action:clear-logs'),
  testDucking: () => ipcRenderer.invoke('action:test-ducking'),
  
  openSettings: () => ipcRenderer.send('action:open-settings'),
  hideLauncher: () => ipcRenderer.send('action:hide-launcher'),
  exitApp: () => ipcRenderer.send('action:exit-app'),

  onSessions: (callback) => {
    const subscription = (_event, data) => callback(data)
    ipcRenderer.on('audio:sessions', subscription)
    return () => {
      ipcRenderer.removeListener('audio:sessions', subscription)
    }
  },
  onConfigUpdated: (callback) => {
    const subscription = (_event, data) => callback(data)
    ipcRenderer.on('config-updated', subscription)
    return () => {
      ipcRenderer.removeListener('config-updated', subscription)
    }
  },
  onAck: (callback) => {
    const subscription = (_event, data) => callback(data)
    ipcRenderer.on('audio:ack', subscription)
    return () => {
      ipcRenderer.removeListener('audio:ack', subscription)
    }
  },
  onError: (callback) => {
    const subscription = (_event, data) => callback(data)
    ipcRenderer.on('audio:error', subscription)
    return () => {
      ipcRenderer.removeListener('audio:error', subscription)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
