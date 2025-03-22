import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // ✅ correct


export default defineConfig({
  plugins: [react()],
});
