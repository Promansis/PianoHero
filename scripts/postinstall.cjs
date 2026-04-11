const { spawnSync } = require('node:child_process');

if (process.env.PIANOHERO_SKIP_ELECTRON_REBUILD === '1') {
  console.log('Skipping electron-rebuild because PIANOHERO_SKIP_ELECTRON_REBUILD=1');
  process.exit(0);
}

const isWindows = process.platform === 'win32';
const command = isWindows ? 'npx.cmd' : 'npx';
const result = spawnSync(command, ['electron-rebuild', '-f', '-w', 'better-sqlite3'], {
  stdio: 'inherit',
  shell: false
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
