
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore, doc, getDoc, getDocs, collection, setDoc, increment } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
const firebaseConfig = {
    apiKey: "AIzaSyB1Ccv6r5Br2A03iclkRnxGjXQhGEhrzUQ",
    authDomain: "guesswhen.firebaseapp.com",
    projectId: "guesswhen",
    storageBucket: "guesswhen.firebasestorage.app",
    messagingSenderId: "748176999936",
    appId: "1:748176999936:android:494227a1dffa7c3c4efae5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const urlParams = new URLSearchParams(window.location.search);
let betId = urlParams.get('id') || urlParams.get('ID');

if (!betId) {
    const rawUrl = window.location.href;
    if (rawUrl.includes("id=")) {
        const parts = rawUrl.split("id=");
        betId = (parts && parts[1]) ? parts[1].substring(0, 6) : null;
    } else if (rawUrl.includes("ID=")) {
        const parts = rawUrl.split("ID=");
        betId = (parts && parts[1]) ? parts[1].substring(0, 6) : null;
    }
}

const screenLoading = document.getElementById('screen-loading');
const screenLogin = document.getElementById('screen-login');
const screenPlayRoom = document.getElementById('screen-play-room');
const storicoWrapper = document.getElementById('storico-wrapper');

let localUsername = localStorage.getItem('identita_utente_global') || "";

// Gestore navigazione iniziale basato sull'identità dell'utente
async function inizializzaFlussoPiattaforma() {
    if (!localUsername) {
        if (screenLoading) screenLoading.style.display = 'none';
        if (screenLogin) screenLogin.classList.remove('hidden');
        if (storicoWrapper) storicoWrapper.classList.add('hidden');
        if (screenPlayRoom) screenPlayRoom.classList.add('hidden');
        
        document.getElementById('btn-salva-identita').onclick = () => {
            const nome = document.getElementById('input-username').value.trim();
            if (nome.length >= 2) {
                localStorage.setItem('identita_utente_global', nome);
                window.location.reload();
            } else { alert("Scegli un Nickname valido di almeno 2 caratteri! 🎮"); }
        };
        return;
    }

    if (storicoWrapper) storicoWrapper.classList.remove('hidden');
    mostraStoricoSchermata();
    await aggiornaTokenGrafica();

    if (!betId) {
        if (screenLoading) {
            screenLoading.innerHTML = `
                <div style='text-align:center;padding:10px;'>
                    <h3 style='color:#1E293B;margin-bottom:5px;'>🔮 Benvenuto su GuessWhen!</h3>
                    <p style='color:#64748B;font-size:13px;margin:0;'>Apri un link sfida ricevuto su WhatsApp per poter votare e scalare la classifica del gruppo! 🤝</p>
                </div>
            `;
        }
    } else {
        if (screenLoading) screenLoading.style.display = 'none';
        if (screenPlayRoom) screenPlayRoom.classList.remove('hidden');
        eseguiStanzaGioco();
    }
}

inizializzaFlussoPiattaforma();
// ========================================================
// JAVASCRIPT - PARTE 2 di 3: FLUSSO STANZA DI GIOCO E TIMER
// ========================================================
async function eseguiStanzaGioco() {
    try {
        const docSnap = await getDoc(doc(db, "scommesse", betId));
        if (!docSnap.exists()) {
            document.getElementById('room-question').innerText = "Sfida non trovata nel database server.";
            return;
        }

        const data = docSnap.data();
        document.getElementById('room-id-tag').innerText = `#${betId}`;
        document.getElementById('room-question').innerText = data.domanda;
        document.getElementById('room-reward').innerText = `🎁 Premio in palio: ${data.premio}`;

        const badgeStato = document.getElementById('room-status-badge');
        if (data.annullata) {
            badgeStato.className = "status-dot dot-annullata"; badgeStato.innerText = "• ANNULLATA";
        } else if (data.risposta_corretta) {
            badgeStato.className = "status-dot dot-chiusa"; badgeStato.innerText = "• CHIUSA";
        } else {
            badgeStato.className = "status-dot dot-attiva"; badgeStato.innerText = "• ATTIVA";
        }

        const oraCorrente = new Date().getTime();
        const isScaduta = oraCorrente >= data.timestamp_scadenza;
        const haEsito = data.risposta_corretta !== "";

        if (isScaduta || haEsito || data.annullata) {
            document.getElementById('timer-container').innerHTML = "🔒 Votazioni Concluse";
            document.getElementById('room-vote-actions').classList.add('hidden');
            document.getElementById('room-results-panel').classList.remove('hidden');
            document.getElementById('room-participants-card').classList.remove('hidden');
            mostraRisultatiStanza(data);
        } else {
            avviaTimerStanza(data.timestamp_scadenza);
            if (localStorage.getItem(`ha_votato_${betId}`)) {
                document.getElementById('room-vote-actions').classList.add('hidden');
                document.getElementById('room-results-panel').classList.remove('hidden');
                mostraRisultatiStanza(data);
            } else {
                document.getElementById('room-vote-actions').classList.remove('hidden');
                // ✅ SBLOCCATO: Carica le opzioni personalizzate create dal Master nell'App
                generaBottoniVotoStanza(data.opzioni_disponibili || ["si", "no"]);
            }
        }

        // Pannello Admin visibile solo al creatore della sfida
        if (data.creatore_nome === localUsername && !haEsito && !data.annullata) {
            const adminPanel = document.getElementById('room-admin-panel');
            if (adminPanel) {
                adminPanel.classList.remove('hidden');
                generaControlliAdmin(data);
            }
        }
    } catch (e) { console.error(e); }
}

function avviaTimerStanza(timestampScadenza) {
    const container = document.getElementById('timer-container');
    if (!container) return;
    function aggiorna() {
        const ora = new Date().getTime();
        const diff = timestampScadenza - ora;
        if (diff <= 0) { window.location.reload(); return; }
        const ore = Math.floor(diff / (1000 * 60 * 60));
        const minuti = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secondi = Math.floor((diff % (1000 * 60)) / 1000);
        container.innerHTML = `⏳ Scade tra: ${ore}h ${minuti}m ${secondi}s`;
    }
    aggiorna();
    setInterval(aggiorna, 1000);
}
// ========================================================
// JAVASCRIPT - PARTE 3 di 3: OPERAZIONI VOTO E ADMIN ENGINE
// ========================================================
function generaBottoniVotoStanza(opzioni) {
    const container = document.getElementById('options-container');
    if (!container) return;
    container.innerHTML = "";
    
    // Genera i pulsanti dinamici basati sulle opzioni scelte dal Master
    opzioni.forEach(opzione => {
        const btn = document.createElement('button');
        btn.className = "btn-main";
        btn.style.marginBottom = "10px";
        btn.innerText = opzione.toUpperCase(); 
        btn.onclick = () => inviaVotoStanza(opzione);
        container.appendChild(btn);
    });
}

async function inviaVotoStanza(opzioneScelta) {
    try {
        const usernameNormalizzato = localUsername.toUpperCase().trim();
        const votiRef = collection(db, "scommesse", betId, "voti");
        const snapshotVoti = await getDocs(votiRef);
        
        let giaVotato = false;
        snapshotVoti.forEach(docVoto => {
            if (docVoto.data().utente.toUpperCase().trim() === usernameNormalizzato) giaVotato = true;
        });

        if (giaVotato) { 
            alert("⚠️ Hai già espresso un voto per questa sfida!"); 
            return; 
        }

        const identificatoreVotoEsterno = usernameNormalizzato + "_" + betId.substring(0, 3);
        await setDoc(doc(db, "scommesse", betId, "voti", identificatoreVotoEsterno), {
            utente: localUsername, 
            scelta: opzioneScelta.toLowerCase().trim(),
            timestamp: new Date().toISOString()
        });
        
        localStorage.setItem(`ha_votato_${betId}`, opzioneScelta.toLowerCase().trim());
        window.location.reload();
    } catch (e) { console.error("Errore salvataggio voto:", e); }
}

function generaControlliAdmin(dataScommessa) {
    const layoutChoices = document.getElementById('admin-choices-layout');
    if (!layoutChoices) return;
    layoutChoices.innerHTML = "";

    getDocs(collection(db, "scommesse", betId, "voti")).then(snap => {
        const txtVoti = document.getElementById('admin-vote-count-text');
        if (txtVoti) txtVoti.innerText = `${snap.size} voti`;
    });

    dataScommessa.opzioni_disponibili.forEach(opzione => {
        const btnAdmin = document.createElement('button');
        btnAdmin.className = "btn-admin-choice";
        btnAdmin.innerText = opzione.toUpperCase();
        btnAdmin.onclick = () => decretaRisultatoUfficialeCloud(opzione, dataScommessa.opzioni_disponibili);
        layoutChoices.appendChild(btnAdmin);
    });
}

// ========================================================
// JAVASCRIPT - PARTE 5 di 5: ALGORITMO PONDERATO E STORICO
// ========================================================
async function decretaRisultatoUfficialeCloud(opzioneVincente, tutteLeOpzioni) {
    const rispCorrettaNorm = opzioneVincente.toLowerCase().trim().replace("ì", "i");
    if (!confirm(`Vuoi impostare "${opzioneVincente.toUpperCase()}" come risultato definitivo?`)) return;

    try {
        const votiSnap = await getDocs(collection(db, "scommesse", betId, "voti"));
        if (votiSnap.size <= 1) {
            await setDoc(doc(db, "scommesse", betId), { annullata: true, chiusa_anticipo: true }, { merge: true });
            alert("Sfida annullata: minimo 2 partecipanti richiesti.");
            window.location.reload(); return;
        }

        const utentiSnap = await getDocs(collection(db, "utenti_globali"));
        const mappaGettoniCloud = {};
        utentiSnap.forEach(uDoc => { mappaGettoniCloud[uDoc.id.toUpperCase().trim()] = uDoc.data().token_totali || 0; });

        const vincitoriPossibili = [];
        const perdentiPossibili = [];

        votiSnap.forEach(vDoc => {
            const v = vDoc.data();
            const sceltaUtenteNorm = v.scelta.toLowerCase().trim().replace("ì", "i");
            if (sceltaUtenteNorm === rispCorrettaNorm) vincitoriPossibili.push(v.utente); else perdentiPossibili.push(v.utente);
        });

        let vincitoreAssoluto = "Nessuno";
        if (vincitoriPossibili.length > 0) {
            const urnaVincitori = [];
            vincitoriPossibili.forEach(v => {
                const gettoni = mappaGettoniCloud[v.toUpperCase().trim()] || 0;
                const biglietti = gettoni > 0 ? (1 + gettoni) : 1;
                for (let i = 0; i < biglietti; i++) urnaVincitori.push(v);
            });
            vincitoreAssoluto = urnaVincitori[Math.floor(Math.random() * urnaVincitori.length)];
        }

        let perdenteAssoluto = "Nessuno";
        if (perdentiPossibili.length > 0) {
            const urnaPerdenti = [];
            perdentiPossibili.forEach(p => {
                const gettoni = mappaGettoniCloud[p.toUpperCase().trim()] || 0;
                const biglietti = gettoni < 0 ? (1 + Math.abs(gettoni)) : 1;
                for (let i = 0; i < biglietti; i++) urnaPerdenti.push(p);
            });
            perdenteAssoluto = urnaPerdenti[Math.floor(Math.random() * urnaPerdenti.length)];
        }

        await setDoc(doc(db, "scommesse", betId), {
            risposta_corretta: rispCorrettaNorm, vincitore_estratto: vincitoreAssoluto, perdente_estratto: perdenteAssoluto, chiusa_anticipo: true
        }, { merge: true });

        alert(`🏆 Verdetto registrato!\n👑 Vincitore: ${vincitoreAssoluto}\n☠️ Perdente: ${perdenteAssoluto}`);
        window.location.reload();
    } catch (e) { console.error(e); }
}

async function mostraRisultatiStanza(dataSfida) {
    try {
        const votiSnap = await getDocs(collection(db, "scommesse", betId, "voti"));
        const chartsWrapper = document.getElementById('charts-wrapper');
        const listContainer = document.getElementById('consolation-list');

        if (chartsWrapper) chartsWrapper.innerHTML = "";
        if (listContainer) listContainer.innerHTML = "";

        const conteggi = {};
        dataSfida.opzioni_disponibili.forEach(opz => conteggi[opz.toLowerCase().trim()] = 0);
        let totaleVoti = 0;

        votiSnap.forEach(vDoc => {
            const v = vDoc.data();
            const scelta = v.scelta.toLowerCase().trim();
            if (conteggi[scelta] !== undefined) { conteggi[scelta]++; totaleVoti++; } else { conteggi[scelta] = 1; totaleVoti++; }
            
            if (dataSfida.risposta_corretta && !dataSfida.annullata) {
                const rispCorrettaNorm = dataSfida.risposta_corretta.toLowerCase().trim().replace("ì", "i");
                if (scelta.replace("ì", "i") === rispCorrettaNorm && v.utente === localUsername) modificaBilancioCloudClassifica(1);
                else if (scelta.replace("ì", "i") !== rispCorrettaNorm && v.utente === localUsername) modificaBilancioCloudClassifica(-1);
            }

            const li = document.createElement('li');
            li.style = "padding:10px 0; border-bottom:1px solid #F1F5F9; font-size:14px; font-weight:500;";
            li.innerHTML = `👤 <b>${v.utente}</b> ha votato <span style="text-transform:uppercase;color:#2563EB;">${scelta}</span>`;
            if (listContainer) listContainer.appendChild(li);
        });

        const pStatus = document.getElementById('room-percent-status');
        if (dataSfida.risposta_corretta) {
            pStatus.innerHTML = `👑 VINCITORE: <span style="color:#D97706;">${dataSfida.vincitore_estratto}</span> | ☠️ ESTRATTO: <span style="color:#DC2626;">${dataSfida.perdente_estratto}</span>`;
        } else { pStatus.innerText = `• RISULTATI FINALI (${totaleVoti} VOTI)`; }

        dataSfida.opzioni_disponibili.forEach(opz => {
            const count = conteggi[opz.toLowerCase().trim()] || 0;
            const pct = totaleVoti > 0 ? Math.round((count / totaleVoti) * 100) : 0;
            const resultField = document.createElement('div');
            resultField.className = "bar-result-field";
            resultField.innerHTML = `
                <div style="text-transform:uppercase;">${opz}</div>
                <div style="color:#64748B;">${pct}% (${count})</div>
            `;
            if (chartsWrapper) chartsWrapper.appendChild(resultField);
        });
    } catch (e) { console.error(e); }
}

async function modificaBilancioCloudClassifica(valore) {
    if (!localStorage.getItem(`token_elaborato_${betId}`)) {
        localStorage.setItem(`token_elaborato_${betId}`, "true");
        const userIdNormalizzato = localUsername.toUpperCase().trim();
        try {
            await setDoc(doc(db, "utenti_globali", userIdNormalizzato), {
                username: userIdNormalizzato, token_totali: increment(valore), ultimo_aggiornamento: new Date().toISOString()
            }, { merge: true });
            await aggiornaTokenGrafica();
        } catch (e) { console.error(e); }
    }
}

async function aggiornaTokenGrafica() {
    const badge = document.getElementById('top-token-counter');
    if (!badge || !localUsername) return;
    try {
        const userIdNormalizzato = localUsername.toUpperCase().trim();
        const docSnap = await getDoc(doc(db, "utenti_globali", userIdNormalizzato));
        let saldo = 0;
        if (docSnap.exists()) { saldo = docSnap.data().token_totali || 0; }
        badge.innerText = `TOKENS x${saldo}`;
    } catch (e) { console.error(e); }
}

async function mostraStoricoSchermata() {
    const container = document.getElementById('storico-container');
    if (!container) return;
    container.innerHTML = "<p style='text-align:center;color:#94A3B8;font-size:12px;'>Caricamento storico... ⏳</p>";
    
    try {
        const snap = await getDocs(collection(db, "scommesse"));
        container.innerHTML = "";
        let count = 0;
        let html = '<ul style="list-style:none; padding:0; margin:0;">';
        
        snap.forEach(mDoc => {
            const m = mDoc.data();
            count++;
            const ora = new Date().getTime();
            const isFinita = (ora >= m.timestamp_scadenza) || m.risposta_corretta !== "";
            const b = isFinita ? `<span style="background:#E2E8F0;font-size:10px;padding:2px 6px;border-radius:4px;color:#475569;font-weight:bold;">Conclusa</span>` : `<span style="background:#E0F2FE;font-size:10px;padding:2px 6px;border-radius:4px;color:#0369A1;font-weight:bold;">Attiva</span>`;
            html += `<li class="historico-list-item"><span>📌 <a href="?id=${mDoc.id}">${m.domanda}</a></span> ${b}</li>`;
        });
        
        if (count === 0) { container.innerHTML = "<p style='font-size:12px;color:#888;text-align:center;'>Nessun match registrato nel server.</p>"; }
        else { container.innerHTML = html + "</ul>"; }
    } catch (e) { console.error(e); }
}

