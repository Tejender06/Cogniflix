/*
FILE: vite.config.ts

PURPOSE:
Configures Vite build tool and development server.

FLOW:
CLI -> Vite Build Process

USED BY:
Vite build and dev server

NEXT FLOW:
None

*/
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
