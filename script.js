let config = { players: 3, impostors: 1 };
let gameState = { 
    players: [], 
    currentIndex: 0, 
    secretWord: "", 
    votes: {}, 
    totalVotesCast: 0, 
    actualImpsCount: 0 
};

const DICCIONARIO = { 
    "Fútbol": ["Messi", "VAR", "Pelota", "Estadio", "Gol", "Corner", "Atajada", "Cancha", "Árbitro", "Mundial"],
    "Cine": ["Oscar", "Director", "Actor", "Estreno", "Guión", "Cámara", "Popcorn", "Efectos", "Escena", "Titanic"],
    "Comida": ["Asado", "Pizza", "Sushi", "Hamburguesa", "Tacos", "Pasta", "Milanesa", "Postre", "Fernet", "Mate"]
};

window.onload = () => {
    updateUI();
};

function showScreen(id) {
    const screens = ['home', 'config', 'reveal', 'lobby', 'vote', 'result'];
    screens.forEach(s => document.getElementById('screen-' + s)?.classList.add('hidden'));
    document.getElementById('screen-' + id)?.classList.remove('hidden');
    window.scrollTo(0, 0);
}

function changeVal(type, delta) {
    if (type === 'players') {
        config.players = Math.max(3, Math.min(12, config.players + delta));
        if (config.impostors > config.players) config.impostors = config.players;
    } else if (type === 'impostors') {
        config.impostors = Math.max(1, Math.min(config.players, config.impostors + delta));
    }
    updateUI();
}

function updateUI() {
    document.getElementById('v-players').innerText = config.players;
    document.getElementById('v-impostors').innerText = config.impostors;
    renderNames();
}

function renderNames() {
    const container = document.getElementById('names-container');
    const existing = Array.from(document.querySelectorAll('.player-name')).map(i => i.value);
    container.innerHTML = '';
    for (let i = 0; i < config.players; i++) {
        container.innerHTML += `<input type="text" placeholder="Jugador ${i+1}" value="${existing[i] || ''}" class="player-name w-full p-4 rounded-2xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-cyan-500 transition-all text-sm uppercase font-bold">`;
    }
}

function startGame() {
    const names = Array.from(document.querySelectorAll('.player-name')).map(i => i.value.trim());
    if (names.some(n => n === "")) return alert("¡Faltan nombres!");
    ejecutarSorteo(names);
}

function ejecutarSorteo(names) {
    gameState.currentIndex = 0;
    gameState.votes = {};
    gameState.totalVotesCast = 0;

    // Palabra
    const themes = Array.from(document.querySelectorAll('.category-chip.active')).map(b => b.innerText);
    let pool = themes.flatMap(t => DICCIONARIO[t] || []);
    gameState.secretWord = pool.length ? pool[Math.floor(Math.random() * pool.length)] : "SECRETO";

    // Impostores
    const randomImps = document.getElementById('check-random').checked;
    gameState.actualImpsCount = randomImps ? Math.floor(Math.random() * config.impostors) + 1 : config.impostors;

    // Roles
    gameState.players = names.map(n => ({ name: n, role: 'citizen', alive: true }));
    let assigned = 0;
    while(assigned < gameState.actualImpsCount) {
        let idx = Math.floor(Math.random() * gameState.players.length);
        if(gameState.players[idx].role !== 'impostor') {
            gameState.players[idx].role = 'impostor';
            assigned++;
        }
    }

    const alertBox = document.getElementById('total-imps-alert');
    if(document.getElementById('check-show-count').checked) {
        alertBox.innerText = `ATENCIÓN: HAY ${gameState.actualImpsCount} IMPOSTOR(ES)`;
        alertBox.classList.remove('hidden');
    } else {
        alertBox.classList.add('hidden');
    }

    showScreen('reveal');
    setupTurn();
}

function setupTurn() {
    const p = gameState.players[gameState.currentIndex];
    document.getElementById('current-player-name').innerText = p.name;
    document.getElementById('card-hidden').classList.remove('hidden');
    document.getElementById('card-visible').classList.add('hidden');
}

function revealWord() {
    const p = gameState.players[gameState.currentIndex];
    const d = document.getElementById('secret-word-display');
    if (p.role === 'impostor') {
        d.innerText = "SOS EL IMPOSTOR";
        d.className = "text-2xl font-black text-red-500 italic";
    } else {
        d.innerText = gameState.secretWord;
        d.className = "text-3xl font-black text-slate-900";
    }
    document.getElementById('card-hidden').classList.add('hidden');
    document.getElementById('card-visible').classList.remove('hidden');
}

function nextTurn() {
    gameState.currentIndex++;
    if(gameState.currentIndex < gameState.players.length) {
        setupTurn();
    } else {
        irADebate();
    }
}

function irADebate() {
    const vivos = gameState.players.filter(p => p.alive);
    document.getElementById('starter-name').innerText = vivos[Math.floor(Math.random() * vivos.length)].name;
    showScreen('lobby');
}

function goToVote() {
    const container = document.getElementById('vote-container');
    const vivos = gameState.players.filter(p => p.alive);
    gameState.totalVotesCast = 0;
    gameState.votes = {};
    container.innerHTML = '';
    vivos.forEach(p => {
        gameState.votes[p.name] = 0;
        container.innerHTML += `
            <div class="glass p-4 rounded-2xl flex items-center justify-between border border-white/5">
                <span class="font-bold text-xs uppercase text-slate-300">${p.name}</span>
                <div class="flex items-center gap-4">
                    <button onclick="changeVote('${p.name}', -1)" class="w-10 h-10 rounded-lg bg-slate-800 text-red-400 font-bold">-</button>
                    <span id="vote-${p.name}" class="text-xl font-black w-4 text-center">0</span>
                    <button onclick="changeVote('${p.name}', 1)" class="w-10 h-10 rounded-lg bg-slate-800 text-green-400 font-bold">+</button>
                </div>
            </div>`;
    });
    document.getElementById('remaining-votes').innerText = vivos.length;
    showScreen('vote');
}

function changeVote(name, delta) {
    const vivosCount = gameState.players.filter(p => p.alive).length;
    if(delta > 0 && gameState.totalVotesCast >= vivosCount) return;
    if(delta < 0 && gameState.votes[name] <= 0) return;
    gameState.votes[name] += delta;
    gameState.totalVotesCast += delta;
    document.getElementById('vote-' + name).innerText = gameState.votes[name];
    document.getElementById('remaining-votes').innerText = vivosCount - gameState.totalVotesCast;
}

function processResults() {
    let max = -1; let votedOut = null; let tie = false;
    for(let n in gameState.votes) {
        if(gameState.votes[n] > max) { max = gameState.votes[n]; votedOut = n; tie = false; }
        else if(gameState.votes[n] === max && max > 0) tie = true;
    }
    if(tie || max === 0) { alert("Empate o nadie votó."); return irADebate(); }

    const player = gameState.players.find(p => p.name === votedOut);
    player.alive = false;
    
    const imps = gameState.players.filter(p => p.role === 'impostor' && p.alive).length;
    const cits = gameState.players.filter(p => p.role === 'citizen' && p.alive).length;

    document.getElementById('result-title').innerText = player.role === 'impostor' ? "ERA EL IMPOSTOR" : "ERA CIUDADANO";
    document.getElementById('result-status-icon').innerText = player.role === 'impostor' ? "🔥" : "💀";
    
    const btn = document.getElementById('btn-next-action');
    if(imps === 0 || imps >= cits) {
        document.getElementById('result-desc').innerText = imps === 0 ? "¡VICTORIA CIUDADANA!" : "¡GANAN LOS IMPOSTORES!";
        btn.innerText = "Nueva Partida";
        btn.onclick = () => ejecutarSorteo(gameState.players.map(p => p.name));
    } else {
        document.getElementById('result-desc').innerText = `Eliminado: ${player.name}. Quedan ${imps} impostores.`;
        btn.innerText = "Próxima Ronda";
        btn.onclick = () => irADebate();
    }
    showScreen('result');
}

function toggleCategory(btn) {
    btn.classList.toggle('active');
    btn.classList.toggle('text-slate-500');
}