import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base musi się zgadzać z nazwą repo GitHub Pages: https://<user>.github.io/spartans-asg-admin/
export default defineConfig({
  plugins: [react()],
  base: '/spartans-asg-admin/',
});
