# Sway

A lightweight Windows background utility that automatically ducks your background music when another app plays sound, then fades it back in when it's done.

---

## What It Does

If you listen to Spotify or Apple Music while working, you've probably run into this: you open a YouTube link, join a quick Slack huddle, or watch a video clip, and you have to manually pause your music or fumble with volume sliders.

Sway automates this entirely:

- When sound starts playing from a browser tab, video, or call, Sway smoothly lowers your music to 40% volume.
- Once that audio finishes, it waits a brief moment (1.5s) and fades your music back to full volume.
- Only media players get ducked. Voice chat in Discord, game audio, and system alerts are untouched.

No virtual audio cables, no third-party audio drivers, and no microphone access required.

---

## How It Was Made

Windows already has a built-in per-application volume mixer, but it doesn't offer dynamic audio ducking between arbitrary apps. 

Sway was built with a split architecture for speed and a clean native interface:

- **Native C# Audio Subsystem (`AudioManager.cs`)**: Hooks directly into Windows Core Audio sessions via WASAPI COM interfaces. It monitors active render endpoints and samples peak levels every 50ms without adding latency.
- **Interpolated Gain Envelope**: Volume transitions use linear interpolation over a configurable millisecond window (default: 1000ms fade down, 1000ms fade up) so there are no sudden clicks or harsh volume jumps.
- **Electron + React HUD Frontend**: Provides a lightweight tray application and quick-launcher overlay to manage ducking rules, monitor audio meters, and tweak settings.
- **Zero Overhead**: Sits silently in the system tray, uses under 15 MB of RAM, and sits at 0.0% CPU usage when idle.

---

## Installation & Setup

### Prerequisites

- Windows 10 (1809+) or Windows 11 (64-bit)
- [Node.js](https://nodejs.org/) (v18+)

### Clone and Run Locally

```bash
# Clone the repository
git clone https://github.com/akshnoorbawa2-glitch/Sway-Audio.git
cd Sway-Audio

# Install dependencies
npm install

# Start development build (with hot reload)
npm run dev
```

### Build Executable / Installer

```bash
# Package standalone Windows build
npm run build:win
```

The packaged installer and portable binaries will be output to the `dist/` directory.

---

## How to Use It

### Basic Workflow

1. Start Sway. It will minimize directly to your system tray.
2. Play music in Spotify, Apple Music, or VLC.
3. Open YouTube in Chrome or Edge and start playing a video. Sway will detect the audio and automatically fade down your music.
4. Pause or close the video. After a short 1.5-second buffer, your music smoothly ramps back to 100%.

### Hotkey & Quick HUD

Press **`Alt + Space`** at any time to pull up the quick HUD overlay. From here you can:
- Toggle ducking on/off temporarily.
- View live audio levels of currently playing apps.
- Adjust fade durations or exit the app.

### Custom Configuration

You can customize app rules and envelope timings directly from the UI or via `config.json`:

```json
{
  "hotkey": "Alt+Space",
  "duckTargetVolume": 0.40,
  "fadeDownDurationMs": 1000,
  "restoreDelayMs": 1500,
  "fadeUpDurationMs": 1000,
  "targetProcesses": [
    "spotify.exe",
    "AppleMusic.exe",
    "vlc.exe",
    "tidal.exe"
  ],
  "ignoredProcesses": [
    "discord.exe",
    "steam.exe"
  ],
  "runOnStartup": false
}
```

- **`targetProcesses`**: Add the `.exe` names of media players you want Sway to duck.
- **`ignoredProcesses`**: Apps that should never trigger ducking or be ducked (like Discord or games).
- **`fadeDownDurationMs` / `fadeUpDurationMs`**: Adjust how fast or gradual the volume fades feel.

---

## License

[MIT](LICENSE) &copy; 2026 Akshnoor Bawa
