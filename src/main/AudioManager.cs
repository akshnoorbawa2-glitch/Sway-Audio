using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using System.Collections.Generic;
using System.Text;
using System.Text.RegularExpressions;

namespace SwayEngine
{
    class Program
    {
        // Thread-safe configuration variables
        private static float duckFactor = 0.25f; // Target ducked volume factor (e.g. 25% of original)
        private static int restoreDelayMs = 1500; // Delay before restoring volume after audio stops
        private static int fadeDownMs = 1000; // Time in ms to fade volume down
        private static int fadeUpMs = 1000; // Time in ms to fade volume back up
        private static bool isEnabled = true;

        // Duck All Other settings
        private static bool duckAllOther = false;
        private static bool excludeSystemSounds = true;
        private static bool excludeCommunicationApps = true;
        private static bool excludeMediaPlayers = false;

        // Lists of processes
        private static HashSet<string> triggerProcesses = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "chrome", "msedge", "firefox", "brave", "opera", "iexplore"
        };
        private static HashSet<string> targetProcesses = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "spotify", "itunes", "vlc", "foobar2000", "wmplayer", "musicbee", "aimp", "winamp", "applemusic", "tidal", "deezer", "amazonmusic", "soundcloud", "groove"
        };

        // Communication apps to exclude if configured
        private static HashSet<string> communicationProcesses = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "discord", "teams", "skype", "zoom", "slack", "webex", "whatsapp", "signal", "tg", "telegram"
        };

        // Track original volumes and states for ducked PIDs
        private static Dictionary<int, float> originalVolumes = new Dictionary<int, float>();
        private static DateTime lastTriggerAudioTime = DateTime.MinValue;
        private static bool isCurrentlyDucked = false;

        [STAThread]
        static void Main(string[] args)
        {
            // Start stdin command reader thread
            Thread inputThread = new Thread(ReadInputLoop);
            inputThread.IsBackground = true;
            inputThread.Start();

            // Main loop
            int loopIntervalMs = 50;
            int printCounter = 0;
            int printIntervalTicks = 100 / loopIntervalMs; // Print session list to UI every 100ms

            while (true)
            {
                try
                {
                    RunAudioEngineStep(printCounter == 0, loopIntervalMs);
                }
                catch (Exception ex)
                {
                    Console.WriteLine("{\"event\":\"error\",\"message\":" + EscapeJsonString(ex.Message) + "}");
                }

                printCounter = (printCounter + 1) % printIntervalTicks;
                Thread.Sleep(loopIntervalMs);
            }
        }

        private static void RunAudioEngineStep(bool printSessions, int loopIntervalMs)
        {
            IMMDeviceEnumerator deviceEnumerator = null;
            IAudioSessionEnumerator sessionEnumerator = null;
            IAudioSessionManager2 mgr = null;
            IMMDevice speakers = null;

            try
            {
                // Instantiate device enumerator COM object
                deviceEnumerator = (IMMDeviceEnumerator)(new MMDeviceEnumerator());
                deviceEnumerator.GetDefaultAudioEndpoint(EDataFlow.eRender, ERole.eMultimedia, out speakers);

                if (speakers == null) return;

                // Activate the session manager
                Guid IID_IAudioSessionManager2 = typeof(IAudioSessionManager2).GUID;
                object o;
                speakers.Activate(ref IID_IAudioSessionManager2, 0, IntPtr.Zero, out o);
                mgr = (IAudioSessionManager2)o;

                if (mgr == null) return;

                // Get session enumerator
                mgr.GetSessionEnumerator(out sessionEnumerator);
                if (sessionEnumerator == null) return;

                int count;
                sessionEnumerator.GetCount(out count);

                bool triggerActive = false;
                List<AudioSessionInfo> activeSessions = new List<AudioSessionInfo>();

                // First pass: gather session info and check if trigger audio is active
                for (int i = 0; i < count; ++i)
                {
                    IAudioSessionControl2 ctl = null;
                    try
                    {
                        sessionEnumerator.GetSession(i, out ctl);
                        if (ctl == null) continue;

                        int pid;
                        ctl.GetProcessId(out pid);

                        bool isSystemSounds = ctl.IsSystemSoundsSession() == 0;
                        if (pid <= 0 && !isSystemSounds) continue;

                        string processName = "";
                        if (isSystemSounds)
                        {
                            processName = "System Sounds";
                        }
                        else
                        {
                            try
                            {
                                using (Process p = Process.GetProcessById(pid))
                                {
                                    processName = p.ProcessName;
                                }
                            }
                            catch
                            {
                                // Process exited
                                continue;
                            }
                        }

                        // Get volume and mute status
                        ISimpleAudioVolume simpleVolume = ctl as ISimpleAudioVolume;
                        float volumeLevel = 0.0f;
                        bool isMuted = false;
                        if (simpleVolume != null)
                        {
                            simpleVolume.GetMasterVolume(out volumeLevel);
                            simpleVolume.GetMute(out isMuted);
                        }

                        // Get peak audio level
                        IAudioMeterInformation meter = ctl as IAudioMeterInformation;
                        float peakLevel = 0.0f;
                        if (meter != null)
                        {
                            meter.GetPeakValue(out peakLevel);
                        }

                        activeSessions.Add(new AudioSessionInfo
                        {
                            Pid = pid,
                            Name = processName,
                            Volume = volumeLevel,
                            Peak = peakLevel,
                            IsMuted = isMuted,
                            IsSystemSounds = isSystemSounds,
                            VolumeControl = simpleVolume // Store to modify in second pass
                        });

                        // Check if active playback trigger is detected
                        if (triggerProcesses.Contains(processName) && peakLevel > 0.002f && !isMuted)
                        {
                            triggerActive = true;
                        }
                    }
                    catch
                    {
                        if (ctl != null) Marshal.ReleaseComObject(ctl);
                    }
                }

                // Update trigger timing
                if (triggerActive)
                {
                    lastTriggerAudioTime = DateTime.UtcNow;
                }

                // Determine if we should be ducking
                bool shouldDuck = isEnabled && (DateTime.UtcNow - lastTriggerAudioTime).TotalMilliseconds < restoreDelayMs;

                // Calculate steps based on fade times (in milliseconds)
                float downStep = fadeDownMs > 0 ? (1.0f - duckFactor) / (fadeDownMs / (float)loopIntervalMs) : 1.0f;
                float upStep = fadeUpMs > 0 ? (1.0f - duckFactor) / (fadeUpMs / (float)loopIntervalMs) : 1.0f;

                // Second pass: adjust volumes based on ducking state and exclusion rules
                foreach (var session in activeSessions)
                {
                    bool isTarget = false;

                    if (duckAllOther)
                    {
                        // Duck everything EXCEPT triggers, system sounds, communication apps, or media players (based on settings)
                        bool isExcluded = false;

                        if (triggerProcesses.Contains(session.Name))
                        {
                            isExcluded = true;
                        }
                        else if (session.IsSystemSounds && excludeSystemSounds)
                        {
                            isExcluded = true;
                        }
                        else if (communicationProcesses.Contains(session.Name) && excludeCommunicationApps)
                        {
                            isExcluded = true;
                        }
                        else if (targetProcesses.Contains(session.Name) && excludeMediaPlayers)
                        {
                            isExcluded = true;
                        }

                        isTarget = !isExcluded;
                    }
                    else
                    {
                        // Only duck explicit targets
                        isTarget = targetProcesses.Contains(session.Name);
                    }

                    if (isTarget)
                    {
                        if (session.VolumeControl == null) continue;

                        float targetVolume;
                        if (shouldDuck)
                        {
                            // Store original volume before ducking if we haven't yet
                            if (!originalVolumes.ContainsKey(session.Pid))
                            {
                                originalVolumes[session.Pid] = session.Volume;
                            }

                            // Calculate ducked target volume
                            targetVolume = originalVolumes[session.Pid] * duckFactor;

                            // Smoothly fade down
                            if (session.Volume > targetVolume)
                            {
                                float nextVolume = Math.Max(targetVolume, session.Volume - downStep);
                                Guid guid = Guid.Empty;
                                session.VolumeControl.SetMasterVolume(nextVolume, ref guid);
                                session.Volume = nextVolume; // update local representation for print
                            }
                        }
                        else
                        {
                            // If we have a stored original volume, fade back up
                            if (originalVolumes.ContainsKey(session.Pid))
                            {
                                targetVolume = originalVolumes[session.Pid];

                                if (session.Volume < targetVolume)
                                {
                                    float nextVolume = Math.Min(targetVolume, session.Volume + upStep);
                                    Guid guid = Guid.Empty;
                                    session.VolumeControl.SetMasterVolume(nextVolume, ref guid);
                                    session.Volume = nextVolume;
                                }
                                else
                                {
                                    // Finished restoring, clean up stored original volume
                                    originalVolumes.Remove(session.Pid);
                                }
                            }
                        }
                    }
                    else
                    {
                        // If it's not a target, and we are not ducking, update originalVolume tracker to watch manual slider changes
                        if (!shouldDuck && originalVolumes.ContainsKey(session.Pid))
                        {
                            originalVolumes.Remove(session.Pid);
                        }
                    }
                }

                isCurrentlyDucked = shouldDuck;

                // Print sessions details as JSON every 100ms
                if (printSessions)
                {
                    StringBuilder sb = new StringBuilder();
                    sb.Append("{\"event\":\"sessions\",\"duckingActive\":");
                    sb.Append(isCurrentlyDucked ? "true" : "false");
                    sb.Append(",\"data\":[");

                    for (int i = 0; i < activeSessions.Count; i++)
                    {
                        var s = activeSessions[i];
                        sb.Append("{");
                        sb.Append("\"pid\":").Append(s.Pid).Append(",");
                        sb.Append("\"name\":").Append(EscapeJsonString(s.Name)).Append(",");
                        sb.Append("\"volume\":").Append(Math.Round(s.Volume * 100, 1)).Append(",");
                        sb.Append("\"peak\":").Append(Math.Round(s.Peak * 100, 2)).Append(",");
                        sb.Append("\"isMuted\":").Append(s.IsMuted ? "true" : "false");
                        sb.Append("}");
                        if (i < activeSessions.Count - 1) sb.Append(",");
                    }

                    sb.Append("]}");
                    Console.WriteLine(sb.ToString());
                }

                // Clean up COM objects for the sessions
                foreach (var session in activeSessions)
                {
                    if (session.VolumeControl != null)
                    {
                        Marshal.ReleaseComObject(session.VolumeControl);
                    }
                }
            }
            finally
            {
                if (sessionEnumerator != null) Marshal.ReleaseComObject(sessionEnumerator);
                if (mgr != null) Marshal.ReleaseComObject(mgr);
                if (speakers != null) Marshal.ReleaseComObject(speakers);
                if (deviceEnumerator != null) Marshal.ReleaseComObject(deviceEnumerator);
            }
        }

        private static void ReadInputLoop()
        {
            while (true)
            {
                string line = Console.ReadLine();
                if (string.IsNullOrEmpty(line)) continue;

                try
                {
                    // Basic regex parsing for incoming configuration JSON commands
                    Match matchCommand = Regex.Match(line, "\"command\"\\s*:\\s*\"([^\"]+)\"");
                    if (!matchCommand.Success) continue;

                    string command = matchCommand.Groups[1].Value;

                    if (command == "set_settings")
                    {
                        // Parse values
                        Match matchDuck = Regex.Match(line, "\"duckFactor\"\\s*:\\s*([0-9.]+)");
                        if (matchDuck.Success) duckFactor = float.Parse(matchDuck.Groups[1].Value);

                        Match matchDelay = Regex.Match(line, "\"restoreDelayMs\"\\s*:\\s*([0-9]+)");
                        if (matchDelay.Success) restoreDelayMs = int.Parse(matchDelay.Groups[1].Value);

                        Match matchFadeDown = Regex.Match(line, "\"fadeDownMs\"\\s*:\\s*([0-9]+)");
                        if (matchFadeDown.Success) fadeDownMs = int.Parse(matchFadeDown.Groups[1].Value);

                        Match matchFadeUp = Regex.Match(line, "\"fadeUpMs\"\\s*:\\s*([0-9]+)");
                        if (matchFadeUp.Success) fadeUpMs = int.Parse(matchFadeUp.Groups[1].Value);

                        Match matchEnabled = Regex.Match(line, "\"enabled\"\\s*:\\s*(true|false)");
                        if (matchEnabled.Success) isEnabled = bool.Parse(matchEnabled.Groups[1].Value);

                        // Duck all other settings
                        Match matchDuckAll = Regex.Match(line, "\"duckAllOther\"\\s*:\\s*(true|false)");
                        if (matchDuckAll.Success) duckAllOther = bool.Parse(matchDuckAll.Groups[1].Value);

                        Match matchExcludeSys = Regex.Match(line, "\"excludeSystemSounds\"\\s*:\\s*(true|false)");
                        if (matchExcludeSys.Success) excludeSystemSounds = bool.Parse(matchExcludeSys.Groups[1].Value);

                        Match matchExcludeComm = Regex.Match(line, "\"excludeCommunicationApps\"\\s*:\\s*(true|false)");
                        if (matchExcludeComm.Success) excludeCommunicationApps = bool.Parse(matchExcludeComm.Groups[1].Value);

                        Match matchExcludeMedia = Regex.Match(line, "\"excludeMediaPlayers\"\\s*:\\s*(true|false)");
                        if (matchExcludeMedia.Success) excludeMediaPlayers = bool.Parse(matchExcludeMedia.Groups[1].Value);
                    }
                    else if (command == "set_processes")
                    {
                        // Parse triggers and targets lists
                        Match matchTriggers = Regex.Match(line, "\"triggers\"\\s*:\\s*\\[([^\\]]*)\\]");
                        if (matchTriggers.Success)
                        {
                            string raw = matchTriggers.Groups[1].Value;
                            string[] items = raw.Split(',');
                            HashSet<string> nextTriggers = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                            foreach (var item in items)
                            {
                                string clean = item.Trim(' ', '"', '\'');
                                if (!string.IsNullOrEmpty(clean)) nextTriggers.Add(clean);
                            }
                            triggerProcesses = nextTriggers;
                        }

                        Match matchTargets = Regex.Match(line, "\"targets\"\\s*:\\s*\\[([^\\]]*)\\]");
                        if (matchTargets.Success)
                        {
                            string raw = matchTargets.Groups[1].Value;
                            string[] items = raw.Split(',');
                            HashSet<string> nextTargets = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                            foreach (var item in items)
                            {
                                string clean = item.Trim(' ', '"', '\'');
                                if (!string.IsNullOrEmpty(clean)) nextTargets.Add(clean);
                            }
                            targetProcesses = nextTargets;
                        }
                    }
                    else if (command == "set_volume")
                    {
                        // Set specific application volume (manually from the UI slider)
                        Match matchPid = Regex.Match(line, "\"pid\"\\s*:\\s*([0-9]+)");
                        Match matchVol = Regex.Match(line, "\"volume\"\\s*:\\s*([0-9.]+)");

                        if (matchPid.Success && matchVol.Success)
                        {
                            int targetPid = int.Parse(matchPid.Groups[1].Value);
                            float volLevel = float.Parse(matchVol.Groups[1].Value) / 100.0f;

                            SetProcessVolumeDirect(targetPid, volLevel);
                        }
                    }
                    else if (command == "set_mute")
                    {
                        // Mute/unmute specific app
                        Match matchPid = Regex.Match(line, "\"pid\"\\s*:\\s*([0-9]+)");
                        Match matchMute = Regex.Match(line, "\"mute\"\\s*:\\s*(true|false)");

                        if (matchPid.Success && matchMute.Success)
                        {
                            int targetPid = int.Parse(matchPid.Groups[1].Value);
                            bool muteVal = bool.Parse(matchMute.Groups[1].Value);

                            SetProcessMuteDirect(targetPid, muteVal);
                        }
                    }

                    // Acknowledge setting updates
                    Console.WriteLine("{\"event\":\"ack\",\"command\":\"" + command + "\"}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine("{\"event\":\"error\",\"message\":\"Command execution failed: " + EscapeJsonString(ex.Message) + "\"}");
                }
            }
        }

        private static void SetProcessVolumeDirect(int pid, float level)
        {
            IMMDeviceEnumerator deviceEnumerator = null;
            IAudioSessionEnumerator sessionEnumerator = null;
            IAudioSessionManager2 mgr = null;
            IMMDevice speakers = null;

            try
            {
                deviceEnumerator = (IMMDeviceEnumerator)(new MMDeviceEnumerator());
                deviceEnumerator.GetDefaultAudioEndpoint(EDataFlow.eRender, ERole.eMultimedia, out speakers);
                if (speakers == null) return;

                Guid IID_IAudioSessionManager2 = typeof(IAudioSessionManager2).GUID;
                object o;
                speakers.Activate(ref IID_IAudioSessionManager2, 0, IntPtr.Zero, out o);
                mgr = (IAudioSessionManager2)o;
                if (mgr == null) return;

                mgr.GetSessionEnumerator(out sessionEnumerator);
                if (sessionEnumerator == null) return;

                int count;
                sessionEnumerator.GetCount(out count);

                for (int i = 0; i < count; ++i)
                {
                    IAudioSessionControl2 ctl = null;
                    try
                    {
                        sessionEnumerator.GetSession(i, out ctl);
                        if (ctl == null) continue;

                        int cpid;
                        ctl.GetProcessId(out cpid);

                        if (cpid == pid)
                        {
                            ISimpleAudioVolume volumeControl = ctl as ISimpleAudioVolume;
                            if (volumeControl != null)
                            {
                                Guid guid = Guid.Empty;
                                volumeControl.SetMasterVolume(level, ref guid);
                            }
                            break;
                        }
                    }
                    finally
                    {
                        if (ctl != null) Marshal.ReleaseComObject(ctl);
                    }
                }
            }
            finally
            {
                if (sessionEnumerator != null) Marshal.ReleaseComObject(sessionEnumerator);
                if (mgr != null) Marshal.ReleaseComObject(mgr);
                if (speakers != null) Marshal.ReleaseComObject(speakers);
                if (deviceEnumerator != null) Marshal.ReleaseComObject(deviceEnumerator);
            }
        }

        private static void SetProcessMuteDirect(int pid, bool mute)
        {
            IMMDeviceEnumerator deviceEnumerator = null;
            IAudioSessionEnumerator sessionEnumerator = null;
            IAudioSessionManager2 mgr = null;
            IMMDevice speakers = null;

            try
            {
                deviceEnumerator = (IMMDeviceEnumerator)(new MMDeviceEnumerator());
                deviceEnumerator.GetDefaultAudioEndpoint(EDataFlow.eRender, ERole.eMultimedia, out speakers);
                if (speakers == null) return;

                Guid IID_IAudioSessionManager2 = typeof(IAudioSessionManager2).GUID;
                object o;
                speakers.Activate(ref IID_IAudioSessionManager2, 0, IntPtr.Zero, out o);
                mgr = (IAudioSessionManager2)o;
                if (mgr == null) return;

                mgr.GetSessionEnumerator(out sessionEnumerator);
                if (sessionEnumerator == null) return;

                int count;
                sessionEnumerator.GetCount(out count);

                for (int i = 0; i < count; ++i)
                {
                    IAudioSessionControl2 ctl = null;
                    try
                    {
                        sessionEnumerator.GetSession(i, out ctl);
                        if (ctl == null) continue;

                        int cpid;
                        ctl.GetProcessId(out cpid);

                        if (cpid == pid)
                        {
                            ISimpleAudioVolume volumeControl = ctl as ISimpleAudioVolume;
                            if (volumeControl != null)
                            {
                                Guid guid = Guid.Empty;
                                volumeControl.SetMute(mute, ref guid);
                            }
                            break;
                        }
                    }
                    finally
                    {
                        if (ctl != null) Marshal.ReleaseComObject(ctl);
                    }
                }
            }
            finally
            {
                if (sessionEnumerator != null) Marshal.ReleaseComObject(sessionEnumerator);
                if (mgr != null) Marshal.ReleaseComObject(mgr);
                if (speakers != null) Marshal.ReleaseComObject(speakers);
                if (deviceEnumerator != null) Marshal.ReleaseComObject(deviceEnumerator);
            }
        }

        private static string EscapeJsonString(string text)
        {
            if (string.IsNullOrEmpty(text)) return "\"\"";
            StringBuilder sb = new StringBuilder();
            sb.Append("\"");
            foreach (char c in text)
            {
                if (c == '\\') sb.Append("\\\\");
                else if (c == '"') sb.Append("\\\"");
                else if (c == '\n') sb.Append("\\n");
                else if (c == '\r') sb.Append("\\r");
                else if (c == '\t') sb.Append("\\t");
                else if (c < 32) sb.AppendFormat("\\u{0:x4}", (int)c);
                else sb.Append(c);
            }
            sb.Append("\"");
            return sb.ToString();
        }
    }

    class AudioSessionInfo
    {
        public int Pid { get; set; }
        public string Name { get; set; }
        public float Volume { get; set; }
        public float Peak { get; set; }
        public bool IsMuted { get; set; }
        public bool IsSystemSounds { get; set; }
        public ISimpleAudioVolume VolumeControl { get; set; }
    }

    #region Abstracted COM interfaces from Windows CoreAudio API

    [ComImport]
    [Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
    internal class MMDeviceEnumerator
    {
    }

    internal enum EDataFlow
    {
        eRender,
        eCapture,
        eAll,
        EDataFlow_enum_count
    }

    internal enum ERole
    {
        eConsole,
        eMultimedia,
        eCommunications,
        ERole_enum_count
    }

    [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IMMDeviceEnumerator
    {
        int NotImpl1();

        [PreserveSig]
        int GetDefaultAudioEndpoint(EDataFlow dataFlow, ERole role, out IMMDevice ppDevice);
    }

    [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IMMDevice
    {
        [PreserveSig]
        int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
    }

    [Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IAudioSessionManager2
    {
        int NotImpl1();
        int NotImpl2();

        [PreserveSig]
        int GetSessionEnumerator(out IAudioSessionEnumerator SessionEnum);
    }

    [Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IAudioSessionEnumerator
    {
        [PreserveSig]
        int GetCount(out int SessionCount);

        [PreserveSig]
        int GetSession(int SessionCount, out IAudioSessionControl2 Session);
    }

    [Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface ISimpleAudioVolume
    {
        [PreserveSig]
        int SetMasterVolume(float fLevel, ref Guid EventContext);

        [PreserveSig]
        int GetMasterVolume(out float pfLevel);

        [PreserveSig]
        int SetMute(bool bMute, ref Guid EventContext);

        [PreserveSig]
        int GetMute(out bool pbMute);
    }

    [Guid("bfb7ff88-7239-4fc9-8fa2-07c950be9c6d"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IAudioSessionControl2
    {
        [PreserveSig] int NotImpl0();
        [PreserveSig] int GetDisplayName([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
        [PreserveSig] int SetDisplayName([MarshalAs(UnmanagedType.LPWStr)] string Value, [MarshalAs(UnmanagedType.LPStruct)] Guid EventContext);
        [PreserveSig] int GetIconPath([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
        [PreserveSig] int SetIconPath([MarshalAs(UnmanagedType.LPWStr)] string Value, [MarshalAs(UnmanagedType.LPStruct)] Guid EventContext);
        [PreserveSig] int GetGroupingParam(out Guid pRetVal);
        [PreserveSig] int SetGroupingParam([MarshalAs(UnmanagedType.LPStruct)] Guid Override, [MarshalAs(UnmanagedType.LPStruct)] Guid EventContext);
        [PreserveSig] int NotImpl1();
        [PreserveSig] int NotImpl2();
        [PreserveSig] int GetSessionIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
        [PreserveSig] int GetSessionInstanceIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
        [PreserveSig] int GetProcessId(out int pRetVal);
        [PreserveSig] int IsSystemSoundsSession();
        [PreserveSig] int SetDuckingPreference(bool optOut);
    }

    [Guid("C02216F6-8C67-4B5B-9D00-D008E73E0064"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IAudioMeterInformation
    {
        [PreserveSig]
        int GetPeakValue(out float pfPeak);

        [PreserveSig]
        int GetMeteringChannelCount(out int pnChannelCount);

        [PreserveSig]
        int GetChannelsPeakValues(int u32ChannelCount, [Out] float[] afPeakValues);

        [PreserveSig]
        int QueryHardwareSupport(out int pdwHardwareSupportMask);
    }

    #endregion
}
