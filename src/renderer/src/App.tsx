import React, { useState, useEffect, useRef } from 'react'
import { SwaySettings, SessionData } from '../../preload/index.d'

// Clean native Windows 11 style SVG icons (No emojis)
const Icons = {
  Logo: ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12h3l3-7 4 14 3-7h7" />
    </svg>
  ),
  General: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Ducking: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  ),
  Detection: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Applications: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  Notifications: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Startup: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  ),
  Browser: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  Advanced: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  ),
  Folder: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Power: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  )
}

interface LogItem {
  time: string
  type: 'info' | 'duck' | 'restore'
  message: string
}

interface CommandItem {
  id: string
  name: string
  desc: string
  shortcut: string
  icon: React.ReactNode
  action: () => void
}

function App(): React.JSX.Element {
  const [windowType, setWindowType] = useState<'settings' | 'launcher'>('settings')
  const [activeTab, setActiveTab] = useState<string>('general')
  const [settings, setSettings] = useState<SwaySettings | null>(null)
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [duckingActive, setDuckingActive] = useState<boolean>(false)
  const wasDuckingRef = useRef<boolean>(false)

  const [showResetDialog, setShowResetDialog] = useState<boolean>(false)
  const [logs, setLogs] = useState<LogItem[]>([
    { time: new Date().toLocaleTimeString(), type: 'info', message: 'SWAY Audio Engine initialized.' }
  ])

  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Add process state
  const [newProcessName, setNewProcessName] = useState('')
  const [processType, setProcessType] = useState<'trigger' | 'target'>('target')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('window') === 'launcher') {
      setWindowType('launcher')
    } else {
      setWindowType('settings')
    }
  }, [])

  useEffect(() => {
    window.api.getConfig().then((config) => {
      setSettings(config)
    })

    const unsubscribeConfig = window.api.onConfigUpdated((updatedConfig) => {
      setSettings(updatedConfig)
    })

    return unsubscribeConfig
  }, [])

  useEffect(() => {
    const unsubscribeSessions = window.api.onSessions((event) => {
      setSessions(event.data)
      setDuckingActive(event.duckingActive)

      if (event.duckingActive !== wasDuckingRef.current) {
        const time = new Date().toLocaleTimeString()
        if (event.duckingActive) {
          addLog(time, 'duck', `Ducked background audio to ${Math.round((settings?.duckFactor || 0.25) * 100)}%.`)
        } else {
          addLog(time, 'restore', 'Restored background audio to standard level.')
        }
        wasDuckingRef.current = event.duckingActive
      }
    })
    return unsubscribeSessions
  }, [settings])

  useEffect(() => {
    const unsubscribeError = window.api.onError((err) => {
      addLog(new Date().toLocaleTimeString(), 'info', `Engine notice: ${err.message}`)
    })
    return unsubscribeError
  }, [])

  useEffect(() => {
    if (windowType === 'launcher' && inputRef.current) {
      inputRef.current.focus()
      setSearchQuery('')
      setSelectedIndex(0)
    }
  }, [windowType])

  const addLog = (time: string, type: 'info' | 'duck' | 'restore', message: string) => {
    setLogs((prev) => [{ time, type, message }, ...prev].slice(0, 50))
  }

  const updateSetting = <K extends keyof SwaySettings>(key: K, value: SwaySettings[K]) => {
    if (!settings) return
    const next = { ...settings, [key]: value }
    setSettings(next)
    window.api.saveConfig(next)
  }

  const saveAllSettings = (updated: SwaySettings) => {
    setSettings(updated)
    window.api.saveConfig(updated)
    addLog(new Date().toLocaleTimeString(), 'info', 'Saved configuration settings.')
  }

  const handleAddProcess = () => {
    if (!settings || !newProcessName.trim()) return
    const cleanName = newProcessName.trim().toLowerCase().replace('.exe', '')
    
    if (processType === 'trigger') {
      if (!settings.triggers.includes(cleanName)) {
        const updated = { ...settings, triggers: [...settings.triggers, cleanName] }
        saveAllSettings(updated)
        addLog(new Date().toLocaleTimeString(), 'info', `Added "${cleanName}.exe" to trigger list.`)
      }
    } else {
      if (!settings.targets.includes(cleanName)) {
        const updated = { ...settings, targets: [...settings.targets, cleanName] }
        saveAllSettings(updated)
        addLog(new Date().toLocaleTimeString(), 'info', `Added "${cleanName}.exe" to target list.`)
      }
    }
    setNewProcessName('')
  }

  const handleRemoveProcess = (name: string, type: 'trigger' | 'target') => {
    if (!settings) return
    const cleanName = name.toLowerCase()
    
    if (type === 'trigger') {
      const updated = { ...settings, triggers: settings.triggers.filter((t) => t !== cleanName) }
      saveAllSettings(updated)
      addLog(new Date().toLocaleTimeString(), 'info', `Removed "${cleanName}" from triggers.`)
    } else {
      const updated = { ...settings, targets: settings.targets.filter((t) => t !== cleanName) }
      saveAllSettings(updated)
      addLog(new Date().toLocaleTimeString(), 'info', `Removed "${cleanName}" from targets.`)
    }
  }

  const handleTestDucking = () => {
    window.api.testDucking()
    addLog(new Date().toLocaleTimeString(), 'info', 'Simulating ducking audio state transition.')
  }

  const handleResetSettings = () => {
    const defaultSettings: SwaySettings = {
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
    saveAllSettings(defaultSettings)
    setShowResetDialog(false)
    addLog(new Date().toLocaleTimeString(), 'info', 'Restored default settings.')
  }

  // Launcher commands with clean SVG icons
  const commands: CommandItem[] = [
    {
      id: 'settings_general',
      name: 'SWAY Settings',
      desc: 'Open main configuration dashboard',
      shortcut: 'Ctrl+,',
      icon: <Icons.General size={15} />,
      action: () => window.api.openSettings()
    },
    {
      id: 'settings_ducking',
      name: 'Ducking Settings',
      desc: 'Adjust volume reduction and fade durations',
      shortcut: 'Alt+D',
      icon: <Icons.Ducking size={15} />,
      action: () => {
        window.api.openSettings()
        setTimeout(() => setActiveTab('ducking'), 150)
      }
    },
    {
      id: 'settings_playback',
      name: 'Playback Detection',
      desc: 'Configure browser media triggers',
      shortcut: 'Alt+P',
      icon: <Icons.Detection size={15} />,
      action: () => {
        window.api.openSettings()
        setTimeout(() => setActiveTab('playback'), 150)
      }
    },
    {
      id: 'settings_apps',
      name: 'Applications List',
      desc: 'Manage excluded and targeted audio processes',
      shortcut: 'Alt+A',
      icon: <Icons.Applications size={15} />,
      action: () => {
        window.api.openSettings()
        setTimeout(() => setActiveTab('applications'), 150)
      }
    },
    {
      id: 'action_config_folder',
      name: 'Open Configuration Folder',
      desc: 'View settings directory in Explorer',
      shortcut: 'Ctrl+Shift+O',
      icon: <Icons.Folder size={15} />,
      action: () => window.api.openLogFolder()
    },
    {
      id: 'action_exit',
      name: 'Quit SWAY',
      desc: 'Close application and release audio session controls',
      shortcut: 'Alt+F4',
      icon: <Icons.Power size={15} />,
      action: () => window.api.exitApp()
    }
  ]

  const filteredCommands = commands.filter((cmd) =>
    cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cmd.desc.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleLauncherKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      window.api.hideLauncher()
    }
  }

  useEffect(() => {
    if (windowType !== 'launcher') return
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.api.hideLauncher()
      }
    }
    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [windowType])

  if (!settings) {
    return (
      <div className="sway-app settings-window" style={{ alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <Icons.Logo size={32} />
          <span style={{ fontSize: '13px' }}>Loading SWAY...</span>
        </div>
      </div>
    )
  }

  // Render Launcher Window (Alt+Space)
  if (windowType === 'launcher') {
    return (
      <div className="sway-app launcher-window">
        <div className="launcher-box">
          <div className="launcher-header">
            <div className="launcher-logo">
              <Icons.Logo size={13} />
            </div>
            <input
              ref={inputRef}
              type="text"
              className="launcher-input"
              placeholder="Search settings, commands and actions..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setSelectedIndex(0)
              }}
              onKeyDown={handleLauncherKeyDown}
            />
          </div>

          <div className="launcher-list">
            {filteredCommands.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No matching commands found.
              </div>
            ) : (
              filteredCommands.map((cmd, idx) => (
                <div
                  key={cmd.id}
                  className={`launcher-item ${idx === selectedIndex ? 'selected' : ''}`}
                  onClick={cmd.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="launcher-item-meta">
                    <span className="launcher-item-icon">{cmd.icon}</span>
                    <div className="launcher-item-text">
                      <span className="launcher-item-name">{cmd.name}</span>
                      <span className="launcher-item-desc">{cmd.desc}</span>
                    </div>
                  </div>
                  <span className="launcher-item-shortcut">{cmd.shortcut}</span>
                </div>
              ))
            )}
          </div>

          <div className="launcher-footer">
            <span>SWAY</span>
            <div className="launcher-tip-container">
              <div className="launcher-tip">
                <span className="launcher-key">↑↓</span> Navigate
              </div>
              <div className="launcher-tip">
                <span className="launcher-key">Enter</span> Select
              </div>
              <div className="launcher-tip">
                <span className="launcher-key">Esc</span> Close
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render Settings Dashboard Window
  return (
    <div className="sway-app settings-window">
      {/* Left Sidebar */}
      <div className="sidebar">
        <div>
          <div className="logo-section">
            <div className="logo-icon">
              <Icons.Logo size={14} />
            </div>
            <div className="logo-text">SWAY</div>
          </div>

          <div className="nav-list">
            <div className={`nav-item ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>
              <Icons.General size={15} /> General
            </div>
            <div className={`nav-item ${activeTab === 'ducking' ? 'active' : ''}`} onClick={() => setActiveTab('ducking')}>
              <Icons.Ducking size={15} /> Ducking
            </div>
            <div className={`nav-item ${activeTab === 'playback' ? 'active' : ''}`} onClick={() => setActiveTab('playback')}>
              <Icons.Detection size={15} /> Playback Detection
            </div>
            <div className={`nav-item ${activeTab === 'applications' ? 'active' : ''}`} onClick={() => setActiveTab('applications')}>
              <Icons.Applications size={15} /> Applications
            </div>
            <div className={`nav-item ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
              <Icons.Notifications size={15} /> Notifications
            </div>
            <div className={`nav-item ${activeTab === 'startup' ? 'active' : ''}`} onClick={() => setActiveTab('startup')}>
              <Icons.Startup size={15} /> Startup & Logging
            </div>
            <div className={`nav-item ${activeTab === 'browser' ? 'active' : ''}`} onClick={() => setActiveTab('browser')}>
              <Icons.Browser size={15} /> Browser Integration
            </div>
            <div className={`nav-item ${activeTab === 'advanced' ? 'active' : ''}`} onClick={() => setActiveTab('advanced')}>
              <Icons.Advanced size={15} /> Advanced
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <div>Version 1.0.0</div>
          <div className="footer-links">
            <span className="footer-link" onClick={() => addLog(new Date().toLocaleTimeString(), 'info', 'SWAY is up to date.')}>Check for updates</span>
          </div>
        </div>
      </div>

      {/* Main Settings Views */}
      <div className="settings-view">
        {activeTab === 'general' && (
          <>
            <div className="page-header">
              <h1>General</h1>
              <p>Configure background behaviour and window preferences.</p>
            </div>

            <div className="card-section">
              <div className="card-title-sub">Startup Options</div>
              <div className="settings-card">
                <div className="settings-row">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Launch on Windows startup</span>
                    <span className="settings-row-desc">Start audio listener service automatically on login.</span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.launchOnStartup}
                      onChange={(e) => updateSetting('launchOnStartup', e.target.checked)}
                    />
                    <span className="slider-toggle"></span>
                  </label>
                </div>

                <div className="settings-row">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Start minimized to tray</span>
                    <span className="settings-row-desc">Launch quietly in the background without opening the dashboard.</span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.startMinimized}
                      onChange={(e) => updateSetting('startMinimized', e.target.checked)}
                    />
                    <span className="slider-toggle"></span>
                  </label>
                </div>

                <div className="settings-row">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Minimize to system tray on close</span>
                    <span className="settings-row-desc">Keep running in the background when the window is closed.</span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.minimizeToTray}
                      onChange={(e) => updateSetting('minimizeToTray', e.target.checked)}
                    />
                    <span className="slider-toggle"></span>
                  </label>
                </div>
              </div>

              <div className="card-title-sub">Global Shortcut</div>
              <div className="settings-card">
                <div className="settings-row">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Open Search Launcher</span>
                    <span className="settings-row-desc">Keyboard hotkey to toggle the quick launcher.</span>
                  </div>
                  <input
                    type="text"
                    className="text-input"
                    value={settings.globalShortcut}
                    onChange={(e) => updateSetting('globalShortcut', e.target.value)}
                    style={{ width: '130px', textAlign: 'center' }}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'ducking' && (
          <>
            <div className="page-header">
              <h1>Ducking</h1>
              <p>Configure volume lowering parameters and transition durations.</p>
            </div>

            <div className="card-section">
              <div className="settings-card">
                <div className="settings-row" style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px' }}>
                  <div className="settings-row-info">
                    <span className="settings-row-label" style={{ fontSize: '15px' }}>Enable audio ducking</span>
                    <span className="settings-row-desc">Master switch to activate or pause audio management.</span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.enabled}
                      onChange={(e) => updateSetting('enabled', e.target.checked)}
                    />
                    <span className="slider-toggle"></span>
                  </label>
                </div>

                <div className="settings-row">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Ducked volume target</span>
                    <span className="settings-row-desc">Target volume for background music when media is active.</span>
                  </div>
                  <div className="slider-control-container">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.duckFactor * 100}
                      className="volume-slider"
                      onChange={(e) => updateSetting('duckFactor', parseFloat(e.target.value) / 100)}
                    />
                    <span className="slider-val-label">{Math.round(settings.duckFactor * 100)}%</span>
                  </div>
                </div>

                <div className="settings-row">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Fade down time</span>
                    <span className="settings-row-desc">Duration to transition volume down.</span>
                  </div>
                  <div className="number-input-container">
                    <input
                      type="number"
                      className="number-input"
                      value={settings.fadeDownMs}
                      onChange={(e) => updateSetting('fadeDownMs', parseInt(e.target.value) || 0)}
                    />
                    <span className="number-unit">ms</span>
                  </div>
                </div>

                <div className="settings-row">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Fade up time</span>
                    <span className="settings-row-desc">Duration to restore volume back to normal.</span>
                  </div>
                  <div className="number-input-container">
                    <input
                      type="number"
                      className="number-input"
                      value={settings.fadeUpMs}
                      onChange={(e) => updateSetting('fadeUpMs', parseInt(e.target.value) || 0)}
                    />
                    <span className="number-unit">ms</span>
                  </div>
                </div>

                <div className="settings-row">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Restore delay</span>
                    <span className="settings-row-desc">Delay after browser audio stops before restoring volume.</span>
                  </div>
                  <div className="number-input-container">
                    <input
                      type="number"
                      className="number-input"
                      value={settings.restoreDelayMs}
                      onChange={(e) => updateSetting('restoreDelayMs', parseInt(e.target.value) || 0)}
                    />
                    <span className="number-unit">ms</span>
                  </div>
                </div>
              </div>

              <div className="card-title-sub">Actions</div>
              <div className="settings-card" style={{ background: 'transparent', padding: 0, border: 'none' }}>
                <button className="btn btn-primary" onClick={handleTestDucking}>
                  Test ducking transition
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'playback' && (
          <>
            <div className="page-header">
              <h1>Playback Detection</h1>
              <p>Configure which browsers trigger background audio ducking.</p>
            </div>

            <div className="card-section">
              <div className="card-title-sub">Web Browsers</div>
              <div className="settings-card">
                <div className="settings-row">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Google Chrome</span>
                    <span className="settings-row-desc">Monitor Chrome audio playback sessions.</span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.triggers.includes('chrome')}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...settings.triggers, 'chrome']
                          : settings.triggers.filter((t) => t !== 'chrome')
                        updateSetting('triggers', next)
                      }}
                    />
                    <span className="slider-toggle"></span>
                  </label>
                </div>

                <div className="settings-row">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Microsoft Edge</span>
                    <span className="settings-row-desc">Monitor Edge audio playback sessions.</span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.triggers.includes('msedge')}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...settings.triggers, 'msedge']
                          : settings.triggers.filter((t) => t !== 'msedge')
                        updateSetting('triggers', next)
                      }}
                    />
                    <span className="slider-toggle"></span>
                  </label>
                </div>

                <div className="settings-row">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Mozilla Firefox</span>
                    <span className="settings-row-desc">Monitor Firefox audio playback sessions.</span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.triggers.includes('firefox')}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...settings.triggers, 'firefox']
                          : settings.triggers.filter((t) => t !== 'firefox')
                        updateSetting('triggers', next)
                      }}
                    />
                    <span className="slider-toggle"></span>
                  </label>
                </div>

                <div className="settings-row">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Brave Browser</span>
                    <span className="settings-row-desc">Monitor Brave audio playback sessions.</span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.triggers.includes('brave')}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...settings.triggers, 'brave']
                          : settings.triggers.filter((t) => t !== 'brave')
                        updateSetting('triggers', next)
                      }}
                    />
                    <span className="slider-toggle"></span>
                  </label>
                </div>
              </div>

              <div className="card-title-sub">Detection Engine Status</div>
              <div className="settings-card">
                <div className="settings-row">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Windows CoreAudio Session Monitor</span>
                    <span className="settings-row-desc">Direct hardware API peak meter listening.</span>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-green)', letterSpacing: '0.5px' }}>
                    RUNNING
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'applications' && (
          <>
            <div className="page-header">
              <h1>Applications</h1>
              <p>Configure which applications have their volume reduced.</p>
            </div>

            <div className="card-section">
              <div className="settings-card" style={{ padding: '8px' }}>
                <table className="app-table">
                  <thead>
                    <tr>
                      <th>Application</th>
                      <th>Process</th>
                      <th>Class</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.targets.map((target) => (
                      <tr key={target}>
                        <td style={{ fontWeight: 500, color: '#ffffff' }}>{target.toUpperCase()}</td>
                        <td><code>{target}.exe</code></td>
                        <td><span style={{ color: '#ffffff', background: '#27272a', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500 }}>Target</span></td>
                        <td>
                          <span
                            style={{ color: 'var(--accent-danger)', cursor: 'pointer', fontSize: '12px' }}
                            onClick={() => handleRemoveProcess(target, 'target')}
                          >
                            Remove
                          </span>
                        </td>
                      </tr>
                    ))}
                    {settings.triggers.map((trigger) => (
                      <tr key={trigger}>
                        <td style={{ fontWeight: 500, color: '#ffffff' }}>{trigger.toUpperCase()}</td>
                        <td><code>{trigger}.exe</code></td>
                        <td><span style={{ color: 'var(--text-secondary)', background: '#1f1f24', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500 }}>Trigger</span></td>
                        <td>
                          <span
                            style={{ color: 'var(--accent-danger)', cursor: 'pointer', fontSize: '12px' }}
                            onClick={() => handleRemoveProcess(trigger, 'trigger')}
                          >
                            Remove
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card-title-sub">Add Application</div>
              <div className="settings-card">
                <div className="settings-row" style={{ gap: '16px' }}>
                  <div className="form-group" style={{ flexGrow: 1 }}>
                    <label>Process Name</label>
                    <input
                      type="text"
                      className="text-input"
                      placeholder="e.g. foobar2000"
                      value={newProcessName}
                      onChange={(e) => setNewProcessName(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ width: '160px' }}>
                    <label>Type</label>
                    <select
                      className="text-input"
                      style={{ padding: '10px 12px' }}
                      value={processType}
                      onChange={(e) => setProcessType(e.target.value as any)}
                    >
                      <option value="target">Target (Ducked)</option>
                      <option value="trigger">Trigger (Browser)</option>
                    </select>
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{ marginTop: '22px' }}
                    onClick={handleAddProcess}
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="card-title-sub">Automatic Exclusion Rules</div>
              <div className="settings-card">
                <div className="settings-row">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Duck all other unlisted applications</span>
                    <span className="settings-row-desc">Automatically lower games and miscellaneous audio.</span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.duckAllOther}
                      onChange={(e) => updateSetting('duckAllOther', e.target.checked)}
                    />
                    <span className="slider-toggle"></span>
                  </label>
                </div>

                {settings.duckAllOther && (
                  <>
                    <div className="settings-row" style={{ paddingLeft: '20px' }}>
                      <div className="settings-row-info">
                        <span className="settings-row-label">Exclude system sounds</span>
                        <span className="settings-row-desc">Do not duck Windows system alerts and chimes.</span>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={settings.excludeSystemSounds}
                          onChange={(e) => updateSetting('excludeSystemSounds', e.target.checked)}
                        />
                        <span className="slider-toggle"></span>
                      </label>
                    </div>

                    <div className="settings-row" style={{ paddingLeft: '20px' }}>
                      <div className="settings-row-info">
                        <span className="settings-row-label">Exclude communication apps</span>
                        <span className="settings-row-desc">Do not duck Discord, Teams, Zoom, or Slack calls.</span>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={settings.excludeCommunicationApps}
                          onChange={(e) => updateSetting('excludeCommunicationApps', e.target.checked)}
                        />
                        <span className="slider-toggle"></span>
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'notifications' && (
          <>
            <div className="page-header">
              <h1>Notifications</h1>
              <p>Configure toast notification preferences.</p>
            </div>

            <div className="card-section">
              <div className="settings-card">
                <div className="settings-row">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Show ducking notification</span>
                    <span className="settings-row-desc">Toast alert when background audio volume lowers.</span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.showDuckingNotification}
                      onChange={(e) => updateSetting('showDuckingNotification', e.target.checked)}
                    />
                    <span className="slider-toggle"></span>
                  </label>
                </div>

                <div className="settings-row">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Show restore notification</span>
                    <span className="settings-row-desc">Toast alert when volume is restored to normal.</span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.showRestoreNotification}
                      onChange={(e) => updateSetting('showRestoreNotification', e.target.checked)}
                    />
                    <span className="slider-toggle"></span>
                  </label>
                </div>

                <div className="settings-row">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Play notification sound</span>
                    <span className="settings-row-desc">Play standard Windows chime on alerts.</span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.playNotificationSound}
                      onChange={(e) => updateSetting('playNotificationSound', e.target.checked)}
                    />
                    <span className="slider-toggle"></span>
                  </label>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'startup' && (
          <>
            <div className="page-header">
              <h1>Startup & Logging</h1>
              <p>Diagnostics, directories, and background history.</p>
            </div>

            <div className="card-section">
              <div className="settings-card">
                <div className="settings-row">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Directory Path</span>
                    <span className="settings-row-desc">Local configuration storage folder.</span>
                  </div>
                  <code style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)' }}>
                    AppData\Roaming\sway
                  </code>
                </div>

                <div className="btn-group">
                  <button className="btn" onClick={() => window.api.openLogFolder()}>
                    Open in Explorer
                  </button>
                  <button className="btn btn-danger" onClick={() => {
                    window.api.clearLogs()
                    setLogs([])
                    addLog(new Date().toLocaleTimeString(), 'info', 'Logs cleared.')
                  }}>
                    Clear history
                  </button>
                </div>
              </div>

              <div className="card-title-sub">Activity Feed</div>
              <div className="settings-card" style={{ maxHeight: '240px', overflowY: 'auto', padding: '16px' }}>
                {logs.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                    No activity recorded.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                    {logs.map((log, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '12px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>[{log.time}]</span>
                        <span style={{ color: log.type === 'duck' ? '#ffffff' : log.type === 'restore' ? '#a1a1aa' : '#71717a' }}>
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'browser' && (
          <>
            <div className="page-header">
              <h1>Browser Integration</h1>
              <p>Optional extension integration settings.</p>
            </div>

            <div className="card-section">
              <div className="settings-card">
                <div className="settings-row-info">
                  <span className="settings-row-label" style={{ fontSize: '15px' }}>Native CoreAudio Detection</span>
                  <span className="settings-row-desc" style={{ marginTop: '4px' }}>
                    SWAY monitors browser audio sessions directly via Windows WASAPI. No browser extensions are required for full functionality.
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'advanced' && (
          <>
            <div className="page-header">
              <h1>Advanced</h1>
              <p>Hardware scan rates and configuration maintenance.</p>
            </div>

            <div className="card-section">
              <div className="card-title-sub">Engine Parameters</div>
              <div className="settings-card">
                <div className="settings-row">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Audio polling interval</span>
                    <span className="settings-row-desc">Session polling tick rate (ms).</span>
                  </div>
                  <div className="number-input-container">
                    <input
                      type="number"
                      className="number-input"
                      value={settings.detectionInterval}
                      onChange={(e) => updateSetting('detectionInterval', parseInt(e.target.value) || 50)}
                    />
                    <span className="number-unit">ms</span>
                  </div>
                </div>
              </div>

              <div className="card-title-sub">Maintenance</div>
              <div className="settings-card">
                <div className="settings-row">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Reset all settings</span>
                    <span className="settings-row-desc">Restore all parameters to installation defaults.</span>
                  </div>
                  <button className="btn btn-danger" onClick={() => setShowResetDialog(true)}>
                    Reset defaults
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Global Live Audio Status Footer */}
        <div className="glass-card" style={{ marginTop: 'auto', padding: '14px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 500, color: '#ffffff' }}>
                <span className="status-dot" style={{ background: duckingActive ? '#ffffff' : '#52525b' }}></span>
                <span>{duckingActive ? 'Ducking Active' : 'Idle'}</span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Active Streams: {sessions.length}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {sessions.slice(0, 3).map((s) => (
                <div key={s.pid} className="live-session-mini">
                  <div className="live-session-mini-bar-track">
                    <div className="live-session-mini-bar-fill" style={{ width: `${s.peak}%` }}></div>
                  </div>
                  <span className="live-session-mini-name" style={{ fontFamily: 'var(--font-mono)' }}>{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showResetDialog && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <span className="dialog-title">Reset SWAY Settings?</span>
            <p className="dialog-message">
              This will restore all SWAY preferences, ducking levels, and process lists back to default.
            </p>
            <div className="dialog-actions">
              <button className="btn" onClick={() => setShowResetDialog(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleResetSettings}>
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
