/ 1. IMPORT MODULI CORRETTI CON WWW (Risolto errore CORS di gstatic)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore, doc, getDoc, collection, addDoc, getDocs, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
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

// ========================================================
// JAVASCRIPT - PARTE 2 di 6: PARSING URL E BOTTONE TOKEN
// ========================================================
const urlParams = new URLSearchParams(window.location.search);
let betId = urlParams.get('id') || urlParams.get('ID');

if (!betId) {
    const rawUrl = window.location.href;
    if (rawUrl.includes("id=")) {
        const parts = rawUrl.split("id=");
        betId = parts && parts[1] ? parts[1].substring(0, 6) : null;
    } else if (rawUrl.includes("ID=")) {
        const parts = rawUrl.split("ID=");
        betId = parts && parts[1] ? parts[1].substring(0, 6) : null;
    }
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const urlParams = new URLSearchParams(window.location.search);
let betId = urlParams.get('id') || urlParams.get('ID');

if (!betId) {
    const rawUrl = window.location.href;
    if (rawUrl.includes("id=")) {
        const parts = rawUrl.split("id=");
        betId = parts && parts[1] ? parts[1].substring(0, 6) : null;
    } else if (rawUrl.includes("ID=")) {
        const parts = rawUrl.split("ID=");
        betId = parts && parts[1] ? parts[1].substring(0, 6) : null;
    }
}

const loadingEl = document.getElementById('loading');
let localUsername = localStorage.getItem('identita_utente_global') || "";

if (typeof mostraStoricoSchermata === "function") mostraStoricoSchermata();
if (typeof aggiornaTokenGrafica === "function") aggiornaTokenGrafica();

const btnUsaToken = document.getElementById('btn-usa-token');
if (btnUsaToken) {
    btnUsaToken.onclick = () => {
        let tokenAttuali = parseInt(localStorage.getItem('saldo_token_global')) || 0;
        if (tokenAttuali <= 0) {
            alert("Non hai abbastanza Token attivi per salvarti! 😭");
            return;
        }
        if (confirm("Vuoi spendere 1 Token Bonus per annullare la penitenza?")) {
            tokenAttuali -= 1;
            localStorage.setItem('saldo_token_global', tokenAttuali);
            if (typeof aggiornaTokenGrafica === "function") aggiornaTokenGrafica();
            alert("🛡️ Token utilizzato! Sei salvo.");
        }
    };
}

if (!betId) {
    if (typeof mostraSchermataInizialeSenzaId === "function") mostraSchermataInizialeSenzaId();
} else {
    betId = betId.trim();
    controllaStato();
}
// ========================================================
// JAVASCRIPT - PARTE 2 di 5: CORE ENGINE DI STATO CLOUD
// ========================================================
async function controllaStato() {
    try {
        console.log("Lettura scommessa cloud ID:", betId);
        const docRef = doc(db, "scommesse", betId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            if (loadingEl) loadingEl.innerText = `Scommessa o Quiz (${betId}) non trovato.`;
            return;
        }

        const data = docSnap.data();
        const opzioniDisponibili = data.opzioni_disponibili || ["si", "no"]; 
        
        const challengeTitleEl = document.getElementById('challenge-title');
        const questionEl = document.getElementById('question');
        const rewardEl = document.getElementById('reward');
        const contentEl = document.getElementById('content');
        const timerContainerEl = document.getElementById('timer-container');
        const voteSectionEl = document.getElementById('vote-section');
        const resultsSectionEl = document.getElementById('results-section');
        const thanksSectionEl = document.getElementById('thanks-section');

        if (challengeTitleEl) challengeTitleEl.innerText = data.is_quiz ? "🧠 QUIZ GLOBALE" : "🔮 SFIDA DI GRUPPO";
        if (questionEl) questionEl.innerText = data.domanda || "Nuova scommessa";
        if (rewardEl) {
            rewardEl.innerText = data.is_quiz ? "🎯 Punti Quiz: " + (data.premio || "0") : "🎁 In palio: " + (data.premio || "Nessun premio");
        }
        
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) contentEl.classList.remove('hidden');

        if (data.annullata === true) {
            if (timerContainerEl) timerContainerEl.innerHTML = `<span class="status-badge" style="background:#FEE2E2; color:#991B1B; border: 1px solid #FCA5A5;">⚠️ SFIDA ANNULLATA ❌</span>`;
            if (voteSectionEl) voteSectionEl.classList.add('hidden');
            if (resultsSectionEl) {
                resultsSectionEl.innerHTML = `<p style="text-align:center; padding:20px; color:#64748B; font-weight:500;">La scommessa è stata annullata. Nessun gettone modificato!</p>`;
                resultsSectionEl.classList.remove('hidden');
            }
            return; 
        }

        let dataScadenza = data.timestamp_scadenza ? new Date(data.timestamp_scadenza) : (data.data_scadenza ? new Date(data.data_scadenza) : new Date());
        const oraCorrente = new Date();
        const isChiusaManualmente = data.chiusa_anticipo === true;
        const haRispostaUfficiale = data.risposta_corretta !== undefined && data.risposta_corretta !== null && data.risposta_corretta !== "";

        if (typeof salvaInStoricoLocale === "function") {
            salvaInStoricoLocale(betId, data.domanda, data.risposta_corretta, data.timestamp_scadenza || data.data_scadenza);
        }

        if (oraCorrente >= dataScadenza || isChiusaManualmente || haRispostaUfficiale) {
            if (timerContainerEl) timerContainerEl.innerHTML = `<span class="status-badge" style="background:#E2E8F0; color:#334155;">Scommessa Chiusa 🔒</span>`;
            if (voteSectionEl) voteSectionEl.classList.add('hidden');
            if (resultsSectionEl) {
                resultsSectionEl.classList.remove('hidden');
            }
            mostraRisultati(opzioniDisponibili, data.risposta_corretta, data.vincitore_estratto, data.perdente_estratto, data.annullata);
        } else {
            avviaTimer(dataScadenza);
            
            const nomeSalvatoPermanente = localStorage.getItem('identita_utente_global');
            const welcomeBox = document.getElementById('welcome-user-box');
            const inputNome = document.getElementById('input-username');
            const identitySectionEl = document.getElementById('identity-section');

            if (nomeSalvatoPermanente) {
                if (inputNome) { inputNome.value = nomeSalvatoPermanente; inputNome.classList.add('hidden'); }
                if (welcomeBox) {
                    welcomeBox.innerHTML = `👋 Bentornato, <span style="text-transform: capitalize;">${nomeSalvatoPermanente.toLowerCase()}</span>!`;
                    welcomeBox.classList.remove('hidden');
                }
            }

            if (localStorage.getItem(`ha_votato_${betId}`)) {
                if (voteSectionEl) voteSectionEl.classList.add('hidden');
                if (thanksSectionEl) thanksSectionEl.classList.remove('hidden');
            } else {
                if (nomeSalvatoPermanente) {
                    if (identitySectionEl) identitySectionEl.classList.add('hidden');
                    if (voteSectionEl) voteSectionEl.classList.remove('hidden');
                    generaBottoniVoto(opzioniDisponibili);
                } else {
                    if (identitySectionEl) identitySectionEl.classList.remove('hidden');
                    if (voteSectionEl) voteSectionEl.classList.add('hidden');
                    
                    document.getElementById('btn-salva-identita').onclick = () => {
                        const inputNomeVal = document.getElementById('input-username').value.trim();
                        if (inputNomeVal.length >= 2) {
                            localStorage.setItem('identita_utente_global', inputNomeVal);
                            setTimeout(() => { location.reload(); }, 100);
                        } else {
                            alert("Scegli un Nickname valido! 🎮");
                        }
                    };
                }
            }
        }
    } catch (errore) { console.error("Errore controllaStato:", errore); }
}
// ========================================================
// JAVASCRIPT - PARTE 3 di 5: FUNZIONI OPERATIVE VOTO
// ========================================================
function avviaTimer(dataScadenza) {
    const container = document.getElementById('timer-container');
    if (!container) return;
    function aggiorna() {
        const ora = new Date();
        const diff = dataScadenza - ora;
        if (diff <= 0) { location.reload(); return; }
        const ore = Math.floor(diff / (1000 * 60 * 60));
        const minuti = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secondi = Math.floor((diff % (1000 * 60)) / 1000);
        container.innerHTML = `<span class="timer-badge">⏳ Scade tra: ${ore}h ${minuti}m ${secondi}s</span>`;
    }
    aggiorna();
    setInterval(aggiorna, 1000);
}

function generaBottoniVoto(opzioni) {
    const container = document.getElementById('options-container');
    if (!container) return;
    container.innerHTML = "";
    opzioni.forEach(opzione => {
        const btn = document.createElement('button');
        btn.className = "btn-option";
        btn.innerText = opzione.toUpperCase(); 
        btn.onclick = () => inviaVoto(opzione);
        container.appendChild(btn);
    });
}

async function inviaVoto(opzioneScelta) {
    const loadingEl = document.getElementById('loading');
    const username = localStorage.getItem('identita_utente_global') || "";
    if (!username) { alert("Inserisci il tuo nome prima di votare!"); return; }
    const usernameNormalizzato = username.toUpperCase().trim(); 

    try {
        if (loadingEl) { loadingEl.style.display = 'block'; loadingEl.innerText = "Invio voto in corso... 🛡️"; }

        const votiRef = collection(db, "scommesse", betId, "voti");
        const snapshotVoti = await getDocs(votiRef);
        let giaVotato = false;
        snapshotVoti.forEach(docVoto => {
            if (docVoto.data().utente.toUpperCase().trim() === usernameNormalizzato) giaVotato = true;
        });

        if (giaVotato) {
            if (loadingEl) loadingEl.style.display = 'none';
            alert(`⚠️ Hai già espresso un voto per questa sfida!`);
            return; 
        }

        const saldoTokenAttuale = parseInt(localStorage.getItem('saldo_token_global')) || 0;
        const identificatoreVotoEsterno = usernameNormalizzato + "_" + betId.substring(0,3);
        const votoSpecificoRef = doc(db, "scommesse", betId, "voti", identificatoreVotoEsterno);

        await setDoc(votoSpecificoRef, {
            utente: username, 
            scelta: opzioneScelta.toLowerCase().trim(),
            timestamp: new Date().toISOString(),
            saldo_token: saldoTokenAttuale 
        });
        
        localStorage.setItem(`ha_votato_${betId}`, opzioneScelta.toLowerCase().trim());
        setTimeout(() => { location.reload(); }, 100);
    } catch (e) { console.error(e); }
}
// ========================================================
// JAVASCRIPT - PARTE 4 di 5: RENDERING RISULTATI E VERDETTI
// ========================================================
async function mostraRisultati(opzioni, rispostaCorretta, vincitoreEstratto, perdenteEstratto, isAnnullataCloud) {
    try {
        const votiSnap = await getDocs(collection(db, "scommesse", betId, "voti"));
        const winnersList = document.getElementById('winners-list');
        const losersList = document.getElementById('losers-list');
        const chartsContainer = document.getElementById('charts-container');
        const timerContainerEl = document.getElementById('timer-container');
        const consolationList = document.getElementById('consolation-list');

        if (winnersList) winnersList.innerHTML = "";
        if (losersList) losersList.innerHTML = "";
        if (consolationList) consolationList.innerHTML = "";
        if (chartsContainer) chartsContainer.innerHTML = "";

        const haEsitoUfficiale = rispostaCorretta !== undefined && rispostaCorretta !== null && rispostaCorretta !== "";
        
        if (isAnnullataCloud || (haEsitoUfficiale && votiSnap.size <= 1)) {
            if (timerContainerEl) timerContainerEl.innerHTML = `<span class="status-badge" style="background:#FEE2E2; color:#991B1B; border: 1px solid #FCA5A5;">⚠️ SFIDA ANNULLATA ❌</span>`;
            if (winnersList) winnersList.innerHTML = "<p style='font-size:14px; color:#64748B; text-align:center; font-weight:500;'>Sfida annullata automaticamente: è richiesto un minimo di 2 partecipanti per convalidare il match.</p>";
            return; 
        }

        if (!rispostaCorretta) {
            if (winnersList) winnersList.innerHTML = "<p style='font-size:14px; color:#888; text-align:center;'>⏱ Match Terminato. In attesa del risultato ufficiale dall'organizzatore...</p>";
            if (timerContainerEl) timerContainerEl.innerHTML = `<span class="status-badge" style="background:#FEF3C7; color:#92400E; padding:5px 10px; border-radius:5px; font-weight:bold;">🔒 VOTAZIONI CHIUSE</span>`;
            return;
        }

        if (timerContainerEl) timerContainerEl.innerHTML = `<span class="status-badge" style="background:#E2E8F0; color:#334155; padding:5px 10px; border-radius:5px; font-weight:bold;">🏆 SFIDA CONCLUSA</span>`;

        const conteggi = {};
        let totaleVoti = 0;
        opzioni.forEach(o => conteggi[o.toLowerCase().trim()] = 0);

        const rispCorrettaNorm = rispostaCorretta.toLowerCase().trim().replace("ì", "i");
        let contatoreVincitori = 0;
        let contatorePerdenti = 0;
        const votiDataArray = [];

        votiSnap.forEach(votoDoc => {
            const v = votoDoc.data();
            votiDataArray.push(v);
            const sceltaUtenteNorm = v.scelta.toLowerCase().trim().replace("ì", "i");
            const chiaveConteggio = v.scelta.toLowerCase().trim();

            if (conteggi[chiaveConteggio] !== undefined) { conteggi[chiaveConteggio]++; totaleVoti++; }
            else { conteggi[chiaveConteggio] = 1; totaleVoti++; }

            if (sceltaUtenteNorm === rispCorrettaNorm) contatoreVincitori++; else contatorePerdenti++;
        });

        const tuttiVincitori = (contatorePerdenti === 0 && contatoreVincitori > 0);
        const tuttiPerdenti = (contatoreVincitori === 0 && contatorePerdenti > 0);

        if (winnersList) {
            if (tuttiVincitori) {
                winnersList.innerHTML = `<div class="vincitore-unico-box" style="background:#E8F5E9; padding:15px; color:#2E7D32; border-radius:10px; text-align:center; font-weight:bold;">🥳 EN PLEIN DI VINCITE! Tutti prendono +1 Token.</div>`;
            } else if (tuttiPerdenti) {
                winnersList.innerHTML = `<div class="vincitore-unico-box" style="background:#F1F5F9; padding:15px; color:#475569; border-radius:10px; text-align:center; font-weight:bold;">🤷‍♂️ NESSUN VINCITORE! Tutti Silurati (-1 Token).</div>`;
            } else if (vincitoreEstratto) {
                winnersList.innerHTML = `<div class="vincitore-unico-box" style="background:#FEF3C7; border:2px solid #F59E0B; padding:15px; border-radius:10px; color:#B45309; text-align:center;">👑 VINCITORE ASSOLUTO ESTRATTO:<br><span style="font-weight:bold; font-size:20px;">${vincitoreEstratto}</span></div>`;
            }
        }

        if (losersList && !tuttiVincitori && perdenteEstratto) {
            losersList.innerHTML = `<div class="perdente-unico-box" style="background:#FEE2E2; border:2px solid #EF4444; padding:15px; border-radius:10px; color:#991B1B; text-align:center; margin-top:10px;">☠️ PERDENTE ASSOLUTO (PAGA LA PENITENZA):<br><span style="font-weight:bold; font-size:20px;">${perdenteEstratto}</span> 😭</div>`;
        }

        votiDataArray.forEach(v => {
            const li = document.createElement('li');
            li.style = "padding:8px; border-bottom:1px solid #F1F5F9; list-style:none; font-size:13px; color:#334155;";
            const sceltaUtenteNorm = v.scelta.toLowerCase().trim().replace("ì", "i");

            if (sceltaUtenteNorm === rispCorrettaNorm) {
                if (tuttiVincitori) {
                    li.innerHTML = `🔹 <b>${v.utente}</b>: Indovinato! <span style="color:#16A34A;font-weight:bold;">+1 Token</span>`;
                    if (v.utente === localUsername) modificaBilancioToken(betId, 1, null);
                } else {
                    const isVincitoreAssoluto = (v.utente === vincitoreEstratto);
                    li.innerHTML = isVincitoreAssoluto ? `👑 <b>${v.utente}</b>: <span style="color:#D97706;font-weight:bold;">VINCITORE ASSOLUTO</span>` : `🔹 <b>${v.utente}</b>: Indovinato! <span style="color:#16A34A;font-weight:bold;">+1 Token</span>`;
                    if (v.utente === localUsername) modificaBilancioToken(betId, 1, "Hai indovinato la scommessa! +1 Token. 🪙");
                }
            } else {
                if (tuttiPerdenti) {
                    li.innerHTML = `🌶️ <b>${v.utente}</b>: Sbagliato! <span style="color:#DC2626;font-weight:bold;">-1 Token</span>`;
                    if (v.utente === localUsername) modificaBilancioToken(betId, -1, null);
                } else {
                    const isPerdenteAssoluto = (v.utente === perdenteEstratto);
                    li.innerHTML = isPerdenteAssoluto ? `☠️ <b>${v.utente}</b>: <span style="color:#DC2626;font-weight:bold;">PERDENTE ASSOLUTO (Penitenza)</span>` : `🌶️ <b>${v.utente}</b>: Sbagliato! <span style="color:#EF4444;">-1 Token (Penitenza minore)</span>`;
                    if (v.utente === localUsername) modificaBilancioToken(betId, -1, "Hai sbagliato la risposta! -1 Token. 🌶️");
                }
            }
            if (consolationList) consolationList.appendChild(li);
        });

        if (chartsContainer && totaleVoti > 0) {
            chartsContainer.innerHTML = `<h4 style="margin-bottom:10px; font-size:14px; color:#1E293B;">Riepilogo Percentuali Voti:</h4>`;
            opzioni.forEach(opzione => {
                const chiaveOpzione = opzione.toLowerCase().trim();
                const count = conteggi[chiaveOpzione] || 0;
                const pct = Math.round((count / totaleVoti) * 100);
                const isCorrect = opzione.toLowerCase().trim().replace("ì", "i") === rispCorrettaNorm;
                const fillStyle = isCorrect ? 'background-color: #C8E6C9;' : '';
                
                chartsContainer.innerHTML += `
                    <div style="margin-bottom:8px; font-size:12px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                            <span style="font-weight:500; text-transform:uppercase;">${opzione}</span>
                            <span style="color:#64748B;">${count} voti (${pct}%)</span>
                        </div>
                        <div style="background:#E2E8F0; width:100%; height:8px; border-radius:4px; overflow:hidden;">
                            <div style="background:#2563EB; width:${pct}%; ${fillStyle} height:100%;"></div>
                        </div>
                    </div>`;
            });
        }
    } catch (e) { console.error(e); }
}
// ========================================================
// JAVASCRIPT - PARTE 5 di 5: STORICO E PORTAFOGLIO NATIVO
// ========================================================
function salvaInStoricoLocale(idScommessa, domanda, rispostaCorretta, expirationTimestamp) {
    try {
        let storico = JSON.parse(localStorage.getItem('storico_scommesse_global')) || [];
        const index = storico.findIndex(item => item.id === idScommessa);
        const dati = { id: idScommessa, domanda: domanda, risposta_corretta: rispostaCorretta || null, data_scadenza_ufficiale: expirationTimestamp || null, data_salvataggio: new Date().toISOString() };
        if (index !== -1) {
            storico[index].risposta_corretta = rispostaCorretta || null;
            if (expirationTimestamp) storico[index].data_scadenza_ufficiale = expirationTimestamp;
        } else { storico.unshift(dati); }
        if (storico.length > 15) storico = storico.slice(0, 15);
        localStorage.setItem('storico_scommesse_global', JSON.stringify(storico));
    } catch (e) { console.error(e); }
}

async function modificaBilancioToken(idScommessa, valore, messaggioAlert) {
    if (!localStorage.getItem(`token_elaborato_${idScommessa}`)) {
        let saldoAttuale = parseInt(localStorage.getItem('saldo_token_global')) || 0;
        saldoAttuale += valore;
        localStorage.setItem('saldo_token_global', saldoAttuale);
        localStorage.setItem(`token_elaborato_${idScommessa}`, "true");
        
        if (typeof aggiornaTokenGrafica === "function") aggiornaTokenGrafica();
        if (messaggioAlert) alert(messaggioAlert);

        if (localUsername) {
            const userIdNormalizzato = localUsername.toUpperCase().trim();
            const userGlobalRef = doc(db, "utenti_globali", userIdNormalizzato);
            try {
                await setDoc(userGlobalRef, {
                    username: userIdNormalizzato,
                    sfide_indovinate: valore > 0 ? increment(1) : increment(0),
                    sfide_sbagliate: valore < 0 ? increment(1) : increment(0),
                    token_totali: increment(valore),
                    ultimo_aggiornamento: new Date().toISOString()
                }, { merge: true });
            } catch (e) { console.error("Errore classifica cloud:", e); }
        }
    }
}

function aggiornaTokenGrafica() {
    const contatore = document.getElementById('token-count');
    const box = document.querySelector('.token-balance-box');
    if (contatore && box) {
        const saldo = parseInt(localStorage.getItem('saldo_token_global')) || 0;
        if (saldo > 0) { contatore.innerText = `+${saldo} (Bonus 👑)`; box.className = "token-balance-box token-positivo"; }
        else if (saldo < 0) { contatore.innerText = `${saldo} (Malus 🌶️)`; box.className = "token-balance-box token-negativo"; }
        else { contatore.innerText = "0 (In Pari 🤝)"; box.className = "token-balance-box"; }
    }
}
window.aggiornaTokenGrafica = aggiornaTokenGrafica;

function mostraStoricoSchermata() {
    const container = document.getElementById('storico-container');
    if (!container) return;
    const storico = JSON.parse(localStorage.getItem('storico_scommesse_global')) || [];
    if (storico.length === 0) { container.innerHTML = "<p style='font-size:12px;color:#888;text-align:center;'>Nessun match registrato.</p>"; return; }
    let html = '<ul style="list-style:none; padding:0; margin:0;">';
    storico.forEach(m => {
        const ora = new Date();
        const scade = m.data_scadenza_ufficiale ? new Date(m.data_scadenza_ufficiale) : new Date();
        const isFinita = (ora >= scade) || m.risposta_corretta;
        const b = isFinita ? `<span style="background:#E2E8F0;font-size:10px;padding:2px 4px;border-radius:4px;color:#475569;">Conclusa</span>` : `<span style="background:#E0F2FE;font-size:10px;padding:2px 4px;border-radius:4px;color:#0369A1;">Attiva</span>`;
        html += `<li style="padding:6px 0; border-bottom:1px solid #F1F5F9; font-size:12px;"><a href="?id=${m.id}" style="text-decoration:none; color:#2563EB; font-weight:500;">${m.domanda}</a> ${b}</li>`;
    });
    container.innerHTML = html + "</ul>";
}

function mostraSchermataInizialeSenzaId() {
    const l = document.getElementById('loading');
    if (l) l.innerHTML = `<div style='text-align:center;padding:20px;'><h2 style='color:#1E293B;margin-bottom:10px;'>🔮 Benvenuto su GuessWhen!</h2><p style='color:#64748B;font-size:14px;'>Apri un link sfida ricevuto su WhatsApp per poter votare, accumulare gettoni e scalare la classifica del tuo gruppo di amici! 🤝</p></div>`;
    if (typeof mostraStoricoSchermata === "function") mostraStoricoSchermata();
    if (typeof aggiornaTokenGrafica === "function") aggiornaTokenGrafica();
}
