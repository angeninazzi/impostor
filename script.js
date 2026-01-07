let playerList = [];
let config = { impostors: 1 };
let gameState = { players: [], currentIndex: 0, secretWord: "", secretClue: "", votes: {}, totalVotesCast: 0, actualImpsCount: 0 };
let lastWords = [];

const DICCIONARIO = {
    "Fútbol": [{w:"Messi", p:"Rosario"}, {w:"VAR", p:"Pantalla"}, {w:"Pelota", p:"Cuero"}, {w:"Estadio", p:"Cemento"}, {w:"Gol", p:"Grito"}, {w:"Corner", p:"Bandera"}, {w:"Atajada", p:"Vuelo"}, {w:"Cancha", p:"Césped"}, {w:"Árbitro", p:"Silbato"}, {w:"Mundial", p:"Naciones"}],
    "Cine": [{w:"Oscar", p:"Estatuilla"}, {w:"Director", p:"Silla"}, {w:"Actor", p:"Maquillaje"}, {w:"Estreno", p:"Cartelera"}, {w:"Guión", p:"Papel"}, {w:"Titanic", p:"Iceberg"}, {w:"Avatar", p:"Azul"}, {w:"Horror", p:"Susto"}, {w:"Comedia", p:"Risa"}, {w:"Musical", p:"Baile"}],
    "Comida": [{w:"Asado", p:"Leña"}, {w:"Pizza", p:"Masa"}, {w:"Sushi", p:"Palillos"}, {w:"Hamburguesa", p:"Medallón"}, {w:"Tacos", p:"Tortilla"}, {w:"Pasta", p:"Salsa"}, {w:"Milanesa", p:"Pan rallado"}, {w:"Postre", p:"Dulce"}, {w:"Fernet", p:"Hierbas"}, {w:"Mate", p:"Bombilla"}]
};

function showScreen(id) {
    ['home', 'config', 'reveal', 'lobby', 'vote', 'result'].forEach(s => document.getElementById('screen-' + s)?.classList.add('hidden'));
    document.getElementById('screen-' + id).classList.remove('hidden');
    window.scrollTo(0,0);
}

function addPlayerFromInput() {
    const input = document.getElementById('input-player-name');
    const name = input.value.trim().toUpperCase();
    if (!name) return;
    if (playerList.includes(name)) { alert("Ese nombre ya existe"); return; }
    playerList.push(name);
    input.value = "";
    renderList();
}

function removePlayer(n) { playerList = playerList.filter(p => p !== n); renderList(); }

function renderList() {
    const c = document.getElementById('players-list');
    c.innerHTML = playerList.map(p => `
        <div class="flex items-center justify-between bg-slate-800 p-4 rounded-2xl border border-white/5 fade-in">
            <span class="text-xs font-black uppercase text-cyan-400">${p}</span>
            <button onclick="removePlayer('${p}')" class="text-red-500 font-bold px-2">X</button>
        </div>`).join('');
}

function changeImpVal(d) {
    config.impostors = Math.max(1, Math.min(playerList.length - 1, config.impostors + d));
    document.getElementById('v-impostors').innerText = config.impostors;
}

function toggleCategory(btn) { 
    btn.classList.toggle('active'); 
    btn.classList.toggle('text-slate-500'); 
}

function startGame() {
    if (playerList.length < 3) return alert("Mínimo 3 jugadores.");
    
    // 1. Obtener Temas Seleccionados
    const selectedThemes = Array.from(document.querySelectorAll('.category-chip.active')).map(b => b.innerText);
    
    // 2. Mazo de emergencia por si no se seleccionó nada
    let pool = [];
    if (selectedThemes.length === 0) {
        pool = DICCIONARIO["Fútbol"]; // Por defecto si fallan los botones
    } else {
        pool = selectedThemes.flatMap(t => DICCIONARIO[t] || []);
    }

    // 3. Filtrar palabras usadas recientemente
    let filtered = pool.filter(x => !lastWords.includes(x.w));
    if (filtered.length === 0) filtered = pool;

    const sel = filtered[Math.floor(Math.random() * filtered.length)];
    
    // 4. Asegurar que nunca sea undefined
    gameState.secretWord = sel ? sel.w : "FÚTBOL";
    gameState.secretClue = sel ? sel.p : "CANCHA";

    lastWords.push(gameState.secretWord);
    if (lastWords.length > 5) lastWords.shift();

    // 5. Configuración de Impostores
    const randomCheck = document.getElementById('check-random').checked;
    gameState.actualImpsCount = randomCheck ? Math.floor(Math.random() * config.impostors) + 1 : config.impostors;

    // 6. Asignar Roles
    gameState.players = playerList.map(n => ({ name: n, role: 'citizen', alive: true }));
    let assigned = 0;
    while(assigned < gameState.actualImpsCount) {
        let idx = Math.floor(Math.random() * gameState.players.length);
        if(gameState.players[idx].role !== 'impostor') {
            gameState.players[idx].role = 'impostor';
            assigned++;
        }
    }

    document.getElementById('total-imps-alert').innerText = `HAY ${gameState.actualImpsCount} IMPOSTOR(ES)`;
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
    const display = document.getElementById('secret-word-display');
    const radio = document.querySelector('input[name="clue-mode"]:checked');
    const mode = radio ? radio.value : 'none';
    
    if (p.role === 'impostor') {
        let showP = (mode === 'always') || (mode === 'first' && gameState.currentIndex === 0);
        display.innerText = showP ? `SOS EL IMPOSTOR\n\nPISTA: ${gameState.secretClue}` : "SOS EL IMPOSTOR";
        display.className = "text-2xl font-black text-red-500 italic whitespace-pre-line";
    } else {
        display.innerText = gameState.secretWord;
        display.className = "text-4xl font-black text-white italic uppercase";
    }
    document.getElementById('card-hidden').classList.add('hidden');
    document.getElementById('card-visible').classList.remove('hidden');
}

function nextTurn() {
    gameState.currentIndex++;
    if(gameState.currentIndex < gameState.players.length) {
        setupTurn();
    } else {
        const vivos = gameState.players.filter(p => p.alive);
        document.getElementById('starter-name').innerText = vivos[Math.floor(Math.random() * vivos.length)].name;
        showScreen('lobby');
    }
}

function goToVote() {
    const c = document.getElementById('vote-container');
    const vivos = gameState.players.filter(p => p.alive);
    gameState.totalVotesCast = 0;
    gameState.votes = {};
    c.innerHTML = vivos.map(p => {
        gameState.votes[p.name] = 0;
        return `<div class="glass p-4 rounded-2xl flex items-center justify-between border border-white/5">
            <span class="text-xs font-black uppercase text-white">${p.name}</span>
            <div class="flex items-center gap-4">
                <button onclick="changeVote('${p.name}', -1)" class="w-10 h-10 rounded-xl bg-slate-800 text-red-400 font-bold">-</button>
                <span id="vote-${p.name}" class="text-xl font-black w-4 text-center">0</span>
                <button onclick="changeVote('${p.name}', 1)" class="w-10 h-10 rounded-xl bg-slate-800 text-green-400 font-bold">+</button>
            </div>
        </div>`;
    }).join('');
    document.getElementById('remaining-votes').innerText = vivos.length;
    showScreen('vote');
}

function changeVote(n, d) {
    const max = gameState.players.filter(p => p.alive).length;
    if (d > 0 && gameState.totalVotesCast >= max) return;
    if (d < 0 && gameState.votes[n] <= 0) return;
    gameState.votes[n] += d;
    gameState.totalVotesCast += d;
    document.getElementById('vote-' + n).innerText = gameState.votes[n];
    document.getElementById('remaining-votes').innerText = max - gameState.totalVotesCast;
}

function processResults() {
    let max = -1; let out = null; let tie = false;
    for(let n in gameState.votes) {
        if(gameState.votes[n] > max) { max = gameState.votes[n]; out = n; tie = false; }
        else if(gameState.votes[n] === max && max > 0) tie = true;
    }
    if (tie || max === 0) return alert("Hay un empate o no hubo votos.");

    const pOut = gameState.players.find(p => p.name === out);
    pOut.alive = false;
    
    const imps = gameState.players.filter(p => p.role === 'impostor' && p.alive).length;
    const cits = gameState.players.filter(p => p.role === 'citizen' && p.alive).length;

    document.getElementById('result-title').innerText = pOut.role === 'impostor' ? "ERA EL IMPOSTOR" : "ERA CIUDADANO";
    document.getElementById('result-status-icon').innerText = pOut.role === 'impostor' ? "🔥" : "💀";
    
    const btn = document.getElementById('btn-next-action');
    if (imps === 0 || imps >= cits) {
        document.getElementById('result-desc').innerText = imps === 0 ? "¡GANAN CIUDADANOS!" : "¡GANAN IMPOSTORES!";
        btn.innerText = "NUEVA PARTIDA";
        btn.onclick = () => startGame(); // AVANZA DIRECTAMENTE
    } else {
        document.getElementById('result-desc').innerText = `${pOut.name} fue expulsado. Quedan ${imps} imps.`;
        btn.innerText = "CONTINUAR DEBATE";
        btn.onclick = () => {
            const vivos = gameState.players.filter(p => p.alive);
            document.getElementById('starter-name').innerText = vivos[Math.floor(Math.random() * vivos.length)].name;
            showScreen('lobby');
        };
    }
    showScreen('result');
}