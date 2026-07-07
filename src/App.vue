<script setup lang="ts">
import { computed } from "vue"
import { RouterView, useRoute } from "vue-router"
import Layout from "./layouts/Layout.vue";

const route = useRoute()
// Routes flagged `bare` (e.g. the OBS overlay) render without the site chrome.
const bare = computed(() => route.meta.bare === true)
</script>

<template>
  <RouterView v-if="bare" />
  <Layout v-else>
    <RouterView />
  </Layout>
</template>
