let config = { players: 3, impostors: 1, rounds: 0 };
let gameState = { players: [], currentIndex: 0, secretWord: "", votes: {}, totalVotesCast: 0, actualImpsCount: 0 };

const DICCIONARIO = { 
    "Fútbol": ["Messi", "VAR", "Pelota", "Estadio", "Gol", "Corner", "Atajada", "Cancha", "Árbitro", "Mundial"],
    "Cine": ["Oscar", "Director", "Actor", "Estreno", "Guión", "Cámara", "Popcorn", "Efectos", "Escena", "Titanic"],
    "Comida": ["Asado", "Pizza", "Sushi", "Hamburguesa", "Tacos", "Pasta", "Milanesa", "Postre", "Fernet", "Mate"],
    "Custom": []
};

// Cargar del LocalStorage si existe
window.onload = () => {
    const saved = localStorage.getItem('imposort_config');
    if (saved) {
        const parsed = JSON.parse(saved);
        config = parsed;
        updateUI();
    } else {
        renderNames();
    }
};

function showScreen(id) {
    ['home', 'config', 'reveal', 'lobby', 'vote', 'result'].forEach(s => {
        document.getElementById('screen-' + s).classList.add('hidden');
    });
    document.getElementById('screen-' + id).classList.remove('hidden');
    window.scrollTo(0, 0);
    if(id === 'config') renderNames();
}

function changeVal(type, delta) {
    if (type === 'players') {
        let n = config.players + delta;
        if (n >= 3 && n <= 12) { config.players = n; if (config.impostors > n) config.impostors = n; }
    } else if (type === 'impostors') {
        let n = config.impostors + delta;
        if (n >= 1 && n <= config.players) config.impostors = n;
    } else if (type === 'rounds') {
        let n = config.rounds + delta;
        if (n >= 0 && n <= 20) config.rounds = n;
    }
    updateUI();
    localStorage.setItem('imposort_config', JSON.stringify(config));
}

function updateUI() {
    document.getElementById('v-players').innerText = config.players;
    document.getElementById('v-impostors').innerText = config.impostors;
    const rs = document.getElementById('v-rounds');
    rs.innerText = config.rounds === 0 ? "∞" : config.rounds;
    renderNames();
}

function renderNames() {
    const container = document.getElementById('names-container');
    const savedInputs = document.querySelectorAll('.player-name');
    const currentNames = Array.from(savedInputs).map(i => i.value);
    container.innerHTML = '';
    for (let i = 0; i < config.players; i++) {
        container.innerHTML += `<input type="text" placeholder="Jugador ${i+1}" value="${currentNames[i] || ''}" class="player-name w-full p-4 rounded-2xl bg-slate-800 border border-slate-700 outline-none focus:border-cyan-500 transition-all">`;
    }
}

function toggleCategory(btn) {
    btn.classList.toggle('active');
    btn.classList.toggle('text-slate-500');
}

function addCustomWord() {
    const input = document.getElementById('custom-word-input');
    const word = input.value.trim();
    if (word === "") return;
    DICCIONARIO["Custom"].push(word);
    document.getElementById('custom-words-badge').innerHTML += `<span class="bg-slate-700 text-[10px] px-2 py-1 rounded-md border border-white/10 text-cyan-400">${word}</span>`;
    input.value = "";
}

function startGame() {
    const names = Array.from(document.querySelectorAll('.player-name')).map(i => i.value.trim());
    if (names.some(n => n === "")) return alert("¡Completá todos los nombres!");
    if (new Set(names.map(n => n.toLowerCase())).size !== names.length) return alert("Hay nombres repetidos.");
    
    const themes = Array.from(document.querySelectorAll('.category-chip.active')).map(b => b.innerText);
    let pool = themes.flatMap(t => DICCIONARIO[t]);
    if(DICCIONARIO["Custom"].length > 0) pool = [...pool, ...DICCIONARIO["Custom"]];
    if (pool.length === 0) return alert("Elegí al menos un tema.");

    gameState.secretWord = pool[Math.floor(Math.random() * pool.length)];
    gameState.actualImpsCount = document.getElementById('check-random').checked ? Math.floor(Math.random() * config.impostors) + 1 : config.impostors;
    
    gameState.players = names.map(n => ({ name: n, role: 'citizen', alive: true }));
    let assigned = 0;
    while(assigned < gameState.actualImpsCount) {
        let idx = Math.floor(Math.random() * names.length);
        if(gameState.players[idx].role !== 'impostor') { gameState.players[idx].role = 'impostor'; assigned++; }
    }

    const alertBox = document.getElementById('total-imps-alert');
    if(document.getElementById('check-show-count').checked) {
        alertBox.innerText = `ATENCIÓN: HAY ${gameState.actualImpsCount} IMPOSTOR(ES)`;
        alertBox.classList.remove('hidden');
    }

    gameState.currentIndex = 0;
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
    d.innerText = p.role === 'impostor' ? "SOS EL IMPOSTOR" : gameState.secretWord;
    d.className = p.role === 'impostor' ? "text-2xl font-black text-red-500 italic" : "text-3xl font-black text-white";
    document.getElementById('card-hidden').classList.add('hidden');
    document.getElementById('card-visible').classList.remove('hidden');
}

function nextTurn() {
    gameState.currentIndex++;
    if(gameState.currentIndex < gameState.players.length) {
        setupTurn();
    } else {
        const alive = gameState.players.filter(p => p.alive);
        document.getElementById('starter-name').innerText = alive[Math.floor(Math.random() * alive.length)].name;
        showScreen('lobby');
    }
}

function goToVote() {
    const container = document.getElementById('vote-container');
    const alive = gameState.players.filter(p => p.alive);
    gameState.totalVotesCast = 0;
    gameState.votes = {};
    container.innerHTML = '';
    alive.forEach(p => {
        gameState.votes[p.name] = 0;
        container.innerHTML += `
            <div class="glass p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                <span class="font-bold text-xs uppercase text-slate-300">${p.name}</span>
                <div class="flex items-center gap-4">
                    <button onclick="changeVote('${p.name}', -1)" class="w-10 h-10 rounded-lg bg-slate-800 text-red-400 font-bold">-</button>
                    <span id="vote-${p.name}" class="text-xl font-black w-4 text-center">0</span>
                    <button onclick="changeVote('${p.name}', 1)" class="w-10 h-10 rounded-lg bg-slate-800 text-green-400 font-bold">+</button>
                </div>
            </div>`;
    });
    document.getElementById('remaining-votes').innerText = alive.length;
    showScreen('vote');
}

function changeVote(name, delta) {
    const limit = gameState.players.filter(p => p.alive).length;
    if(delta > 0 && gameState.totalVotesCast >= limit) return;
    if(delta < 0 && gameState.votes[name] <= 0) return;
    gameState.votes[name] += delta;
    gameState.totalVotesCast += delta;
    document.getElementById('vote-' + name).innerText = gameState.votes[name];
    document.getElementById('remaining-votes').innerText = limit - gameState.totalVotesCast;
}

function processResults() {
    let max = -1; let votedOut = null; let tie = false;
    for(let n in gameState.votes) {
        if(gameState.votes[n] > max) { max = gameState.votes[n]; votedOut = n; tie = false; }
        else if(gameState.votes[n] === max && max > 0) tie = true;
    }
    if(tie || max === 0) { alert("Empate o sin votos. Nadie sale."); return showScreen('lobby'); }

    const player = gameState.players.find(p => p.name === votedOut);
    player.alive = false;
    const imps = gameState.players.filter(p => p.role === 'impostor' && p.alive).length;
    const cits = gameState.players.filter(p => p.role === 'citizen' && p.alive).length;

    document.getElementById('result-title').innerText = player.role === 'impostor' ? "ERA EL IMPOSTOR" : "ERA CIUDADANO";
    document.getElementById('result-status-icon').innerText = player.role === 'impostor' ? "🔥" : "💀";
    
    if(imps === 0) {
        document.getElementById('result-desc').innerText = "¡GANAN CIUDADANOS!";
        document.getElementById('btn-next-action').innerText = "Nueva Partida";
    } else if(imps >= cits) {
        document.getElementById('result-desc').innerText = "¡GANAN IMPOSTORES!";
        document.getElementById('btn-next-action').innerText = "Nueva Partida";
    } else {
        document.getElementById('result-desc').innerText = player.role === 'impostor' ? `¡Bien! Quedan ${imps} impostores.` : `Inocente. Sigue el juego.`;
        document.getElementById('btn-next-action').innerText = "Próxima Ronda";
    }
    showScreen('result');
}


// ... (Todo lo anterior igual hasta llegar a handlePostResult)

function handlePostResult() {
    const btnText = document.getElementById('btn-next-action').innerText;
    
    if (btnText === "Nueva Partida") {
        // Obtenemos los nombres de los jugadores de la partida anterior
        const currentNames = gameState.players.map(p => p.name);
        // Reiniciamos todo el estado
        gameState = { 
            players: [], 
            currentIndex: 0, 
            secretWord: "", 
            votes: {}, 
            totalVotesCast: 0, 
            actualImpsCount: 0 
        };
        // Iniciamos el proceso de sorteo con los mismos nombres
        repartirNuevosRoles(currentNames);
    } else {
        // "Próxima Ronda" (el juego sigue porque no ganaron todavía)
        const alive = gameState.players.filter(p => p.alive);
        document.getElementById('starter-name').innerText = alive[Math.floor(Math.random() * alive.length)].name;
        showScreen('lobby');
    }
}

function repartirNuevosRoles(names) {
    // 1. Seleccionar nueva palabra
    const themes = Array.from(document.querySelectorAll('.category-chip.active')).map(b => b.innerText);
    let pool = themes.flatMap(t => DICCIONARIO[t]);
    if(DICCIONARIO["Custom"].length > 0) pool = [...pool, ...DICCIONARIO["Custom"]];
    gameState.secretWord = pool[Math.floor(Math.random() * pool.length)];
    
    // 2. Definir cantidad de impostores
    gameState.actualImpsCount = document.getElementById('check-random').checked ? 
        Math.floor(Math.random() * config.impostors) + 1 : config.impostors;
    
    // 3. Crear lista de jugadores y asignar roles
    gameState.players = names.map(n => ({ name: n, role: 'citizen', alive: true }));
    let assigned = 0;
    while(assigned < gameState.actualImpsCount) {
        let idx = Math.floor(Math.random() * names.length);
        if(gameState.players[idx].role !== 'impostor') { 
            gameState.players[idx].role = 'impostor'; 
            assigned++; 
        }
    }

    // 4. Mostrar alerta de cantidad si está activo
    const alertBox = document.getElementById('total-imps-alert');
    if(document.getElementById('check-show-count').checked) {
        alertBox.innerText = `ATENCIÓN: HAY ${gameState.actualImpsCount} IMPOSTOR(ES)`;
        alertBox.classList.remove('hidden');
    } else {
        alertBox.classList.add('hidden');
    }

    // 5. Ir a revelar
    gameState.currentIndex = 0;
    showScreen('reveal');
    setupTurn();
}