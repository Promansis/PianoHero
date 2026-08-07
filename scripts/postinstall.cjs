const { ensureNativeModule } = require('./ensure-native-module.cjs');

if (!ensureNativeModule('electron')) {
  process.exitCode = 1;
}
