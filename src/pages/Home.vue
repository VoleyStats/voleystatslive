<template>
    <!-- INTRO + CTAs -->
    <section
        class="rounded-lg p-6 flex flex-col justify-center items-center h-[80vh] relative"
    >
        <div class="h-screen absolute bottom-0 left-0 right-0 top-0">
            <div
                class="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:24px_48px] [mask-image:radial-gradient(ellipse_100%_100%_at_50%_0%,#000_70%,transparent_100%)]"
            ></div>
        </div>
        <div class="z-10">
            <div class="text-cente w-full flex justify-center">
                <h4
                    class="text-xs font-thin border-slate-700 bg-gray-800 border w-fit text-center py-1 px-4 text-slate-300 rounded-full"
                >
                    Conecta con tu equipo
                    <i class="bi bi-arrow-right-short text-sm"></i>
                </h4>
            </div>
            <h1
                class="text-center text-5xl sm:text-6xl lg:text-8xl leading-tight text-pretty sm:max-w-[600px] md:max-w-[700px] lg:max-w-[900px]"
            >
                Alcanza el mejor potencial de tu equipo
            </h1>
            <p
                class="text-center text-slate-300 text-sm font-thin leading-normal tracking-normal mt-4 mb-7"
            >
                Registra tus estadisticas, descarga informes y mejora partido a
                partido
            </p>
            <div class="flex justify-center items-center">
                <RouterLink
                    :to="'/team-code'"
                    class="text-sm font-thin border-slate-600 border bg-slate-700 w-fit text-center py-1 px-4 rounded-full"
                    >Consultar estadisticas online
                </RouterLink>
                <RouterLink
                    :to="'#'"
                    class="text-sm font-thin w-fit text-center py-1 px-4 rounded-full"
                    >Descargar app
                </RouterLink>
            </div>
        </div>
    </section>

    <!-- SECCION DE PRODUCTO -->
    <section
        class="rounded-lg mt-16 items-center grid md:grid-cols-2 gap-4 w-full max-w-screen-xl mx-auto p-4"
    >
        <div class="flex justify-center items-center">
            <img
                class="max-w-[300px] md:max-w-[460px] anime-fade-in"
                src="https://res.cloudinary.com/dfbloaduq/image/upload/test-2_k6ahsf.webp"
                alt=""
            />
        </div>

        <article class="w-full md:max-w-[480px] mt-4 md:mt-0 anime-fade-in">
            <h2
                class="text-center md:text-left text-3xl sm:text-4xl lg:text-5xl leading-tight text-pretty sm:max-w-[600px] md:max-w-[700px] lg:max-w-[900px]"
            >
                Maneja tu equipo al completo
            </h2>
            <p
                class="text-center md:text-left text-slate-300 text-base font-thin leading-normal tracking-normal mt-4 mb-7"
            >
                Registra las estadisticas de cada jugador, compara resultados de
                cada partido, examina la evolución de la temporada y valora
                posibles estrategias.
            </p>
            <p
                class="text-center md:text-left text-slate-300 text-base font-thin leading-normal tracking-normal mt-4 mb-7"
            >
                Registra las estadisticas de cada jugador, compara resultados de
                cada partido, examina la evolución de la temporada y valora
                posibles estrategias.
            </p>
        </article>
    </section>

    <!-- SECCION PASARELA -->
    <section
        class="mb-9 p-8 bg-gray-900 w-[100vw] mx-auto min-h-[450px] md:min-h-[750px] md:mt-20 flex justify-center items-center anime-fade-in"
    >
        <div class="w-full max-w-screen-xl mx-auto">
            <article class="mb-8 md:mb-10 anime-fade-in">
                <h2
                    class="text-center md:text-left text-3xl sm:text-4xl lg:text-5xl leading-tight text-pretty sm:max-w-[600px] md:max-w-[700px] lg:max-w-[900px]"
                >
                    Conoce la app
                </h2>
                <p
                    class="text-center md:text-left text-slate-300 text-base font-thin leading-normal tracking-normal mt-2"
                >
                    Te presentamos algunas de sus principales funcionalidades
                </p>
            </article>
            <div
                class="flex justify-start items-center flex-col md:flex-row gap-4 md:overflow-x-scroll scroll-p-[24rem]"
            >
                <article
                    class="w-[312px] shrink-0 p-6 rounded-3xl flex flex-col bg-clip-padding backdrop-filter backdrop-blur-lg bg-white bg-opacity-5 border border-slate-600 gap-4 anime-fade-in"
                    v-for="feature in appFeatures"
                >
                    <div class="border rounded-xl w-fit py-2 px-3">
                        <i :class="feature.icon"></i>
                    </div>
                    <div>
                        <h3>{{ feature.title }}</h3>
                        <p
                            class="md:text-left text-slate-300 text-sm font-thin"
                        >
                            Descarga el PDF con las estadisticas de tu equipo
                        </p>
                    </div>
                </article>
            </div>
        </div>
    </section>

    <!-- SECCION FAQs -->
    <section
        class="my-12 w-full max-w-screen-xl mx-auto p-8 min-h-[650px] flex justify-center items-start flex-col"
    >
        <h2
            class="text-left md:text-left text-3xl sm:text-4xl lg:text-5xl leading-tight text-pretty mb-6 anime-fade-in"
        >
            Preguntas frecuentes
        </h2>

        <!-- LISTADO DE PREGUNTAS -->
        <div class="grid grid-flow-row grid-cols-1 gap-2 mt-4 mb-4 w-full">
            <article
                class="border rounded-lg px-3 py-2 border-slate-600 g-clip-padding backdrop-filter backdrop-blur-lg bg-opacity-5 bg-white anime-fade-in"
                v-for="(q, index) in faqs"
                @click="toggleQuestion(index)"
            >
                <div class="flex justify-between cursor-pointer items-center">
                    <h3>{{ q.question }}</h3>
                    <i
                        v-if="!qSelection.includes(index)"
                        class="bi bi-chevron-down"
                    ></i>
                    <i
                        v-if="qSelection.includes(index)"
                        class="bi bi-chevron-up"
                    ></i>
                </div>
                <p
                    v-if="qSelection.includes(index)"
                    class="font-thin text-sm text-slate-300 mt-2"
                >
                    {{ q.answer }}
                </p>
            </article>
        </div>
    </section>
</template>

<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const applyFadeInEffect = (className: string) => {
    const elements = document.querySelectorAll(className);
    elements.forEach((element) => {
        gsap.fromTo(
            element,
            { opacity: 0, y: 100 },
            {
                opacity: 1,
                y: 0,
                duration: 3,
                scrollTrigger: {
                    trigger: element,
                    start: "top 75%",
                    end: "top 50%",
                    scrub: true,
                    once: true,
                    markers: false,
                },
            }
        );
    });
};

onMounted(() => {
    applyFadeInEffect(".anime-fade-in");
});

const appFeatures = [
    {
        title: "Descargar el PDF",
        description: "Descarga el PDF con las estadisticas de tu equipo",
        icon: "bi bi-asterisk",
    },
    {
        title: "Planifica tus partidos",
        description:
            "Evalua el resultado de cada jugador y encuentra su fuerte",
        icon: "bi bi-graph-up-arrow",
    },
    {
        title: "Analiza la evolución",
        description:
            "Compara los resultados de cada partido y valora posibles estrategias",
        icon: "bi bi-bar-chart-line",
    },
    {
        title: "Comparte informes",
        description: "Comparte informes de temporada, partido y entreno",
        icon: "bi bi-filetype-pdf",
    },
];

const faqs = [
    {
        question: "¿Cómo puedo descargar el PDF?",
        answer: "Para descargar el PDF, debes ir a la sección de informes y seleccionar la opción de descarga",
    },
    {
        question: "¿Cómo puedo compartir un informe?",
        answer: "Para compartir un informe, debes ir a la sección de informes y seleccionar la opción de compartir",
    },
    {
        question: "¿Cómo puedo comparar los resultados de cada partido?",
        answer: "Para comparar los resultados de cada partido, debes ir a la sección de estadisticas y seleccionar la opción de comparar",
    },
    {
        question: "¿Cómo puedo analizar la evolución de la temporada?",
        answer: "Para analizar la evolución de la temporada, debes ir a la sección de estadisticas y seleccion",
    },
];

const qSelection = ref([] as number[]);
const toggleQuestion = (index: number) => {
    if (qSelection.value.includes(index)) {
        qSelection.value = qSelection.value.filter((i) => i !== index);
    } else {
        qSelection.value.push(index);
    }
};
</script>
