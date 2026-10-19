import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base — имя репозитория, так приложение открывается по адресу diz-fluor.github.io/kopitron/
export default defineConfig({
  base: '/kopitron/',
  plugins: [react()],
})
