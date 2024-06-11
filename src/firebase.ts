import { initializeApp } from "firebase/app";
import { collection, doc, getFirestore } from "firebase/firestore";

import { useCollection, useDocument } from "vuefire";

export const firebaseApp = initializeApp({
    apiKey: import.meta.env.VITE_API_KEY,
    authDomain: import.meta.env.VITE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_APP_ID,
    measurementId: import.meta.env.VITE_MEASUREMENT_ID
})

export const db = getFirestore(firebaseApp)

export const matches = collection(db, "live_matches")

export async function getMatch(id:string) {
    
    return useDocument(doc(db, "live_matches", id))
}

export async function getStats(id:string) {
    // return getDocs(collection(db, "live_matches", id, "stats"))
    return useCollection(collection(db, "live_matches", id, "stats"))
    // return await getDoc(doc(db, "live_matches", id))
}
