<template>
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
    <section
      v-else
        class="min-h-screen px-4 flex flex-col gap-4 items-center relative pb-20"
    >
        <!-- test sets -->
        
        <!-- SCORE -->
        <article class="w-full">
            <div
                class="card h-40 p-4 col-span-2 flex flex-col items-center justify-around text-4xl md:text-7xl"
            >
                <p class="text-xl text-center w-full mb-2">Marcador</p>

                <div class="w-full h-full flex items-center gap-2">
                    <div
                        class="text-center rounded-lg h-full w-full text-slate-300 bg-white/[0.05] border border-white/10 flex flex-col items-center justify-center"
                    >
                        <p>
                            {{ score[1] }}
                        </p>
                        <small class="text-slate-300 text-base">Rival</small>
                    </div>
                    <div
                        class="text-center rounded-lg h-full w-full text-brand-300 bg-brand-500/10 border border-brand-500/20 flex flex-col items-center justify-center"
                    >
                        <p>
                            {{ score[0] }}
                        </p>
                        <small class="text-slate-300 text-base"
                            >Tu equipo</small
                        >
                    </div>
                </div>
            </div>
        </article>

        <!-- ERRORS -->
        <section class="w-full h-fit flex justify-center items-center gap-2">
            <article
                class="bg-white/[0.04] border border-white/10 p-4 rounded-lg flex items-center justify-around w-1/2 h-[95px]"
            >
                <div
                    class="w-full flex justify-center items-center flex-col gap-2"
                >
                    <p
                        class="text-neutral-400 text-xs font-light text-center leading-3"
                    >
                        <span class="text-xl text-white font-normal"
                            >{{ Math.floor(serveData.percentage) }}%</span
                        >
                        <br />
                        de eficiencia en K2
                    </p>
                    <!-- PROGRESS BAR -->
                    <div class="bg-neutral-500 w-full h-[10px] rounded-full">
                        <div
                            class="bg-sky-300 h-[10px] rounded-full"
                            :style="`width: ${Math.floor(
                                serveData.percentage
                            )}%;`"
                        ></div>
                    </div>
                </div>
            </article>
            <article
                class="bg-white/[0.04] border border-white/10 p-2 rounded-lg flex items-center justify-around w-1/2"
            >
                <div class="flex justify-center items-center w-fit gap-1">
                    <svg
                        v-if="!rowErrors"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        class="fill-green-600 size-20 max-w-12"
                    >
                        <path
                            fill-rule="evenodd"
                            d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                            clip-rule="evenodd"
                        />
                    </svg>
                    <svg
                        v-else
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        class="fill-red-500 size-20 max-w-12"
                    >
                        <path
                            fill-rule="evenodd"
                            d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z"
                            clip-rule="evenodd"
                        />
                    </svg>

                    <p
                        class="text-base text-neutral-400 leading-5 font-light line-clamp-2"
                    >
                        <span class="text-white"
                            >{{ rowActions }}
                            {{ rowErrors ? " fallos" : " aciertos" }}</span
                        >
                        <br />
                        seguidos
                    </p>
                </div>
            </article>
        </section>

        <!-- SETS -->
        <section
            class="w-full flex justify-start items-center gap-2"
            v-if="false"
        >
            <div class="w-screen rounded-lg text-center">
                <div
                    class="bg-white/[0.04] border border-white/10 flex w-full rounded-lg p-2 content-between justify-around gap-2"
                >
                    <div
                        :class="{
                            'rounded-lg py-1 w-full': true,
                            'bg-white text-slate-800': set == n,
                        }"
                        v-for="n in match?.n_sets"
                        @click="set = n"
                    >
                        Set {{ n }}
                    </div>
                </div>
            </div>
        </section>

        <p class="text-xl w-full text-left">Estadísticas</p>
        <!-- CHARTS -->
        <section class="w-full flex flex-col justify-start items-center gap-4">
            <!-- BAR CHART -->
            <div
                class="bg-white/[0.04] border border-white/10 h-full rounded-lg w-full min-h-250"
            >
                <apexchart
                    class=""
                    type="bar"
                    :options="errors.chartOptions"
                    :series="errors.series"
                ></apexchart>
            </div>

            <!-- VERTICAL BAR CHART -->
            <div
                class="bg-white/[0.04] border border-white/10 p-4 rounded-lg min-h-[400px] w-full"
            >
                <p class="text-center">Curva de registro</p>
                <div id="chart" class="min-h-[400px]">
                    <apexchart
                        height="100%"
                        type="bar"
                        :options="pointLog.chartOptions"
                        :series="pointLog.series"
                    >
                    </apexchart>
                </div>
            </div>
        </section>
    </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, Ref, watch } from "vue";
import type { errorLog } from "../interfaces/errorTypes";
import { useDocument } from "vuefire";
import EmptyState from '../components/EmptyState.vue'
import {
    collection,
    doc,
    onSnapshot,
    orderBy,
    query,
} from "firebase/firestore";
import { db } from "../firebase";
const props = defineProps({
    id: String,
    setNumber: Number,
});
const score = ref([0, 0]);

const set = ref(1 as number);

const match = useDocument(doc(db, "live_matches", props?.id ?? ""));

const log: Ref<errorLog> = ref({ data: [], labels: [] });

const errorData: Ref<errorLog> = ref({ data: [], labels: [] });

const serveData = ref({total: 0, points: 0, percentage: 0})

const areaLabels = [
    "Recepción",
    "Bloqueo",
    "Defensa",
    "Colocación",
    "Saque",
    "Ataque",
    "Falta",
];

const rowErrors = ref(false);

const rowActions = ref(1);

const selectSet = ref(false);

let errors = computed(() => {
    return {
        series: [
            {
                name: "Errores",
                data: errorData.value.data,
            },
        ],
        chartOptions: {
            title: {
                text: "Errores",
                align: "center",
                margin: 20,

                style: {
                    color: "#fff",
                },
            },
            fill: {
                type: "gradient",
                gradient: {
                    type: "diagonal2",
                    gradientToColors: ["#7DD3FC", "#7DD3FC"],
                    colorStops: [
                        {
                            offset: 40,
                            color: "#7DD3FC",
                            opacity: 1,
                        },
                        {
                            offset: 100,
                            color: "#7DD3FC",
                            opacity: 1,
                        },
                    ],
                },
            },
            chart: {
                type: "bar",
                height: "100%",
                redrawOnParentResize: true,
                toolbar: {
                    show: false,
                },
            },
            grid: {
                show: false,
                padding: {
                    left: 0,
                    right: 0,
                },
            },
            plotOptions: {
                bar: {
                    horizontal: false,
              borderRadius: 6,
              columnWidth: 30,
              barHeight: '50%',
              borderRadiusApplication: "end",
                },
            },
            dataLabels: {
                enabled: false,
            },
            xaxis: {
                labels: {
                    show: false,
                },
                axisBorder: {
                    show: false,
                },
                axisTicks: {
                    show: false,
                },
                categories: errorData.value.labels,
            },
            yaxis: {
                show: false,
            },
            tooltip: {
                theme: "dark",
                y: {
                  formatter: function (val: number) {
                    return val;
                  },
                },
            },
        },
    };
});

// let areaStats = computed(() => {
//   return {
//     series: serveStats.value.data,
//     chartOptions: {
//       dataLabels:{
//         enabled: false,
//       },
//       tooltip: {
//         theme: "dark",
//         fillSeriesColor: false,
//         y: {
//           formatter: function (val) {
//             return val;
//           },
//         },
//       },
//       title: {
//         text: "Errores",
//         align: "center",
//         // margin: 20,
//         // offsetY: 130,
//         style:{
//           color: "#fff"
//         }
//       },
//       stroke: {
//         show: false
//       },
//       legend:{
//         show: false
//       },
//       chart: {
//         type: "donut",
//         // offsetY: -10,
//       },
//       plotOptions: {

//         pie: {
//           startAngle: -135,
//           endAngle: 135,
//           dataLabels: {
//             name: {
//               // fontSize: "16px",
//               color: "#fff",
//               // offsetY: 70,
//             },
//             value: {
//               // offsetY: -10,
//               fontSize: "22px",
//               color: "#fff",
//               formatter: function (val) {
//                 return val;
//               },
//             },
//           },
//         },
//       },
//       colors: ["#609DE7", "#7b100c", "#efefef"],
//       // fill: {
//       //     type: 'gradient',
//       //     gradient: {
//       //         type: 'vertical',
//       //         gradientToColors: ["#609DE7", "#beebef"],
//       //         colorStops: [
//       //         {
//       //             offset: 40,
//       //             color: '#609DE7',
//       //             opacity: 1
//       //           },
//       //           {
//       //             offset: 100,
//       //             color: '#beebef',
//       //             opacity: 1
//       //           },

//       //         ]
//       //     },
//       //   },
//       labels: ["aces", "errors", "rest"],
//     },
//   }
// });

let pointLog = computed(() => {
    return {
        series: [
            {
                data: log.value.data,
            },
        ],
        chartOptions: {
            annotations: {
                xaxis: [
                    {
                        x: 0,
                        strokeDashArray: 0,
                    },
                ],
            },
            chart: {
                type: "bar",
                height: "100%",
                toolbar: {
                    show: false,
                },
            },
            grid: {
                show: false,
                xaxis: {
                    lines: {
                        show: false,
                    },
                },
                yaxis: {
                    lines: {
                        show: false,
                    },
                },
            },
            plotOptions: {
                bar: {
                    borderRadius: 4,
                    borderRadiusApplication: "end",
                    horizontal: true,
                    // barHeight: 15,
                    colors: {
                        ranges: [
                            {
                                from: 0,
                                to: Infinity,
                                color: "#7DD3FC",
                            },
                            {
                                from: -Infinity,
                                to: 0,
                                color: "#7b100c",
                            },
                        ],
                    },
                },
            },
            dataLabels: {
                enabled: false,
            },
            xaxis: {
                min: -25,
                max: 25,
                axisBorder: {
                    show: false,
                },
                axisTicks: {
                    show: false,
                },
                labels: {
                    show: false,
                },
                categories: log.value.labels,
            },
            yaxis: {
                show: true,
                labels: {
                    style: {
                        colors: "#fff",
                    },
                },
            },
            tooltip: {
                enabled: false,
            },
        },
    };
});

const stats = reactive({ data: [] as any[] })
const baseStats = reactive({ data: [] as any[] })


watch(stats, () => {
    let last = stats.data.at(-1);

    if (last != undefined && last.to != 0) {
        rowActions.value = 1;
        rowErrors.value = last?.to == 2;
        for (let i = stats.data.length - 2; i >= 0; i--) {
            if (stats.data[i].to == last?.to) {
                rowActions.value++;
            } else {
                break;
            }
        }
        // stats.reverse().forEach(s=>)
        score.value = [last?.score_us, last?.score_them];
        let finals = stats.data.filter(s=>s.to !== 0)
        log.value = {
            labels: finals.map((s) => s.score_them + "-" + s.score_us),
            data: finals.map((s) => s.score_us - s.score_them),
        };
        // @ts-ignore
        let grouped = Map.groupBy(
            stats.data.filter((s) => s.to == 2 && s.action.type == "error"),
            // @ts-ignore

            ({ action }) => action.area
        );
        errorData.value = {
            labels: Array.from(
                grouped.keys(),
                (k: number) => areaLabels[k]
            ),
            data: Array.from(grouped.values(), (v: Array<any>) => v.length),
        };
        let serves = stats.data.filter(s => s.stage === 0 && s.server !== null && s.to !== 0)
        let pt = serves.filter(s => s.to == 1)
        serveData.value = {
            total: serves.length,
            points: pt.length,
            percentage: (pt.length / serves.length) * 100

        }
        // const serves = stats.filter(s => s.action.area === 4 && s.player !== null)
        // serveStats.value.data = [serves.filter(s => s.action.id === 8).length, serves.filter(s => s.action.id === 15).length, serves.filter(s => s.action.id !== 15 && s.action.id !== 8).length]
        // serveStats.value.labels = areaLabels[4]
    } else {
        score.value = [0, 0];
        log.value = {
            labels: [],
            data: [],
        };
        errorData.value = {
            labels: [],
            data: [],
        };
        serveData.value = {
            total: 0,
            points: 0,
            percentage: 0
        }
    }
})
watch(set, () => {
    stats.data = baseStats.data.filter((s) => s.set.number == set.value);
})

onSnapshot(
    query(
        collection(db, "live_matches", props?.id ?? "", "stats"),
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
