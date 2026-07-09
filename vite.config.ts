import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    rolldownOptions: {
      output: {
        // Vendors pesados en chunks propios y cacheables: los comparten las
        // páginas lazy de stats sin duplicarse y sin entrar en el chunk inicial.
        // OJO: los grupos capturan también sus dependencias (comportamiento por
        // defecto y necesario para que el orden de inicialización sea correcto),
        // por eso los tests apuntan solo a paquetes autocontenidos:
        //  - `apexcharts` (core) y no `vue3-apexcharts`, cuyo wrapper depende de
        //    Vue y arrastraría el runtime entero al chunk del grupo (haciendo
        //    que el entry lo importe estáticamente).
        codeSplitting: {
          groups: [
            { name: 'firebase', test: /node_modules[\\/]@?firebase[\\/]/, priority: 10 },
            // vue3-apexcharts trae su propia copia SSR de apexcharts que solo
            // importa dinámicamente en servidor: la aislamos en su chunk para
            // que el navegador nunca la descargue junto al build normal.
            { name: 'apexcharts-ssr', test: /apexcharts\.ssr/, priority: 20 },
            { name: 'apexcharts', test: /node_modules[\\/]apexcharts[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
})
