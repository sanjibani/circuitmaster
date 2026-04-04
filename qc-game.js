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

    // ─── Beginner Mode state ────────────────────────────────────────────────
    let beginnerMode = false;
    let beginnerStep = 0;
    let beginnerPhase = 'learn'; // 'learn' → 'quiz'
    let beginnerDefectIdx = 0;
    let quizDefect = null;
    let quizFound = false;
    let quizFalseCount = 0;
    let beginnerScore = 0;

    // Beginner lesson data — teaches each defect with good-vs-bad comparison
    const BEGINNER_LESSONS = [
        {
            defectIdx: 0,
            title: 'Cold Solder Joint',
            emoji: '🔍',
            whatIs: 'A solder joint that didn\'t heat properly during manufacturing. The solder looks dull, grainy, and rough instead of smooth and shiny.',
            lookFor: 'Dull grey appearance instead of bright silver. Grainy, lumpy texture. The solder doesn\'t flow smoothly to the pad.',
            whyBad: 'Creates an unreliable electrical connection that may fail under vibration or temperature changes — leading to intermittent faults.',
            goodLabel: 'Good Joint: Smooth, shiny, cone-shaped fillet',
            badLabel: 'Cold Joint: Dull, grainy, poor flow'
        },
        {
            defectIdx: 1,
            title: 'Solder Bridge',
            emoji: '🌉',
            whatIs: 'Extra solder accidentally connects two adjacent pads that should be electrically separate. Creates an unintended short circuit.',
            lookFor: 'A blob or ribbon of silver solder stretching between two neighboring pads or IC pins. The gap between pins is filled.',
            whyBad: 'Causes a short circuit — electricity flows where it shouldn\'t, potentially destroying ICs or causing the board to malfunction.',
            goodLabel: 'Good: Clean gap between pads',
            badLabel: 'Bridge: Solder connects two pads'
        },
        {
            defectIdx: 2,
            title: 'Missing Component',
            emoji: '❌',
            whatIs: 'A component that should be on the board is completely absent. You can see the empty copper pads where it was supposed to be placed.',
            lookFor: 'Bare copper pads with no component on them. The pads may have solder paste but no part. Look for gaps in rows of components.',
            whyBad: 'The circuit is incomplete — that component (resistor, capacitor, etc.) is needed for the circuit to function correctly.',
            goodLabel: 'Good: Component seated on pads',
            badLabel: 'Missing: Empty pads, no component'
        },
        {
            defectIdx: 3,
            title: 'Tombstone',
            emoji: '🪦',
            whatIs: 'A small chip component lifts up on one end during reflow soldering, standing vertically like a tombstone in a graveyard.',
            lookFor: 'A rectangular component that is tilted or standing straight up instead of lying flat. One pad is connected, the other is in the air.',
            whyBad: 'One terminal has no connection — the component is only half-connected and the circuit won\'t work as designed.',
            goodLabel: 'Good: Component lies flat on both pads',
            badLabel: 'Tombstone: Component standing on one end'
        },
    ];

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
        setupEvents();
        // Start in beginner mode if that's the dropdown default
        const sel = document.getElementById('qc-level');
        if (sel && sel.value === 'beginner') {
            startBeginnerMode();
        } else {
            loadLevel(0);
        }
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

        // Beginner mode click handling
        if (beginnerMode) {
            // Check if "Next" button was clicked
            if (canvas._beginnerBtn) {
                const b = canvas._beginnerBtn;
                if (pos.x >= b.x && pos.x <= b.x + b.w && pos.y >= b.y && pos.y <= b.y + b.h) {
                    beginnerNext();
                    return;
                }
            }
            // Quiz click — try to find defect
            if (beginnerPhase === 'quiz' && !quizFound) {
                handleBeginnerClick(pos);
            }
            return;
        }

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
        if (beginnerMode) { drawBeginner(); return; }
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

    // ─── Beginner Mode ─────────────────────────────────────────────────────
    function startBeginnerMode() {
        beginnerMode = true;
        beginnerStep = 0;
        beginnerPhase = 'learn';
        beginnerDefectIdx = 0;
        beginnerScore = 0;
        quizFound = false;
        quizFalseCount = 0;
        if (timerInterval) clearInterval(timerInterval);
        // Update UI
        document.getElementById('qc-score').textContent = '—';
        document.getElementById('qc-time').textContent = '∞';
        document.getElementById('qc-time').parentElement.style.color = '';
        document.getElementById('qc-findings').innerHTML = '<p style="font-size:13px;color:#3ecf71;font-weight:600;">🎓 Learning Mode</p><p style="font-size:11px;color:var(--text-secondary);margin-top:6px;">Study each defect type. Click "Next" when ready to move on. After learning all 4, you\'ll take a mini quiz!</p>';
        drawBeginner();
    }

    function stopBeginnerMode() {
        beginnerMode = false;
        loadLevel(0);
    }

    function beginnerNext() {
        if (beginnerPhase === 'learn') {
            beginnerDefectIdx++;
            if (beginnerDefectIdx >= BEGINNER_LESSONS.length) {
                // Transition to quiz phase
                beginnerPhase = 'quiz';
                beginnerStep = 0;
                startBeginnerQuiz();
                return;
            }
        } else if (beginnerPhase === 'quiz') {
            beginnerStep++;
            if (beginnerStep >= BEGINNER_LESSONS.length) {
                // All quizzes done — show completion
                beginnerPhase = 'complete';
                drawBeginner();
                return;
            }
            startBeginnerQuiz();
            return;
        } else if (beginnerPhase === 'complete') {
            // Done — graduate to Level 1
            const xp = beginnerScore * 15;
            addXP(xp);
            addGamePlayed();
            showModal('Training Complete! 🎓',
                `<div class="result-row"><span class="result-label">Defects Learned</span><span class="result-value good">${BEGINNER_LESSONS.length}</span></div>
                 <div class="result-row"><span class="result-label">Quiz Score</span><span class="result-value good">${beginnerScore}/${BEGINNER_LESSONS.length}</span></div>
                 <div class="result-row"><span class="result-label">Accuracy</span><span class="result-value good">${Math.round(beginnerScore / BEGINNER_LESSONS.length * 100)}%</span></div>
                 <div class="xp-earned">+${xp} XP</div>
                 <p style="margin-top:10px;font-size:12px;color:var(--text-secondary)">You\'re ready for Level 1: Obvious Defects!</p>`,
                true);
            stopBeginnerMode();
            return;
        }
        drawBeginner();
    }

    function startBeginnerQuiz() {
        quizFound = false;
        quizFalseCount = 0;
        const lesson = BEGINNER_LESSONS[beginnerStep];
        const w = canvas.width, h = canvas.height;
        // Place 1 defect of this type somewhere on a simple board
        quizDefect = {
            id: 0, typeIdx: lesson.defectIdx,
            type: DEFECT_TYPES[lesson.defectIdx],
            x: 200 + Math.random() * (w - 400),
            y: 150 + Math.random() * (h - 300),
            size: 18 + Math.random() * 10,
            found: false
        };
        setTool('flag');
        document.getElementById('qc-findings').innerHTML = `<p style="font-size:13px;color:#4db8ff;font-weight:600;">🧪 Quiz ${beginnerStep + 1}/${BEGINNER_LESSONS.length}</p><p style="font-size:11px;color:var(--text-secondary);margin-top:6px;">Find the <strong>${lesson.title}</strong> on this board. Click "Flag Defect" to mark it!</p>`;
        drawBeginner();
    }

    function handleBeginnerClick(pos) {
        if (beginnerPhase !== 'quiz' || quizFound) return;
        if (tool !== 'flag') return;

        const dist = Math.hypot(quizDefect.x - pos.x, quizDefect.y - pos.y);
        if (dist < quizDefect.size + 20) {
            // Correct!
            quizFound = true;
            quizDefect.found = true;
            beginnerScore++;
            document.getElementById('qc-findings').innerHTML = `<p style="font-size:14px;color:#3ecf71;font-weight:700;">✅ Correct!</p><p style="font-size:11px;color:var(--text-secondary);margin-top:4px;">You found the ${BEGINNER_LESSONS[beginnerStep].title}! ${quizFalseCount === 0 ? 'Perfect — no false alarms!' : quizFalseCount + ' false alarm(s).'}</p><button class="btn btn-primary" style="margin-top:8px;font-size:12px;" onclick="qcGame.beginnerNext()">Next →</button>`;
            drawBeginner();
        } else {
            quizFalseCount++;
            // Flash red circle at click point
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
            ctx.strokeStyle = '#ff5252'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#ff5252'; ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'center'; ctx.fillText('✗', pos.x, pos.y + 3);
        }
    }

    function drawBeginner() {
        if (!ctx) return;
        const w = canvas.width, h = canvas.height;

        if (beginnerPhase === 'learn') {
            drawBeginnerLesson(w, h);
        } else if (beginnerPhase === 'quiz') {
            drawBeginnerQuiz(w, h);
        } else if (beginnerPhase === 'complete') {
            drawBeginnerComplete(w, h);
        }
    }

    function drawBeginnerLesson(w, h) {
        const lesson = BEGINNER_LESSONS[beginnerDefectIdx];

        // Dark background
        ctx.fillStyle = '#0f1117';
        ctx.fillRect(0, 0, w, h);

        // Progress bar at top
        const progW = w - 40;
        ctx.fillStyle = 'rgba(62,207,113,0.15)';
        roundRect(ctx, 20, 12, progW, 6, 3); ctx.fill();
        const fill = ((beginnerDefectIdx + 1) / BEGINNER_LESSONS.length) * progW;
        ctx.fillStyle = '#3ecf71';
        roundRect(ctx, 20, 12, fill, 6, 3); ctx.fill();
        ctx.fillStyle = '#7a8ba5'; ctx.font = '10px Inter,sans-serif'; ctx.textAlign = 'right';
        ctx.fillText(`${beginnerDefectIdx + 1} / ${BEGINNER_LESSONS.length}`, w - 20, 12);

        // Title
        ctx.fillStyle = '#3ecf71'; ctx.font = 'bold 22px Inter,sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`${lesson.emoji}  ${lesson.title}`, w / 2, 56);

        // ─── Good vs Bad comparison ──────────────────────────────
        const cardW = (w - 60) / 2, cardH = h * 0.35;
        const cardY = 80;

        // GOOD card (left)
        ctx.fillStyle = 'rgba(62,207,113,0.08)';
        roundRect(ctx, 20, cardY, cardW, cardH, 10); ctx.fill();
        ctx.strokeStyle = 'rgba(62,207,113,0.4)'; ctx.lineWidth = 1.5;
        roundRect(ctx, 20, cardY, cardW, cardH, 10); ctx.stroke();

        ctx.fillStyle = '#3ecf71'; ctx.font = 'bold 13px Inter,sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('✅ GOOD', 20 + cardW / 2, cardY + 20);

        // Draw a "good" component example
        drawGoodExample(ctx, 20, cardY + 30, cardW, cardH - 60, lesson.defectIdx);

        ctx.fillStyle = '#7a8ba5'; ctx.font = '10px Inter,sans-serif';
        ctx.fillText(lesson.goodLabel, 20 + cardW / 2, cardY + cardH - 10);

        // BAD card (right)
        const badX = 40 + cardW;
        ctx.fillStyle = 'rgba(255,82,82,0.08)';
        roundRect(ctx, badX, cardY, cardW, cardH, 10); ctx.fill();
        ctx.strokeStyle = 'rgba(255,82,82,0.4)'; ctx.lineWidth = 1.5;
        roundRect(ctx, badX, cardY, cardW, cardH, 10); ctx.stroke();

        ctx.fillStyle = '#ff5252'; ctx.font = 'bold 13px Inter,sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('❌ DEFECTIVE', badX + cardW / 2, cardY + 20);

        // Draw the defect example
        drawBadExample(ctx, badX, cardY + 30, cardW, cardH - 60, lesson.defectIdx);

        ctx.fillStyle = '#7a8ba5'; ctx.font = '10px Inter,sans-serif';
        ctx.fillText(lesson.badLabel, badX + cardW / 2, cardY + cardH - 10);

        // ─── Text explanations ───────────────────────────────────
        const textY = cardY + cardH + 20;
        const textX = 30, maxW = w - 60;

        ctx.textAlign = 'left';
        ctx.fillStyle = '#e8edf5'; ctx.font = 'bold 13px Inter,sans-serif';
        ctx.fillText('What is it?', textX, textY);
        ctx.fillStyle = '#c8d4e0'; ctx.font = '12px Inter,sans-serif';
        wrapText(ctx, lesson.whatIs, textX, textY + 16, maxW, 16);

        ctx.fillStyle = '#4db8ff'; ctx.font = 'bold 13px Inter,sans-serif';
        ctx.fillText('🔍 What to look for:', textX, textY + 56);
        ctx.fillStyle = '#c8d4e0'; ctx.font = '12px Inter,sans-serif';
        wrapText(ctx, lesson.lookFor, textX, textY + 72, maxW, 16);

        ctx.fillStyle = '#ff5252'; ctx.font = 'bold 13px Inter,sans-serif';
        ctx.fillText('⚠️ Why it\'s bad:', textX, textY + 112);
        ctx.fillStyle = '#c8d4e0'; ctx.font = '12px Inter,sans-serif';
        wrapText(ctx, lesson.whyBad, textX, textY + 128, maxW, 16);

        // Next button (drawn on canvas)
        const btnW = 140, btnH = 36;
        const btnX = w / 2 - btnW / 2, btnY = h - 50;
        ctx.fillStyle = '#3ecf71';
        roundRect(ctx, btnX, btnY, btnW, btnH, 8); ctx.fill();
        ctx.fillStyle = '#0f1117'; ctx.font = 'bold 14px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(beginnerDefectIdx < BEGINNER_LESSONS.length - 1 ? 'Next Defect →' : 'Start Quiz →', w / 2, btnY + btnH / 2);
        ctx.textBaseline = 'alphabetic';

        // Store button bounds for click handling
        canvas._beginnerBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
    }

    function drawGoodExample(ctx, cardX, cardY, cardW, cardH, defectIdx) {
        const cx = cardX + cardW / 2, cy = cardY + cardH / 2;
        // Small PCB board background
        ctx.fillStyle = '#1a4a2a';
        roundRect(ctx, cardX + 20, cardY + 5, cardW - 40, cardH - 10, 6); ctx.fill();
        // Copper pads
        ctx.fillStyle = '#b87333';
        ctx.fillRect(cx - 25, cy - 3, 12, 6);
        ctx.fillRect(cx + 13, cy - 3, 12, 6);
        // Component body
        ctx.fillStyle = defectIdx <= 1 ? '#e8a87c' : defectIdx === 2 ? '#303030' : '#41b3a3';
        roundRect(ctx, cx - 12, cy - 6, 24, 12, 2); ctx.fill();
        // Good solder joints (bright, smooth)
        ctx.fillStyle = '#e0e0e0';
        ctx.beginPath(); ctx.arc(cx - 12, cy, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 12, cy, 4, 0, Math.PI * 2); ctx.fill();
        // Shine highlight
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath(); ctx.arc(cx - 13, cy - 1, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 11, cy - 1, 1.5, 0, Math.PI * 2); ctx.fill();
        // ✅ check
        ctx.fillStyle = '#3ecf71'; ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center'; ctx.fillText('✓', cx, cy + cardH / 2 - 8);
    }

    function drawBadExample(ctx, cardX, cardY, cardW, cardH, defectIdx) {
        const cx = cardX + cardW / 2, cy = cardY + cardH / 2;
        // Small PCB board background
        ctx.fillStyle = '#1a4a2a';
        roundRect(ctx, cardX + 20, cardY + 5, cardW - 40, cardH - 10, 6); ctx.fill();

        switch (defectIdx) {
            case 0: // Cold solder
                ctx.fillStyle = '#b87333';
                ctx.fillRect(cx - 25, cy - 3, 12, 6);
                ctx.fillRect(cx + 13, cy - 3, 12, 6);
                ctx.fillStyle = '#e8a87c';
                roundRect(ctx, cx - 12, cy - 6, 24, 12, 2); ctx.fill();
                // Dull, grainy solder joints
                ctx.fillStyle = '#888';
                ctx.beginPath(); ctx.arc(cx - 12, cy, 5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(cx + 12, cy, 5, 0, Math.PI * 2); ctx.fill();
                // Grainy texture dots
                ctx.fillStyle = 'rgba(100,100,100,0.7)';
                for (let i = 0; i < 6; i++) {
                    ctx.beginPath();
                    ctx.arc(cx - 12 + (Math.random() - 0.5) * 8, cy + (Math.random() - 0.5) * 8, 1, 0, Math.PI * 2);
                    ctx.fill();
                }
                // Arrow pointing to bad joint
                ctx.strokeStyle = '#ff5252'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(cx - 25, cy - 18); ctx.lineTo(cx - 13, cy - 6); ctx.stroke();
                ctx.fillStyle = '#ff5252'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('Dull & grainy', cx - 12, cy - 22);
                break;

            case 1: // Solder bridge
                ctx.fillStyle = '#b87333';
                ctx.fillRect(cx - 22, cy - 3, 8, 6);
                ctx.fillRect(cx - 6, cy - 3, 8, 6);
                ctx.fillRect(cx + 10, cy - 3, 8, 6);
                // 3 components close together
                ctx.fillStyle = '#303030';
                roundRect(ctx, cx - 22, cy - 8, 8, 16, 1); ctx.fill();
                roundRect(ctx, cx - 6, cy - 8, 8, 16, 1); ctx.fill();
                roundRect(ctx, cx + 10, cy - 8, 8, 16, 1); ctx.fill();
                // Bridge connecting two pads
                ctx.fillStyle = '#c0c0c0';
                ctx.beginPath();
                ctx.ellipse(cx - 3, cy, 12, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                // Arrow
                ctx.strokeStyle = '#ff5252'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(cx - 3, cy - 18); ctx.lineTo(cx - 3, cy - 6); ctx.stroke();
                ctx.fillStyle = '#ff5252'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('Solder bridge!', cx - 3, cy - 22);
                break;

            case 2: // Missing component
                ctx.fillStyle = '#b87333';
                ctx.fillRect(cx - 25, cy - 3, 12, 6);
                ctx.fillRect(cx + 13, cy - 3, 12, 6);
                // Empty pads — no component!
                ctx.strokeStyle = '#b87333'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
                ctx.strokeRect(cx - 14, cy - 8, 28, 16);
                ctx.setLineDash([]);
                // Arrow
                ctx.strokeStyle = '#ff5252'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(cx, cy - 22); ctx.lineTo(cx, cy - 10); ctx.stroke();
                ctx.fillStyle = '#ff5252'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('Missing!', cx, cy - 26);
                break;

            case 3: // Tombstone
                ctx.fillStyle = '#b87333';
                ctx.fillRect(cx - 18, cy + 2, 36, 4);
                // Component standing up
                ctx.fillStyle = '#41b3a3';
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(-Math.PI / 4);
                ctx.fillRect(-4, -14, 8, 20);
                ctx.restore();
                // Arrow
                ctx.strokeStyle = '#ff5252'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(cx + 18, cy - 20); ctx.lineTo(cx + 6, cy - 8); ctx.stroke();
                ctx.fillStyle = '#ff5252'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('Standing up!', cx + 18, cy - 24);
                break;
        }
    }

    function drawBeginnerQuiz(w, h) {
        const rng = seededRandom(42 + beginnerStep);

        // PCB background (simpler, fewer components)
        ctx.fillStyle = '#1a4a2a';
        ctx.fillRect(0, 0, w, h);
        drawGrid(ctx, w, h, 12, 'rgba(0,80,40,0.15)');

        // Board outline
        ctx.strokeStyle = '#3a6a3a'; ctx.lineWidth = 2;
        ctx.strokeRect(60, 40, w - 120, h - 100);

        // Fewer traces (less scary)
        ctx.strokeStyle = '#a08020'; ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            const sx = 80 + rng() * (w - 180), sy = 60 + rng() * (h - 160);
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + (rng() - 0.5) * 100, sy);
            ctx.stroke();
        }

        // Only 6 "good" components (simple, clean board)
        for (let i = 0; i < 6; i++) {
            const cx = 100 + rng() * (w - 220);
            const cy = 80 + rng() * (h - 200);
            const cw = 14 + rng() * 18;
            const ch = 8 + rng() * 10;
            ctx.fillStyle = '#b87333';
            ctx.fillRect(cx - 3, cy, 3, ch);
            ctx.fillRect(cx + cw, cy, 3, ch);
            ctx.fillStyle = rng() < 0.5 ? '#e8a87c' : '#41b3a3';
            roundRect(ctx, cx, cy, cw, ch, 2); ctx.fill();
            ctx.fillStyle = '#d0d0d0';
            ctx.beginPath(); ctx.arc(cx, cy + ch / 2, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + cw, cy + ch / 2, 2.5, 0, Math.PI * 2); ctx.fill();
        }

        // Draw the quiz defect
        if (quizDefect) {
            drawDefect(quizDefect);
        }

        // Draw found marker
        if (quizFound && quizDefect) {
            ctx.beginPath();
            ctx.arc(quizDefect.x, quizDefect.y, 22, 0, Math.PI * 2);
            ctx.strokeStyle = '#3ecf71'; ctx.lineWidth = 3; ctx.stroke();
            ctx.fillStyle = '#3ecf71'; ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('✓ ' + quizDefect.type.name, quizDefect.x, quizDefect.y - 28);
        }

        // Quiz header
        ctx.fillStyle = 'rgba(15,17,23,0.85)';
        roundRect(ctx, w / 2 - 160, 4, 320, 30, 8); ctx.fill();
        ctx.fillStyle = '#4db8ff'; ctx.font = 'bold 13px Inter,sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`🧪 Find the ${BEGINNER_LESSONS[beginnerStep].title}`, w / 2, 24);

        // Magnify effect
        if (tool === 'magnify' && hoverPos) {
            const mx = hoverPos.x, my = hoverPos.y, radius = 55;
            ctx.save();
            ctx.beginPath(); ctx.arc(mx, my, radius, 0, Math.PI * 2);
            ctx.strokeStyle = '#00b4d8'; ctx.lineWidth = 3; ctx.stroke();
            ctx.clip();
            ctx.translate(mx, my); ctx.scale(2, 2); ctx.translate(-mx, -my);
            ctx.fillStyle = '#1a4a2a';
            ctx.fillRect(mx - radius, my - radius, radius * 2, radius * 2);
            if (quizDefect && Math.hypot(quizDefect.x - mx, quizDefect.y - my) < radius * 2) {
                drawDefect(quizDefect);
            }
            ctx.restore();
            ctx.beginPath(); ctx.arc(mx, my, radius, 0, Math.PI * 2);
            ctx.strokeStyle = '#00b4d8'; ctx.lineWidth = 3; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(mx + radius * 0.7, my + radius * 0.7);
            ctx.lineTo(mx + radius * 1.2, my + radius * 1.2);
            ctx.strokeStyle = '#00b4d8'; ctx.lineWidth = 4; ctx.stroke();
        }
    }

    function drawBeginnerComplete(w, h) {
        ctx.fillStyle = '#0f1117';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#3ecf71'; ctx.font = 'bold 28px Inter,sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('🎓 Training Complete!', w / 2, h / 2 - 60);

        ctx.fillStyle = '#e8edf5'; ctx.font = '16px Inter,sans-serif';
        ctx.fillText(`You scored ${beginnerScore}/${BEGINNER_LESSONS.length} on the quiz`, w / 2, h / 2 - 20);

        ctx.fillStyle = '#7a8ba5'; ctx.font = '13px Inter,sans-serif';
        ctx.fillText('You now know the 4 most common PCB defects.', w / 2, h / 2 + 15);
        ctx.fillText('Ready to try the real inspection?', w / 2, h / 2 + 35);

        // Graduate button
        const btnW = 200, btnH = 42;
        const btnX = w / 2 - btnW / 2, btnY = h / 2 + 60;
        ctx.fillStyle = '#3ecf71';
        roundRect(ctx, btnX, btnY, btnW, btnH, 8); ctx.fill();
        ctx.fillStyle = '#0f1117'; ctx.font = 'bold 15px Inter,sans-serif'; ctx.textBaseline = 'middle';
        ctx.fillText('Start Level 1 →', w / 2, btnY + btnH / 2);
        ctx.textBaseline = 'alphabetic';
        canvas._beginnerBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
    }

    function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '', ly = y;
        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            if (ctx.measureText(testLine).width > maxWidth && i > 0) {
                ctx.fillText(line.trim(), x, ly);
                line = words[i] + ' ';
                ly += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line.trim(), x, ly);
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

    return { init, resizeCanvas, loadLevel, setTool, submitInspection, reset, getTutorialAPI, startBeginnerMode, beginnerNext };
})();
