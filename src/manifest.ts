import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Comments Exporter for Claude Design',
  version: '0.1.0',
  description:
    'Download a Claude Design project as a zip with comments.json / comments.md and data-comment-id marks on the commented elements.',
  minimum_chrome_version: '116',
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  action: {
    default_title: 'Comments Exporter for Claude Design',
    default_popup: 'src/popup/popup.html',
    default_icon: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
  },
  background: {
    service_worker: 'src/background/serviceWorker.ts',
    type: 'module',
  },
  // 不需要 tabs：host_permissions 涵蓋的網址，tabs.query 就讀得到 tab.url；其他網站讀不到，正好當「不是專案頁」
  permissions: ['downloads', 'storage'],
  host_permissions: ['https://claude.ai/*'],
});
