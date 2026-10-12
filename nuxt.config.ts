// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  modules: [
    '@nuxtjs/tailwindcss',
    '@vite-pwa/nuxt'
  ],

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'FamWish - Listes de souhaits de Noël, Anniversaires & Famille',
      meta: [
        { name: 'description', content: 'Créez et partagez vos listes de souhaits pour Noël et anniversaires en famille. Réservation secrète et anonyme de cadeaux, QR codes et synchronisation en direct.' },
        { name: 'theme-color', content: '#f43f5e' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'FamWish' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/icons/icon-192x192.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' }
      ],
      script: [
        { src: 'https://accounts.google.com/gsi/client', async: true, defer: true },
        {
          innerHTML: `(function(){try{var t=localStorage.getItem('famwish_theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}else if(t==='light'){document.documentElement.classList.remove('dark');}}catch(e){}})();`,
          type: 'text/javascript'
        }
      ]
    },
    pageTransition: { name: 'page', mode: 'out-in' }
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      id: '/',
      name: 'FamWish - Listes de Souhaits Famille',
      short_name: 'FamWish',
      description: 'Partagez vos listes de cadeaux pour Noël et anniversaires sans gâcher la surprise !',
      theme_color: '#f43f5e',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      scope: '/',
      start_url: '/',
      lang: 'fr',
      categories: ['lifestyle', 'shopping', 'social'],
      icons: [
        {
          src: '/icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable'
        },
        {
          src: '/icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ],
      shortcuts: [
        {
          name: 'Mes Listes',
          short_name: 'Listes',
          description: 'Accéder directement à mes listes de souhaits',
          url: '/',
          icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }]
        },
        {
          name: 'Rejoindre une liste',
          short_name: 'Rejoindre',
          description: 'Rejoindre une liste partagée par un proche',
          url: '/join',
          icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }]
        }
      ]
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico}']
    },
    client: {
      installPrompt: true
    },
    devOptions: {
      enabled: true,
      type: 'module'
    }
  },

  runtimeConfig: {
    public: {
      googleClientId: process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID
    }
  }
})
