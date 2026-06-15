import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, set, get, child, onValue, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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
let activeWheelQuestId = null;
let searchQuery = "";

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

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
    return weekNo;
}

const defaultQuests = {
    // --- MINI-QUESTS (40 Stück) ---
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
    "q11": { id: "q11", title: "Küchenspüle auswischen", type: "mini", reward: 3, icon: "🚰" },
    "q12": { id: "q12", title: "Bett ordentlich machen", type: "mini", reward: 2, icon: "🛏️" },
    "q13": { id: "q13", title: "Wäscheberge in Korb sortieren", type: "mini", reward: 2, icon: "🧦" },
    "q14": { id: "q14", title: "Schuhe im Flur ordnen", type: "mini", reward: 2, icon: "👟" },
    "q15": { id: "q15", title: "Gästehandtuch im Bad austauschen", type: "mini", reward: 3, icon: "🧼" },
    "q16": { id: "q16", title: "Einkaufstaschen wegräumen", type: "mini", reward: 2, icon: "🛍️" },
    "q17": { id: "q17", title: "Klopapier-Rolle erneuern", type: "mini", reward: 2, icon: "🧻" },
    "q18": { id: "q18", title: "Sofa-Kissen aufschütteln", type: "mini", reward: 2, icon: "🛋️" },
    "q19": { id: "q19", title: "Schreibtisch kurz aufräumen", type: "mini", reward: 5, icon: "💻" },
    "q20": { id: "q20", title: "Gelbe-Sack-Müll rausbringen", type: "mini", reward: 4, icon: "💛" },
    "q21": { id: "q21", title: "Papiermüll leeren", type: "mini", reward: 3, icon: "📦" },
    "q22": { id: "q22", title: "Handy-Display desinfizieren", type: "mini", reward: 2, icon: "📱" },
    "q23": { id: "q23", title: "10 Teile wegsortieren", type: "mini", reward: 3, icon: "🧺" },
    "q24": { id: "q24", title: "Flurkommode ordnen", type: "mini", reward: 3, icon: "🔑" },
    "q25": { id: "q25", title: "Obstkorb aussortieren", type: "mini", reward: 4, icon: "🍎" },
    "q26": { id: "q26", title: "Jacken an Garderobe hängen", type: "mini", reward: 2, icon: "🧥" },
    "q27": { id: "q27", title: "Toilettenbürste reinigen", type: "mini", reward: 5, icon: "🚽" },
    "q28": { id: "q28", title: "Spiegel kurz abwischen", type: "mini", reward: 3, icon: "🪞" },
    "q29": { id: "q29", title: "Fernseher abstauben", type: "mini", reward: 4, icon: "📺" },
    "q30": { id: "q30", title: "Wassernapf frisch auswaschen", type: "mini", reward: 3, icon: "🐈" },
    "q31": { id: "q31", title: "Badezimmerspiegel von Zahnpastaflecken befreien", type: "mini", reward: 2, icon: "🪞" },
    "q32": { id: "q32", title: "Verstreute Zeitschriften/Kataloge stapeln", type: "mini", reward: 2, icon: "📚" },
    "q33": { id: "q33", title: "Arbeitsplatte nach dem Kochen trockenwischen", type: "mini", reward: 3, icon: "🧽" },
    "q34": { id: "q34", title: "Leere Flaschen auf der Arbeitsplatte einsammeln", type: "mini", reward: 2, icon: "🍼" },
    "q35": { id: "q35", title: "Einen vollen Wäscheständer leerräumen", type: "mini", reward: 5, icon: "🧺" },
    "q36": { id: "q36", title: "Zwei alte Prospekte wegwerfen", type: "mini", reward: 1, icon: "🧾" },
    "q37": { id: "q37", title: "Haare aus der Haarbürste entfernen", type: "mini", reward: 2, icon: "🪮" },
    "q38": { id: "q38", title: "Gewürzregal kurz gerade rücken", type: "mini", reward: 3, icon: "🧂" },
    "q39": { id: "q39", title: "Katzenspielzeug in die Box werfen", type: "mini", reward: 2, icon: "🐭" },
    "q40": { id: "q40", title: "Fensterbrett kurz abpusten/wischen", type: "mini", reward: 2, icon: "🪴" },

    // --- WOCHEN-QUESTS (25 Stück) ---
    "q41": { id: "q41", title: "Wohnung komplett staubsaugen", type: "woche", reward: 25, icon: "🧹", completed: false },
    "q42": { id: "q42", title: "Badezimmer komplett putzen", type: "woche", reward: 35, icon: "🚽", completed: false },
    "q43": { id: "q43", title: "Böden wischen (Küche/Bad)", type: "woche", reward: 30, icon: "🍳", completed: false },
    "q44": { id: "q44", title: "Wäsche waschen & aufhängen", type: "woche", reward: 25, icon: "👕", completed: false },
    "q45": { id: "q45", title: "Wäsche falten & wegräumen", type: "woche", reward: 20, icon: "🧺", completed: false },
    "q46": { id: "q46", title: "Alle freien Oberflächen abwischen", type: "woche", reward: 20, icon: "🪶", completed: false },
    "q47": { id: "q47", title: "Altglas & Pfand wegbringen", type: "woche", reward: 15, icon: "🍾", completed: false },
    "q48": { id: "q48", title: "Haupt-Mülleimer auswischen", type: "woche", reward: 15, icon: "🗑️", completed: false },
    "q49": { id: "q49", title: "Großen Flurspiegel putzen", type: "woche", reward: 12, icon: "🪞", completed: false },
    "q50": { id: "q50", title: "Küchenarbeitsplatte putzen", type: "woche", reward: 15, icon: "🔪", completed: false },
    "q51": { id: "q51", title: "Katzenklo leeren & auswaschen", type: "woche", reward: 25, icon: "🐈", completed: false },
    "q52": { id: "q52", title: "Badematten waschen/schütteln", type: "woche", reward: 15, icon: "🧼", completed: false },
    "q53": { id: "q53", title: "Mikrowelle von innen reinigen", type: "woche", reward: 18, icon: "📻", completed: false },
    "q54": { id: "q54", title: "Küchenfronten abwischen", type: "woche", reward: 20, icon: "🚪", completed: false },
    "q55": { id: "q55", title: "Duschkabine entkalken", type: "woche", reward: 22, icon: "🚿", completed: false },
    "q56": { id: "q56", title: "Brotkasten auswischen", type: "woche", reward: 10, icon: "🍞", completed: false },
    "q57": { id: "q57", title: "Teppiche gründlich absaugen", type: "woche", reward: 18, icon: "🧶", completed: false },
    "q58": { id: "q58", title: "Handtücher einsammeln & kochen", type: "woche", reward: 15, icon: "🧺", completed: false },
    "q59": { id: "q59", title: "Wohnzimmertisch polieren", type: "woche", reward: 12, icon: "🪵", completed: false },
    "q60": { id: "q60", title: "Einkauf planen & Kühlschrank prüfen", type: "woche", reward: 10, icon: "📝", completed: false },
    "q61": { id: "q61", title: "Wasserkocher entkalken", type: "woche", reward: 12, icon: "🫖", completed: false },
    "q62": { id: "q62", title: "Wohnzimmerböden gründlich saugen", type: "woche", reward: 20, icon: "🧹", completed: false },
    "q63": { id: "q63", title: "Schlafzimmer entstauben", type: "woche", reward: 15, icon: "🪶", completed: false },
    "q64": { id: "q64", title: "Gemüsefach aussortieren", type: "woche", reward: 12, icon: "🥦", completed: false },
    "q65": { id: "q65", title: "Alle Seifenspender säubern & auffüllen", type: "woche", reward: 10, icon: "🧴", completed: false },

    // --- MONATS-QUESTS (25 Stück) ---
    "q66": { id: "q66", title: "Bettwäsche wechseln & waschen", type: "monat", reward: 40, icon: "🛏️", completed: false },
    "q67": { id: "q67", title: "Kühlschrank komplett auswischen", type: "monat", reward: 60, icon: "🧊", completed: false },
    "q68": { id: "q68", title: "Backofen tiefenreinigen", type: "monat", reward: 80, icon: "🔥", completed: false },
    "q69": { id: "q69", title: "Fenster putzen (Wohnbereich)", type: "monat", reward: 45, icon: "🖼️", completed: false },
    "q70": { id: "q70", title: "Fenster putzen (Schlafbereich)", type: "monat", reward: 45, icon: "🖼️", completed: false },
    "q71": { id: "q71", title: "Kaffeemaschine entkalken", type: "monat", reward: 30, icon: "☕", completed: false },
    "q72": { id: "q72", title: "Spülmaschine Tiefenpflege durchführen", type: "monat", reward: 35, icon: "🧼", completed: false },
    "q73": { id: "q73", title: "Auto komplett aussaugen", type: "monat", reward: 70, icon: "🚗", completed: false },
    "q74": { id: "q74", title: "Auto-Innenscheiben putzen", type: "monat", reward: 25, icon: "🧽", completed: false },
    "q75": { id: "q75", title: "Balkon / Terrasse gründlich fegen", type: "monat", reward: 40, icon: "🪵", completed: false },
    "q76": { id: "q76", title: "Abflüsse reinigen & spülen", type: "monat", reward: 50, icon: "💧", completed: false },
    "q77": { id: "q77", title: "Matratzen absaugen & wenden", type: "monat", reward: 35, icon: "🛏️", completed: false },
    "q78": { id: "q78", title: "Alle Klinken desinfizieren", type: "monat", reward: 30, icon: "🧽", completed: false },
    "q79": { id: "q79", title: "Waschmaschine Flusensieb säubern", type: "monat", reward: 45, icon: "🧼", completed: false },
    "q80": { id: "q80", title: "Heizkörper entstauben", type: "monat", reward: 30, icon: "♨️", completed: false },
    "q81": { id: "q81", title: "Fußleisten in der Wohnung wischen", type: "monat", reward: 55, icon: "🧹", completed: false },
    "q82": { id: "q82", title: "Dunstabzugshaube Filter reinigen", type: "monat", reward: 50, icon: "💨", completed: false },
    "q83": { id: "q83", title: "Duschvorhang waschen", type: "monat", reward: 35, icon: "🚿", completed: false },
    "q84": { id: "q84", title: "Vorratsschrank auswischen & MHD", type: "monat", reward: 45, icon: "🥫", completed: false },
    "q85": { id: "q85", title: "Kleiderschrank ausmisten & ordnen", type: "monat", reward: 60, icon: "👔", completed: false },
    "q86": { id: "q86", title: "Spiegelschrank im Bad wischen", type: "monat", reward: 40, icon: "🧴", completed: false },
    "q87": { id: "q87", title: "Lampenschirme & Leuchtmittel entstauben", type: "monat", reward: 35, icon: "💡", completed: false },
    "q88": { id: "q88", title: "Unter dem Sofa staubsaugen", type: "monat", reward: 50, icon: "🛋️", completed: false },
    "q89": { id: "q89", title: "Wohnungstür abwischen", type: "monat", reward: 30, icon: "🚪", completed: false },
    "q90": { id: "q90", title: "Kellerraum fegen / ordnen", type: "monat", reward: 65, icon: "📦", completed: false }
};

const defaultShop = {
    "s1": { id: "s1", title: "Snack ans Sofa gebracht kriegen", cost: 40, icon: "🍿" },
    "s2": { id: "s2", title: "1x Kaffee fertig ans Bett gebracht", cost: 50, icon: "☕" },
    "s3": { id: "s3", title: "Joker: Eine Mini-Quest sofort abgeben", cost: 60, icon: "🃏" },
    "s4": { id: "s4", title: "Der andere räumt deine Jacke weg", cost: 30, icon: "👟" },
    "s5": { id: "s5", title: "15 Minuten absolute Ruhe", cost: 45, icon: "🤫" },
    "s6": { id: "s6", title: "Der andere holt die Pakete ab", cost: 35, icon: "📦" },
    "s7": { id: "s7", title: "Lieblings-Song wird angemacht", cost: 20, icon: "🎵" },
    "s8": { id: "s8", title: "Der andere mixt dir ein Getränk", cost: 55, icon: "🍹" },
    "s9": { id: "s9", title: "Der andere holt das Ladekabel", cost: 25, icon: "🔌" },
    "s10": { id: "s10", title: "Ungestörtes Schaumbad nehmen", cost: 50, icon: "🛁" },
    "s11": { id: "s11", title: "Der andere schüttelt deine Decke auf", cost: 20, icon: "🛏️" },
    "s12": { id: "s12", title: "Kirschkernkissen gemacht kriegen", cost: 35, icon: "🔥" },
    "s13": { id: "s13", title: "Der andere lüftet das Zimmer", cost: 15, icon: "🪟" },
    "s14": { id: "s14", title: "Ein Glas Wasser gebracht kriegen", cost: 15, icon: "🥛" },
    "s15": { id: "s15", title: "Eis aus der Truhe serviert kriegen", cost: 40, icon: "🍦" },
    "s16": { id: "s16", title: "1 Abend freie Filmwahl", cost: 90, icon: "🎬" },
    "s17": { id: "s17", title: "1 Tag kein Spülmaschinendienst", cost: 120, icon: "🍽️" },
    "s18": { id: "s18", title: "10 Minuten Fußmassage beim Streamen", cost: 150, icon: "🦶" },
    "s19": { id: "s19", title: "15 Minuten Rückenmassage", cost: 200, icon: "💆‍♂️" },
    "s20": { id: "s20", title: "Wochenend-Essen bestellen bestimmen", cost: 100, icon: "🍕" },
    "s21": { id: "s21", title: "Spieleabend-Wahl (Du bestimmst)", cost: 80, icon: "🎲" },
    "s22": { id: "s22", title: "Der andere brings den Müll weg", cost: 65, icon: "🗑️" },
    "s23": { id: "s23", title: "Beim nächsten Streit 'Recht haben'", cost: 150, icon: "⚖️" },
    "s24": { id: "s24", title: "Lieblings-Frühstück gekocht kriegen", cost: 110, icon: "🥞" },
    "s25": { id: "s25", title: "1 Tag komplett haushaltsfrei", cost: 180, icon: "🛌" },
    "s26": { id: "s26", title: "Der andere schneidet deine Haare", cost: 130, icon: "✂️" },
    "s27": { id: "s27", title: "Playlist-Herrschaft im Auto", cost: 75, icon: "🚗" },
    "s28": { id: "s28", title: "Der andere trägt 1h ein Clowns-Outfit", cost: 140, icon: "🤡" },
    "s29": { id: "s29", title: "1 Abend lang die Konsolen-Herrschaft", cost: 100, icon: "🎮" },
    "s30": { id: "s30", title: "Nächstes Ausflugsziel bestimmen", cost: 120, icon: "🗺️" },
    "s31": { id: "s31", title: "Ein ehrliches Kompliment kriegen", cost: 30, icon: "💬" },
    "s32": { id: "s32", title: "Gute-Nacht-Geschichte vorgelesen kriegen", cost: 60, icon: "📖" },
    "s33": { id: "s33", title: "Veto-Recht bei einer Serienfolge", cost: 95, icon: "🚫" },
    "s34": { id: "s34", title: "Der andere räumt den Tisch allein ab", cost: 70, icon: "🧼" },
    "s35": { id: "s35", title: "Der andere holt morgen Brötchen", cost: 100, icon: "🥐" },
    "s36": { id: "s36", title: "Wochenende ungestört ausschlafen", cost: 250, icon: "💤" },
    "s37": { id: "s37", title: "3-Gänge-Lieblingsessen gekocht kriegen", cost: 350, icon: "🍔" },
    "s38": { id: "s38", title: "Der andere macht Wocheneinkauf allein", cost: 400, icon: "🛒" },
    "s39": { id: "s39", title: "Der andere putzt das Bad allein", cost: 300, icon: "🧼" },
    "s40": { id: "s40", title: "Der andere bügelt deine Wäsche", cost: 350, icon: "👔" },
    "s41": { id: "s41", title: "45 Minuten Wellness-Massage", cost: 500, icon: "🧴" },
    "s42": { id: "s42", title: "Der andere reinigt das Auto komplett", cost: 450, icon: "🚗" },
    "s43": { id: "s43", title: "Komplett bezahltes Überraschungs-Date", cost: 600, icon: "🌹" },
    "s44": { id: "s44", title: "Der andere übernimmt Wochenaufgabe", cost: 280, icon: "📝" },
    "s45": { id: "s45", title: "LEGENDÄR: Ein ganzes Verwöhn-Wochenende!", cost: 1000, icon: "👑" },
    "s46": { id: "s46", title: "Der andere putzt alle Fenster allein", cost: 550, icon: "🖼️" },
    "s47": { id: "s47", title: "Wunsch-Geschenk bis zu 20€ spendiert kriegen", cost: 700, icon: "🎁" },
    "s48": { id: "s48", title: "1 Woche Küchendienst vom Partner", cost: 650, icon: "🍳" },
    "s49": { id: "s49", title: "Der andere repariert ein Möbelstück", cost: 500, icon: "🛠️" },
    "s50": { id: "s50", title: "🛡️ IMMUNITÄT: 1 Woche haushaltsfrei!", cost: 1200, icon: "🛡️" }
};

window.app = {
    initAutoLogin: function() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                localUid = user.uid;
                const savedRoomId = localStorage.getItem("h_room_id");
                if (savedRoomId) {
                    currentRoomId = savedRoomId;
                    this.showScreen("main-game");
                    await this.checkAndUpdateStreak();
                    await this.checkAndTriggerTimeResets();
                    this.listenToRoomData();
                } else { this.showScreen("room-screen"); }
            } else { localUid = null; this.showScreen("auth-screen"); }
        });
    },

    handleAuth: async function(type) {
        const email = document.getElementById("auth-email").value.trim();
        const password = document.getElementById("auth-password").value.trim();
        if(!email || !password) return alert("Felder ausfüllen!");
        try {
            if(type === 'register') { await createUserWithEmailAndPassword(auth, email, password); alert("Account erstellt!"); }
            else { await signInWithEmailAndPassword(auth, email, password); }
        } catch (error) { alert("Fehler: " + error.message); }
    },

    logout: function() {
        localStorage.removeItem("h_room_id");
        signOut(auth);
    },

    handleRoom: async function(type) {
        const roomId = document.getElementById("room-id").value.trim().replace(/[^a-zA-Z0-9]/g, "");
        const roomPass = document.getElementById("room-password").value.trim();
        if(!roomId || !roomPass) return alert("Daten unvollständig!");

        const dbRef = ref(db);
        if(type === 'create') {
            const snapshot = await get(child(dbRef, `rooms/${roomId}`));
            if(snapshot.exists()) return alert("Raum existiert schon!");
            
            const now = new Date();
            await set(ref(db, `rooms/${roomId}`), {
                password: roomPass,
                stats: { mini: 0, woche: 0, monat: 0, totalCleaned: 0, bossHp: 1000 },
                quests: defaultQuests,
                shop: defaultShop,
                achievements: { "king": false, "knight": false, "rich": false },
                lastResetWeek: getWeekNumber(now),
                lastResetMonth: now.getMonth()
            });
            alert("Raum generiert!");
        }

        const snapshot = await get(child(dbRef, `rooms/${roomId}`));
        if(!snapshot.exists()) return alert("Raum existiert nicht!");
        if(snapshot.val().password !== roomPass) return alert("Falsches Passwort!");

        currentRoomId = roomId;
        localStorage.setItem("h_room_id", roomId);
        this.checkPlayerProfile();
    },

    checkAndTriggerTimeResets: async function() {
        const roomSnapshot = await get(ref(db, `rooms/${currentRoomId}`));
        if(!roomSnapshot.exists()) return;
        const roomData = roomSnapshot.val();

        const now = new Date();
        const currentWeek = getWeekNumber(now);
        const currentMonth = now.getMonth();

        let updates = {};
        let needsUpdate = false;

        if (roomData.lastResetWeek !== currentWeek) {
            Object.keys(roomData.quests).forEach(qKey => {
                if (roomData.quests[qKey].type === 'woche') {
                    updates[`quests/${qKey}/completed`] = false;
                }
            });
            updates["lastResetWeek"] = currentWeek;
            needsUpdate = true;
        }

        if (roomData.lastResetMonth !== currentMonth) {
            Object.keys(roomData.quests).forEach(qKey => {
                if (roomData.quests[qKey].type === 'monat') {
                    updates[`quests/${qKey}/completed`] = false;
                }
            });
            updates["stats/bossHp"] = 1000;
            updates["lastResetMonth"] = currentMonth;
            needsUpdate = true;
        }

        if (needsUpdate) {
            await update(ref(db, `rooms/${currentRoomId}`), updates);
            this.showToast("⏳ Ein neuer Zyklus hat begonnen!");
        }
    },

    leaveRoom: function() { localStorage.removeItem("h_room_id"); currentRoomId = null; this.showScreen("room-screen"); },

    checkPlayerProfile: async function() {
        const snapshot = await get(ref(db, `rooms/${currentRoomId}/players/${localUid}`));
        if(snapshot.exists()) {
            this.showScreen("main-game");
            this.checkAndUpdateStreak();
            this.listenToRoomData();
        } else { this.showScreen("char-screen"); this.buildAvatarGrid(); }
    },

    buildAvatarGrid: function() {
        const grid = document.getElementById("avatar-grid"); grid.innerHTML = "";
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
        const todayStr = new Date().toDateString();
        await set(ref(db, `rooms/${currentRoomId}/players/${localUid}`), {
            name: name, avatar: selectedAvatarIcon, gold: 0, xp: 0, level: 1,
            streak: 1, lastLoginDate: todayStr,
            wheelClaimsToday: 0, wheelRerollsToday: 0, lastWheelDate: todayStr
        });
        this.showScreen("main-game");
        this.listenToRoomData();
    },

    checkAndUpdateStreak: async function() {
        const pRef = ref(db, `rooms/${currentRoomId}/players/${localUid}`);
        const snapshot = await get(pRef); if(!snapshot.exists()) return;
        let p = snapshot.val();
        const todayStr = new Date().toDateString();
        
        if (p.lastLoginDate !== todayStr) {
            const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
            if (p.lastLoginDate === yesterday.toDateString()) { p.streak = (p.streak || 0) + 1; } 
            else { p.streak = 1; }
            p.lastLoginDate = todayStr;
            await set(pRef, p);
        }
    },

    listenToRoomData: function() {
        if(!currentRoomId) return;
        onValue(ref(db, `rooms/${currentRoomId}`), (snapshot) => {
            const data = snapshot.val(); if(!data) return;
            this.renderQuests(data.quests || {});
            this.renderShop(data.shop || {});
            this.renderStats(data.players || {}, data.stats || {}, data.achievements || {});
            
            // --- NEU: DYNAMISCHER MULTIPLAYER DATA SYNC FÜR DAS DUO-DASHBOARD ---
            const pEntries = Object.entries(data.players || {});
            let me = null;
            let partner = null;

            pEntries.forEach(([uid, profile]) => {
                if (uid === localUid) { me = profile; } 
                else { partner = profile; }
            });

            // 1. Eigene Werte ins linke Dashboard schreiben
            if(me) {
                document.getElementById('display-name').innerText = me.name;
                document.getElementById('display-avatar').innerText = me.avatar;
                document.getElementById('player-gold').innerText = me.gold;
                document.getElementById('player-xp').innerText = me.xp;
                document.getElementById('player-level').innerText = me.level;
                document.getElementById('next-level-xp').innerText = me.level * 100;
                document.getElementById('player-streak').innerText = me.streak || 1;
                document.getElementById('streak-bonus-text').innerText = me.streak >= 3 ? "(+10% Gold Bonus!)" : "";
            }

            // 2. Partner-Werte ins rechte Dashboard schreiben (falls beigetreten)
            if(partner) {
                document.getElementById('partner-name').innerText = partner.name;
                document.getElementById('partner-avatar').innerText = partner.avatar;
                document.getElementById('partner-gold').innerText = partner.gold;
                document.getElementById('partner-xp').innerText = partner.xp;
                document.getElementById('partner-level').innerText = partner.level;
                document.getElementById('partner-next-xp').innerText = partner.level * 100;
                document.getElementById('partner-streak').innerText = partner.streak || 1;
            } else {
                // Ausweichtext, wenn man noch alleine im Raum ist
                document.getElementById('partner-name').innerText = "Warten...";
                document.getElementById('partner-avatar').innerText = "❓";
            }

            // Schicksalsrad Anzeige
            if(me) {
                const todayStr = new Date().toDateString();
                let claims = me.lastWheelDate === todayStr ? (me.wheelClaimsToday || 0) : 0;
                let rerolls = me.lastWheelDate === todayStr ? (me.wheelRerollsToday || 0) : 0;
                document.getElementById("wheel-left-count").innerText = `${3 - claims} / 3`;
                document.getElementById("wheel-rerolls-count").innerText = `${3 - rerolls} / 3`;
            }
        });
    },

    handleSearch: function() {
        searchQuery = document.getElementById("quest-search").value.toLowerCase().trim();
        this.listenToRoomData();
    },

    spinWheel: async function() {
        const pRef = ref(db, `rooms/${currentRoomId}/players/${localUid}`);
        const pSnapshot = await get(pRef);
        let p = pSnapshot.val();
        const todayStr = new Date().toDateString();
        if (p.lastWheelDate !== todayStr) { p.wheelClaimsToday = 0; p.wheelRerollsToday = 0; p.lastWheelDate = todayStr; }
        if ((p.wheelClaimsToday || 0) >= 3) { playSound('fail'); return alert("Limit erreicht!"); }

        playSound('buy');
        const wheelBtn = document.getElementById('wheel-btn');
        const wheelResult = document.getElementById('wheel-result');
        wheelBtn.disabled = true;
        wheelResult.innerHTML = "Wähle Quest...";

        get(ref(db, `rooms/${currentRoomId}/quests`)).then(async (snapshot) => {
            const questsList = Object.values(snapshot.val() || {}).filter(q => !q.completed);
            if(questsList.length === 0) { wheelResult.innerHTML = "Alle Quests geschafft!"; wheelBtn.disabled = false; return; }
            
            const randomQuest = questsList[Math.floor(Math.random() * questsList.length)];
            activeWheelQuestId = randomQuest.id;
            
            let rerollBtnHtml = `<button class="btn" style="margin:0; background:#444; flex:1; font-size:18px;" onclick="app.rerollWheel()">🔄 Passt nicht (${3 - (p.wheelRerollsToday || 0)} Rerolls)</button>`;
            if ((p.wheelRerollsToday || 0) >= 3) {
                rerollBtnHtml = `<button class="btn disabled-btn" style="margin:0; flex:1; font-size:16px;" disabled>Keine Rerolls mehr</button>`;
            }

            wheelResult.innerHTML = `
                <div style="margin: 15px 0; padding: 10px; background: #222230; border: 2px dashed var(--pixel-accent);">
                    <span style="font-size: 24px; display: block; margin-bottom: 10px;">🎯 Ziel: ${randomQuest.icon} ${randomQuest.title}</span>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-green" style="margin: 0; flex: 1;" onclick="app.completeQuest('${randomQuest.id}', '${randomQuest.type}', ${randomQuest.reward})">Hier direkt abgeben!</button>
                        ${rerollBtnHtml}
                    </div>
                </div>`;
            await set(pRef, p);
        });
    },

    rerollWheel: async function() {
        const pRef = ref(db, `rooms/${currentRoomId}/players/${localUid}`);
        const pSnapshot = await get(pRef); let p = pSnapshot.val();
        p.wheelRerollsToday = (p.wheelRerollsToday || 0) + 1;
        await set(pRef, p);
        activeWheelQuestId = null;
        this.spinWheel();
    },

    renderQuests: function(questsObj) {
        const container = document.getElementById("quest-list"); container.innerHTML = "";
        Object.values(questsObj).forEach(quest => {
            if(currentFilter !== 'all' && quest.type !== currentFilter) return;
            if(searchQuery !== "" && !quest.title.toLowerCase().includes(searchQuery)) return;

            const card = document.createElement('div'); card.className = 'card' + (quest.completed ? ' completed-quest' : '');
            let btnHtml = `<button class="btn btn-green" onclick="app.completeQuest('${quest.id}', '${quest.type}', ${quest.reward})">Erledigt</button>`;
            let cdHtml = "";
            if(quest.completed) {
                btnHtml = `<button class="btn disabled-btn" disabled>✔ Safe</button>`;
                cdHtml = `<span class="cooldown-text">Wieder da: ${quest.type === 'woche' ? 'nächsten Montag' : 'zum 1.'}</span>`;
            }
            card.innerHTML = `
                <div class="card-info">
                    <div class="card-title">${quest.icon} ${quest.title}</div>
                    <div class="card-reward">+${quest.reward} Münzen ${activeWheelQuestId === quest.id ? '<span style="color:var(--pixel-accent);">(Joker!)</span>' : ''}</div>
                    ${cdHtml}
                </div><div class="card-action">${btnHtml}</div>`;
            container.appendChild(card);
        });
    },

    filterQuests: function(type) { currentFilter = type; document.querySelectorAll('.filter-bar .btn').forEach(b => b.classList.remove('active')); document.getElementById(`f-${type}`).classList.add('active'); this.listenToRoomData(); },

    completeQuest: async function(qId, type, reward) {
        playSound('success');
        const pSnapshot = await get(ref(db, `rooms/${currentRoomId}/players/${localUid}`));
        let p = pSnapshot.val();
        
        let finalReward = reward;
        if (activeWheelQuestId === qId) {
            finalReward = reward * 2; activeWheelQuestId = null;
            document.getElementById('wheel-result').innerHTML = "";
            document.getElementById('wheel-btn').disabled = false;
            p.wheelClaimsToday = (p.wheelClaimsToday || 0) + 1;
        }
        
        if (p.streak >= 3) finalReward = Math.round(finalReward * 1.1);
        p.gold += finalReward; p.xp += finalReward;
        if(p.xp >= p.level * 100) { p.xp -= p.level * 100; p.level++; this.showToast("LEVEL UP!"); }
        await set(ref(db, `rooms/${currentRoomId}/players/${localUid}`), p);

        if(type !== 'mini') await update(ref(db, `rooms/${currentRoomId}/quests/${qId}`), { completed: true });

        const sSnapshot = await get(ref(db, `rooms/${currentRoomId}/stats`));
        let s = sSnapshot.val() || { mini: 0, woche: 0, monat: 0, totalCleaned: 0, bossHp: 1000 };
        s[type] = (s[type] || 0) + 1; s.totalCleaned = (s.totalCleaned || 0) + 1;
        let damage = type === 'mini' ? 5 : (type === 'woche' ? 25 : 70);
        s.bossHp = Math.max((s.bossHp || 1000) - damage, 0);
        await set(ref(db, `rooms/${currentRoomId}/stats`), s);
        
        this.validateAchievements(s.mini, s.monat, p.gold);
        this.showToast(`Quest geschafft! +${finalReward} Gold`);
    },

    validateAchievements: async function(miniCount, monatCount, currentGold) {
        let updates = {};
        if(miniCount >= 50) updates["king"] = true; if(monatCount >= 5) updates["knight"] = true; if(currentGold >= 1500) updates["rich"] = true;
        if(Object.keys(updates).length > 0) await update(ref(db, `rooms/${currentRoomId}/achievements`), updates);
    },

    renderShop: function(shopObj) {
        const container = document.getElementById("shop-list"); container.innerHTML = "";
        Object.values(shopObj).forEach(item => {
            const card = document.createElement('div'); card.className = 'card';
            card.innerHTML = `
                <div class="card-info"><div class="card-title">${item.icon} ${item.title}</div><div class="card-cost">Kosten: 🪙 ${item.cost}</div></div>
                <div class="card-action"><button class="btn" style="background:#d32f2f;" onclick="app.buyItem(${item.cost}, '${item.title}', '${item.icon}')">Kaufen</button></div>`;
            container.appendChild(card);
        });
    },

    buyItem: async function(cost, title, icon) {
        const pRef = ref(db, `rooms/${currentRoomId}/players/${localUid}`);
        const pSnapshot = await get(pRef); let p = pSnapshot.val();
        if (p.gold >= cost) {
            playSound('buy'); p.gold -= cost; await set(pRef, p);

            const invKey = "inv_" + Date.now();
            await set(ref(db, `rooms/${currentRoomId}/inventory/${invKey}`), {
                id: invKey, title: title, icon: icon, ownerName: p.name, ownerUid: localUid
            });
            this.showToast(`Gutschein gesichert!`);
        } else { playSound('fail'); this.showToast("Zu wenig Münzen!"); }
    },

    claimInventoryItem: async function(invKey) {
        playSound('success');
        await set(ref(db, `rooms/${currentRoomId}/inventory/${invKey}`), null);
        this.showToast("Gutschein eingelöst!");
    },

    renderStats: function(playersObj, statsObj, achObj) {
        let hp = statsObj.bossHp !== undefined ? statsObj.bossHp : 1000;
        let hpPercent = (hp / 1000) * 100;
        document.getElementById('boss-hp-fill').style.width = `${hpPercent}%`;
        document.getElementById('boss-hp-text').innerText = hp <= 0 ? "⚔️ BESIEGT!" : `${hp} / 1000 HP`;

        let total = (statsObj.mini || 0) + (statsObj.woche || 0) + (statsObj.monat || 0);
        let goalPercent = Math.min((total / 50) * 100, 100);
        document.getElementById('progress-goal-fill').style.width = `${goalPercent}%`;
        document.getElementById('progress-goal-text').innerText = `${total} / 50 Quests gelöst`;

        const achContainer = document.getElementById("achievements-list");
        achContainer.innerHTML = `
            <div>${achObj.king ? "👑" : "🔒"} <b>Müll-König</b> (50 Mini)</div>
            <div>${achObj.knight ? "⚔️" : "🔒"} <b>Sanitär-Ritter</b> (5 Monat)</div>
            <div>${achObj.rich ? "💰" : "🔒"} <b>Großverdiener</b> (1500 Münzen)</div>`;

        get(ref(db, `rooms/${currentRoomId}/inventory`)).then((invSnapshot) => {
            const invContainer = document.getElementById("inventory-list");
            invContainer.innerHTML = "";
            const invData = invSnapshot.val();
            if(!invData) { invContainer.innerHTML = '<div style="color:#777; text-align:center;">Keine offenen Gutscheine vorrätig.</div>'; return; }
            
            Object.values(invData).forEach(item => {
                const row = document.createElement("div"); row.className = "card"; row.style.borderColor = "var(--pixel-blue)";
                let actionBtnHtml = `<button class="btn btn-green" style="margin:0; font-size:16px; padding:4px;" onclick="app.claimInventoryItem('${item.id}')">Gefallen einfordern!</button>`;
                if (item.ownerUid === localUid) { actionBtnHtml = `<span style="font-size:16px; color:#666;">Wartet auf Partner</span>`; }
                row.innerHTML = `
                    <div class="card-info">
                        <div class="card-title" style="font-size:20px;">${item.icon} ${item.title}</div>
                        <div style="font-size:14px; color:#aaa;">Gekauft von: ${item.ownerName}</div>
                    </div><div class="card-action" style="min-width:130px;">${actionBtnHtml}</div>`;
                invContainer.appendChild(row);
            });
        });

        let maxVal = Math.max(statsObj.mini || 0, statsObj.woche || 0, statsObj.monat || 0, 1);
        document.getElementById('bar-mini').style.width = `${((statsObj.mini||0)/maxVal)*100}%`; document.getElementById('stat-count-mini').innerText = statsObj.mini || 0;
        document.getElementById('bar-woche').style.width = `${((statsObj.woche||0)/maxVal)*100}%`; document.getElementById('stat-count-woche').innerText = statsObj.woche || 0;
        document.getElementById('bar-monat').style.width = `${((statsObj.monat||0)/maxVal)*100}%`; document.getElementById('stat-count-monat').innerText = statsObj.monat || 0;

        const pArray = Object.entries(playersObj); const labelContainer = document.getElementById("vs-label-container");
        if(pArray.length >= 1) {
            let totalXp = 0; let p1Total = pArray[0][1].xp + (pArray[0][1].level-1)*100;
            pArray.forEach(p => { totalXp += p[1].xp + (p[1].level-1)*100; });
            let p1Percent = totalXp > 0 ? Math.round((p1Total / totalXp) * 100) : 50;
            let p2Percent = 100 - p1Percent;
            document.getElementById('vs-p1').style.width = `${p1Percent}%`; document.getElementById('vs-p1').innerText = `${p1Percent}%`;
            document.getElementById('vs-p2').style.width = `${p2Percent}%`; document.getElementById('vs-p2').innerText = `${p2Percent}%`;
            labelContainer.innerHTML = `<span style="color:var(--pixel-blue);">${pArray[0][1].name}</span> <span style="color:var(--pixel-purple);">${pArray[1] ? pArray[1][1].name : 'Partner/in'}</span>`;
        }
    },

    adminAddQuest: async function() {
        const title = document.getElementById("admin-q-title").value.trim(); const icon = document.getElementById("admin-q-icon").value.trim() || "✨"; const type = document.getElementById("admin-q-type").value; const reward = parseInt(document.getElementById("admin-q-reward").value);
        if(!title || !reward) return alert("Fehler!"); const newKey = "q_" + Date.now(); const newQuest = { id: newKey, title: title, type: type, reward: reward, icon: icon }; if(type !== 'mini') newQuest.completed = false;
        await set(ref(db, `rooms/${currentRoomId}/quests/${newKey}`), newQuest); this.showToast("Quest gespeichert!"); document.getElementById("admin-q-title").value = ""; document.getElementById("admin-q-reward").value = "";
    },

    adminAddShopItem: async function() {
        const title = document.getElementById("admin-s-title").value.trim(); const icon = document.getElementById("admin-s-icon").value.trim() || "🪙"; const cost = parseInt(document.getElementById("admin-s-cost").value);
        if(!title || !cost) return alert("Fehler!"); const newKey = "s_" + Date.now(); await set(ref(db, `rooms/${currentRoomId}/shop/${newKey}`), { id: newKey, title: title, cost: cost, icon: icon }); this.showToast("Shop-Item gespeichert!"); document.getElementById("admin-s-title").value = ""; document.getElementById("admin-s-cost").value = "";
    },

    switchTab: function(tab) {
        document.querySelectorAll('.list-section').forEach(s => s.classList.remove('active')); document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); document.getElementById(`section-${tab}`).classList.add('active'); if(tab !== 'admin') document.getElementById(`tab-${tab}`).classList.add('active');
    },

    showScreen: function(id) { document.querySelectorAll(".screen").forEach(s => s.classList.remove("active")); document.getElementById(id).classList.add("active"); },
    showToast: function(text) { const toast = document.getElementById('toast'); toast.innerText = text; toast.style.display = 'block'; setTimeout(() => { toast.style.display = 'none'; }, 2500); }
};

app.initAutoLogin();
