/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}


/**
 *  /courses/:id endpoint returns lessons WITHOUT completion flags.
 * Enrollment endpoint returns:
 *  - progress_percent
 *  - last_completed_lesson: { order }
 */
