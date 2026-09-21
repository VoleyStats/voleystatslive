<script setup lang="ts">
import { computed } from "vue"
import { RouterView, useRoute } from "vue-router"
import Layout from "./layouts/Layout.vue";

const route = useRoute()
// Routes flagged `bare` (e.g. the OBS overlay) render without the site chrome.
const bare = computed(() => route.meta.bare === true)
</script>

<template>
  <!-- El overlay va SIN transición: es una fuente de OBS, no una página que
       alguien navega, y un fundido de entrada saldría al directo. -->
  <RouterView v-if="bare" />
  <Layout v-else>
    <!-- Cambio de página con fundido (`.page-*` en style.css).
         Lo que se anima es ESTE div y no el componente de la página: la mitad
         de las páginas (Home, TeamCode, TeamMatches) tienen varias <section>
         hermanas como raíz, y `<Transition>` sobre un fragmento no anima nada
         —solo avisa por consola—. Envolviéndolas siempre hay un único nodo.
         `mode="out-in"` porque dos páginas no miden lo mismo: solapadas, el
         pie daría un salto.
         La `key` es el NOMBRE de la ruta, no su path: `/stats/A` → `/stats/B`
         es la misma página con otro partido, así que no se vuelve a montar (y
         el componente sigue resolviendo el cambio con sus propios watchers,
         como hasta ahora). -->
    <RouterView v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <div :key="String(route.name ?? route.path)">
          <component :is="Component" />
        </div>
      </Transition>
    </RouterView>
  </Layout>
</template>
