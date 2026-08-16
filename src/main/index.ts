import { app, shell, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, Notification, nativeImage } from 'electron'
import { join } from 'path'
import { spawn, ChildProcess } from 'child_process'
import * as readline from 'readline'
import * as fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { loadSettings, saveSettings, SwaySettings } from './config'

let settingsWindow: BrowserWindow | null = null
let launcherWindow: BrowserWindow | null = null
let tray: Tray | null = null
let audioProcess: ChildProcess | null = null
let currentSettings = loadSettings()
let wasDucking = false
let isQuitting = false

function killAudioProcess(): void {
  if (audioProcess) {
    try {
      if (process.platform === 'win32' && audioProcess.pid) {
        spawn('taskkill', ['/pid', audioProcess.pid.toString(), '/f', '/t'])
      } else {
        audioProcess.kill('SIGKILL')
      }
    } catch (e) {
      console.error('Failed to kill audio process:', e)
    }
    audioProcess = null
  }
}

// Start AudioManager C# engine subprocess
function startAudioManager(): void {
  if (isQuitting) return
  killAudioProcess()

  let exePath = join(app.getAppPath(), 'src/main/AudioManager.exe')
  
  if (!fs.existsSync(exePath)) {
    exePath = join(process.resourcesPath, 'AudioManager.exe')
  }

  if (!fs.existsSync(exePath)) {
    exePath = join(__dirname, 'AudioManager.exe')
  }

  console.log(`Starting SWAY Audio Engine from: ${exePath}`)
  
  try {
    audioProcess = spawn(exePath, [], { stdio: ['pipe', 'pipe', 'inherit'], windowsHide: true })

    const rl = readline.createInterface({
      input: audioProcess.stdout!,
      terminal: false
    })

    rl.on('line', (line) => {
      try {
        const parsed = JSON.parse(line)
        
        // Handle session updates and notifications
        if (parsed.event === 'sessions') {
          // Broadcast to Settings window if open
          if (settingsWindow && !settingsWindow.isDestroyed()) {
            settingsWindow.webContents.send('audio:sessions', parsed)
          }
          // Broadcast to Launcher window if open
          if (launcherWindow && !launcherWindow.isDestroyed()) {
            launcherWindow.webContents.send('audio:sessions', parsed)
          }

          // Trigger toast notifications on ducking status change
          const currentDucking = parsed.duckingActive
          if (currentDucking !== wasDucking) {
            triggerDuckingNotification(currentDucking)
            wasDucking = currentDucking
          }
        } else if (parsed.event === 'ack') {
          if (settingsWindow && !settingsWindow.isDestroyed()) {
            settingsWindow.webContents.send('audio:ack', parsed)
          }
        } else if (parsed.event === 'error') {
          if (settingsWindow && !settingsWindow.isDestroyed()) {
            settingsWindow.webContents.send('audio:error', parsed)
          }
        }
      } catch (e) {
        console.error('Failed to parse audio engine output:', line, e)
      }
    })

    audioProcess.on('error', (err) => {
      console.error('Audio engine failed to start:', err)
      sendErrorToUI(`Subprocess spawn error: ${err.message}`)
    })

    audioProcess.on('exit', (code) => {
      console.log(`Audio engine process exited with code ${code}`)
      audioProcess = null
    })

    // Wait a brief moment then send initial settings
    setTimeout(() => {
      syncConfigToEngine()
    }, 500)

  } catch (err: any) {
    console.error('Error in startAudioManager:', err)
  }
}

// Sync current configuration settings to the C# subprocess
function syncConfigToEngine(): void {
  if (!audioProcess || !audioProcess.stdin || isQuitting) return

  try {
    // 1. Send settings
    audioProcess.stdin.write(JSON.stringify({
      command: 'set_settings',
      enabled: currentSettings.enabled,
      duckFactor: currentSettings.duckFactor,
      restoreDelayMs: currentSettings.restoreDelayMs,
      fadeDownMs: currentSettings.fadeDownMs,
      fadeUpMs: currentSettings.fadeUpMs,
      duckAllOther: currentSettings.duckAllOther,
      excludeSystemSounds: currentSettings.excludeSystemSounds,
      excludeCommunicationApps: currentSettings.excludeCommunicationApps,
      excludeMediaPlayers: currentSettings.excludeMediaPlayers
    }) + '\n')

    // 2. Send processes
    audioProcess.stdin.write(JSON.stringify({
      command: 'set_processes',
      triggers: currentSettings.triggers,
      targets: currentSettings.targets
    }) + '\n')
  } catch (e) {
    console.error('Failed to sync config to audio engine:', e)
  }
}

// Trigger standard OS notifications based on user setting
function triggerDuckingNotification(isDucked: boolean): void {
  if (isQuitting) return
  if (isDucked && currentSettings.showDuckingNotification) {
    new Notification({
      title: 'SWAY',
      body: `Background audio lowered to ${Math.round(currentSettings.duckFactor * 100)}%.`,
      silent: !currentSettings.playNotificationSound,
      icon: icon
    }).show()
  } else if (!isDucked && currentSettings.showRestoreNotification) {
    new Notification({
      title: 'SWAY',
      body: 'Audio restored to original volume.',
      silent: !currentSettings.playNotificationSound,
      icon: icon
    }).show()
  }
}

function sendErrorToUI(msg: string): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('audio:error', { message: msg })
  }
}

// Create System Tray Integration
function createTray(): void {
  try {
    let img = nativeImage.createFromPath(icon).resize({ width: 16, height: 16 })
    if (img.isEmpty() && fs.existsSync(join(process.resourcesPath, 'icon.png'))) {
      img = nativeImage.createFromPath(join(process.resourcesPath, 'icon.png')).resize({ width: 16, height: 16 })
    }
    tray = new Tray(img)
    updateTrayMenu()
    tray.setToolTip('SWAY')
    
    tray.on('double-click', () => {
      showSettingsWindow()
    })
  } catch (err) {
    console.error('Failed to initialize system tray:', err)
  }
}

function updateTrayMenu(): void {
  if (!tray) return

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'SWAY',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Enable Ducking',
      type: 'checkbox',
      checked: currentSettings.enabled,
      click: (item) => {
        currentSettings.enabled = item.checked
        saveSettings(currentSettings)
        syncConfigToEngine()
        updateTrayMenu()
        if (settingsWindow && !settingsWindow.isDestroyed()) {
          settingsWindow.webContents.send('config-updated', currentSettings)
        }
      }
    },
    {
      label: 'Pause Ducking',
      type: 'checkbox',
      checked: !currentSettings.enabled,
      click: (item) => {
        currentSettings.enabled = !item.checked
        saveSettings(currentSettings)
        syncConfigToEngine()
        updateTrayMenu()
        if (settingsWindow && !settingsWindow.isDestroyed()) {
          settingsWindow.webContents.send('config-updated', currentSettings)
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => showSettingsWindow()
    },
    {
      label: 'Search Launcher',
      click: () => toggleLauncher()
    },
    { type: 'separator' },
    {
      label: 'Quit SWAY',
      click: () => {
        exitAppProperly()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
}

function exitAppProperly(): void {
  isQuitting = true
  globalShortcut.unregisterAll()
  killAudioProcess()
  if (tray) {
    try {
      tray.destroy()
    } catch {}
    tray = null
  }
  app.exit(0)
}

// Register Global Shortcut
function registerHotkey(shortcut: string): void {
  globalShortcut.unregisterAll()
  if (!shortcut || shortcut.trim() === '') return
  try {
    globalShortcut.register(shortcut, () => {
      toggleLauncher()
    })
    console.log(`Global hotkey registered: ${shortcut}`)
  } catch (e) {
    console.error(`Failed to register global hotkey "${shortcut}":`, e)
  }
}

function toggleLauncher(): void {
  if (isQuitting) return
  if (!launcherWindow || launcherWindow.isDestroyed()) {
    createLauncherWindow()
  }

  if (launcherWindow) {
    if (launcherWindow.isVisible()) {
      launcherWindow.hide()
    } else {
      launcherWindow.show()
      launcherWindow.focus()
    }
  }
}

// Window creation helpers
function showSettingsWindow(): void {
  if (isQuitting) return
  if (!settingsWindow || settingsWindow.isDestroyed()) {
    createSettingsWindow()
  } else {
    settingsWindow.show()
    settingsWindow.focus()
  }
}

function createSettingsWindow(): void {
  settingsWindow = new BrowserWindow({
    width: 960,
    height: 720,
    show: true,
    autoHideMenuBar: true,
    title: 'SWAY Settings',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  settingsWindow.setAlwaysOnTop(true)
  settingsWindow.show()
  settingsWindow.focus()
  settingsWindow.setAlwaysOnTop(false)
  settingsWindow.flashFrame(true)

  // Handle minimize to tray behaviour
  settingsWindow.on('minimize', () => {
    if (!isQuitting && currentSettings.minimizeToTray) {
      if (settingsWindow) settingsWindow.hide()
    }
  })

  settingsWindow.on('close', (event) => {
    if (!isQuitting && tray && currentSettings.minimizeToTray) {
      event.preventDefault()
      if (settingsWindow) settingsWindow.hide()
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    settingsWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?window=settings`)
  } else {
    settingsWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      search: 'window=settings'
    })
  }
}

function createLauncherWindow(): void {
  launcherWindow = new BrowserWindow({
    width: 680,
    height: 420,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    icon: icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  launcherWindow.on('blur', () => {
    if (launcherWindow && !launcherWindow.isDestroyed()) {
      launcherWindow.hide()
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    launcherWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?window=launcher`)
  } else {
    launcherWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      search: 'window=launcher'
    })
  }
}

// App Initialization
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.sway.utility')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Start background processes
  createTray()
  createLauncherWindow()
  createSettingsWindow()
  startAudioManager()
  registerHotkey(currentSettings.globalShortcut)

  // Configure Startup shortcut
  configureStartupEntry(currentSettings.launchOnStartup)

  // IPC channel registrations
  ipcMain.handle('config:get', () => {
    return currentSettings
  })

  ipcMain.handle('config:save', (_event, settings: SwaySettings) => {
    const oldShortcut = currentSettings.globalShortcut
    const oldStartup = currentSettings.launchOnStartup

    currentSettings = settings
    saveSettings(currentSettings)
    syncConfigToEngine()
    updateTrayMenu()

    // Re-register hotkey if modified
    if (oldShortcut !== currentSettings.globalShortcut) {
      registerHotkey(currentSettings.globalShortcut)
    }

    // Update Startup entry if modified
    if (oldStartup !== currentSettings.launchOnStartup) {
      configureStartupEntry(currentSettings.launchOnStartup)
    }

    // Sync to all windows
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.webContents.send('config-updated', currentSettings)
    }
    if (launcherWindow && !launcherWindow.isDestroyed()) {
      launcherWindow.webContents.send('config-updated', currentSettings)
    }

    return true
  })

  ipcMain.on('audio:set-volume', (_event, { pid, volume }) => {
    if (audioProcess && audioProcess.stdin) {
      audioProcess.stdin.write(JSON.stringify({ command: 'set_volume', pid, volume }) + '\n')
    }
  })

  ipcMain.on('audio:set-mute', (_event, { pid, mute }) => {
    if (audioProcess && audioProcess.stdin) {
      audioProcess.stdin.write(JSON.stringify({ command: 'set_mute', pid, mute }) + '\n')
    }
  })

  // Action IPC channels
  ipcMain.on('action:open-launcher', () => {
    toggleLauncher()
  })

  ipcMain.on('action:hide-launcher', () => {
    if (launcherWindow && !launcherWindow.isDestroyed()) {
      launcherWindow.hide()
    }
  })

  ipcMain.on('action:open-settings', () => {
    showSettingsWindow()
    if (launcherWindow && !launcherWindow.isDestroyed()) {
      launcherWindow.hide()
    }
  })

  ipcMain.on('action:exit-app', () => {
    exitAppProperly()
  })

  ipcMain.handle('action:open-log-folder', () => {
    shell.openPath(app.getPath('userData'))
    return true
  })

  ipcMain.handle('action:clear-logs', () => {
    return true
  })

  ipcMain.handle('action:test-ducking', () => {
    return true
  })

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createSettingsWindow()
  })
})

function configureStartupEntry(enable: boolean): void {
  try {
    app.setLoginItemSettings({
      openAtLogin: enable,
      path: app.getPath('exe')
    })
  } catch (e) {
    console.error('Failed to set login item settings:', e)
  }
}

// Clean termination handlers
app.on('before-quit', () => {
  isQuitting = true
  killAudioProcess()
})

app.on('window-all-closed', () => {
  if (!isQuitting && currentSettings.minimizeToTray) {
    // Keep running in tray / background
  } else {
    exitAppProperly()
  }
})

app.on('will-quit', () => {
  exitAppProperly()
})

process.on('exit', () => {
  killAudioProcess()
})
