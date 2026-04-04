const qcGame = (() => {
    let canvas, ctx;
    let currentLevel = 0;
    let tool = 'magnify';
    let defects = [];
    let flaggedDefects = [];
    let hoverPos = null;
    let magnifyActive = false;
    let timerInterval = null;
    let timeLeft = 120;
    let boardSeed = 0;

    const DEFECT_TYPES = [
        { id: 'cold_solder', name: 'Cold Solder Joint', color: '#ff9100', desc: 'Dull, grainy solder joint - poor wetting' },
        { id: 'bridge', name: 'Solder Bridge', color: '#ff5252', desc: 'Solder connecting two pads that should be separate' },
        { id: 'missing', name: 'Missing Component', color: '#b388ff', desc: 'Empty pad where a component should be' },
        { id: 'tombstone', name: 'Tombstone', color: '#00e5ff', desc: 'Component standing on one end' },
        { id: 'misaligned', name: 'Misaligned', color: '#69f0ae', desc: 'Component shifted off its pads' },
        { id: 'crack', name: 'PCB Crack', color: '#ff6e40', desc: 'Visible crack in the board substrate' },
        { id: 'burnt', name: 'Burn Mark', color: '#8d6e63', desc: 'Discoloration from excessive heat' },
        { id: 'lifted_pad', name: 'Lifted Pad', color: '#ffd740', desc: 'Copper pad peeling from the board' },
    ];

    const LEVELS = [
        { name: 'Obvious Defects', defectCount: 4, types: [0, 1, 2, 3], timeLimit: 120, boardComplexity: 'simple' },
        { name: 'Subtle Issues', defectCount: 6, types: [0, 1, 2, 3, 4, 5], timeLimit: 90, boardComplexity: 'medium' },
        { name: 'Expert Mode', defectCount: 8, types: [0, 1, 2, 3, 4, 5, 6, 7], timeLimit: 60, boardComplexity: 'complex' },
    ];

    function init() {
        canvas = document.getElementById('qc-canvas');
        ctx = canvas.getContext('2d');
        resizeCanvas();
        buildDefectTypes();
        loadLevel(0);
        setupEvents();
    }

    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight - 40;
        draw();
    }

    function buildDefectTypes() {
        const container = document.getElementById('qc-defect-types');
        container.innerHTML = '<h3>Defect Types</h3>';
        DEFECT_TYPES.forEach(dt => {
            container.innerHTML += `
                <div class="defect-badge">
                    <div class="defect-color" style="background:${dt.color}"></div>
                    <div>
                        <div style="font-weight:600;color:var(--text-primary)">${dt.name}</div>
                        <div style="font-size:10px;color:var(--text-secondary)">${dt.desc}</div>
                    </div>
                </div>
            `;
        });
    }

    function loadLevel(idx) {
        currentLevel = parseInt(idx);
        const level = LEVELS[currentLevel];
        flaggedDefects = [];
        timeLeft = level.timeLimit;
        boardSeed = Math.random();

        // Generate defects
        defects = [];
        const w = canvas.width || 800;
        const h = canvas.height || 560;

        for (let i = 0; i < level.defectCount; i++) {
            const typeIdx = level.types[Math.floor(Math.random() * level.types.length)];
            const dt = DEFECT_TYPES[typeIdx];
            defects.push({
                id: i,
                typeIdx: typeIdx,
                type: dt,
                x: 120 + Math.random() * (w - 280),
                y: 80 + Math.random() * (h - 220),
                size: 12 + Math.random() * 20,
                found: false
            });
        }

        document.getElementById('qc-score').textContent = `0/${defects.length}`;
        document.getElementById('qc-time').textContent = formatTime(timeLeft);
        document.getElementById('qc-findings').innerHTML = '<p style="font-size:12px;color:var(--text-secondary)">No defects flagged yet. Use the magnify tool to inspect and the flag tool to mark defects.</p>';

        startTimer();
        draw();
    }

    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            timeLeft--;
            document.getElementById('qc-time').textContent = formatTime(timeLeft);
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                submitInspection();
            }
            if (timeLeft <= 20) {
                document.getElementById('qc-time').parentElement.style.color = 'var(--accent-red)';
            }
        }, 1000);
    }

    function formatTime(s) {
        const min = Math.floor(s / 60);
        const sec = s % 60;
        return `${min}:${sec.toString().padStart(2, '0')}`;
    }

    function setTool(t) {
        tool = t;
        document.querySelectorAll('.qc-toolbar .tool-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.qc-toolbar .tool-btn[data-tool="${t}"]`)?.classList.add('active');
        canvas.style.cursor = t === 'magnify' ? 'zoom-in' : t === 'flag' ? 'crosshair' : 'pointer';
        if (window.tutorialEngine && tutorialEngine.isActive()) {
            tutorialEngine.onUserAction('qc-action', { tool, flaggedCount: flaggedDefects.filter(f => !f.falseAlarm).length, totalDefects: defects.length });
        }
    }

    function setupEvents() {
        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('mousemove', e => {
            hoverPos = getCanvasCoords(canvas, e);
            draw();
        });
        window.addEventListener('resize', () => {
            if (document.getElementById('qc-inspector').classList.contains('active')) resizeCanvas();
        });
    }

    function handleClick(e) {
        const pos = getCanvasCoords(canvas, e);

        if (tool === 'flag') {
            // Check if clicking near a defect
            let foundDefect = null;
            defects.forEach(d => {
                const dist = Math.hypot(d.x - pos.x, d.y - pos.y);
                if (dist < d.size + 15 && !d.found) {
                    foundDefect = d;
                }
            });

            if (foundDefect) {
                foundDefect.found = true;
                flaggedDefects.push(foundDefect);

                // Update score
                document.getElementById('qc-score').textContent = `${flaggedDefects.length}/${defects.length}`;

                // Update findings
                updateFindings();
                draw();

                // Check if all found
                if (flaggedDefects.length >= defects.length) {
                    clearInterval(timerInterval);
                    setTimeout(() => submitInspection(), 500);
                }
            } else {
                // False flag - check if far from any defect
                const nearAny = defects.some(d => Math.hypot(d.x - pos.x, d.y - pos.y) < d.size + 30);
                if (!nearAny) {
                    // Flash red at click point
                    flaggedDefects.push({ id: -1, type: { name: 'False Alarm', color: '#ff5252' }, x: pos.x, y: pos.y, size: 10, found: true, falseAlarm: true });
                    updateFindings();
                    draw();
                }
            }
        } else if (tool === 'clear') {
            // Remove nearest flag
            const idx = flaggedDefects.findIndex(f => Math.hypot(f.x - pos.x, f.y - pos.y) < 20);
            if (idx >= 0) {
                const removed = flaggedDefects.splice(idx, 1)[0];
                if (removed.id >= 0) {
                    defects.find(d => d.id === removed.id).found = false;
                }
                document.getElementById('qc-score').textContent = `${flaggedDefects.filter(f => !f.falseAlarm).length}/${defects.length}`;
                updateFindings();
                draw();
            }
        }

        // Tutorial hook
        if (window.tutorialEngine && tutorialEngine.isActive()) {
            tutorialEngine.onUserAction('qc-action', {
                tool,
                flaggedCount: flaggedDefects.filter(f => !f.falseAlarm).length,
                totalDefects: defects.length
            });
        }
    }

    function updateFindings() {
        const findings = document.getElementById('qc-findings');
        if (flaggedDefects.length === 0) {
            findings.innerHTML = '<p style="font-size:12px;color:var(--text-secondary)">No defects flagged yet.</p>';
            return;
        }
        findings.innerHTML = flaggedDefects.map(f => `
            <div class="check-item${f.falseAlarm ? '' : ' done'}">
                <div class="check-mark" style="${f.falseAlarm ? 'background:var(--accent-red);border-color:var(--accent-red);color:#000' : ''}">${f.falseAlarm ? '!' : '\u2713'}</div>
                <span style="${f.falseAlarm ? 'color:var(--accent-red)' : ''}">${f.falseAlarm ? 'False Alarm' : f.type.name}</span>
            </div>
        `).join('');
    }

    function submitInspection() {
        if (window.tutorialEngine && tutorialEngine.isActive()) {
            tutorialEngine.onUserAction('qc-submit', {});
        }
        if (timerInterval) clearInterval(timerInterval);
        addGamePlayed();

        const realFinds = flaggedDefects.filter(f => !f.falseAlarm).length;
        const falseAlarms = flaggedDefects.filter(f => f.falseAlarm).length;
        const missed = defects.length - realFinds;
        const accuracy = defects.length > 0 ? Math.round((realFinds / defects.length) * 100) : 0;
        const score = Math.max(0, accuracy - falseAlarms * 10);
        const xp = Math.round(score * 2);
        addXP(xp);

        // Show missed defects
        defects.forEach(d => d.found = true);
        draw();

        showModal(
            accuracy >= 70 ? 'Good Inspection!' : 'Missed Defects!',
            `<div class="result-row"><span class="result-label">Level</span><span class="result-value">${LEVELS[currentLevel].name}</span></div>
             <div class="result-row"><span class="result-label">Defects Found</span><span class="result-value ${realFinds >= defects.length ? 'good' : 'bad'}">${realFinds}/${defects.length}</span></div>
             <div class="result-row"><span class="result-label">False Alarms</span><span class="result-value ${falseAlarms === 0 ? 'good' : 'bad'}">${falseAlarms}</span></div>
             <div class="result-row"><span class="result-label">Missed</span><span class="result-value ${missed === 0 ? 'good' : 'bad'}">${missed}</span></div>
             <div class="result-row"><span class="result-label">Time Remaining</span><span class="result-value">${formatTime(Math.max(timeLeft, 0))}</span></div>
             <div class="result-row"><span class="result-label">Accuracy</span><span class="result-value ${accuracy >= 70 ? 'good' : 'bad'}">${accuracy}%</span></div>
             <div class="xp-earned">+${xp} XP</div>`,
            accuracy >= 70
        );
    }

    function reset() {
        loadLevel(currentLevel);
    }

    // Seeded random for consistent board appearance
    function seededRandom(seed) {
        let s = seed;
        return function() {
            s = (s * 16807) % 2147483647;
            return (s - 1) / 2147483646;
        };
    }

    function draw() {
        if (!ctx) return;
        const w = canvas.width, h = canvas.height;
        const rng = seededRandom(Math.floor(boardSeed * 10000));

        // PCB background
        ctx.fillStyle = '#1a4a2a';
        ctx.fillRect(0, 0, w, h);
        drawGrid(ctx, w, h, 8, 'rgba(0, 80, 40, 0.2)');

        // Board outline
        ctx.strokeStyle = '#4a6a4a';
        ctx.lineWidth = 2;
        ctx.strokeRect(80, 50, w - 160, h - 140);

        // Copper traces (decorative)
        ctx.strokeStyle = '#c0a020';
        ctx.lineWidth = 2;
        for (let i = 0; i < 30; i++) {
            ctx.beginPath();
            const sx = 100 + rng() * (w - 220);
            const sy = 70 + rng() * (h - 200);
            ctx.moveTo(sx, sy);
            // L-shaped traces
            const mx = sx + (rng() - 0.5) * 150;
            ctx.lineTo(mx, sy);
            ctx.lineTo(mx, sy + (rng() - 0.5) * 100);
            ctx.stroke();
        }

        // Normal components (not defective)
        const compCount = currentLevel === 0 ? 15 : currentLevel === 1 ? 25 : 40;
        for (let i = 0; i < compCount; i++) {
            const cx = 100 + rng() * (w - 240);
            const cy = 70 + rng() * (h - 200);
            const cw = 10 + rng() * 30;
            const ch = 8 + rng() * 15;
            const type = rng();

            // Pads
            ctx.fillStyle = '#b87333';
            ctx.fillRect(cx - 3, cy, 3, ch);
            ctx.fillRect(cx + cw, cy, 3, ch);

            // Component body
            if (type < 0.3) ctx.fillStyle = '#303030'; // IC
            else if (type < 0.5) ctx.fillStyle = '#e8a87c'; // Resistor
            else if (type < 0.7) ctx.fillStyle = '#41b3a3'; // Capacitor
            else ctx.fillStyle = '#555'; // Other

            roundRect(ctx, cx, cy, cw, ch, 2);
            ctx.fill();

            // Solder joints
            ctx.fillStyle = '#c0c0c0';
            ctx.beginPath();
            ctx.arc(cx, cy + ch / 2, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + cw, cy + ch / 2, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw defects
        defects.forEach(d => {
            drawDefect(d);
        });

        // Draw flags
        flaggedDefects.forEach(f => {
            if (f.found) {
                ctx.beginPath();
                ctx.arc(f.x, f.y, 15, 0, Math.PI * 2);
                ctx.strokeStyle = f.falseAlarm ? '#ff5252' : '#00e676';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Label
                ctx.fillStyle = f.falseAlarm ? '#ff5252' : '#00e676';
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(f.falseAlarm ? 'FALSE' : f.type.name, f.x, f.y - 20);
            }
        });

        // Magnifying glass effect
        if (tool === 'magnify' && hoverPos) {
            const mx = hoverPos.x;
            const my = hoverPos.y;
            const radius = 50;

            ctx.save();
            ctx.beginPath();
            ctx.arc(mx, my, radius, 0, Math.PI * 2);
            ctx.strokeStyle = '#00b4d8';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Zoom effect - draw enlarged area
            ctx.clip();
            ctx.translate(mx, my);
            ctx.scale(2, 2);
            ctx.translate(-mx, -my);

            // Redraw board area under magnifier
            ctx.fillStyle = '#1a4a2a';
            ctx.fillRect(mx - radius, my - radius, radius * 2, radius * 2);
            drawGrid(ctx, w, h, 8, 'rgba(0, 80, 40, 0.2)');

            // Redraw nearby defects enlarged
            defects.forEach(d => {
                if (Math.hypot(d.x - mx, d.y - my) < radius * 2) {
                    drawDefect(d);
                }
            });

            ctx.restore();

            // Magnifier border
            ctx.beginPath();
            ctx.arc(mx, my, radius, 0, Math.PI * 2);
            ctx.strokeStyle = '#00b4d8';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Handle
            ctx.beginPath();
            ctx.moveTo(mx + radius * 0.7, my + radius * 0.7);
            ctx.lineTo(mx + radius * 1.2, my + radius * 1.2);
            ctx.strokeStyle = '#00b4d8';
            ctx.lineWidth = 4;
            ctx.stroke();
        }
    }

    function drawDefect(d) {
        const dt = d.type;
        ctx.save();

        switch (d.typeIdx) {
            case 0: // Cold solder
                ctx.fillStyle = '#888';
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.size / 2, 0, Math.PI * 2);
                ctx.fill();
                // Grainy texture
                for (let i = 0; i < 8; i++) {
                    ctx.fillStyle = 'rgba(100,100,100,0.5)';
                    ctx.beginPath();
                    ctx.arc(d.x + (Math.random() - 0.5) * d.size, d.y + (Math.random() - 0.5) * d.size, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;

            case 1: // Solder bridge
                ctx.fillStyle = '#c0c0c0';
                ctx.beginPath();
                ctx.ellipse(d.x, d.y, d.size, d.size / 3, 0.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#a0a0a0';
                ctx.lineWidth = 1;
                ctx.stroke();
                break;

            case 2: // Missing component
                ctx.fillStyle = '#b87333';
                ctx.fillRect(d.x - d.size / 2, d.y - 3, d.size, 6);
                // Empty pads
                ctx.strokeStyle = '#b87333';
                ctx.lineWidth = 1;
                ctx.setLineDash([2, 2]);
                ctx.strokeRect(d.x - d.size / 2 - 2, d.y - d.size / 4, d.size + 4, d.size / 2);
                ctx.setLineDash([]);
                break;

            case 3: // Tombstone
                ctx.fillStyle = '#e8a87c';
                ctx.save();
                ctx.translate(d.x, d.y);
                ctx.rotate(-Math.PI / 4);
                ctx.fillRect(-d.size / 4, -d.size / 2, d.size / 2, d.size);
                ctx.restore();
                // Base pad
                ctx.fillStyle = '#b87333';
                ctx.fillRect(d.x - d.size / 2, d.y + 2, d.size, 4);
                break;

            case 4: // Misaligned
                ctx.fillStyle = '#41b3a3';
                roundRect(ctx, d.x - d.size / 2 + 5, d.y - d.size / 4 + 3, d.size, d.size / 2, 2);
                ctx.fill();
                // Show correct position
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.strokeRect(d.x - d.size / 2, d.y - d.size / 4, d.size, d.size / 2);
                ctx.setLineDash([]);
                break;

            case 5: // PCB crack
                ctx.strokeStyle = '#5a3a2a';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(d.x - d.size, d.y - d.size / 3);
                ctx.lineTo(d.x - d.size / 3, d.y);
                ctx.lineTo(d.x + d.size / 3, d.y - d.size / 4);
                ctx.lineTo(d.x + d.size, d.y + d.size / 3);
                ctx.stroke();
                break;

            case 6: // Burn mark
                const grad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.size);
                grad.addColorStop(0, 'rgba(60, 30, 10, 0.8)');
                grad.addColorStop(0.5, 'rgba(80, 50, 20, 0.5)');
                grad.addColorStop(1, 'rgba(100, 70, 30, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 7: // Lifted pad
                ctx.fillStyle = '#b87333';
                ctx.fillRect(d.x - d.size / 2, d.y, d.size, d.size / 3);
                // Lifted part
                ctx.fillStyle = '#d09050';
                ctx.beginPath();
                ctx.moveTo(d.x - d.size / 2, d.y);
                ctx.lineTo(d.x, d.y - d.size / 3);
                ctx.lineTo(d.x + d.size / 4, d.y);
                ctx.fill();
                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath();
                ctx.ellipse(d.x - d.size / 4, d.y + d.size / 4, d.size / 3, d.size / 8, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
        }

        ctx.restore();
    }

    function getTutorialAPI() {
        return {
            getCanvas: () => canvas,
            getCurrentTool: () => tool,
            getFlaggedCount: () => flaggedDefects.filter(f => !f.falseAlarm).length,
            getTotalDefects: () => defects.length,
            setBoardSeed: (seed) => { boardSeed = seed; },
            loadLevel: (idx) => loadLevel(idx),
        };
    }

    return { init, resizeCanvas, loadLevel, setTool, submitInspection, reset, getTutorialAPI };
})();
