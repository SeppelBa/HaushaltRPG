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
  databaseURL: "https://haushaltrpg-default-rtdb.europe-west1.firebasedatabase.app" // Automatisch ergänzt für Europa-Server
};

const fApp = initializeApp(firebaseConfig);
const auth = getAuth(fApp);
const db = getDatabase(fApp);

// Standard Avatare für die Auswahl
const avatars = ["🧙‍♂️", "🥷", "🧝‍♀️", "🧑‍🚀", "⚔️", "🐈"];
let selectedAvatarIcon = "🧙‍♂️";
let currentRoomId = null;
let currentFilter = "all";
let localUid = null;

// Integrierter Web Audio API Synthesizer für Retro-Sounds
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
            
            // Standard-Katalog beim ersten Erstellen in den Cloud-Raum werfen
            await set(ref(db, `rooms/${roomId}`), {
                password: roomPass,
                stats: { mini: 0, woche: 0, monat: 0 },
                quests: {
                    "q1": { id: "q1", title: "Müll runterbringen", type: "mini", reward: 5, icon: "🗑️" },
                    "q2": { id: "q2", title: "Spülmaschine ausräumen", type: "mini", reward: 8, icon: "🍽️" },
                    "q3": { id: "q3", title: "Badezimmer komplett putzen", type: "woche", reward: 35, icon: "🚽", completed: false },
                    "q4": { id: "q4", title: "Wäsche falten & wegräumen", type: "woche", reward: 20, icon: "🧺", completed: false },
                    "q5": { id: "q5", title: "Bettwäsche wechseln & waschen", type: "monat", reward: 40, icon: "🛏️", completed: false },
                    "q6": { id: "q6", title: "Kühlschrank auswischen", type: "monat", reward: 60, icon: "🧊", completed: false },
                    "q7": { id: "q7", title: "Auto aussaugen", type: "monat", reward: 70, icon: "🚗", completed: false }
                },
                shop: {
                    "s1": { id: "s1", title: "Der andere bringt Snack ans Bett", cost: 40, icon: "🍿" },
                    "s2": { id: "s2", title: "1 Abend freie Film-Auswahl", cost: 90, icon: "🎬" },
                    "s3": { id: "s3", title: "10 Minuten Fußmassage", cost: 150, icon: "🦶" },
                    "s4": { id: "s4", title: "Lieblingsessen gekocht bekommen", cost: 350, icon: "🍔" }
                }
            });
            alert("Dein Cloud-Raum wurde erfolgreich erstellt!");
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

    // 3. ECHTZEIT DATA SYNC (Beide Handys hören hier live zu)
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
        let goalPercent = Math.min((total / 30) * 100, 100); 
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

    // 4. ADMIN-MENÜ: LIVE-GENERATOR IN DIE CLOUD
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

// Überwachung des Authentication-Status von Firebase
onAuthStateChanged(auth, (user) => {
    if (user) {
        localUid = user.uid;
        if(!currentRoomId) app.showScreen("room-screen");
    } else {
        localUid = null;
        app.showScreen("auth-screen");
    }
});
