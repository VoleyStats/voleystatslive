<template>
  <section class="relative min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden px-5 py-16">
    <div class="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,#000_50%,transparent_100%)]"></div>
    <div class="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-brand-500/20 blur-[120px]"></div>

    <div class="card relative w-full max-w-md p-8 sm:p-10">
      <div class="flex justify-center mb-6">
        <span
          class="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br"
          :class="status === 'error' ? 'from-red-500/20 to-red-500/5' : 'from-brand-500/20 to-volt-500/10'"
        >
          <i
            :class="['bi', headerIcon, 'text-2xl', status === 'error' ? 'text-red-400' : 'text-volt-400', status === 'loading' && 'animate-pulse']"
          ></i>
        </span>
      </div>

      <!-- Comprobando el oobCode contra Firebase. -->
      <template v-if="status === 'loading'">
        <p class="text-center text-sm text-slate-400">{{ t('authAction.loading') }}</p>
        <div class="mt-6 space-y-3 animate-pulse">
          <div class="h-3 rounded-full bg-white/10 w-3/4 mx-auto"></div>
          <div class="h-3 rounded-full bg-white/10 w-1/2 mx-auto"></div>
        </div>
      </template>

      <!-- Enlace inválido/caducado/ya usado, o cualquier fallo al aplicar la acción. -->
      <template v-else-if="status === 'error'">
        <h1 class="text-xl font-bold text-center">{{ t('authAction.errorTitle') }}</h1>
        <p class="mt-3 text-sm text-slate-400 text-center leading-relaxed">{{ errorMessage }}</p>
      </template>

      <!-- resetPassword: formulario de nueva contraseña, solo tras verificar el oobCode. -->
      <template v-else-if="status === 'ready'">
        <h1 class="text-xl font-bold text-center">{{ t('authAction.modes.resetPassword.title') }}</h1>
        <p class="mt-2 text-sm text-slate-400 text-center">
          {{ t('authAction.modes.resetPassword.subtitle', { email: accountEmail }) }}
        </p>

        <form class="mt-6 space-y-4" @submit.prevent="submitNewPassword" novalidate>
          <div>
            <label for="new-password" class="block text-sm font-medium text-slate-300 mb-2">
              {{ t('authAction.modes.resetPassword.newPassword') }}
            </label>
            <div class="relative">
              <input
                id="new-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                minlength="6"
                required
                class="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 pr-11 text-white placeholder-slate-500 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30 transition"
              />
              <button
                type="button"
                class="pressable absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-white"
                :aria-label="showPassword ? t('authAction.modes.resetPassword.hidePassword') : t('authAction.modes.resetPassword.showPassword')"
                @click="showPassword = !showPassword"
              >
                <i :class="['bi', showPassword ? 'bi-eye-slash' : 'bi-eye']"></i>
              </button>
            </div>
          </div>

          <div>
            <label for="confirm-password" class="block text-sm font-medium text-slate-300 mb-2">
              {{ t('authAction.modes.resetPassword.confirmPassword') }}
            </label>
            <div class="relative">
              <input
                id="confirm-password"
                v-model="password2"
                :type="showPassword2 ? 'text' : 'password'"
                autocomplete="new-password"
                minlength="6"
                required
                class="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 pr-11 text-white placeholder-slate-500 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30 transition"
              />
              <button
                type="button"
                class="pressable absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-white"
                :aria-label="showPassword2 ? t('authAction.modes.resetPassword.hidePassword') : t('authAction.modes.resetPassword.showPassword')"
                @click="showPassword2 = !showPassword2"
              >
                <i :class="['bi', showPassword2 ? 'bi-eye-slash' : 'bi-eye']"></i>
              </button>
            </div>
          </div>

          <p v-if="formError" class="text-sm text-red-400">{{ formError }}</p>

          <button
            type="submit"
            class="btn-primary w-full text-base disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            :disabled="submitting"
          >
            {{ submitting ? t('authAction.modes.resetPassword.submitting') : t('authAction.modes.resetPassword.submit') }}
          </button>
        </form>
      </template>

      <!-- Éxito: resetPassword (tras enviar), verifyEmail o recoverEmail (tras applyActionCode). -->
      <template v-else-if="status === 'success'">
        <h1 class="text-xl font-bold text-center">{{ successTitle }}</h1>
        <p class="mt-3 text-sm text-slate-400 text-center leading-relaxed">{{ successMessage }}</p>
      </template>

      <RouterLink
        :to="localeTo('/')"
        class="mt-8 flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition"
      >
        <i class="bi bi-arrow-left"></i>
        {{ t('authAction.backToSite') }}
      </RouterLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode,
  checkActionCode,
} from "firebase/auth";
import { setLocale, type AppLocale } from "../i18n";
import { useLocalePath } from "../composables/useLocalePath";

// Esta página nunca toca Firestore, así que NO reutiliza `../firebase.ts`
// (que inicializa la caché persistente de Firestore de forma eager en cuanto
// se importa el módulo): tiene su propia instancia de Firebase App, con
// nombre propio para no chocar si en la misma sesión ya existe la app por
// defecto (p. ej. se abrió este enlace tras visitar una página de stats).
const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID,
};
const AUTH_APP_NAME = "auth-action";
const authApp =
  getApps().find((app) => app.name === AUTH_APP_NAME) ??
  initializeApp(FIREBASE_CONFIG, AUTH_APP_NAME);
const auth = getAuth(authApp);

const route = useRoute();
const { t } = useI18n();
const { localeTo } = useLocalePath();

type Mode = "resetPassword" | "verifyEmail" | "recoverEmail";
const KNOWN_MODES: Mode[] = ["resetPassword", "verifyEmail", "recoverEmail"];

function firstQueryValue(value: unknown): string {
  const v = Array.isArray(value) ? value[0] : value;
  return typeof v === "string" ? v : "";
}

const oobCode = computed(() => firstQueryValue(route.query.oobCode));
const mode = computed<Mode | null>(() => {
  const raw = firstQueryValue(route.query.mode);
  return (KNOWN_MODES as string[]).includes(raw) ? (raw as Mode) : null;
});

type Status = "loading" | "ready" | "success" | "error";
const status = ref<Status>("loading");
const errorMessage = ref("");
const accountEmail = ref("");
const restoredEmail = ref("");

const password = ref("");
const password2 = ref("");
const showPassword = ref(false);
const showPassword2 = ref(false);
const formError = ref("");
const submitting = ref(false);

const headerIcon = computed(() => {
  if (status.value === "error") return "bi-exclamation-triangle-fill";
  if (status.value === "success") return "bi-check-circle-fill";
  if (status.value === "ready") return "bi-shield-lock";
  return "bi-hourglass-split";
});

const successTitle = computed(() => {
  if (mode.value === "resetPassword") return t("authAction.modes.resetPassword.successTitle");
  if (mode.value === "verifyEmail") return t("authAction.modes.verifyEmail.successTitle");
  if (mode.value === "recoverEmail") return t("authAction.modes.recoverEmail.successTitle");
  return "";
});

const successMessage = computed(() => {
  if (mode.value === "resetPassword") return t("authAction.modes.resetPassword.success");
  if (mode.value === "verifyEmail") return t("authAction.modes.verifyEmail.success");
  if (mode.value === "recoverEmail")
    return t("authAction.modes.recoverEmail.success", { email: restoredEmail.value });
  return "";
});

// Códigos de auth traducidos a lenguaje humano (el caso más frecuente, con
// diferencia, es el enlace caducado). Cualquier otro código cae en el
// mensaje genérico: preferible a exponer el código técnico de Firebase.
const KNOWN_ERROR_CODES = [
  "auth/expired-action-code",
  "auth/invalid-action-code",
  "auth/user-disabled",
  "auth/user-not-found",
  "auth/weak-password",
];
function mapAuthError(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err ? String((err as { code?: unknown }).code) : "";
  const key = KNOWN_ERROR_CODES.includes(code) ? code.replace("auth/", "") : "generic";
  return t(`authAction.errors.${key}`);
}

onMounted(async () => {
  // Firebase añade `lang` a la URL de acción según la plantilla/preferencia
  // que disparó el correo. La ruta en sí solo tiene un gemelo `/es`/`/en`
  // fijo (la URL de acción configurada en la consola es única), así que sin
  // esto un enlace en inglés podría abrir la versión castellana de esta
  // página.
  const lang = firstQueryValue(route.query.lang);
  if (lang === "es" || lang === "en") setLocale(lang as AppLocale);

  if (!oobCode.value || !mode.value) {
    status.value = "error";
    errorMessage.value = t("authAction.errors.invalidLink");
    return;
  }

  try {
    if (mode.value === "resetPassword") {
      accountEmail.value = await verifyPasswordResetCode(auth, oobCode.value);
      status.value = "ready";
    } else if (mode.value === "verifyEmail") {
      await applyActionCode(auth, oobCode.value);
      status.value = "success";
    } else if (mode.value === "recoverEmail") {
      const info = await checkActionCode(auth, oobCode.value);
      restoredEmail.value = info.data.email ?? "";
      await applyActionCode(auth, oobCode.value);
      status.value = "success";
    }
  } catch (err) {
    status.value = "error";
    errorMessage.value = mapAuthError(err);
  }
});

async function submitNewPassword() {
  formError.value = "";
  if (password.value.length < 6) {
    formError.value = t("authAction.errors.tooShort");
    return;
  }
  if (password.value !== password2.value) {
    formError.value = t("authAction.errors.mismatch");
    return;
  }

  submitting.value = true;
  try {
    await confirmPasswordReset(auth, oobCode.value, password.value);
    status.value = "success";
  } catch (err) {
    // Un problema con la contraseña se queda DENTRO del formulario: si
    // saltásemos a la pantalla de error, la usuaria perdería lo escrito y se
    // quedaría sin salida, teniendo que pedir otro correo por haber elegido
    // una contraseña floja. Solo un fallo del propio código (caducado, ya
    // usado, cuenta deshabilitada) justifica tumbar la pantalla, porque de
    // ese sí que no se puede seguir.
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: unknown }).code)
        : "";
    if (code === "auth/weak-password" || code.startsWith("auth/password-does-not-meet")) {
      formError.value = mapAuthError(err);
    } else {
      status.value = "error";
      errorMessage.value = mapAuthError(err);
    }
  } finally {
    submitting.value = false;
  }
}
</script>
