import { initializeApp } from "firebase/app";
import { collection, doc, getFirestore } from "firebase/firestore";
import { useCollection, useDocument } from "vuefire";

export const firebaseApp = initializeApp({
    apiKey: "AIzaSyCvBYvxZiOLGFp5cIfbZpvLeIM0VWiAV8A",
  authDomain: "voleystats.firebaseapp.com",
  projectId: "voleystats",
  storageBucket: "voleystats.appspot.com",
  messagingSenderId: "734080847541",
  appId: "1:734080847541:web:9201320f5b766a29fd38fc",
  measurementId: "G-DTYF9VQCLE"
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
