// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBLjEvNUC4Rbj_2S9EohlEKzgpxjV25q5I",
  authDomain: "painel-de-saude-imc.firebaseapp.com",
  projectId: "painel-de-saude-imc",
  storageBucket: "painel-de-saude-imc.firebasestorage.app",
  messagingSenderId: "944562211467",
  appId: "1:944562211467:web:a0a025339e8185dfefa28e",
  measurementId: "G-R17WD0Z2XP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// Exporta as referências à coleção
export const imcCollection = collection(db, 'imc_entries');