import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { resolvePublicAssetUrl } from '../lib/audio/publicAssetUrl';
import '@fontsource-variable/oxanium';
import '@fontsource-variable/sora';
import '@fontsource/barlow-semi-condensed/600.css';
import '@fontsource/barlow-semi-condensed/700.css';
import './styles.css';

document.documentElement.style.setProperty(
  '--main-menu-background-image',
  `image-set(url("${resolvePublicAssetUrl('/assets/main-menu/mainmenu-neonbackground.webp')}") type("image/webp"), url("${resolvePublicAssetUrl('/assets/main-menu/mainmenu-neonbackground.png')}") type("image/png"))`,
);

async function bootstrap() {
  if (IS_WEB) {
    const { webBridge } = await import('./webBridge');
    window.appBridge = webBridge;
  }

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void bootstrap();
