const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'exec_debug.log');
const exe = path.join(__dirname, '../dist/win-unpacked/SWAY.exe');

fs.writeFileSync(logFile, `Attempting to spawn ${exe} at ${new Date().toISOString()}\n`);

const proc = spawn(exe, ['--enable-logging'], {
  stdio: ['ignore', 'pipe', 'pipe']
});

proc.stdout.on('data', (d) => {
  fs.appendFileSync(logFile, `[STDOUT] ${d.toString()}\n`);
});

proc.stderr.on('data', (d) => {
  fs.appendFileSync(logFile, `[STDERR] ${d.toString()}\n`);
});

proc.on('error', (err) => {
  fs.appendFileSync(logFile, `[ERROR] ${err.message}\n`);
});

proc.on('exit', (code, sig) => {
  fs.appendFileSync(logFile, `[EXIT] code=${code}, signal=${sig}\n`);
});

setTimeout(() => {
  fs.appendFileSync(logFile, `Still alive at 3s? pid=${proc.pid}\n`);
}, 3000);
