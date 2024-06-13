<template>
  <div class="p-4">
    <div>
        <article v-for="[player, stat] in rcvStats.data" class="text-center bg-white bg-opacity-10 p-4 rounded-lg m-4">
            <p class="font-bold pb-2">{{ player }}</p>
            <!-- {{ stat }} -->
            <div class="flex w-full">
                <p class="-rotate-90 w-10">Rece</p>
            <div class="flex items-around justify-around w-full">
                <div v-for="value, area in stat"> 
                    <p>{{ area }}</p>
                    <p>{{ value }}</p>
                </div>
            </div>
        </div>
        </article>
    </div>
    <!-- {{ rcvStats }} -->
  </div>
</template>

<script lang="ts" setup>
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { db } from '../firebase';
const set = ref(1 as number);
const matchId = useRoute().params.id as string
const stats = reactive({ data: [] as any[] })
const baseStats = reactive({ data: [] as any[] })
const rcvStats = reactive({ data: [] as any[]})

watch(stats, () => {
    let last = stats.data.at(-1);
    if (last != undefined && last.to != 0) {
        // let rcv = stats.data.filter(s=>s.player !== null && [1, 2, 3, 4, 22].includes(s.action.id))
        // rcvStats.data = {
        //     overpass: rcv.filter(s=>s.action.id === 1).length,
        //     receive1: rcv.filter(s=>s.action.id === 2).length,
        //     receiv2: rcv.filter(s=>s.action.id === 3).length,
        //     receive3: rcv.filter(s=>s.action.id === 4).length,
        //     error: rcv.filter(s=>s.action.id === 22).length
        // }
        //@ts-ignore
        rcvStats.data = Map.groupBy(stats.data.filter(s=>s.player !== null && [1, 2, 3, 4, 22].includes(s.action.id)), ({player})=>player.name)
        //@ts-ignore
        rcvStats.data.forEach((s, k)=>rcvStats.data.set(k, {
            //@ts-ignore
            total: s.length,
            //@ts-ignore
            "-": s.filter(s=>s.action.id === 2).length,
            //@ts-ignore
            "+": s.filter(s=>s.action.id === 3).length,
            //@ts-ignore
            "++": s.filter(s=>s.action.id === 4).length,
            //@ts-ignore
            error: s.filter(s=>s.action.id === 22).length
        }))
        // rcvStats.data.map((s)=>s)
        console.log(rcvStats.data)
    } else {
        
    }
})
watch(set, () => {
    stats.data = baseStats.data.filter((s) => s.set.number == set.value);
})

onSnapshot(
    query(
        collection(db, "live_matches", matchId, "stats"),
        orderBy("order")
    ),

    (q) => {
        // console.log(q.docs.map((d) => d.data()))
        baseStats.data = q.docs.map((d) => d.data())
        stats.data = baseStats.data.filter((s) => s.set.number == set.value);
        // console.log($routes)

    }
);
</script>
