
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
        betId = (parts && parts) ? parts.substring(0, 6) : null;
    } else if (rawUrl.includes("ID=")) {
        const parts = rawUrl.split("ID=");
        betId = (parts && parts) ? parts.substring(0, 6) : null;
    }
}

const screenLoading = document.getElementById('screen-loading');
const screenLogin = document.getElementById('screen-login');
const screenPlayRoom = document.getElementById('screen-play-room');
const storicoWrapper = document.getElementById('storico-wrapper');

let localUsername = localStorage.getItem('identita_utente_global') || "";
// ========================================================
// JAVASCRIPT - PARTE 2 di 5: CONFIGURAZIONE SCHERMATE E FILTRI
// ========================================================
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

    // Imposta il nome della persona loggata in alto a destra
    const elTopUserName = document.getElementById('top-user-name');
    if (elTopUserName) elTopUserName.innerText = `👤 ${localUsername.toUpperCase()}`;

    if (storicoWrapper) storicoWrapper.classList.remove('hidden');
    
    // Configura il menu a tendina per i filtri web
    const selectFiltro = document.getElementById('select-filtro-web');
    if (selectFiltro) {
        selectFiltro.onchange = () => {
            mostraStoricoSchermata(selectFiltro.value);
        };
    }

    await mostraStoricoSchermata("TUTTE");
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
// JAVASCRIPT - PARTE 3 di 5: GESTIONE STANZA E TIMEOUT
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
                generaBottoniVotoStanza(data.opzioni_disponibili || ["si", "no"]);
            }
        }
    } catch (e) { console.error("Errore eseguiStanzaGioco:", e); }
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
// JAVASCRIPT - PARTE 4 di 5: LOGICA VOTO E MOTORE STELLE RATINGS
// ========================================================
function generaBottoniVotoStanza(opzioni) {
    const container = document.getElementById('options-container');
    if (!container) return;
    container.innerHTML = "";
    
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

        if (giaVotato) { alert("⚠️ Hai già espresso un voto per questa sfida!"); return; }

        const identificatoreVotoEsterno = usernameNormalizzato + "_" + betId.substring(0, 3);
        await setDoc(doc(db, "scommesse", betId, "voti", identificatoreVotoEsterno), {
            utente: localUsername, 
            scelta: opzioneScelta.toLowerCase().trim(),
            timestamp: new Date().toISOString()
        });
        
        localStorage.setItem(`ha_votato_${betId}`, opzioneScelta.toLowerCase().trim());
        window.location.reload();
    } catch (e) { console.error(e); }
}

function inizializzaValutazioneStelle() {
    const wrapperStelle = document.getElementById('wrapper-valutazione-stelle');
    if (!wrapperStelle) return;

    if (localStorage.getItem(`recensito_stelle_${betId}`)) {
        wrapperStelle.classList.add('hidden');
        return;
    }

    wrapperStelle.classList.remove('hidden');
    const stelleElements = document.querySelectorAll('.star-clickable');

    stelleElements.forEach(stella => {
        stella.onclick = async () => {
            const valoreStelle = parseInt(stella.getAttribute('data-value')) || 5;

            stelleElements.forEach(s => {
                const sVal = parseInt(s.getAttribute('data-value')) || 0;
                if (sVal <= valoreStelle) s.classList.add('active'); else s.classList.remove('active');
            });

            try {
                const userIdNormalizzato = localUsername.toUpperCase().trim();
                const ratingDocRef = doc(db, "scommesse", betId, "valutazioni", userIdNormalizzato);
                
                await setDoc(ratingDocRef, {
                    votante: localUsername,
                    stelle: valoreStelle,
                    timestamp: new Date().toISOString()
                });

                localStorage.setItem(`recensito_stelle_${betId}`, "true");
                document.getElementById('text-conferma-stella').classList.remove('hidden');
                
                setTimeout(() => { wrapperStelle.classList.add('hidden'); }, 1500);
            } catch (err) { console.error("Errore invio stelle:", err); }
        };
    });
}
// ========================================================
// JAVASCRIPT - PARTE 5 di 5: VERDETTI E STORICO ORDINATO ATTIVE
// ========================================================
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
            if (!dataSfida.annullata) inizializzaValutazioneStelle();
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

async function mostraStoricoSchermata(filtroSelezionato = "TUTTE") {
    const container = document.getElementById('storico-container');
    if (!container) return;
    container.innerHTML = "<p style='text-align:center;color:#94A3B8;font-size:12px;'>Aggiornamento storico... ⏳</p>";
    
    try {
        const snap = await getDocs(collection(db, "scommesse"));
        container.innerHTML = "";
        
        const sfideAttive = [];
        const sfideConcluse = [];
        const oraCorrente = new Date().getTime();
        const usernameNormalizzato = localUsername.toUpperCase().trim();

        const promesseDiFiltro = [];

        snap.forEach(mDoc => {
            const m = mDoc.data();
            const isFinita = (oraCorrente >= m.timestamp_scadenza) || (m.risposta_corretta && m.risposta_corretta !== "");
            
            const p = getDocs(collection(db, "scommesse", mDoc.id, "voti")).then(votiSnap => {
                let haVotatoQuestaPersona = false;
                votiSnap.forEach(vDoc => {
                    if (vDoc.data().utente.toUpperCase().trim() === usernameNormalizzato) haVotatoQuestaPersona = true;
                });

                if (haVotatoQuestaPersona || m.creatore_nome === localUsername) {
                    const datiSfida = { id: mDoc.id, domanda: m.domanda, isFinita: isFinita, haVotato: haVotatoQuestaPersona };

                    if (filtroSelezionato === "ATTIVE" && isFinita) return;
                    if (filtroSelezionato === "RISOLTE" && !isFinita) return;

                    if (isFinita) sfideConcluse.push(datiSfida); else sfideAttive.push(datiSfida);
                }
            });
            promesseDiFiltro.push(p);
        });

        await Promise.all(promesseDiFiltro);
        const listaOrdinataSito = [...sfideAttive, ...sfideConcluse];
        
        if (listaOrdinataSito.length === 0) { 
            container.innerHTML = "<p style='font-size:12px;color:#888;text-align:center;'>Nessun match registrato per il tuo profilo.</p>"; 
            return;
        }
        
        let html = '<ul style="list-style:none; padding:0; margin:0;">';
        listaOrdinataSito.forEach(m => {
            const badgeLabel = m.isFinita ? 
                `<span style="background:#E2E8F0;font-size:10px;padding:2px 6px;border-radius:4px;color:#475569;font-weight:bold;">Conclusa</span>` : 
                `<span style="background:#E0F2FE;font-size:10px;padding:2px 6px;border-radius:4px;color:#0369A1;font-weight:bold;">Attiva</span>`;
            
            const spuntaVoto = m.haVotato ? `<span class="voted-badge">✓ Votata</span>` : "";

            html += `<li class="historico-list-item"><span>📌 ${spuntaVoto}<a href="?id=${m.id}">${m.domanda}</a></span> ${badgeLabel}</li>`;
        });
        
        container.innerHTML = html + "</ul>";
    } catch (e) { console.error(e); }
}
