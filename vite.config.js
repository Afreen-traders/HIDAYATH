import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        checkout: resolve(__dirname, 'checkout.html'),
        login: resolve(__dirname, 'login.html'),
        product: resolve(__dirname, 'product.html'),
        products: resolve(__dirname, 'products.html'),
        profile: resolve(__dirname, 'profile.html'),
        success: resolve(__dirname, 'success.html'),
        trackOrder: resolve(__dirname, 'track-order.html')
      }
    }
  },
  publicDir: 'public'
});
