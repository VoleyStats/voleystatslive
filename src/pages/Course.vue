<template>
  <section class="relative min-h-[calc(100vh-4rem)] overflow-hidden px-5 py-14">
    <div class="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,#000_50%,transparent_100%)]"></div>
    <div class="pointer-events-none absolute top-24 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-brand-500/20 blur-[120px]"></div>

    <div class="relative mx-auto w-full max-w-lg">
      <!-- Comprobando el código. -->
      <div v-if="state === 'loading'" class="card p-8 animate-pulse" aria-busy="true">
        <p class="sr-only">{{ t('course.loading') }}</p>
        <div class="h-3 rounded-full bg-white/10 w-1/3"></div>
        <div class="mt-4 h-6 rounded-full bg-white/10 w-2/3"></div>
        <div class="mt-8 h-24 rounded-2xl bg-white/[0.06]"></div>
      </div>

      <!-- Sin conexión con el servidor: el QR es correcto, la red no. -->
      <div v-else-if="state === 'network'" class="card p-8 text-center">
        <i class="bi bi-wifi-off text-2xl text-slate-400"></i>
        <p class="mt-3 text-sm text-slate-300">{{ t('course.network') }}</p>
        <button type="button" class="btn-ghost mt-6 text-sm" @click="loadInfo">
          <i class="bi bi-arrow-clockwise"></i>
          {{ t('course.retry') }}
        </button>
      </div>

      <!-- Código inexistente o mal escaneado. -->
      <div v-else-if="state === 'invalid' || !info" class="card p-8 text-center">
        <i class="bi bi-question-circle text-2xl text-slate-400"></i>
        <h1 class="mt-3 text-xl font-bold">{{ t('course.invalid.title') }}</h1>
        <p class="mt-2 text-sm leading-relaxed text-slate-400">{{ t('course.invalid.text') }}</p>
      </div>

      <template v-else>
        <p class="eyebrow">{{ info.label }}</p>
        <h1 class="mt-3 text-3xl sm:text-4xl font-bold">{{ t('course.title') }}</h1>

        <ol class="mt-8 space-y-4">
          <!-- 1 · La app y la cuenta: se crean en la app, no aquí. -->
          <li class="card p-6">
            <div class="flex items-start gap-4">
              <span class="step-num">1</span>
              <div class="min-w-0">
                <h2 class="font-semibold">{{ t('course.step1.title') }}</h2>
                <p class="mt-1 text-sm leading-relaxed text-slate-400">{{ t('course.step1.text') }}</p>
                <div class="mt-4 flex flex-wrap gap-2">
                  <StoreButtons variant="ghost" size="sm" />
                </div>
              </div>
            </div>
          </li>

          <!-- 2 · Activar el plan con la cuenta de la app. -->
          <li class="card p-6">
            <div class="flex items-start gap-4">
              <span class="step-num" :class="redeemed && 'is-done'">
                <i v-if="redeemed" class="bi bi-check-lg"></i>
                <template v-else>2</template>
              </span>
              <div class="min-w-0 flex-1">
                <h2 class="font-semibold">{{ t('course.step2.title', { days: info.days, plan: planName(info.tier) }) }}</h2>

                <div v-if="redeemed" class="mt-3 rounded-xl border border-volt-400/30 bg-volt-400/[0.07] p-4" role="status">
                  <p class="text-sm font-semibold text-volt-300">{{ t('course.step2.success.title') }}</p>
                  <p class="mt-1 text-sm leading-relaxed text-slate-300">
                    {{ t(redeemed.status === 'already' ? 'course.step2.success.already' : 'course.step2.success.text', {
                      plan: planName(redeemed.tier),
                      date: formatDate(redeemed.expires_at),
                    }) }}
                  </p>
                </div>

                <p v-else-if="info.status !== 'open'" class="mt-2 text-sm leading-relaxed text-slate-400">
                  {{ t(`course.closed.${info.status}`) }}
                </p>

                <template v-else>
                  <p class="mt-1 text-sm leading-relaxed text-slate-400">{{ t('course.step2.text') }}</p>
                  <form class="mt-4 space-y-3" @submit.prevent="activate" novalidate>
                    <div>
                      <label for="course-email" class="sr-only">{{ t('course.step2.email') }}</label>
                      <input
                        id="course-email"
                        v-model.trim="email"
                        type="email"
                        inputmode="email"
                        autocomplete="username"
                        autocapitalize="off"
                        spellcheck="false"
                        required
                        :placeholder="t('course.step2.email')"
                        class="field"
                      />
                    </div>
                    <div class="relative">
                      <label for="course-password" class="sr-only">{{ t('course.step2.password') }}</label>
                      <input
                        id="course-password"
                        v-model="password"
                        :type="showPassword ? 'text' : 'password'"
                        autocomplete="current-password"
                        required
                        :placeholder="t('course.step2.password')"
                        class="field pr-11"
                      />
                      <button
                        type="button"
                        class="pressable absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-white"
                        :aria-label="t(showPassword ? 'course.step2.hidePassword' : 'course.step2.showPassword')"
                        @click="showPassword = !showPassword"
                      >
                        <i :class="['bi', showPassword ? 'bi-eye-slash' : 'bi-eye']"></i>
                      </button>
                    </div>

                    <p v-if="formError" class="text-sm text-red-400" role="alert">{{ formError }}</p>
                    <p v-else-if="resetSentTo" class="text-sm text-slate-300" role="status">
                      {{ t('course.step2.forgotSent', { email: resetSentTo }) }}
                    </p>

                    <button
                      type="submit"
                      class="btn-primary w-full text-base disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                      :disabled="busy || !email || !password"
                    >
                      {{ t(busy ? 'course.step2.submitting' : 'course.step2.submit') }}
                    </button>
                    <button
                      type="button"
                      class="block mx-auto text-xs text-slate-500 hover:text-slate-300 transition"
                      :disabled="busy"
                      @click="forgotPassword"
                    >
                      {{ t('course.step2.forgot') }}
                    </button>
                  </form>
                </template>
              </div>
            </div>
          </li>

          <!-- 3 · El partido del curso. Independiente del paso 2: también
               sirve a quien no ha podido activar el plan. -->
          <li v-if="info.download_url" class="card p-6">
            <div class="flex items-start gap-4">
              <span class="step-num">3</span>
              <div class="min-w-0">
                <h2 class="font-semibold">{{ t('course.step3.title') }}</h2>
                <p class="mt-1 text-sm leading-relaxed text-slate-400">{{ t('course.step3.text') }}</p>
                <a :href="info.download_url" download class="btn-ghost mt-4 text-sm">
                  <i class="bi bi-download"></i>
                  {{ t('course.step3.button') }}
                </a>
              </div>
            </div>
          </li>
        </ol>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  inMemoryPersistence,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from "firebase/auth";
import StoreButtons from "../components/StoreButtons.vue";
import { fetchPromoInfo, redeemPromo, type PromoInfo, type PromoTier } from "../utils/promo";

// Instancia propia de Firebase, como AuthAction.vue: esta página no toca
// Firestore, así que no importa ../firebase.ts (que arranca la caché de
// Firestore al importarse). Sesión SOLO en memoria: en la formación se usan
// tablets prestadas y móviles de otros, y la web no tiene nada más que hacer
// con la cuenta una vez canjeado el código.
const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID,
};
const COURSE_APP_NAME = "course";

function courseAuth(): Auth {
  const existing = getApps().find((app) => app.name === COURSE_APP_NAME);
  // initializeAuth lanza si se llama dos veces sobre la misma app (volver a
  // esta página en la misma sesión): la segunda vez basta con recuperarla.
  if (existing) return getAuth(existing);
  return initializeAuth(initializeApp(FIREBASE_CONFIG, COURSE_APP_NAME), { persistence: inMemoryPersistence });
}

const route = useRoute();
const { t, locale } = useI18n();

const code = String(route.params.code ?? "").trim().toLowerCase();

type State = "loading" | "network" | "invalid" | "ready";
const state = ref<State>("loading");
const info = ref<Exclude<PromoInfo, { status: "not_found" }> | null>(null);

const email = ref("");
const password = ref("");
const showPassword = ref(false);
const busy = ref(false);
const formError = ref("");
const resetSentTo = ref("");
const redeemed = ref<{ status: "ok" | "already"; tier: PromoTier; expires_at: string } | null>(null);

function planName(tier: PromoTier): string {
  return t(`course.plans.${tier}`);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(locale.value, { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

async function loadInfo() {
  state.value = "loading";
  try {
    const res = await fetchPromoInfo(code);
    if (res.status === "not_found") {
      state.value = "invalid";
      return;
    }
    info.value = res;
    state.value = "ready";
  } catch {
    state.value = "network";
  }
}

function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-email"].includes(code)) {
    return t("course.step2.errors.credentials");
  }
  if (code === "auth/too-many-requests") return t("course.step2.errors.tooMany");
  if (code === "auth/network-request-failed") return t("course.step2.errors.network");
  return t("course.step2.errors.generic");
}

async function activate() {
  if (busy.value || !info.value) return;
  busy.value = true;
  formError.value = "";
  resetSentTo.value = "";
  const auth = courseAuth();
  try {
    let idToken: string;
    try {
      const cred = await signInWithEmailAndPassword(auth, email.value, password.value);
      idToken = await cred.user.getIdToken();
    } catch (err) {
      formError.value = authErrorMessage(err);
      return;
    }

    try {
      const res = await redeemPromo(code, idToken);
      if (res.status === "ok" || res.status === "already") {
        redeemed.value = res;
        password.value = "";
      } else if (res.status === "not_found") {
        state.value = "invalid";
      } else {
        // Se cerró (plazo o plazas) entre que se abrió la página y el envío.
        info.value = { ...info.value, status: res.status };
      }
    } catch {
      formError.value = t("course.step2.errors.network");
    }
  } finally {
    await signOut(auth).catch(() => {});
    busy.value = false;
  }
}

async function forgotPassword() {
  formError.value = "";
  resetSentTo.value = "";
  if (!email.value) {
    formError.value = t("course.step2.forgotNeedEmail");
    return;
  }
  try {
    await sendPasswordResetEmail(courseAuth(), email.value);
  } catch (err) {
    // Un email que no existe no se distingue de uno que sí: es lo que hace
    // Firebase con la protección de enumeración activada, y aquí igual.
    const c = (err as { code?: string })?.code ?? "";
    if (c !== "auth/user-not-found") {
      formError.value = c === "auth/invalid-email" ? t("course.step2.errors.credentials") : authErrorMessage(err);
      return;
    }
  }
  resetSentTo.value = email.value;
}

onMounted(loadInfo);
</script>

<style scoped>
.step-num {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.6rem;
  background: rgb(61 107 255 / 0.15);
  color: #9cb8ff;
  font-size: 0.85rem;
  font-weight: 700;
}
.step-num.is-done {
  background: rgb(203 251 69 / 0.15);
  color: #cbfb45;
}
.field {
  width: 100%;
  border-radius: 0.75rem;
  background: rgb(255 255 255 / 0.04);
  border: 1px solid rgb(255 255 255 / 0.1);
  padding: 0.75rem 1rem;
  color: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.field::placeholder {
  color: rgb(100 116 139);
}
.field:focus {
  outline: none;
  border-color: #6e93ff;
  box-shadow: 0 0 0 3px rgb(61 107 255 / 0.3);
}
</style>
