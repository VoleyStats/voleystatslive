<template>
    <div class="min-h-screen text-slate-800 pb-20">
        <div class="grid grid-cols-3 gap-4 px-4 auto-rows-fr">
            <div class="row-span-1 col-span-3 flex items-center sm:order-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
                class=" stroke-slate-800 shadow-md p-2 rounded-lg size-8 bg-white">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 15.75 3 12m0 0 3.75-3.75M3 12h18" />
                </svg>
                <p class="px-4 py-2 w-full text-center">Opponent name</p>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" 
                class="stroke-slate-800 shadow-md p-2 rounded-lg size-8 bg-white">
                    <path fill-rule="evenodd" d="M12 5.25c1.213 0 2.415.046 3.605.135a3.256 3.256 0 0 1 3.01 3.01c.044.583.077 1.17.1 1.759L17.03 8.47a.75.75 0 1 0-1.06 1.06l3 3a.75.75 0 0 0 1.06 0l3-3a.75.75 0 0 0-1.06-1.06l-1.752 1.751c-.023-.65-.06-1.296-.108-1.939a4.756 4.756 0 0 0-4.392-4.392 49.422 49.422 0 0 0-7.436 0A4.756 4.756 0 0 0 3.89 8.282c-.017.224-.033.447-.046.672a.75.75 0 1 0 1.497.092c.013-.217.028-.434.044-.651a3.256 3.256 0 0 1 3.01-3.01c1.19-.09 2.392-.135 3.605-.135Zm-6.97 6.22a.75.75 0 0 0-1.06 0l-3 3a.75.75 0 1 0 1.06 1.06l1.752-1.751c.023.65.06 1.296.108 1.939a4.756 4.756 0 0 0 4.392 4.392 49.413 49.413 0 0 0 7.436 0 4.756 4.756 0 0 0 4.392-4.392c.017-.223.032-.447.046-.672a.75.75 0 0 0-1.497-.092c-.013.217-.028.434-.044.651a3.256 3.256 0 0 1-3.01 3.01 47.953 47.953 0 0 1-7.21 0 3.256 3.256 0 0 1-3.01-3.01 47.759 47.759 0 0 1-.1-1.759L6.97 15.53a.75.75 0 0 0 1.06-1.06l-3-3Z" clip-rule="evenodd" />
                </svg>
            </div>
            <div class="row-span-1 bg-white p-4 rounded-lg col-span-2 sm:col-span-2 flex items-center justify-around sm:order-2">
                <p class="text-xl text-center rounded-lg py-4 px-8 bg-cyan-500 text-white">1</p>
                <p class="text-xl text-center p-4">-</p>
                <p class="text-xl text-center rounded-lg py-4 px-8 bg-pink-400 text-white">1</p>
            </div>
            <div class="row-span-1 bg-rose-700 text-white p-4 rounded-lg col-span-1 sm:order-2">
                <p class="text-3xl text-center">8</p>
                <p class="text-xs text-center">Errors in a row</p>
            </div>
            <div class="row-span-2 bg-white p-4 rounded-lg col-span-3 sm:col-span-2 sm:order-4">
                <p class="text-center">Error distribution</p>
                <div id="chart" class="w-full ">
                    <apexchart type="bar" :options="errors.chartOptions" :series="errors.series"></apexchart>
                </div>
            </div>
            <div class="row-span-2 bg-white p-4 rounded-lg col-span-3 sm:col-span-2 sm:order-5">
                <p class="text-center">Serve stats</p>
                <div id="chart" class="w-full">
                    <apexchart type="radialBar" :options="areaStats.chartOptions" :series="areaStats.series"></apexchart>
                </div>
            </div>
            <div class="row-span-4 bg-white p-4 rounded-lg sm:col-span-1 col-span-3 order-3">
                <p class="text-center">Point log</p>
                <div id="chart" class="min-h-80 max-h-80 overflow-y-auto overflow-x-hidden">
                    <apexchart type="bar" :options="pointLog.chartOptions" :series="pointLog.series"></apexchart>
                </div>
            </div>
            <!-- <div class="row-span-1 p-4 rounded-lg bg-white col-span-3 h-1/5"></div> -->
        </div>
        
    </div>
    <div class="flex bg-white w-screen h-16 rounded-lg items-center justify-around fixed bottom-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" 
            class="size-6 shadow-md bg-cyan-500 fill-white p-1 rounded-lg">
                <path fill-rule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clip-rule="evenodd" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6 fill-slate-800">
                <path fill-rule="evenodd" d="M1.5 5.625c0-1.036.84-1.875 1.875-1.875h17.25c1.035 0 1.875.84 1.875 1.875v12.75c0 1.035-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 0 1 1.5 18.375V5.625ZM21 9.375A.375.375 0 0 0 20.625 9h-7.5a.375.375 0 0 0-.375.375v1.5c0 .207.168.375.375.375h7.5a.375.375 0 0 0 .375-.375v-1.5Zm0 3.75a.375.375 0 0 0-.375-.375h-7.5a.375.375 0 0 0-.375.375v1.5c0 .207.168.375.375.375h7.5a.375.375 0 0 0 .375-.375v-1.5Zm0 3.75a.375.375 0 0 0-.375-.375h-7.5a.375.375 0 0 0-.375.375v1.5c0 .207.168.375.375.375h7.5a.375.375 0 0 0 .375-.375v-1.5ZM10.875 18.75a.375.375 0 0 0 .375-.375v-1.5a.375.375 0 0 0-.375-.375h-7.5a.375.375 0 0 0-.375.375v1.5c0 .207.168.375.375.375h7.5ZM3.375 15h7.5a.375.375 0 0 0 .375-.375v-1.5a.375.375 0 0 0-.375-.375h-7.5a.375.375 0 0 0-.375.375v1.5c0 .207.168.375.375.375Zm0-3.75h7.5a.375.375 0 0 0 .375-.375v-1.5A.375.375 0 0 0 10.875 9h-7.5A.375.375 0 0 0 3 9.375v1.5c0 .207.168.375.375.375Z" clip-rule="evenodd" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6 fill-slate-800">
                <path d="M4.5 6.375a4.125 4.125 0 1 1 8.25 0 4.125 4.125 0 0 1-8.25 0ZM14.25 8.625a3.375 3.375 0 1 1 6.75 0 3.375 3.375 0 0 1-6.75 0ZM1.5 19.125a7.125 7.125 0 0 1 14.25 0v.003l-.001.119a.75.75 0 0 1-.363.63 13.067 13.067 0 0 1-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 0 1-.364-.63l-.001-.122ZM17.25 19.128l-.001.144a2.25 2.25 0 0 1-.233.96 10.088 10.088 0 0 0 5.06-1.01.75.75 0 0 0 .42-.643 4.875 4.875 0 0 0-6.957-4.611 8.586 8.586 0 0 1 1.71 5.157v.003Z" />
            </svg>

        </div>
</template>

<script setup lang="ts">

let errors = {
    series: [{
            name: 'Net Profit',
            data: [44, 55, 57, 56, 61, 58, 63, 60, 66]
          }],
          chartOptions: {
            chart: {
              type: 'bar',
            //   height: 350,
              toolbar: {
                show: false
              }
            },
            grid:{
                show: false
            },  
            plotOptions: {
              bar: {
                horizontal: false,
                // columnWidth: '55%',
                // endingShape: 'rounded'
              },
            },
            dataLabels: {
              enabled: false
            },
            stroke: {
              show: true,
              width: 2,
              colors: ['transparent']
            },
            xaxis: {
                axisBorder: {
                    show: false
                },
                axisTicks: {
                    show: false
                },
              categories: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
            },
            yaxis: {
                show: false,
              title: {
                text: '$ (thousands)'
              },
            },
            fill: {
              opacity: 1
            },
            tooltip: {
              y: {
                formatter: function (val) {
                  return "$ " + val + " thousands"
                }
              }
            }
          },
          
          
        }
        let areaStats = {
          series: [67],
          chartOptions: {
            chart: {
              height: 350,
              type: 'radialBar',
              offsetY: -10
            },
            plotOptions: {
              radialBar: {
                startAngle: -135,
                endAngle: 135,
                dataLabels: {
                  name: {
                    fontSize: '16px',
                    color: undefined,
                    offsetY: 120
                  },
                  value: {
                    offsetY: 76,
                    fontSize: '22px',
                    color: undefined,
                    formatter: function (val) {
                      return val + "%";
                    }
                  }
                }
              }
            },
            fill: {
              type: 'gradient',
              gradient: {
                  shade: 'dark',
                  shadeIntensity: 0.15,
                  inverseColors: false,
                  opacityFrom: 1,
                  opacityTo: 1,
                  stops: [0, 50, 65, 91]
              },
            },
            labels: ['Median Ratio'],
          },
          
          
        }
        let pointLog = {
          
          series: [{
            data: [400, -100, 448, 470, 540, 200, -100, -200, 300, 1380, -100, 448, 470, 540, 200, -100, -200, 300, 1380, -100, 448, 470, 540, 200, -100, -200, 300, 1380]
          }],
          chartOptions: {
            chart: {
              type: 'bar',
              height: '100%',
              toolbar:{
                show: false
              },
              zoom:{
                enabled: true,
                type: 'y'
              }
            },
            grid:{
                show: false,
                xaxis: {
                    lines: {
                        show:false
                    }
                },
                yaxis: {
                    lines: {
                        show:false
                    }
                }
            },
            plotOptions: {
              bar: {
                borderRadius: 4,
                borderRadiusApplication: 'end',
                horizontal: true,
              }
            },
            dataLabels: {
              enabled: false
            },
            xaxis: {
                axisBorder: {
                    show: false
                },
                axisTicks: {
                    show: false
                },
                labels:{

                    show: false,
                },
              categories: ['South Korea', 'Canada', 'United Kingdom', 'Netherlands', 'Italy', 'France', 'Japan','United States', 'China', 'Germany', 'Canada', 'United Kingdom', 'Netherlands', 'Italy', 'France', 'Japan','United States', 'China', 'Germany', 'Canada', 'United Kingdom', 'Netherlands', 'Italy', 'France', 'Japan','United States', 'China', 'Germany'],
            },
            yaxis: {
                show: false
            }
          },
          fill: {
            type: "gradient",
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.7,
                opacityTo: 0.9,
                stops: [0, 90, 100]
            }
          }
          
        }

</script>
