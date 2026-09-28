import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// base tương đối để build tĩnh chạy được ở GitHub Pages hoặc thư mục con bất kỳ.
export default defineConfig({
  base: './',
  plugins: [react()],
});
