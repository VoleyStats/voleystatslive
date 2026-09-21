import { computed } from "vue";
import { useRoute } from "vue-router";

/**
 * Enlaces internos que se quedan en el idioma del visitante.
 *
 * Los gemelos ingleses viven bajo `/en` y declaran su propio canonical, asi que
 * un `to="/team-code"` a pelo saca al lector de `/en` de su version del sitio
 * (y lo manda a una URL que le dice a Google que es otra pagina). `Layout` ya
 * resolvia esto para su chrome; esto lo saca de ahi para que las paginas de
 * contenido usen exactamente la misma regla.
 */
export function useLocalePath() {
  const route = useRoute();

  const isEn = computed(() => route.meta?.locale === "en");

  // El sufijo `-en` lo pone `router.ts` a los gemelos; comparar `route.name`
  // a pelo da falso en TODA la version inglesa.
  const baseName = computed(() => ((route.name as string) ?? "").replace(/-en$/, ""));

  const localeTo = (path: string) =>
    isEn.value ? (path === "/" ? "/en" : `/en${path}`) : path;

  // En la portada el ancla se queda relativa (`#faq`), que es un salto nativo
  // sin recargar; desde cualquier otra pagina hace falta la ruta completa.
  const homeAnchor = (hash: string) =>
    baseName.value === "home" ? `#${hash}` : `${isEn.value ? "/en" : "/"}#${hash}`;

  return { isEn, baseName, localeTo, homeAnchor };
}
