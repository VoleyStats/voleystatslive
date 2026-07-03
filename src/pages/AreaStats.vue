<template>

  <div class="p-4" >
    <div
            class="fixed top-20 right-0 z-30 flex w-12 flex-col items-center rounded-l-xl border border-r-0 border-white/10 bg-ink-850/80 py-2 backdrop-blur-xl cursor-pointer"
            @click="selectSet = !selectSet"
            >
            <div v-show="selectSet">
                <p class="">Set</p>
                
                <ul class="flex flex-col items-center gap-4 mt-2">
                    <li
                        :class="{'text-sm text-bold p-2 rounded-full h-6 w-6  flex justify-center items-center': true, 
                        'text-slate-700 bg-slate-100': set == n
                    }"
                        v-for = "n in match?.n_sets"
                        :key="n"
                        @click="set = n"
                    >
                        <p>{{ n }}</p>
                    </li>
                </ul>
            </div>
            <p v-show="!selectSet" class=" text-sm">Set {{ set }}</p>
        </div>
        <EmptyState v-if="stats.data.length === 0"/>
    <div v-else>
        <article v-for="[player, stat] in rcvStats.data" class="text-center bg-white/[0.04] border border-white/10 rounded-2xl p-4 m-4">
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
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { db } from '../firebase';
import { useDocument } from 'vuefire';
import EmptyState from '../components/EmptyState.vue';
const set = ref(1 as number);
const matchId = useRoute().params.id as string
const stats = reactive({ data: [] as any[] })
const baseStats = reactive({ data: [] as any[] })
const rcvStats = reactive({ data: [] as any[]})
const match = useDocument(doc(db, "live_matches", matchId));
const selectSet = ref(false);
watch(stats, () => {
    let last = stats.data.at(-1);
    if (last != undefined && last.to != 0) {
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
        rcvStats.data = []
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
