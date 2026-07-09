<template>
  <GeneralStats :id="matchId" />
</template>

<script lang="ts" setup>
import GeneralStats from "./GeneralStats.vue";
import { useRoute } from "vue-router";

const matchId = useRoute().params.id as string;
</script>
