// Global state
const gameState = {
    totalXP: 0,
    level: 1,
    gamesPlayed: 0
};

function switchTab(tabId) {
    if (window.tutorialEngine && tutorialEngine.isActive()) {
        tutorialEngine.stopFlow();
    }
    document.querySelectorAll('.game-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    // Resize canvases on tab switch
    requestAnimationFrame(() => {
        if (tabId === 'pcb-design') pcbGame.resizeCanvas();
        if (tabId === 'phone-assembly') assemblyGame.resizeCanvas();
        if (tabId === 'smt-line') smtGame.resizeCanvas();
        if (tabId === 'qc-inspector') qcGame.resizeCanvas();
    });
}

function addXP(amount) {
    gameState.totalXP += amount;
    gameState.level = Math.floor(gameState.totalXP / 500) + 1;
    document.getElementById('total-xp').textContent = gameState.totalXP;
    document.getElementById('player-level').textContent = gameState.level;
}

function addGamePlayed() {
    gameState.gamesPlayed++;
    document.getElementById('games-played').textContent = gameState.gamesPlayed;
}

function showModal(title, bodyHTML, success = true) {
    const modal = document.getElementById('result-modal');
    const header = document.getElementById('modal-header');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    header.className = 'modal-header ' + (success ? 'success' : 'fail');
    modal.classList.add('show');
}

function closeModal() {
    document.getElementById('result-modal').classList.remove('show');
}

// Utility: get canvas coords from mouse event
function getCanvasCoords(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

// Draw rounded rect
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// Draw grid
function drawGrid(ctx, w, h, gridSize, color = 'rgba(42, 54, 80, 0.5)') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= w; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y <= h; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
}

// Snap to grid
function snapToGrid(val, gridSize) {
    return Math.round(val / gridSize) * gridSize;
}
