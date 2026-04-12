/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#e11d48',
          'primary-muted': '#fff1f2',
          'primary-dark': '#be123c',
          accent: '#d97706',
          'accent-muted': '#fef3c7',
        },
        neutral: {
          background: '#f8fafc',
          surface: '#ffffff',
          border: '#e2e8f0',
          'text-primary': '#0f172a',
          'text-muted': '#64748b',
          'text-inverse': '#f9fafb',
        },
        status: {
          success: '#059669',
          error: '#b91c1c',
          warning: '#d97706',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      fontSize: {
        md: '1rem',
      },
      fontWeight: {
        regular: '400',
      },
      lineHeight: {
        relaxed: '1.7',
      },
      borderRadius: {
        sm: '6px',
        md: '12px',
        lg: '24px',
        pill: '9999px',
      },
      boxShadow: {
        'elevation-1': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'elevation-2': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'elevation-3': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
}
