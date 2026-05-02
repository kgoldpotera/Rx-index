/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        'rx-green': '#064124',
        'rx-cream': '#F7F6DF',
        'rx-yellow': '#FCB018',
        'rx-peach': '#FFCE9F',
      },
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