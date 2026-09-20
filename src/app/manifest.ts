import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദ് | മഹല്ല് പോർട്ടൽ',
    short_name: 'മഹല്ല് പോർട്ടൽ',
    description:
      'മഹല്ല് ജമാഅത്ത് ഡിജിറ്റൽ ഗവേണൻസ്, കുടുംബ രജിസ്ട്രി, പ്രതിമാസ വരിസംഖ്യ, വിവാഹ സർട്ടിഫിക്കറ്റ് പോർട്ടൽ.',
    start_url: '/',
    id: '/',
    display: 'standalone',
    background_color: '#064e3b',
    theme_color: '#064e3b',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'ml',
    dir: 'ltr',
    categories: ['government', 'finance', 'utilities', 'productivity'],
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'റെസിഡന്റ് ഡാഷ്‌ബോർഡ്',
        short_name: 'ഡാഷ്‌ബോർഡ്',
        description: 'കുടുംബ വിവരങ്ങൾ, അംഗങ്ങൾ, വരിസംഖ്യ രേഖകൾ എന്നിവ കാണുക',
        url: '/dashboard',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'വരിസംഖ്യ അടയ്ക്കുക',
        short_name: 'വരിസംഖ്യ',
        description: 'UPI വഴി വരിസംഖ്യ അടച്ച് രസീത് ഡൗൺലോഡ് ചെയ്യുക',
        url: '/dashboard/payments',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'വിവാഹ സർട്ടിഫിക്കറ്റ്',
        short_name: 'നികാഹ് സർട്ടിഫിക്കറ്റ്',
        description: 'നികാഹ് സർട്ടിഫിക്കറ്റിനായി അപേക്ഷിക്കുക അല്ലെങ്കിൽ ഡൗൺലോഡ് ചെയ്യുക',
        url: '/dashboard/marriage-certificate',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'അഡ്മിനിസ്ട്രേഷൻ പാനൽ',
        short_name: 'അഡ്മിൻ',
        description: 'മഹല്ല് കമ്മിറ്റി മാനേജ്‌മെന്റും പരിശോധനകളും',
        url: '/admin',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192' }],
      },
    ],
  };
}
