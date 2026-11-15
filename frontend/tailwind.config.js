/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      colors: {
        // Clinical Hospital Management Color Palette
        clinical: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6', // Medical Teal
          600: '#0d9488', // Deep Clinical Teal
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        medblue: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7', // Hospital Command Blue
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        emergency: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626', // Code Red Trauma
          700: '#b91c1c',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        navy: {
          800: '#0f172a',
          900: '#0a0f1d',
          950: '#050811', // Deep Ultra-Clean Slate
        }
      },
      boxShadow: {
        'clinical': '0 4px 20px -2px rgba(13, 148, 136, 0.12), 0 2px 6px -1px rgba(0, 0, 0, 0.4)',
        'emergency': '0 4px 25px -2px rgba(220, 38, 38, 0.25)',
        'card-subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.3)',
      }
    },
  },
  plugins: [],
}
