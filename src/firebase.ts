import { initializeApp } from "firebase/app";
import {
    getFirestore,
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
} from "firebase/firestore";

// Este módulo solo lo importan las páginas lazy que leen Firestore, de modo
// que Firebase queda fuera del chunk inicial. Los composables de vuefire
// (useDocument, etc.) encuentran la app por defecto vía getApp(), así que no
// hace falta instalar el plugin VueFire en main.ts.
export const firebaseApp = initializeApp({
    apiKey: import.meta.env.VITE_API_KEY,
    authDomain: import.meta.env.VITE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_APP_ID,
    measurementId: import.meta.env.VITE_MEASUREMENT_ID
})

// Caché local persistente (IndexedDB) con soporte multi-pestaña: toda lectura
// (getDoc/getDocs/onSnapshot, incluida la página de partido en directo) sirve
// primero desde disco y solo sincroniza los deltas contra Firestore, así que
// una recarga -incluso de una temporada entera- es casi instantánea y el
// realtime de los partidos en directo no se ve afectado (Firestore sigue
// escuchando el backend, solo cambia de dónde lee al arrancar). Si el
// navegador no soporta IndexedDB (Safari privado, cuota agotada, contexto sin
// almacenamiento...) `initializeFirestore` lanza síncronamente -aquí se
// captura y se cae a `getFirestore` (caché en memoria, comportamiento previo)
// en vez de romper el arranque de la app.
function initDb() {
    try {
        return initializeFirestore(firebaseApp, {
            localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
        });
    } catch {
        return getFirestore(firebaseApp);
    }
}

export const db = initDb()
