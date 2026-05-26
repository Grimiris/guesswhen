import { initializeApp } from "https://gstatic.com";
import { getFirestore, doc, setDoc } from "https://gstatic.com";

const firebaseConfig = {
    apiKey: "AIzaSyB1Ccv6r5Br2A03iclkRnxGjXQhGEhrzUQ",
    authDomain: "://firebaseapp.com",
    projectId: "guesswhen",
    storageBucket: "guesswhen.firebasestorage.app",
    messagingSenderId: "748176999936",
    appId: "1:748176999936:android:494227a1dffa7c3c4efae5"
};

if (!localStorage.getItem('id_dispositivo_global')) {
    const idCasuale = 'user_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    localStorage.setItem('id_dispositivo_global', idCasuale);
}
const mioIdDispositivo = localStorage.getItem('id_dispositivo_global');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.getElementById('btn-salva-sfida').onclick = async () => {
    const domanda = document.getElementById('input-domanda').value.trim();
    const premio = document.getElementById('input-premio').value.trim();
    const ore = parseInt(document.getElementById('input-ore').value) || 2;

    if (!domanda || !premio) {
        alert("Compila tutti i campi prima di lanciare la sfida!");
        return;
    }

    const idScommessa = Math.random().toString(36).substring(2, 8);
    const dataScadenza = new Date(new Date().getTime() + ore * 60 * 60 * 1000);

    try {
        await setDoc(doc(db, "scommesse", idScommessa), {
            domanda: domanda,
            premio: premio,
            opzioni_disponibili: ["si", "no"],
            data_scadenza: dataScadenza.toISOString(),
            creatore_id: mioIdDispositivo // 🌟 Questo ti rende Admin automatico di questa sfida
        });

        alert(`Sfida creata!\nID: ${idScommessa}`);
        window.location.href = `index.html?id=${idScommessa}`;
    } catch (e) {
        console.error(e);
        alert("Errore durante la creazione della scommessa.");
    }
};
