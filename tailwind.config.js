/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['SF Pro Text', 'sans-serif'],
        display: ['SF Pro Display', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-.04em',
      }
    },
  },
  plugins: [],
}