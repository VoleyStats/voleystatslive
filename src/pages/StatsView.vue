<template>
  <div class=" w-screen h-16 rounded-lg text-center p-4">
    <p class="text-white">
      {{ opponent?.opponent }}
    </p>
<!-- Suggested code may be subject to a license. Learn more: ~LicenseLog:611877287. -->
    <div class="bg-white dark:bg-opacity-10 flex w-full rounded-lg p-2 content-between justify-around">
      <div v-for="n in opponent?.n_sets">Set {{ n }}</div>
    </div>
  </div>
    <!-- <div v-if="tab === 1" > -->
        <GeneralStats :id = "matchId" :setNumber = "setNumber" v-if="tab === 1" class="h-fit pb-20"/>
    <!-- </div> -->
    <div v-else-if="tab === 2" class="bg-white text-black">
        tab 2
    </div>
    <div v-else class="bg-white text-black">
        tab 3
    </div>
  <div>
    
    <div class="flex bg-white w-screen h-16 rounded-lg items-center justify-around fixed bottom-0">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
      class="size-6 shadow-md bg-cyan-500 fill-white p-1 rounded-lg" @click="changeTab(1)">
      <path fill-rule="evenodd"
        d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z"
        clip-rule="evenodd" />
    </svg>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6 fill-slate-800" @click="changeTab(2)">
      <path fill-rule="evenodd"
        d="M1.5 5.625c0-1.036.84-1.875 1.875-1.875h17.25c1.035 0 1.875.84 1.875 1.875v12.75c0 1.035-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 0 1 1.5 18.375V5.625ZM21 9.375A.375.375 0 0 0 20.625 9h-7.5a.375.375 0 0 0-.375.375v1.5c0 .207.168.375.375.375h7.5a.375.375 0 0 0 .375-.375v-1.5Zm0 3.75a.375.375 0 0 0-.375-.375h-7.5a.375.375 0 0 0-.375.375v1.5c0 .207.168.375.375.375h7.5a.375.375 0 0 0 .375-.375v-1.5Zm0 3.75a.375.375 0 0 0-.375-.375h-7.5a.375.375 0 0 0-.375.375v1.5c0 .207.168.375.375.375h7.5a.375.375 0 0 0 .375-.375v-1.5ZM10.875 18.75a.375.375 0 0 0 .375-.375v-1.5a.375.375 0 0 0-.375-.375h-7.5a.375.375 0 0 0-.375.375v1.5c0 .207.168.375.375.375h7.5ZM3.375 15h7.5a.375.375 0 0 0 .375-.375v-1.5a.375.375 0 0 0-.375-.375h-7.5a.375.375 0 0 0-.375.375v1.5c0 .207.168.375.375.375Zm0-3.75h7.5a.375.375 0 0 0 .375-.375v-1.5A.375.375 0 0 0 10.875 9h-7.5A.375.375 0 0 0 3 9.375v1.5c0 .207.168.375.375.375Z"
        clip-rule="evenodd" />
    </svg>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6 fill-slate-800" @click="changeTab(3)">
      <path
        d="M4.5 6.375a4.125 4.125 0 1 1 8.25 0 4.125 4.125 0 0 1-8.25 0ZM14.25 8.625a3.375 3.375 0 1 1 6.75 0 3.375 3.375 0 0 1-6.75 0ZM1.5 19.125a7.125 7.125 0 0 1 14.25 0v.003l-.001.119a.75.75 0 0 1-.363.63 13.067 13.067 0 0 1-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 0 1-.364-.63l-.001-.122ZM17.25 19.128l-.001.144a2.25 2.25 0 0 1-.233.96 10.088 10.088 0 0 0 5.06-1.01.75.75 0 0 0 .42-.643 4.875 4.875 0 0 0-6.957-4.611 8.586 8.586 0 0 1 1.71 5.157v.003Z" />
    </svg>
  </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import GeneralStats from './GeneralStats.vue';
import { useDocument } from 'vuefire';
import { db } from '../firebase';
import { doc } from 'firebase/firestore';
import { useRoute } from 'vue-router';
const matchId = useRoute().params.id as string
const setNumber = ref(1 as number)
const opponent = useDocument(doc(db, "live_matches", matchId))
    const tab = ref(1 as number)
    const changeTab = (newTab: number)=>{
        tab.value = newTab
        console.log(tab.value)
    }
</script>
