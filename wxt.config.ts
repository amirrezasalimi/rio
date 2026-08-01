import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Rio Recorder',
    description: 'Record a browser tab, window, screen, or selected area with optional audio.',
    permissions: ['activeTab', 'desktopCapture', 'scripting', 'tabCapture'],
    host_permissions: ['https://api.unsplash.com/*', 'https://images.unsplash.com/*'],
    web_accessible_resources: [{
      resources: ['webcam-preview.html', 'chunks/*', 'assets/*'],
      matches: ['<all_urls>'],
    }],
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
    },
  },
  webExt: {
     disabled: true,
   },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
