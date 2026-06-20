export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        crema: {
          DEFAULT: '#ECE7DB',
          soft: '#F3EFE6',
        },
        cesped: {
          DEFAULT: '#ECE7DB',
          2: '#0b2418',
          3: '#103324',
        },
        panel: '#ffffff',
        cal: '#16140F',
        tiza: '#8A8273',
        mag: {
          DEFAULT: '#1B43E0',
          soft: '#3a5fe8',
        },
        verde: '#1E9E5A',
        tercero: '#E8A21C',
        rojo: '#E6371F',
      },
      fontFamily: {
        display: ['Archivo', 'system-ui', 'sans-serif'],
        head: ['Archivo', 'system-ui', 'sans-serif'],
        body: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(22,20,15,0.05), 0 16px 34px -22px rgba(22,20,15,0.28)',
        'card-hover': '0 2px 6px rgba(22,20,15,0.08), 0 22px 46px -22px rgba(22,20,15,0.34)',
        'live-card': '0 0 0 1px rgba(230,55,31,0.22), 0 14px 26px -16px rgba(230,55,31,0.45)',
        hero: '0 24px 46px -24px rgba(22,20,15,0.65)',
      },
      keyframes: {
        pulseLive: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.35', transform: 'scale(0.8)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        tickerMove: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'pulse-live': 'pulseLive 1.1s ease-in-out infinite',
        'slide-up': 'slideUp 0.25s ease-out',
        ticker: 'tickerMove 30s linear infinite',
      },
    },
  },
  plugins: [],
}
