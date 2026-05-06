// This disables Server-Side Rendering. The app will now render entirely in the browser.
export const ssr = false;

// This tells SvelteKit to pre-compile the HTML shells for all routes at build time so the Service Worker can cache them.
export const prerender = true;
