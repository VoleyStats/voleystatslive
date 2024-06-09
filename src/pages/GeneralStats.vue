<template>
  <section class="min-h-screen px-4 flex flex-col gap-4 items-center">
    <!-- MARKER -->
    <article class="w-full">
      <div
        class="bg-white h-40 dark:bg-opacity-10 border border-slate-700 p-4 rounded-lg col-span-2 sm:col-span-2 flex flex-col items-center justify-around sm:order-2 text-4xl md:text-7xl"
      >
        <p class="text-xl text-center w-full mb-2">Marker</p>

        <div class="w-full h-full flex items-center gap-2">
          <div
            class="text-center rounded-lg h-full w-full text-red-400 dark:bg-white bg-neutral-200 dark:bg-opacity-10 flex flex-col items-center justify-center"
          >
            <p>
              {{ score[1] }}
            </p>
            <small class="text-slate-300 text-base">Rival team</small>
          </div>
          <div
            class="text-center rounded-lg h-full w-full text-sky-300 dark:bg-white bg-neutral-200 dark:bg-opacity-10 flex flex-col items-center justify-center"
          >
            <p>
              {{ score[0] }}
            </p>
            <small class="text-slate-300 text-base">Your team</small>
          </div>
        </div>
      </div>
    </article>

    <!-- ERRORS -->
    <section class="w-full h-[90px] flex justify-start items-center gap-2">
      <article
        class="bg-white dark:bg-opacity-10 p-4 rounded-lg relative flex items-baseline justify-center gap-2 w-1/2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          v-if="rowErrors"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="fill-rose-700 size-16 md:size-24 absolute top-[-1.5rem] right-[-1rem]"
        >
          <path
            fill-rule="evenodd"
            d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z"
            clip-rule="evenodd"
          />
        </svg>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          v-if="!rowErrors"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="fill-green-600 size-16 md:size-24 absolute top-[-1.5rem] right-[-1rem]"
        >
          <path
            fill-rule="evenodd"
            d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
            clip-rule="evenodd"
          />
        </svg>

        <p class="md:text-8xl text-6xl text-center">{{ rowActions }}</p>
        <p class="md:text-xl text-center">In a row</p>
      </article>

      <article
        class="bg-white dark:bg-opacity-10 p-4 rounded-lg w-1/2 flex justify-center items-center h-full grow"
      >
        <p class="text-center">+ 4 hits</p>
      </article>
    </section>

    <!-- SETS -->
    <section class="w-full flex justify-start items-center gap-2">
      <div class="w-screen rounded-lg text-center">
        <div
          class="bg-white dark:bg-opacity-10 flex w-full rounded-lg p-2 content-between justify-around"
        >
          <div v-for="n in opponent?.n_sets">Set {{ n }}</div>
        </div>
      </div>
    </section>

    <p class="text-xl w-full text-left">Your stats</p>
    <!-- CHARTS -->
    <section class="w-full flex flex-col justify-start items-center gap-4">
      <!-- BAR CHART -->
      <div
        class="bg-white dark:bg-opacity-10 h-full rounded-lg w-full min-h-250"
      >
        <apexchart
          class=""
          type="bar"
          :options="errors.chartOptions"
          :series="errors.series"
        ></apexchart>
      </div>

      <!-- VERTICAL BAR CHART -->
      <div class="bg-white dark:bg-opacity-10 p-4 rounded-lg min-h-[400px] w-full•">
        <p class="text-center">Point log</p>
        <div id="chart" class="min-h-[400px]">
          <apexchart
            height="100%"
            type="bar"
            :options="pointLog.chartOptions"
            :series="pointLog.series"
          ></apexchart>
        </div>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
// import { getStats, getMatch } from "../firebase";
import { useCollection, useDocument } from "vuefire";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase";
import router from "../router";
import { useRoute } from "vue-router";
const props = defineProps({
  id: String,
  setNumber: Number,
});
const score = ref([0, 0]);

const opponent = useDocument(doc(db, "live_matches", "59p51BXg0ndGKjFUYfeu"));

const log = ref({ data: [] as number[], labels: [] as string[] });

const errorData = ref({ data: [] as number[], labels: [] as string[] });

// const serveStats = ref({ data: [] as number[], labels: "" as string });

const areaLabels = [
  "receive",
  "block",
  "dig",
  "set",
  "serve",
  "attack",
  "fault",
];

const rowErrors = ref(false);

const rowActions = ref(1);

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
          gradientToColors: ["#609DE7", "#beebef"],
          colorStops: [
            {
              offset: 40,
              color: "#609DE7",
              opacity: 1,
            },
            {
              offset: 100,
              color: "#beebef",
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
          borderRadius: 10,
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
          formatter: function (val) {
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
                color: "#609DE7",
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
// let rt = useCollection(collection(db, "live_matches", "59p51BXg0ndGKjFUYfeu", "stats"))

const u = onSnapshot(
  query(collection(db, "live_matches", props.id, "stats"), orderBy("order")),
  (q) => {
    let stats = q.docs.map((d) => d.data());
    // console.log($routes)
    let last = stats.at(-1);
    if (last != undefined && last.to != 0) {
      rowErrors.value = last?.to == 2;
      console.log(stats);
      for (let i = stats.length - 2; i >= 0; i--) {
        if (stats[i].to == last?.to) {
          rowActions.value++;
        } else {
          break;
        }
      }
      // stats.reverse().forEach(s=>)
      score.value = [last?.score_us, last?.score_them];
      log.value = {
        labels: stats.map((s) => s.score_them + "-" + s.score_us),
        data: stats.map((s) => s.score_us - s.score_them),
      };
      let grouped = Map.groupBy(
        stats.filter((s) => s.to == 2 && s.action.type == "error"),
        ({ action }) => action.area
      );
      errorData.value = {
        labels: Array.from(grouped.keys(), (k: number) => areaLabels[k]),
        data: Array.from(grouped.values(), (v) => v.length),
      };
      // const serves = stats.filter(s => s.action.area === 4 && s.player !== null)
      // serveStats.value.data = [serves.filter(s => s.action.id === 8).length, serves.filter(s => s.action.id === 15).length, serves.filter(s => s.action.id !== 15 && s.action.id !== 8).length]
      // serveStats.value.labels = areaLabels[4]
    }
  }
);
</script>
