import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, set, get, child, onValue, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Deine verknüpfte Firebase-Konfiguration
const firebaseConfig = {
  apiKey: "AIzaSyDzWTQUlTPBh-Hw_ZMBuJi_5PcRmDZ_21I",
  authDomain: "haushaltrpg.firebaseapp.com",
  projectId: "haushaltrpg",
  storageBucket: "haushaltrpg.firebasestorage.app",
  messagingSenderId: "495231424575",
  appId: "1:495231424575:web:873a45f50c28b632dc408a",
  databaseURL: "https://haushaltrpg-default-rtdb.europe-west1.firebasedatabase.app"
};

const fApp = initializeApp(firebaseConfig);
const auth = getAuth(fApp);
const db = getDatabase(fApp);

const avatars = ["🧙‍♂️", "🥷", "🧝‍♀️", "🧑‍🚀", "⚔️", "🐈"];
let selectedAvatarIcon = "🧙‍♂️";
let currentRoomId = null;
let currentFilter = "all";
let localUid = null;

// Sound Synthesizer
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    if (type === 'success') {
        osc.type = 'square'; osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime); osc.start(); osc.stop(audioCtx.currentTime + 0.25);
    } else if (type === 'buy') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.setValueAtTime(1320, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime); osc.start(); osc.stop(audioCtx.currentTime + 0.2);
    } else if (type === 'fail') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.setValueAtTime(100, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime); osc.start(); osc.stop(audioCtx.currentTime + 0.3);
    }
}

// RIESIGER VORINSTALLIERTER KATALOG (70 Quests, 30 Shop-Items)
const defaultQuests = {
    // 🔍 MINI-QUESTS (30 Stück)
    "q1": { id: "q1", title: "Müll runterbringen", type: "mini", reward: 4, icon: "🗑️" },
    "q2": { id: "q2", title: "Spülmaschine ausräumen", type: "mini", reward: 8, icon: "🍽️" },
    "q3": { id: "q3", title: "Spülmaschine einräumen", type: "mini", reward: 4, icon: "🥣" },
    "q4": { id: "q4", title: "Esstisch abwischen", type: "mini", reward: 2, icon: "🧼" },
    "q5": { id: "q5", title: "1x Stoßlüften (ganze Wohnung)", type: "mini", reward: 1, icon: "🪟" },
    "q6": { id: "q6", title: "Post reinholen & sortieren", type: "mini", reward: 1, icon: "✉️" },
    "q7": { id: "q7", title: "Zimmerpflanzen gießen", type: "mini", reward: 6, icon: "🪴" },
    "q8": { id: "q8", title: "Tiernapf spülen & frisch befüllen", type: "mini", reward: 4, icon: "🐾" },
    "q9": { id: "q9", title: "Ein herumstehendes Teil wegräumen", type: "mini", reward: 1, icon: "🧸" },
    "q10": { id: "q10", title: "Kaffeesatz leeren / Padhalter reinigen", type: "mini", reward: 3, icon: "☕" },
    "q11": { id: "q11", title: "Küchenspüle auswischen & trockenreiben", type: "mini", reward: 3, icon: "🚰" },
    "q12": { id: "q12", title: "Bett ordentlich machen", type: "mini", reward: 2, icon: "🛏️" },
    "q13": { id: "q13", title: "Wäscheberge vom Boden in Korb sortieren", type: "mini", reward: 2, icon: "🧦" },
    "q14": { id: "q14", title: "Schuhe im Flur ordentlich ausrichten", type: "mini", reward: 2, icon: "👟" },
    "q15": { id: "q15", title: "Gästehandtuch im Bad austauschen", type: "mini", reward: 3, icon: "🧼" },
    "q16": { id: "q16", title: "Einkaufstaschen falten und wegräumen", type: "mini", reward: 2, icon: "🛍️" },
    "q17": { id: "q17", title: "Klopapier-Rolle erneuern & Hülse wegwerfen", type: "mini", reward: 2, icon: "🧻" },
    "q18": { id: "q18", title: "Sofa-Kissen & Decken aufschütteln", type: "mini", reward: 2, icon: "🛋️" },
    "q19": { id: "q19", title: "Arbeitsplatz / Schreibtisch kurz aufräumen", type: "mini", reward: 5, icon: "💻" },
    "q20": { id: "q20", title: "Gelbe-Sack-Müll komprimieren/rausbringen", type: "mini", reward: 4, icon: "💛" },
    "q21": { id: "q21", title: "Papiermüll leeren", type: "mini", reward: 3, icon: "📦" },
    "q22": { id: "q22", title: "Handy-Display desinfizieren", type: "mini", reward: 2, icon: "📱" },
    "q23": { id: "q23", title: "10 Teile fehlerfrei wegsortieren", type: "mini", reward: 3, icon: "🧺" },
    "q24": { id: "q24", title: "Schlüsselboard / Flurkommode ordnen", type: "mini", reward: 3, icon: "🔑" },
    "q25": { id: "q25", title: "Abgelaufenes im Brot- oder Obstkorb aussortieren", type: "mini", reward: 4, icon: "🍎" },
    "q26": { id: "q26", title: "Jacken ordentlich an die Garderobe hängen", type: "mini", reward: 2, icon: "🧥" },
    "q27": { id: "q27", title: "Toilettenbürste reinigen & Halter auswischen", type: "mini", reward: 5, icon: "🚽" },
    "q28": { id: "q28", title: "Spiegel kurz von Flecken befreien", type: "mini", reward: 3, icon: "🪞" },
    "q29": { id: "q29", title: "Deko abstauben (Fernseher/Regal)", type: "mini", reward: 4, icon: "📺" },
    "q30": { id: "q30", title: "Wassernapf Haustier frisch auswaschen", type: "mini", reward: 3, icon: "🐈" },

    // 🗓️ WOCHEN-QUESTS (20 Stück)
    "q31": { id: "q31", title: "Wohnung komplett staubsaugen", type: "woche", reward: 25, icon: "🧹", completed: false },
    "q32": { id: "q32", title: "Badezimmer komplett putzen (Waschbecken/Armaturen)", type: "woche", reward: 35, icon: "🚽", completed: false },
    "q33": { id: "q33", title: "Böden wischen (Küche, Bad & Flur)", type: "woche", reward: 30, icon: "🍳", completed: false },
    "q34": { id: "q34", title: "Eine Maschine Wäsche waschen & aufhängen", type: "woche", reward: 25, icon: "👕", completed: false },
    "q35": { id: "q35", title: "Trockene Wäsche falten & in Schrank räumen", type: "woche", reward: 20, icon: "🧺", completed: false },
    "q36": { id: "q36", title: "Alle freien Oberflächen feucht abwischen", type: "woche", reward: 20, icon: "🪶", completed: false },
    "q37": { id: "q37", title: "Altglas & Pfandflaschen wegbringen", type: "woche", reward: 15, icon: "🍾", completed: false },
    "q38": { id: "q38", title: "Haupt-Mülleimer komplett auswischen", type: "woche", reward: 15, icon: "🗑️", completed: false },
    "q39": { id: "q39", title: "Großen Spiegel im Flur streifenfrei putzen", type: "woche", reward: 12, icon: "🪞", completed: false },
    "q40": { id: "q40", title: "Küchenarbeitsplatte komplett freiräumen & putzen", type: "woche", reward: 15, icon: "🔪", completed: false },
    "q41": { id: "q41", title: "Katzenklo komplett leeren & auswaschen", type: "woche", reward: 25, icon: "🐈", completed: false },
    "q42": { id: "q42", title: "Bettvorleger & Badematten ausschütteln/waschen", type: "woche", reward: 15, icon: "🧼", completed: false },
    "q43": { id: "q43", title: "Mikrowelle von innen reinigen", type: "woche", reward: 18, icon: "📻", completed: false },
    "q44": { id: "q44", title: "Küchenfronten von Fettpatschern befreien", type: "woche", reward: 20, icon: "🚪", completed: false },
    "q45": { id: "q45", title: "Brotkasten auswischen & Krümel entfernen", type: "woche", reward: 10, icon: "🍞", completed: false },
    "q46": { id: "q46", title: "Duschkabine abziehen & Kalkflecken entfernen", type: "woche", reward: 22, icon: "🚿", completed: false },
    "q47": { id: "q47", title: "Teppiche gründlich absaugen/ausklopfen", type: "woche", reward: 18, icon: "🧶", completed: false },
    "q48": { id: "q48", title: "Handtücher im ganzen Haus einsammeln & kochen", type: "woche", reward: 15, icon: "🧺", completed: false },
    "q49": { id: "q49", title: "Wohnzimmertisch komplett aufräumen & polieren", type: "woche", reward: 12, icon: "🪵", completed: false },
    "q50": { id: "q50", title: "Einkauf planen & Kühlschrank-Inventar prüfen", type: "woche", reward: 10, icon: "📝", completed: false },

    // 📯 MONATS-QUESTS (20 Stück)
    "q51": { id: "q51", title: "Bettwäsche komplett wechseln & waschen", type: "monat", reward: 40, icon: "🛏️", completed: false },
    "q52": { id: "q52", title: "Kühlschrank komplett auswischen & sortieren", type: "monat", reward: 60, icon: "🧊", completed: false },
    "q53": { id: "q53", title: "Backofen & Backbleche chemisch reinigen/schrubben", type: "monat", reward: 80, icon: "🔥", completed: false },
    "q54": { id: "q54", title: "Fenster putzen (Wohnbereich)", type: "monat", reward: 45, icon: "🖼️", completed: false },
    "q55": { id: "q55", title: "Fenster putzen (Schlafbereich & Küche)", type: "monat", reward: 45, icon: "🖼️", completed: false },
    "q56": { id: "q56", title: "Kaffeemaschine komplett entkalken & reinigen", type: "monat", reward: 30, icon: "☕", completed: false },
    "q57": { id: "q57", title: "Spülmaschine (Sieb, Sprüharme, Salz) pflegen", type: "monat", reward: 35, icon: "🧼", completed: false },
    "q58": { id: "q58", title: "Auto aussaugen (inklusive Kofferraum)", type: "monat", reward: 70, icon: "🚗", completed: false },
    "q59": { id: "q59", title: "Auto-Innenscheiben streifenfrei putzen", type: "monat", reward: 25, icon: "🧽", completed: false },
    "q60": { id: "q60", title: "Balkon / Terrasse fegen & Geländer wischen", type: "monat", reward: 40, icon: "🪵", completed: false },
    "q61": { id: "q61", title: "Abflüsse reinigen (Haare entfernen + spülen)", type: "monat", reward: 50, icon: "💧", completed: false },
    "q62": { id: "q62", title: "Matratzen gründlich absaugen & wenden", type: "monat", reward: 35, icon: "🛏️", completed: false },
    "q63": { id: "q63", title: "Alle Türen und Türklinken desinfizieren/wischen", type: "monat", reward: 30, icon: "🧽", completed: false },
    "q64": { id: "q64", title: "Waschmaschine (Flusensieb & Einspülfach) reinigen", type: "monat", reward: 45, icon: "🧼", completed: false },
    "q65": { id: "q65", title: "Heizkörper von innen absaugen/entstauben", type: "monat", reward: 30, icon: "♨️", completed: false },
    "q66": { id: "q66", title: "Fußleisten in der gesamten Wohnung abwischen", type: "monat", reward: 55, icon: "🧹", completed: false },
    "q67": { id: "q67", title: "Dunstabzugshaube (Fettfilter auswaschen)", type: "monat", reward: 50, icon: "💨", completed: false },
    "q68": { id: "q68", title: "Duschvorhang waschen / Glaskabine entkalken", type: "monat", reward: 35, icon: "🚿", completed: false },
    "q69": { id: "q69", title: "Vorratsschrank ausräumen, wischen & MHD prüfen", type: "monat", reward: 45, icon: "🥫", completed: false },
    "q70": { id: "q70", title: "Kleiderschrank ausmisten, lüften & ordnen", type: "monat", reward: 60, icon: "👔", completed: false }
};

const defaultShop = {
    // 🪙 KLEINE GEFALLEN (10 Stück)
    "s1": { id: "s1", title: "Der andere bringt dir einen Snack ans Sofa", cost: 40, icon: "🍿" },
    "s2": { id: "s2", title: "1x Kaffee/Tee fix und fertig ans Bett gebracht", cost: 50, icon: "☕" },
    "s3": { id: "s3", title: "Joker: Eine nervige Mini-Quest sofort abtreten", cost: 60, icon: "🃏" },
    "s4": { id: "s4", title: "Der andere räumt deine Schuhe/Jacke weg", cost: 30, icon: "👟" },
    "s5": { id: "s5", title: "15 Minuten absolute Ruhe (Kein Reden/Fragen)", cost: 45, icon: "🤫" },
    "s6": { id: "s6", title: "Der andere holt die Post/Pakete ab", cost: 35, icon: "📦" },
    "s7": { id: "s7", title: "Lieblings-Playlist-Lied wird sofort angemacht", cost: 20, icon: "🎵" },
    "s8": { id: "s8", title: "Der andere mixt dir ein Getränk/Cocktail", cost: 55, icon: "🍹" },
    "s9": { id: "s9", title: "Der andere steht auf und holt die Fernbedienung/Ladekabel", cost: 25, icon: "🔌" },
    "s10": { id: "s10", title: "Gutschein für ein langes, ungestörtes Schaumbad", cost: 50, icon: "🛁" },

    // 🎬 UNTERHALTUNG & PRIVILEGIEN (10 Stück)
    "s11": { id: "s11", title: "1 Abend absolut freie Film- oder Serienwahl", cost: 90, icon: "🎬" },
    "s12": { id: "s12", title: "Gutschein: 1 Tag komplett befreit vom Spülmaschinendienst", cost: 120, icon: "🍽️" },
    "s13": { id: "s13", title: "10 Minuten entspannte Fußmassage beim Streamen", cost: 150, icon: "🦶" },
    "s14": { id: "s14", title: "Gutschein: 15 Minuten intensive Rückenmassage", cost: 200, icon: "💆‍♂️" },
    "s15": { id: "s15", title: "Bestimmen, was am Wochenende bestellt/gegessen wird", cost: 100, icon: "🍕" },
    "s16": { id: "s16", title: "Spieleabend-Wahl (Du bestimmst das Brett-/Videospiel)", cost: 80, icon: "🎲" },
    "s17": { id: "s17", title: "Der andere muss die nächste Ladung Müll wegbringen", cost: 65, icon: "🗑️" },
    "s18": { id: "s18", title: "Das Recht, beim nächsten Streit sofort 'Recht zu haben'", cost: 150, icon: "⚖️" },
    "s19": { id: "s19", title: "Der andere kocht exklusiv dein Lieblings-Frühstück", cost: 110, icon: "🥞" },
    "s20": { id: "s20", title: "Gutschein: 1 Tag lang absolut gar nichts im Haushalt tun", cost: 180, icon: "🛌" },

    // 👑 LUXUS & GROSSE SPARZIELE (10 Stück)
    "s21": { id: "s21", title: "Ausschlafen am Wochenende (der andere macht morgens leise)", cost: 250, icon: "💤" },
    "s22": { id: "s22", title: "Der andere kocht ein aufwendiges 3-Gänge-Lieblingsessen", cost: 350, icon: "🍔" },
    "s23": { id: "s23", title: "Der andere übernimmt den kompletten Wocheneinkauf allein", cost: 400, icon: "🛒" },
    "s24": { id: "s24", title: "Der andere putzt das komplette Bad ganz allein", cost: 300, icon: "🧼" },
    "s25": { id: "s25", title: "Der andere wäscht, bügelt und faltet deine komplette Wäsche", cost: 350, icon: "👔" },
    "s26": { id: "s26", title: "Massage-Upgrade: Ganze 45 Minuten Wellness-Verwöhnung", cost: 500, icon: "🧴" },
    "s27": { id: "s27", title: "Der andere putzt das Auto von innen und außen komplett allein", cost: 450, icon: "🚗" },
    "s28": { id: "s28", title: "Ein Date-Abend komplett vom anderen geplant und bezahlt", cost: 600, icon: "🌹" },
    "s29": { id: "s29", title: "Der andere übernimmt eine komplette Wochenaufgabe deiner Wahl", cost: 280, icon: "📝" },
    "s30": { id: "s30", title: "LEGENDÄR: Ein ganzes Wochenende volles Luxus-Verwöhnprogramm!", cost: 1000, icon: "👑" }
};

// Global scope Verbindung für die HTML Buttons
window.app = {
    // 1. LOGIN & REGISTRIERUNG
    handleAuth: async function(type) {
        const email = document.getElementById("auth-email").value.trim();
        const password = document.getElementById("auth-password").value.trim();
        if(!email || !password) return alert("Bitte alle Felder ausfüllen!");

        try {
            if(type === 'register') {
                await createUserWithEmailAndPassword(auth, email, password);
                alert("Account erfolgreich erstellt! Du wirst automatisch eingeloggt.");
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (error) { alert("Fehler: " + error.message); }
    },

    logout: function() { signOut(auth); },

    // 2. RAUM SYSTEM (BEITRETEN / ERSTELLEN)
    handleRoom: async function(type) {
        const roomId = document.getElementById("room-id").value.trim().replace(/[^a-zA-Z0-9]/g, "");
        const roomPass = document.getElementById("room-password").value.trim();
        if(!roomId || !roomPass) return alert("Bitte Raum-ID und Passwort eingeben!");

        const dbRef = ref(db);
        if(type === 'create') {
            const snapshot = await get(child(dbRef, `rooms/${roomId}`));
            if(snapshot.exists()) return alert("Dieser Raum-Name existiert leider schon!");
            
            // Befüllt den Raum live in der Cloud mit der riesigen vordefinierten Liste
            await set(ref(db, `rooms/${roomId}`), {
                password: roomPass,
                stats: { mini: 0, woche: 0, monat: 0 },
                quests: defaultQuests,
                shop: defaultShop
            });
            alert("Dein Cloud-Raum wurde erfolgreich erstellt und voll befüllt!");
        }

        // Verifizierung beim Beitreten
        const snapshot = await get(child(dbRef, `rooms/${roomId}`));
        if(!snapshot.exists()) return alert("Dieser Raum existiert nicht!");
        if(snapshot.val().password !== roomPass) return alert("Falsches Passwort für diesen Raum!");

        currentRoomId = roomId;
        this.checkPlayerProfile();
    },

    leaveRoom: function() {
        currentRoomId = null;
        this.showScreen("room-screen");
    },

    checkPlayerProfile: async function() {
        const snapshot = await get(ref(db, `rooms/${currentRoomId}/players/${localUid}`));
        if(snapshot.exists()) {
            this.showScreen("main-game");
            this.listenToRoomData();
        } else {
            this.showScreen("char-screen");
            this.buildAvatarGrid();
        }
    },

    buildAvatarGrid: function() {
        const grid = document.getElementById("avatar-grid");
        grid.innerHTML = "";
        avatars.forEach(av => {
            const box = document.createElement("div");
            box.className = "avatar-box" + (av === selectedAvatarIcon ? " selected" : "");
            box.innerHTML = `<span class="avatar-img">${av}</span>`;
            box.onclick = () => {
                selectedAvatarIcon = av;
                document.querySelectorAll(".avatar-box").forEach(b => b.classList.remove("selected"));
                box.classList.add("selected");
            };
            grid.appendChild(box);
        });
    },

    saveCharacter: async function() {
        const name = document.getElementById("player-name-input").value.trim() || "Held";
        await set(ref(db, `rooms/${currentRoomId}/players/${localUid}`), {
            name: name, avatar: selectedAvatarIcon, gold: 0, xp: 0, level: 1
        });
        this.showScreen("main-game");
        this.listenToRoomData();
    },

    // 3. ECHTZEIT DATA SYNC
    listenToRoomData: function() {
        if(!currentRoomId) return;
        onValue(ref(db, `rooms/${currentRoomId}`), (snapshot) => {
            const data = snapshot.val();
            if(!data) return;
            this.renderQuests(data.quests || {});
            this.renderShop(data.shop || {});
            this.renderStats(data.players || {}, data.stats || {});
            
            const me = data.players[localUid];
            if(me) {
                document.getElementById('display-name').innerText = me.name;
                document.getElementById('display-avatar').innerText = me.avatar;
                document.getElementById('player-gold').innerText = me.gold;
                document.getElementById('player-xp').innerText = me.xp;
                document.getElementById('player-level').innerText = me.level;
                document.getElementById('next-level-xp').innerText = me.level * 100;
            }
        });
    },

    renderQuests: function(questsObj) {
        const container = document.getElementById("quest-list");
        container.innerHTML = "";
        Object.values(questsObj).forEach(quest => {
            if(currentFilter !== 'all' && quest.type !== currentFilter) return;

            const card = document.createElement('div');
            card.className = 'card' + (quest.completed ? ' completed-quest' : '');
            
            let btnHtml = `<button class="btn btn-green" onclick="app.completeQuest('${quest.id}', '${quest.type}', ${quest.reward})">Erledigt</button>`;
            let cdHtml = "";
            if(quest.completed) {
                btnHtml = `<button class="btn disabled-btn" disabled>✔ Safe</button>`;
                cdHtml = `<span class="cooldown-text">Wieder da: ${quest.type === 'woche' ? 'nächsten Montag' : 'zum 1.'}</span>`;
            }

            card.innerHTML = `
                <div class="card-info">
                    <div class="card-title">${quest.icon} ${quest.title}</div>
                    <div class="card-reward">+${quest.reward} Münzen/EP</div>
                    ${cdHtml}
                </div>
                <div class="card-action">${btnHtml}</div>
            `;
            container.appendChild(card);
        });
    },

    filterQuests: function(type) {
        currentFilter = type;
        document.querySelectorAll('.filter-bar .btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`f-${type}`).classList.add('active');
        this.listenToRoomData();
    },

    completeQuest: async function(qId, type, reward) {
        playSound('success');
        
        const pSnapshot = await get(ref(db, `rooms/${currentRoomId}/players/${localUid}`));
        let p = pSnapshot.val();
        p.gold += reward; p.xp += reward;
        if(p.xp >= p.level * 100) { p.xp -= p.level * 100; p.level++; this.showToast("LEVEL UP!"); }
        await set(ref(db, `rooms/${currentRoomId}/players/${localUid}`), p);

        if(type !== 'mini') {
            await update(ref(db, `rooms/${currentRoomId}/quests/${qId}`), { completed: true });
        }

        const sSnapshot = await get(ref(db, `rooms/${currentRoomId}/stats`));
        let s = sSnapshot.val() || { mini: 0, woche: 0, monat: 0 };
        s[type] = (s[type] || 0) + 1;
        await set(ref(db, `rooms/${currentRoomId}/stats`), s);
        
        this.showToast(`Quest geschafft! +${reward} Gold`);
    },

    renderShop: function(shopObj) {
        const container = document.getElementById("shop-list");
        container.innerHTML = "";
        Object.values(shopObj).forEach(item => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="card-info">
                    <div class="card-title">${item.icon} ${item.title}</div>
                    <div class="card-cost">Kosten: 🪙 ${item.cost}</div>
                </div>
                <div class="card-action">
                    <button class="btn" style="background:#d32f2f;" onclick="app.buyItem(${item.cost}, '${item.title}')">Einlösen</button>
                </div>
            `;
            container.appendChild(card);
        });
    },

    buyItem: async function(cost, title) {
        const pRef = ref(db, `rooms/${currentRoomId}/players/${localUid}`);
        const pSnapshot = await get(pRef);
        let p = pSnapshot.val();

        if (p.gold >= cost) {
            playSound('buy');
            p.gold -= cost;
            await set(pRef, p);
            this.showToast(`Eingelöst: ${title}!`);
        } else {
            playSound('fail');
            this.showToast("Zu wenig Münzen!");
        }
    },

    renderStats: function(playersObj, statsObj) {
        let total = (statsObj.mini || 0) + (statsObj.woche || 0) + (statsObj.monat || 0);
        let goalPercent = Math.min((total / 50) * 100, 100); // Angepasst auf 50 für die große Questliste
        document.getElementById('progress-goal-fill').style.width = `${goalPercent}%`;
        document.getElementById('progress-goal-text').innerText = `${total} Quests diesen Monat gelöst`;

        let maxVal = Math.max(statsObj.mini || 0, statsObj.woche || 0, statsObj.monat || 0, 1);
        document.getElementById('bar-mini').style.width = `${((statsObj.mini||0)/maxVal)*100}%`;
        document.getElementById('stat-count-mini').innerText = statsObj.mini || 0;
        document.getElementById('bar-woche').style.width = `${((statsObj.woche||0)/maxVal)*100}%`;
        document.getElementById('stat-count-woche').innerText = statsObj.woche || 0;
        document.getElementById('bar-monat').style.width = `${((statsObj.monat||0)/maxVal)*100}%`;
        document.getElementById('stat-count-monat').innerText = statsObj.monat || 0;

        const pArray = Object.entries(playersObj);
        const labelContainer = document.getElementById("vs-label-container");
        
        if(pArray.length >= 1) {
            let totalXp = 0;
            let p1Total = pArray[0][1].xp + (pArray[0][1].level-1)*100;
            
            pArray.forEach(p => {
                totalXp += p[1].xp + (p[1].level-1)*100;
            });

            let p1Percent = totalXp > 0 ? Math.round((p1Total / totalXp) * 100) : 50;
            let p2Percent = 100 - p1Percent;

            document.getElementById('vs-p1').style.width = `${p1Percent}%`;
            document.getElementById('vs-p1').innerText = `${p1Percent}%`;
            document.getElementById('vs-p2').style.width = `${p2Percent}%`;
            document.getElementById('vs-p2').innerText = `${p2Percent}%`;

            labelContainer.innerHTML = `<span style="color:var(--pixel-blue);">${pArray[0][1].name}</span> 
                                        <span style="color:var(--pixel-purple);">${pArray[1] ? pArray[1][1].name : 'Partner/in'}</span>`;
        }
    },

    // 4. ADMIN-MENÜ: LIVE-GENERATOR
    adminAddQuest: async function() {
        const title = document.getElementById("admin-q-title").value.trim();
        const icon = document.getElementById("admin-q-icon").value.trim() || "✨";
        const type = document.getElementById("admin-q-type").value;
        const reward = parseInt(document.getElementById("admin-q-reward").value);

        if(!title || !reward) return alert("Bitte Name und Belohnung eintragen!");
        const newKey = "q_" + Date.now();

        const newQuest = { id: newKey, title: title, type: type, reward: reward, icon: icon };
        if(type !== 'mini') newQuest.completed = false;

        await set(ref(db, `rooms/${currentRoomId}/quests/${newKey}`), newQuest);
        this.showToast("Quest live hinzugefügt!");
        
        document.getElementById("admin-q-title").value = "";
        document.getElementById("admin-q-reward").value = "";
    },

    adminAddShopItem: async function() {
        const title = document.getElementById("admin-s-title").value.trim();
        const icon = document.getElementById("admin-s-icon").value.trim() || "🪙";
        const cost = parseInt(document.getElementById("admin-s-cost").value);

        if(!title || !cost) return alert("Bitte Name und Kosten eintragen!");
        const newKey = "s_" + Date.now();

        await set(ref(db, `rooms/${currentRoomId}/shop/${newKey}`), {
            id: newKey, title: title, cost: cost, icon: icon
        });
        this.showToast("Shop-Item live hinzugefügt!");
        
        document.getElementById("admin-s-title").value = "";
        document.getElementById("admin-s-cost").value = "";
    },

    switchTab: function(tab) {
        document.querySelectorAll('.list-section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`section-${tab}`).classList.add('active');
        if(tab !== 'admin') document.getElementById(`tab-${tab}`).classList.add('active');
    },

    showScreen: function(id) {
        document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
        document.getElementById(id).classList.add("active");
    },

    showToast: function(text) {
        const toast = document.getElementById('toast'); toast.innerText = text; toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 2500);
    }
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        localUid = user.uid;
        if(!currentRoomId) app.showScreen("room-screen");
    } else {
        localUid = null;
        app.showScreen("auth-screen");
    }
});
