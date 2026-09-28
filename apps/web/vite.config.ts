import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// GitHub Pages đặt project site dưới /PharmacyOpen/; bản local vẫn dùng đường dẫn tương đối.
export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/PharmacyOpen/' : './',
  plugins: [react()],
});
