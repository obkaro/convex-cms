import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import viteReact from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tailwindcss(),
    tsconfigPaths(),
    tanstackStart({
      srcDirectory: 'src',
    }),
    // Nitro enables deployment to Node.js and other platforms
    nitro(),
    // React's vite plugin must come after TanStack Start's vite plugin
    viteReact(),
  ],
  // Nitro configuration for Node.js deployment
  nitro: {},
})
