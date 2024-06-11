<template>
  <GeneralStats
    :id="matchId"
    :setNumber="setNumber"
    v-if="tab === 1"
    class="h-fit pb-20"
  />
</template>

<script lang="ts" setup>
import { ref } from "vue";
import GeneralStats from "./GeneralStats.vue";
// import { useDocument } from "vuefire";
// import { db } from "../firebase";
// import { doc } from "firebase/firestore";
import { useRoute } from "vue-router";
const matchId = useRoute().params.id as string;
const setNumber = ref(1 as number);
// const opponent = useDocument(doc(db, "live_matches", matchId));
const tab = ref(1 as number);
// const changeTab = (newTab: number) => {
//   tab.value = newTab;
//   console.log(tab.value);
// };

</script>
