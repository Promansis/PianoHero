const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');

const projectRoot = resolve(__dirname, '..');
const nativeProbe = "const Database = require('better-sqlite3'); const db = new Database(':memory:'); db.close();";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

function ensureNativeModule(target) {
  if (target !== 'node' && target !== 'electron') {
    console.error(`Unknown native runtime target: ${target}`);
    return false;
  }

  if (target === 'electron' && (process.env.LUMAKEYS_SKIP_ELECTRON_REBUILD === '1' || process.env.PIANOHERO_SKIP_ELECTRON_REBUILD === '1')) {
    // ponytail: legacy var accepted for one release; drop PIANOHERO_SKIP_ELECTRON_REBUILD after migration.
    console.log('Skipping Electron native-module rebuild because LUMAKEYS_SKIP_ELECTRON_REBUILD=1');
    return true;
  }

  const probeCommand = target === 'electron' ? require('electron') : process.execPath;
  const probeResult = run(probeCommand, ['-e', nativeProbe], {
    env: target === 'electron'
      ? { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
      : process.env,
    stdio: 'ignore',
  });

  if (probeResult.status === 0) {
    console.log(`better-sqlite3 is ready for ${target}`);
    return true;
  }

  console.log(`Rebuilding better-sqlite3 for ${target}`);
  const rebuildResult = target === 'electron'
    ? run(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['electron-rebuild', '-f', '-w', 'better-sqlite3'], {
      stdio: 'inherit',
    })
    : run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['rebuild', 'better-sqlite3'], {
      stdio: 'inherit',
    });

  if (rebuildResult.status === 0) {
    return true;
  }

  console.error(`Unable to rebuild better-sqlite3 for ${target}`);
  return false;
}

if (require.main === module && !ensureNativeModule(process.argv[2])) {
  process.exitCode = 1;
}

module.exports = { ensureNativeModule };
