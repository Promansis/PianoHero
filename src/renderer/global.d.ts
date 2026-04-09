import type { AppBridge } from '../shared/ipc';

declare global {
  const IS_WEB: boolean;

  interface Window {
    appBridge?: AppBridge;
  }
}

export {};
