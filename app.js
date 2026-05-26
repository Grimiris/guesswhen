
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
const screenDashboard = document.getElementById('screen-dashboard');
const screenCreate = document.getElementById('screen-create');
const screenPlayRoom = document.getElementById('screen-play-room');

let localUsername = localStorage.getItem('identita_utente_global') || "";
// ========================================================
// JAVASCRIPT - PARTE 2 di 5: NAVIGAZIONE E CREAZIONE MATCH
// ========================================================
async function inizializzaFlussoPiattaforma() {
    if (!localUsername) {
        if (screenLoading) screenLoading.style.display = 'none';
        if (screenLogin) screenLogin.classList.remove('hidden');
        
        document.getElementById('btn-salva-identita').onclick = () => {
            const nome = document.getElementById('input-username').value.trim();
            if (nome.length >= 2) {
                localStorage.setItem('identita_utente_global', nome);
                window.location.reload();
            } else { alert("Inserisci un Nickname valido! 🎮"); }
        };
        return;
    }

    await aggiornaTokenGrafica();

    if (!betId) {
        if (screenLoading) screenLoading.style.display = 'none';
        if (screenDashboard) screenDashboard.classList.remove('hidden');
        caricaDashboardMaster();

        document.getElementById('btn-vai-a-creazione').onclick = () => {
            if (screenDashboard) screenDashboard.classList.add('hidden');
            if (screenCreate) screenCreate.classList.remove('hidden');
            
            const oggi = new Date();
            const domani = new Date(oggi.getTime() + 24 * 60 * 60 * 1000);
            document.getElementById('input-data-scadenza').value = domani.toISOString().split('T')[0];
            document.getElementById('input-ora-scadenza').value = "20:00";
        };

        document.getElementById('btn-torna-dash').onclick = (e) => {
            e.preventDefault();
            if (screenCreate) screenCreate.classList.add('hidden');
            if (screenDashboard) screenDashboard.classList.remove('hidden');
        };

        document.getElementById('btn-lancia-sfida').onclick = async () => {
            const q = document.getElementById('etQuestion').value.trim();
            const r = document.getElementById('etReward').value.trim();
            const p = document.getElementById('etPenalty').value.trim();
            const inputData = document.getElementById('input-data-scadenza').value;
            const inputOra = document.getElementById('input-ora-scadenza').value;

            if (!q || !r || !p || !inputData || !inputOra) {
                alert("Compila tutti i campi!"); return;
            }

            const scadenzaSelezionata = new Date(`${inputData}T${inputOra}`);
            if (scadenzaSelezionata <= new Date()) {
                alert("Imposta una data e orario futuri! ⏰"); return;
            }

            const uniqueId = Math.random().toString(36).substring(2, 8);
            const dataScommessa = {
                domanda: q, premio: r, penitenza: p,
                opzioni_disponibili: ["si", "no"],
                timestamp_scadenza: scadenzaSelezionata.getTime(),
                creatore_nome: localUsername, risposta_corretta: "", chiusa_anticipo: false, annullata: false
            };

            await setDoc(doc(db, "scommesse", uniqueId), dataScommessa);
            
            const linkGara = `${window.location.origin}${window.location.pathname}?id=${uniqueId}`;
            const testoMessaggio = encodeURIComponent(`🔮 *NUOVA SFIDA SU GUESSWHEN!*\n\n“${q}”\n\n🎁 *Premio:* ${r}\n🌶️ *Penitenza:* ${p}\n\nEntra e vota qui 👇\n${linkGara}`);
            window.location.href = `https://whatsapp.com{testoMessaggio}`;
        };
    } else {
        if (screenLoading) screenLoading.style.display = 'none';
        if (screenPlayRoom) screenPlayRoom.classList.remove('hidden');
        eseguiStanzaGioco();
    }
}
// ========================================================
// JAVASCRIPT - PARTE 3 di 5: RENDERING STORICO E AVVIO ROOM
// ========================================================
async function caricaDashboardMaster() {
    const contenitore = document.getElementById('lista-sfide-master');
    if (!contenitore) return;
    contenitore.innerHTML = "<p style='text-align:center;color:#64748B;font-size:13px;'>Caricamento storico... ⏳</p>";

    try {
        const snap = await getDocs(collection(db, "scommesse"));
        contenitore.innerHTML = "";
        let contatoreSfide = 0;

        snap.forEach(mDoc => {
            const d = mDoc.data();
            if (d.creatore_nome === localUsername) {
                contatoreSfide++;
                let badgeStato = `<div class="status-dot dot-attiva">• ATTIVA</div>`;
                if (d.annullata) badgeStato = `<div class="status-dot dot-annullata">• ANNULLATA</div>`;
                else if (d.risposta_corretta) badgeStato = `<div class="status-dot dot-chiusa">• CHIUSA</div>`;

                const riga = document.createElement('div');
                riga.className = "sub-card";
                riga.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        ${badgeStato}
                        <div class="id-tag">#${mDoc.id}</div>
                    </div>
                    <h3 style="text-align:left; font-size:18px; margin:0 0 10px 0; text-transform:none;">${d.domanda}</h3>
                    <div style="font-size:13px; color:#64748B; margin-bottom:10px;">🎁 Premio: ${d.premio} | 👹 Penitenza: ${d.penitenza}</div>
                    <div class="match-buttons">
                        <a href="?id=${mDoc.id}" class="btn-main btn-black" style="padding:10px; font-size:13px; margin:0; flex:1;">Apri</a>
                    </div>
                `;
                contenitore.appendChild(riga);
            }
        });

        if (contatoreSfide === 0) {
            contenitore.innerHTML = "<p style='text-align:center;color:#94A3B8;font-size:13px;padding:20px;'>Nessuna sfida creata da te. Clicca '+ Nuova' in alto per iniziare! 🚀</p>";
        }
    } catch (e) { console.error(e); }
}

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
        document.getElementById('room-reward').innerText = `🎁 Premio: ${data.premio}`;
        document.getElementById('room-penalty').innerText = `👹 Penitenza: ${data.penitenza}`;

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
                generaBottoniVotoStanza(data.opzioni_disponibili);
            }
        }

        // Se sei il Creatore Admin della sfida, accende il pannello di controllo esclusivo nero
        if (data.creatore_nome === localUsername && !haEsito && !data.annullata) {
            document.getElementById('room-admin-panel').classList.remove('hidden');
            generaControlliAdmin(data);
        }
    } catch (e) { console.error(e); }
}
// ========================================================
// JAVASCRIPT - PARTE 4 di 5: UTILITY VOTO E CONTROLLI ADMIN
// ========================================================
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

function generaBottoniVotoStanza(opzioni) {
    const container = document.getElementById('options-container');
    if (!container) return;
    container.innerHTML = "";
    opzioni.forEach(opzione => {
        const btn = document.createElement('button');
        btn.className = "btn-main";
        btn.style.marginBottom = "10px";
        btn.innerText = `VOTA ${opzione.toUpperCase()}`; 
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

function generaControlliAdmin(dataScommessa) {
    const layoutChoices = document.getElementById('admin-choices-layout');
    if (!layoutChoices) return;
    layoutChoices.innerHTML = "";

    // Recupera in tempo reale quanti amici hanno votato finora
    getDocs(collection(db, "scommesse", betId, "voti")).then(snap => {
        document.getElementById('admin-vote-count-text').innerText = `${snap.size} voti`;
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
// JAVASCRIPT - PARTE 5 di 5: ALGORITMO PONDERATO E GRAFICI
// ========================================================
async function decretaRisultatoUfficialeCloud(opzioneVincente, tutteLeOpzioni) {
    const rispCorrettaNorm = opzioneVincente.toLowerCase().trim().replace("ì", "i");
    
    if (!confirm(`Vuoi impostare "${opzioneVincente.toUpperCase()}" come risultato definitivo? Verrà eseguito il calcolo ponderato dei gettoni.`)) return;

    try {
        const votiSnap = await getDocs(collection(db, "scommesse", betId, "voti"));
        
        // ⚠️ REGOLA DI ANNULLAMENTO AUTOMATICO: Minimo 2 partecipanti richiesti
        if (votiSnap.size <= 1) {
            await setDoc(doc(db, "scommesse", betId), { annullata: true, chiusa_anticipo: true }, { merge: true });
            alert("Sfida annullata automaticamente: è richiesto un minimo di 2 partecipanti per convalidare il match.");
            window.location.reload();
            return;
        }

        // Scarica la mappa completa dei gettoni per l'estrazione a sorte della fortuna
        const utentiSnap = await getDocs(collection(db, "utenti_globali"));
        const mappaGettoniCloud = {};
        utentiSnap.forEach(uDoc => {
            mappaGettoniCloud[uDoc.id.toUpperCase().trim()] = uDoc.data().token_totali || 0;
        });

        const vincitoriPossibili = [];
        const perdentiPossibili = [];

        votiSnap.forEach(vDoc => {
            const v = vDoc.data();
            const sceltaUtenteNorm = v.scelta.toLowerCase().trim().replace("ì", "i");
            
            if (sceltaUtenteNorm === rispCorrettaNorm) {
                vincitoriPossibili.push(v.utente);
            } else {
                perdentiPossibili.push(v.utente);
            }
        });

        // 🎲 ESTRAZIONE DEL VINCITORE CON BIGLIETTI FORTUNA PONDERATI (Più Gettoni = Più biglitti extra)
        let vincitoreAssoluto = "Nessuno";
        if (vincitoriPossibles.length > 0) {
            const urnaVincitori = [];
            vincitoriPossibili.forEach(v => {
                const gettoniAttuali = mappaGettoniCloud[v.toUpperCase().trim()] || 0;
                const bigliettiSpettanti = gettoniAttuali > 0 ? (1 + gettoniAttuali) : 1;
                for (let i = 0; i < bigliettiSpettanti; i++) { urnaVincitori.push(v); }
            });
            vincitoreAssoluto = urnaVincitori[Math.floor(Math.random() * urnaVincitori.length)];
        }

        // 🎲 ESTRAZIONE DEL PERDENTE CON BIGLIETTI MALUS PONDERATI (Più Gettoni Negativi = Più biglietti della sfortuna)
        let perdenteAssoluto = "Nessuno";
        if (perdentiPossibili.length > 0) {
            const urnaPerdenti = [];
            perdentiPossibili.forEach(p => {
                const gettoniAttuali = mappaGettoniCloud[p.toUpperCase().trim()] || 0;
                const bigliettiSpettanti = gettoniAttuali < 0 ? (1 + Math.abs(gettoniAttuali)) : 1;
                for (let i = 0; i < bigliettiSpettanti; i++) { urnaPerdenti.push(p); }
            });
            perdenteAssoluto = urnaPerdenti[Math.floor(Math.random() * urnaPerdenti.length)];
        }

        // Salva i verdetti nel Cloud
        await setDoc(doc(db, "scommesse", betId), {
            risposta_corretta: rispCorrettaNorm,
            vincitore_estratto: vincitoreAssoluto,
            perdente_estratto: perdenteAssoluto,
            chiusa_anticipo: true
        }, { merge: true });

        alert(`🏆 Verdetto registrato con successo!\n👑 Vincitore: ${vincitoreAssoluto}\n☠️ Perdente: ${perdenteAssoluto}`);
        window.location.reload();

    } catch (e) { console.error("Errore nell'algoritmo ponderato:", e); }
}

async function mostraRisultatiStanza(dataSfida) {
    try {
        const votiSnap = await getDocs(collection(db, "scommesse", betId, "voti"));
        const chartsWrapper = document.getElementById('charts-wrapper');
        const listContainer = document.getElementById('consolation-list');

        if (chartsWrapper) chartsWrapper.innerHTML = "";
        if (listContainer) listContainer.innerHTML = "";

        const conteggi = { si: 0, no: 0 };
        let totaleVoti = 0;

        votiSnap.forEach(vDoc => {
            const v = vDoc.data();
            const scelta = v.scelta.toLowerCase().trim();
            if (conteggi[scelta] !== undefined) { conteggi[scelta]++; totaleVoti++; }
            
            // Assegna gettoni Cloud ai profili se il match è chiuso ed è la prima volta che viene aperto
            if (dataSfida.risposta_corretta && !dataSfida.annullata) {
                const rispCorrettaNorm = dataSfida.risposta_corretta.toLowerCase().trim().replace("ì", "i");
                const sceltaUtenteNorm = scelta.replace("ì", "i");
                
                if (sceltaUtenteNorm === rispCorrettaNorm && v.utente === localUsername) {
                    modificaBilancioCloudClassifica(1);
                } else if (sceltaUtenteNorm !== rispCorrettaNorm && v.utente === localUsername) {
                    modificaBilancioCloudClassifica(-1);
                }
            }

            const li = document.createElement('li');
            li.style = "padding:10px 0; border-bottom:1px solid #F1F5F9; font-size:14px; font-weight:500;";
            li.innerHTML = `👤 <b>${v.utente}</b> ha votato <span style="text-transform:uppercase;color:#2563EB;">${scelta}</span>`;
            if (listContainer) listContainer.appendChild(li);
        });

        // Configura il titolo del pannello percentuali (Se c'è l'estratto, mostra il verdetto)
        const pStatus = document.getElementById('room-percent-status');
        if (dataSfida.risposta_corretta) {
            pStatus.innerHTML = `👑 VINCITORE: <span style="color:#D97706;">${dataSfida.vincitore_estratto}</span> | ☠️ PENITENZA A: <span style="color:#DC2626;">${dataSfida.perdente_estratto}</span>`;
        } else {
            pStatus.innerText = `• RISULTATI FINALI (${totaleVoti} VOTI)`;
        }

        // Disegna le barre dei risultati specchiate al 100% sulla tua foto
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
                username: userIdNormalizzato,
                token_totali: increment(valore),
                ultimo_aggiornamento: new Date().toISOString()
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
