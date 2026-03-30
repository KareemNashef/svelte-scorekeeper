import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // TODO
  // Change this to '/your-repo-name/' for GitHub pages deployment
  base: '/svelte-scorekeeper/', 
  plugins: [
    svelte(),
    tailwindcss(),
  ],
})