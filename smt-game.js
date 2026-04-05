const smtGame = (() => {
    let canvas, ctx;
    let currentBoard = 0;
    let phase = 0; // 0=paste, 1=place, 2=reflow, 3=inspect
    let score = 100;
    let selectedComp = null;
    let padsWithPaste = new Set();
    let placedSMDs = [];
    let reflowed = false;
    let hoverPos = null;

    const BOARDS = [
        {
            name: 'Simple LED Driver',
            pads: [
                { id: 'R1', x: 200, y: 180, w: 50, h: 20, label: 'R1 100\u03a9', type: 'resistor', rotation: 0 },
                { id: 'R2', x: 200, y: 230, w: 50, h: 20, label: 'R2 220\u03a9', type: 'resistor', rotation: 0 },
                { id: 'C1', x: 350, y: 180, w: 30, h: 30, label: 'C1 10\u00b5F', type: 'capacitor', rotation: 0 },
                { id: 'LED1', x: 350, y: 260, w: 30, h: 20, label: 'LED1', type: 'led', rotation: 0 },
                { id: 'LED2', x: 420, y: 260, w: 30, h: 20, label: 'LED2', type: 'led', rotation: 0 },
                { id: 'U1', x: 480, y: 170, w: 60, h: 50, label: 'U1 Driver', type: 'ic', rotation: 0 },
            ],
            components: ['resistor', 'resistor', 'capacitor', 'led', 'led', 'ic']
        },
        {
            name: 'Voltage Regulator',
            pads: [
                { id: 'C1', x: 150, y: 160, w: 30, h: 30, label: 'C1 22\u00b5F', type: 'capacitor', rotation: 0 },
                { id: 'C2', x: 450, y: 160, w: 30, h: 30, label: 'C2 22\u00b5F', type: 'capacitor', rotation: 0 },
                { id: 'C3', x: 300, y: 300, w: 30, h: 30, label: 'C3 100nF', type: 'capacitor', rotation: 0 },
                { id: 'R1', x: 250, y: 240, w: 50, h: 20, label: 'R1 10k\u03a9', type: 'resistor', rotation: 0 },
                { id: 'R2', x: 380, y: 240, w: 50, h: 20, label: 'R2 4.7k\u03a9', type: 'resistor', rotation: 0 },
                { id: 'U1', x: 270, y: 150, w: 80, h: 60, label: 'AMS1117', type: 'ic', rotation: 0 },
                { id: 'D1', x: 450, y: 240, w: 40, h: 25, label: 'D1 Schottky', type: 'diode', rotation: 0 },
                { id: 'LED1', x: 500, y: 300, w: 30, h: 20, label: 'Power LED', type: 'led', rotation: 0 },
            ],
            components: ['capacitor', 'capacitor', 'capacitor', 'resistor', 'resistor', 'ic', 'diode', 'led']
        },
        {
            name: 'Microcontroller Module',
            pads: [
                { id: 'U1', x: 250, y: 150, w: 100, h: 80, label: 'ESP32-S3', type: 'qfp', rotation: 0 },
                { id: 'C1', x: 150, y: 160, w: 25, h: 25, label: 'C1 100nF', type: 'capacitor', rotation: 0 },
                { id: 'C2', x: 150, y: 210, w: 25, h: 25, label: 'C2 10\u00b5F', type: 'capacitor', rotation: 0 },
                { id: 'C3', x: 400, y: 160, w: 25, h: 25, label: 'C3 100nF', type: 'capacitor', rotation: 0 },
                { id: 'R1', x: 400, y: 210, w: 40, h: 16, label: 'R1 10k', type: 'resistor', rotation: 0 },
                { id: 'R2', x: 400, y: 240, w: 40, h: 16, label: 'R2 10k', type: 'resistor', rotation: 0 },
                { id: 'R3', x: 400, y: 270, w: 40, h: 16, label: 'R3 4.7k', type: 'resistor', rotation: 0 },
                { id: 'X1', x: 250, y: 280, w: 45, h: 20, label: '40MHz Xtal', type: 'crystal', rotation: 0 },
                { id: 'LED1', x: 170, y: 300, w: 25, h: 16, label: 'Status LED', type: 'led', rotation: 0 },
                { id: 'USB', x: 300, y: 320, w: 60, h: 30, label: 'USB-C', type: 'connector', rotation: 0 },
            ],
            components: ['qfp', 'capacitor', 'capacitor', 'capacitor', 'resistor', 'resistor', 'resistor', 'crystal', 'led', 'connector']
        }
    ];

    const SMD_COLORS = {
        resistor: '#e8a87c',
        capacitor: '#41b3a3',
        led: '#ff5252',
        ic: '#303030',
        diode: '#7c4dff',
        qfp: '#1a1a1a',
        crystal: '#c0c0c0',
        connector: '#666'
    };

    function init() {
        canvas = document.getElementById('smt-canvas');
        ctx = canvas.getContext('2d');
        resizeCanvas();
        loadBoard(0);
        setupEvents();
    }

    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight - 40;
        draw();
    }

    function loadBoard(idx) {
        currentBoard = parseInt(idx);
        phase = 0;
        score = 100;
        padsWithPaste = new Set();
        placedSMDs = [];
        reflowed = false;
        selectedComp = null;
        document.getElementById('smt-score').textContent = '100%';
        updatePhaseUI();
        buildPalette();
        updateStats();
        draw();
    }

    function buildPalette() {
        const palette = document.getElementById('smt-components');
        palette.innerHTML = '';
        const board = BOARDS[currentBoard];

        if (phase === 0) {
            // Solder paste phase - show stencil tool
            const item = document.createElement('div');
            item.className = 'palette-item selected';
            item.innerHTML = `
                <div class="comp-icon" style="background:#c0c0c01a;padding:0;overflow:hidden;border-radius:6px;display:flex;align-items:center;justify-content:center;">
                    <canvas id="smt-icon-sp" width="40" height="32" style="display:block;width:40px;height:32px;max-width:none;max-height:none;"></canvas>
                </div>
                <div class="comp-info">
                    <div class="comp-name">Solder Paste</div>
                    <div class="comp-detail">Click each pad</div>
                </div>
            `;
            palette.appendChild(item);
            setTimeout(() => {
                const mc = document.getElementById('smt-icon-sp');
                if (mc) drawSmtMiniIcon(mc, 'solderpaste');
            }, 0);
        } else if (phase === 1) {
            // Pick & place phase - show components
            const placedTypes = placedSMDs.map(p => p.type);
            board.pads.forEach((pad, i) => {
                const alreadyPlaced = placedSMDs.some(p => p.padId === pad.id);
                const item = document.createElement('div');
                item.className = 'palette-item' + (alreadyPlaced ? '' : '');
                item.dataset.padIdx = i;
                if (alreadyPlaced) {
                    item.style.opacity = '0.3';
                    item.style.pointerEvents = 'none';
                }
                const iconId = `smt-icon-${i}`;
                item.innerHTML = `
                    <div class="comp-icon" style="background:${SMD_COLORS[pad.type]}1a;padding:0;overflow:hidden;border-radius:6px;display:flex;align-items:center;justify-content:center;">
                        <canvas id="${iconId}" width="40" height="32" style="display:block;width:40px;height:32px;max-width:none;max-height:none;"></canvas>
                    </div>
                    <div class="comp-info">
                        <div class="comp-name">${pad.label}</div>
                        <div class="comp-detail">${pad.type}</div>
                    </div>
                `;
                setTimeout(() => {
                    const mc = document.getElementById(iconId);
                    if (mc) drawSmtMiniIcon(mc, pad.type);
                }, 0);
                item.onclick = () => {
                    if (!alreadyPlaced) {
                        selectedComp = i;
                        document.querySelectorAll('#smt-components .palette-item').forEach(p => p.classList.remove('selected'));
                        item.classList.add('selected');
                        if (window.tutorialEngine && tutorialEngine.isActive()) {
                            tutorialEngine.onUserAction('smt-click', { phase, pasteCount: padsWithPaste.size, placedCount: placedSMDs.length, totalPads: board.pads.length });
                        }
                    }
                };
                palette.appendChild(item);
            });
        }
    }

    function updatePhaseUI() {
        document.querySelectorAll('.smt-phase-indicator .phase').forEach((el, i) => {
            el.classList.remove('active', 'completed');
            if (i === phase) el.classList.add('active');
            else if (i < phase) el.classList.add('completed');
        });
    }

    function updateStats() {
        const board = BOARDS[currentBoard];
        const stats = document.getElementById('smt-stats');
        stats.innerHTML = `<h3>Stats</h3>
            <div class="check-item"><div class="check-mark">${padsWithPaste.size >= board.pads.length ? '\u2713' : padsWithPaste.size}</div><span>Pads with paste: ${padsWithPaste.size}/${board.pads.length}</span></div>
            <div class="check-item"><div class="check-mark">${placedSMDs.length >= board.pads.length ? '\u2713' : placedSMDs.length}</div><span>Components placed: ${placedSMDs.length}/${board.pads.length}</span></div>
            <div class="check-item"><div class="check-mark">${reflowed ? '\u2713' : '-'}</div><span>Reflow: ${reflowed ? 'Complete' : 'Pending'}</span></div>
        `;

        // Hint for current phase
        const hints = [
            'Click on each copper pad to apply solder paste. All pads need paste before placing components.',
            'Select a component from the reel, then click its matching pad on the board to place it.',
            'Click "Next Phase" to start the reflow oven. Watch the temperature profile!',
            'Review your work. Check for any misaligned or missing components.'
        ];
        stats.innerHTML += `<div class="hint-text" style="margin-top:8px">${hints[phase]}</div>`;
    }

    function nextPhase() {
        const board = BOARDS[currentBoard];

        if (phase === 0) {
            // Check all pads have paste
            if (padsWithPaste.size < board.pads.length) {
                const missed = board.pads.length - padsWithPaste.size;
                score -= missed * 5;
            }
            phase = 1;
            buildPalette();
        } else if (phase === 1) {
            if (placedSMDs.length < board.pads.length) {
                const missed = board.pads.length - placedSMDs.length;
                score -= missed * 10;
            }
            phase = 2;
            // Animate reflow
            animateReflow();
        } else if (phase === 2) {
            phase = 3;
            reflowed = true;
            finishInspection();
        } else if (phase === 3) {
            // Submit
            if (window.tutorialEngine && tutorialEngine.isActive()) {
                tutorialEngine.onUserAction('smt-submit', { phase, score });
            }
            addGamePlayed();
            const xp = Math.round(Math.max(score, 0) * 3);
            addXP(xp);

            showModal(
                score >= 70 ? 'Board Passed QC!' : 'Board Needs Rework',
                `<div class="result-row"><span class="result-label">Board</span><span class="result-value">${board.name}</span></div>
                 <div class="result-row"><span class="result-label">Paste Application</span><span class="result-value ${padsWithPaste.size >= board.pads.length ? 'good' : 'bad'}">${padsWithPaste.size}/${board.pads.length} pads</span></div>
                 <div class="result-row"><span class="result-label">Components Placed</span><span class="result-value ${placedSMDs.length >= board.pads.length ? 'good' : 'bad'}">${placedSMDs.length}/${board.pads.length}</span></div>
                 <div class="result-row"><span class="result-label">Accuracy Score</span><span class="result-value ${score >= 70 ? 'good' : 'bad'}">${Math.max(score, 0)}%</span></div>
                 <div class="xp-earned">+${xp} XP</div>`,
                score >= 70
            );
            return;
        }

        score = Math.max(score, 0);
        document.getElementById('smt-score').textContent = Math.max(score, 0) + '%';
        updatePhaseUI();
        updateStats();
        draw();

        // Tutorial hook for phase change
        if (window.tutorialEngine && tutorialEngine.isActive()) {
            tutorialEngine.onUserAction('smt-click', {
                phase, pasteCount: padsWithPaste.size,
                placedCount: placedSMDs.length,
                totalPads: BOARDS[currentBoard].pads.length
            });
        }
    }

    function animateReflow() {
        let temp = 25;
        const targetProfile = [25, 100, 150, 180, 220, 250, 260, 250, 200, 150, 80, 40, 25];
        let step = 0;

        const interval = setInterval(() => {
            if (step >= targetProfile.length) {
                clearInterval(interval);
                phase = 2;
                reflowed = true;
                updatePhaseUI();
                updateStats();
                draw();
                return;
            }
            temp = targetProfile[step];
            step++;

            // Draw temperature indicator
            draw();
            // Overlay temperature
            ctx.fillStyle = 'rgba(10, 14, 23, 0.7)';
            ctx.fillRect(canvas.width / 2 - 120, canvas.height / 2 - 50, 240, 100);
            ctx.strokeStyle = temp > 200 ? '#ff5252' : temp > 150 ? '#ff9100' : '#00e676';
            ctx.lineWidth = 2;
            ctx.strokeRect(canvas.width / 2 - 120, canvas.height / 2 - 50, 240, 100);

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('REFLOW OVEN', canvas.width / 2, canvas.height / 2 - 25);
            ctx.font = 'bold 32px monospace';
            ctx.fillStyle = temp > 200 ? '#ff5252' : temp > 150 ? '#ff9100' : '#00e676';
            ctx.fillText(`${temp}\u00b0C`, canvas.width / 2, canvas.height / 2 + 15);

            // Progress bar
            const progress = step / targetProfile.length;
            ctx.fillStyle = '#2a3650';
            ctx.fillRect(canvas.width / 2 - 100, canvas.height / 2 + 30, 200, 8);
            ctx.fillStyle = temp > 200 ? '#ff5252' : '#00b4d8';
            ctx.fillRect(canvas.width / 2 - 100, canvas.height / 2 + 30, 200 * progress, 8);
        }, 400);
    }

    function finishInspection() {
        updatePhaseUI();
        updateStats();
        draw();
    }

    function setupEvents() {
        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('mousemove', e => {
            hoverPos = getCanvasCoords(canvas, e);
            draw();
        });
        window.addEventListener('resize', () => {
            if (document.getElementById('smt-line').classList.contains('active')) resizeCanvas();
        });
    }

    function handleClick(e) {
        const pos = getCanvasCoords(canvas, e);
        const board = BOARDS[currentBoard];

        if (phase === 0) {
            // Apply solder paste to clicked pad
            board.pads.forEach(pad => {
                if (pos.x >= pad.x && pos.x <= pad.x + pad.w &&
                    pos.y >= pad.y && pos.y <= pad.y + pad.h) {
                    padsWithPaste.add(pad.id);
                    updateStats();
                    draw();
                }
            });
        } else if (phase === 1 && selectedComp !== null) {
            // Place component
            const pad = board.pads[selectedComp];
            if (pad && pos.x >= pad.x - 15 && pos.x <= pad.x + pad.w + 15 &&
                pos.y >= pad.y - 15 && pos.y <= pad.y + pad.h + 15) {
                // Check pad has paste
                if (!padsWithPaste.has(pad.id)) {
                    score -= 5; // Penalty for no paste
                }

                const offsetX = pos.x - (pad.x + pad.w / 2);
                const offsetY = pos.y - (pad.y + pad.h / 2);
                const accuracy = Math.max(0, 100 - Math.hypot(offsetX, offsetY) * 2);

                placedSMDs.push({
                    padId: pad.id,
                    type: pad.type,
                    x: pos.x - pad.w / 2,
                    y: pos.y - pad.h / 2,
                    accuracy: accuracy
                });

                if (accuracy < 80) score -= Math.round((80 - accuracy) / 5);

                selectedComp = null;
                document.getElementById('smt-score').textContent = Math.max(score, 0) + '%';
                buildPalette();
                updateStats();
                draw();
            }
        }

        // Tutorial hook
        if (window.tutorialEngine && tutorialEngine.isActive()) {
            tutorialEngine.onUserAction('smt-click', {
                phase, pasteCount: padsWithPaste.size,
                placedCount: placedSMDs.length,
                totalPads: board.pads.length
            });
        }
    }

    function reset() {
        loadBoard(currentBoard);
    }

    function draw() {
        if (!ctx) return;
        const w = canvas.width, h = canvas.height;

        // PCB background
        ctx.fillStyle = '#1a4a2a';
        ctx.fillRect(0, 0, w, h);
        drawGrid(ctx, w, h, 10, 'rgba(0, 80, 40, 0.3)');

        const board = BOARDS[currentBoard];

        // Board outline
        ctx.strokeStyle = '#4a6a4a';
        ctx.lineWidth = 3;
        ctx.strokeRect(100, 100, w - 200, h - 240);

        // Traces (decorative)
        ctx.strokeStyle = '#c0a020';
        ctx.lineWidth = 2;
        board.pads.forEach((pad, i) => {
            if (i < board.pads.length - 1) {
                const next = board.pads[i + 1];
                ctx.beginPath();
                ctx.moveTo(pad.x + pad.w, pad.y + pad.h / 2);
                ctx.lineTo(next.x, next.y + next.h / 2);
                ctx.stroke();
            }
        });

        // Draw pads as realistic SMD footprints (copper lands + silkscreen)
        board.pads.forEach(pad => {
            const hasPaste = padsWithPaste.has(pad.id);
            const isPlaced = placedSMDs.some(p => p.padId === pad.id);
            drawPadFootprint(ctx, pad, hasPaste, isPlaced);

            // Silkscreen reference designator above footprint
            ctx.fillStyle = '#e8e8e8';
            ctx.font = 'bold 9px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            ctx.shadowColor = 'rgba(0,0,0,0.6)';
            ctx.shadowBlur = 2;
            ctx.fillText(pad.label, pad.x + pad.w / 2, pad.y - 6);
            ctx.shadowBlur = 0;

            // Highlight outline when the pad needs action
            const needsPaste = phase === 0 && !hasPaste;
            const needsPlace = phase === 1 && !isPlaced;
            if (needsPaste || needsPlace) {
                ctx.strokeStyle = needsPaste ? 'rgba(255,145,0,0.55)' : 'rgba(0,230,118,0.55)';
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.strokeRect(pad.x - 3, pad.y - 3, pad.w + 6, pad.h + 6);
                ctx.setLineDash([]);
            }
        });

        // Draw placed SMD components with realistic package rendering
        placedSMDs.forEach(smd => {
            const pad = board.pads.find(p => p.id === smd.padId);
            if (!pad) return;
            ctx.globalAlpha = reflowed ? 1 : 0.9;
            drawPlacedSmdBody(ctx, smd, pad, reflowed);
            ctx.globalAlpha = 1;
        });

        // Hover highlight
        if (hoverPos && (phase === 0 || phase === 1)) {
            board.pads.forEach(pad => {
                if (hoverPos.x >= pad.x - 5 && hoverPos.x <= pad.x + pad.w + 5 &&
                    hoverPos.y >= pad.y - 5 && hoverPos.y <= pad.y + pad.h + 5) {
                    ctx.strokeStyle = phase === 0 ? '#00e676' : '#00b4d8';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([4, 2]);
                    ctx.strokeRect(pad.x - 3, pad.y - 3, pad.w + 6, pad.h + 6);
                    ctx.setLineDash([]);
                }
            });
        }

        // Phase label
        const phaseNames = ['Apply Solder Paste', 'Pick & Place Components', 'Reflow Oven', 'Final Inspection'];
        ctx.fillStyle = '#00b4d8';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Phase: ${phaseNames[phase]}`, 110, h - 130);

        // Board title
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(board.name, w - 110, 115);
    }

    // ─── Realistic PCB footprint drawing (copper lands + silkscreen) ─────────
    // Draws the footprint inside pad.x/y/w/h bounding box.
    function drawPadFootprint(ctx, pad, hasPaste, isPlaced) {
        const x = pad.x, y = pad.y, w = pad.w, h = pad.h;
        const copper = '#b87333';
        const copperLight = '#d39a5c';
        const mask = 'rgba(26, 58, 42, 0)'; // transparent — board green shows through
        const silk = 'rgba(235,235,235,0.55)';

        ctx.save();
        switch (pad.type) {
            case 'resistor':
            case 'diode': {
                // Two terminal pads at each end, silkscreen body outline in between
                const tw = Math.max(6, w * 0.28);
                const th = h;
                // Left land
                copperPad(ctx, x, y, tw, th);
                // Right land
                copperPad(ctx, x + w - tw, y, tw, th);
                // Silkscreen body outline
                ctx.strokeStyle = silk;
                ctx.lineWidth = 1;
                ctx.strokeRect(x + tw + 1, y + 1, w - 2 * tw - 2, h - 2);
                // Polarity mark for diode
                if (pad.type === 'diode') {
                    ctx.fillStyle = silk;
                    ctx.fillRect(x + w - tw - 3, y + 2, 1.5, h - 4);
                }
                if (hasPaste && !isPlaced) {
                    pastePad(ctx, x, y, tw, th);
                    pastePad(ctx, x + w - tw, y, tw, th);
                }
                break;
            }
            case 'capacitor': {
                // Two square lands (chip cap 0805-style)
                const tw = Math.max(5, w * 0.32);
                copperPad(ctx, x, y, tw, h);
                copperPad(ctx, x + w - tw, y, tw, h);
                ctx.strokeStyle = silk; ctx.lineWidth = 1;
                ctx.strokeRect(x + tw + 1, y + 1, w - 2 * tw - 2, h - 2);
                if (hasPaste && !isPlaced) {
                    pastePad(ctx, x, y, tw, h);
                    pastePad(ctx, x + w - tw, y, tw, h);
                }
                break;
            }
            case 'led': {
                // Two lands + cathode triangle silkscreen mark
                const tw = Math.max(5, w * 0.33);
                copperPad(ctx, x, y, tw, h);
                copperPad(ctx, x + w - tw, y, tw, h);
                // Cathode mark (triangle pointing to cathode = right pad)
                ctx.fillStyle = silk;
                ctx.beginPath();
                ctx.moveTo(x + w / 2 - 3, y + h / 2 - 3);
                ctx.lineTo(x + w / 2 + 3, y + h / 2);
                ctx.lineTo(x + w / 2 - 3, y + h / 2 + 3);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = silk; ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x + w / 2 + 3, y + 2); ctx.lineTo(x + w / 2 + 3, y + h - 2);
                ctx.stroke();
                if (hasPaste && !isPlaced) {
                    pastePad(ctx, x, y, tw, h);
                    pastePad(ctx, x + w - tw, y, tw, h);
                }
                break;
            }
            case 'ic': {
                // SOIC — copper fingers on left/right, body outline in middle, pin-1 dot
                const pinCount = 4;
                const pinW = Math.max(3, w * 0.12);
                const pinH = Math.max(3, h / (pinCount + 1));
                const gap = (h - pinCount * pinH) / (pinCount + 1);
                for (let i = 0; i < pinCount; i++) {
                    const py = y + gap + i * (pinH + gap);
                    copperPad(ctx, x, py, pinW, pinH);
                    copperPad(ctx, x + w - pinW, py, pinW, pinH);
                    if (hasPaste && !isPlaced) {
                        pastePad(ctx, x, py, pinW, pinH);
                        pastePad(ctx, x + w - pinW, py, pinW, pinH);
                    }
                }
                // Silkscreen body outline + pin-1 dot
                ctx.strokeStyle = silk; ctx.lineWidth = 1;
                ctx.strokeRect(x + pinW + 1, y + 1, w - 2 * pinW - 2, h - 2);
                ctx.fillStyle = silk;
                ctx.beginPath(); ctx.arc(x + pinW + 4, y + 5, 1.2, 0, Math.PI * 2); ctx.fill();
                break;
            }
            case 'qfp': {
                // QFP — copper fingers on all 4 sides + thermal pad
                const pinCount = 6;
                const pinSize = Math.max(3, Math.min(w, h) * 0.08);
                const avail = Math.min(w, h) - pinSize * 2 - 8;
                const step = avail / (pinCount - 1);
                for (let i = 0; i < pinCount; i++) {
                    const t = pinSize + 4 + i * step;
                    // Left
                    copperPad(ctx, x, y + t - pinSize / 2, pinSize, pinSize);
                    // Right
                    copperPad(ctx, x + w - pinSize, y + t - pinSize / 2, pinSize, pinSize);
                    // Top
                    copperPad(ctx, x + t - pinSize / 2, y, pinSize, pinSize);
                    // Bottom
                    copperPad(ctx, x + t - pinSize / 2, y + h - pinSize, pinSize, pinSize);
                    if (hasPaste && !isPlaced) {
                        pastePad(ctx, x, y + t - pinSize / 2, pinSize, pinSize);
                        pastePad(ctx, x + w - pinSize, y + t - pinSize / 2, pinSize, pinSize);
                        pastePad(ctx, x + t - pinSize / 2, y, pinSize, pinSize);
                        pastePad(ctx, x + t - pinSize / 2, y + h - pinSize, pinSize, pinSize);
                    }
                }
                // Thermal pad in center
                const tpw = w * 0.4, tph = h * 0.4;
                copperPad(ctx, x + (w - tpw) / 2, y + (h - tph) / 2, tpw, tph);
                if (hasPaste && !isPlaced) pastePad(ctx, x + (w - tpw) / 2, y + (h - tph) / 2, tpw, tph);
                // Silkscreen body + pin-1 dot
                ctx.strokeStyle = silk; ctx.lineWidth = 1;
                ctx.strokeRect(x + pinSize + 1, y + pinSize + 1, w - 2 * pinSize - 2, h - 2 * pinSize - 2);
                ctx.fillStyle = silk;
                ctx.beginPath(); ctx.arc(x + pinSize + 5, y + pinSize + 5, 1.5, 0, Math.PI * 2); ctx.fill();
                break;
            }
            case 'crystal': {
                // HC-49 crystal — 2 larger lands + rounded silkscreen outline
                const tw = Math.max(6, w * 0.28);
                copperPad(ctx, x, y, tw, h);
                copperPad(ctx, x + w - tw, y, tw, h);
                ctx.strokeStyle = silk; ctx.lineWidth = 1;
                roundRect(ctx, x + tw + 1, y + 1, w - 2 * tw - 2, h - 2, 4);
                ctx.stroke();
                if (hasPaste && !isPlaced) {
                    pastePad(ctx, x, y, tw, h);
                    pastePad(ctx, x + w - tw, y, tw, h);
                }
                break;
            }
            case 'connector': {
                // USB-C / header — row of rectangular pads
                const pinCount = 6;
                const pinW = (w - (pinCount + 1) * 2) / pinCount;
                const pinH = h * 0.55;
                for (let i = 0; i < pinCount; i++) {
                    const px = x + 2 + i * (pinW + 2);
                    copperPad(ctx, px, y + h - pinH - 2, pinW, pinH);
                    if (hasPaste && !isPlaced) pastePad(ctx, px, y + h - pinH - 2, pinW, pinH);
                }
                // Mounting tabs (larger plated rectangles at each end)
                copperPad(ctx, x, y, 4, h * 0.35);
                copperPad(ctx, x + w - 4, y, 4, h * 0.35);
                if (hasPaste && !isPlaced) {
                    pastePad(ctx, x, y, 4, h * 0.35);
                    pastePad(ctx, x + w - 4, y, 4, h * 0.35);
                }
                // Silkscreen outline
                ctx.strokeStyle = silk; ctx.lineWidth = 1;
                roundRect(ctx, x, y + h * 0.35, w, h * 0.6, 2);
                ctx.stroke();
                break;
            }
            default: {
                copperPad(ctx, x, y, w, h);
                if (hasPaste && !isPlaced) pastePad(ctx, x, y, w, h);
            }
        }
        ctx.restore();
    }

    function copperPad(ctx, x, y, w, h) {
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, '#d89d57');
        grad.addColorStop(0.5, '#b87333');
        grad.addColorStop(1, '#8a5222');
        ctx.fillStyle = grad;
        roundRect(ctx, x, y, w, h, Math.min(2, Math.min(w, h) / 3));
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
    }

    function pastePad(ctx, x, y, w, h) {
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, 'rgba(220,220,225,0.85)');
        grad.addColorStop(1, 'rgba(150,150,160,0.85)');
        ctx.fillStyle = grad;
        const inset = Math.min(1.2, Math.min(w, h) * 0.15);
        roundRect(ctx, x + inset, y + inset, w - inset * 2, h - inset * 2, Math.min(1.5, Math.min(w, h) / 4));
        ctx.fill();
    }

    // Draw a realistic placed SMD component body on top of a footprint
    function drawPlacedSmdBody(ctx, smd, pad, reflowed) {
        const x = smd.x, y = smd.y, w = pad.w, h = pad.h;
        const cx = x + w / 2, cy = y + h / 2;
        ctx.save();
        switch (smd.type) {
            case 'resistor': {
                const bw = w * 0.5, bh = h;
                const bx = cx - bw / 2;
                // silver end caps
                ctx.fillStyle = '#c0c0c0';
                ctx.fillRect(bx - Math.max(3, w * 0.12), y, Math.max(3, w * 0.12), bh);
                ctx.fillRect(bx + bw, y, Math.max(3, w * 0.12), bh);
                // black body
                const grad = ctx.createLinearGradient(0, y, 0, y + bh);
                grad.addColorStop(0, '#2a2a2a'); grad.addColorStop(0.5, '#0e0e0e'); grad.addColorStop(1, '#2a2a2a');
                ctx.fillStyle = grad;
                ctx.fillRect(bx, y, bw, bh);
                if (bh >= 14) {
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText('103', cx, cy);
                }
                break;
            }
            case 'capacitor': {
                const bw = w * 0.42, bh = h;
                const bx = cx - bw / 2;
                ctx.fillStyle = '#c0c0c0';
                ctx.fillRect(bx - Math.max(3, w * 0.18), y, Math.max(3, w * 0.18), bh);
                ctx.fillRect(bx + bw, y, Math.max(3, w * 0.18), bh);
                const grad = ctx.createLinearGradient(0, y, 0, y + bh);
                grad.addColorStop(0, '#d4a373'); grad.addColorStop(0.5, '#8b5a2b'); grad.addColorStop(1, '#d4a373');
                ctx.fillStyle = grad;
                ctx.fillRect(bx, y, bw, bh);
                break;
            }
            case 'led': {
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(x, y, w, h);
                ctx.strokeStyle = '#888'; ctx.lineWidth = 0.5; ctx.strokeRect(x, y, w, h);
                const r = Math.min(w, h) * 0.35;
                const lens = ctx.createRadialGradient(cx, cy, 1, cx, cy, r);
                lens.addColorStop(0, '#ff9a9a'); lens.addColorStop(0.6, '#ff3030'); lens.addColorStop(1, '#660000');
                ctx.fillStyle = lens;
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
                // Cathode mark
                ctx.fillStyle = '#00e676';
                ctx.fillRect(x + w - 4, y + 1, 2, h - 2);
                break;
            }
            case 'diode': {
                ctx.fillStyle = '#c0c0c0';
                ctx.fillRect(x, y + h * 0.15, 3, h * 0.7);
                ctx.fillRect(x + w - 3, y + h * 0.15, 3, h * 0.7);
                ctx.fillStyle = '#151515';
                ctx.fillRect(x + 3, y, w - 6, h);
                // Cathode stripe
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(x + w - 6, y, 2, h);
                break;
            }
            case 'ic': {
                const pad = Math.max(3, w * 0.12);
                const grad = ctx.createLinearGradient(x, y, x + w, y + h);
                grad.addColorStop(0, '#3a3a3a'); grad.addColorStop(1, '#0a0a0a');
                ctx.fillStyle = grad;
                ctx.fillRect(x + pad, y + 1, w - 2 * pad, h - 2);
                ctx.strokeStyle = '#555'; ctx.lineWidth = 0.5;
                ctx.strokeRect(x + pad, y + 1, w - 2 * pad, h - 2);
                ctx.fillStyle = '#ccc';
                ctx.beginPath(); ctx.arc(x + pad + 4, y + 5, 1.3, 0, Math.PI * 2); ctx.fill();
                if (w > 40 && h > 20) {
                    ctx.fillStyle = '#888';
                    ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText('IC', cx, cy);
                }
                break;
            }
            case 'qfp': {
                const pad = Math.max(4, Math.min(w, h) * 0.1);
                const grad = ctx.createLinearGradient(x, y, x + w, y + h);
                grad.addColorStop(0, '#3a3a3a'); grad.addColorStop(1, '#0a0a0a');
                ctx.fillStyle = grad;
                ctx.fillRect(x + pad, y + pad, w - 2 * pad, h - 2 * pad);
                ctx.strokeStyle = '#555'; ctx.lineWidth = 0.5;
                ctx.strokeRect(x + pad, y + pad, w - 2 * pad, h - 2 * pad);
                ctx.fillStyle = '#ccc';
                ctx.beginPath(); ctx.arc(x + pad + 5, y + pad + 5, 1.5, 0, Math.PI * 2); ctx.fill();
                if (w > 60) {
                    ctx.fillStyle = '#888';
                    ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText('ESP32', cx, cy);
                }
                break;
            }
            case 'crystal': {
                const grad = ctx.createLinearGradient(x, y, x, y + h);
                grad.addColorStop(0, '#e0e0e0'); grad.addColorStop(0.5, '#a0a0a0'); grad.addColorStop(1, '#606060');
                ctx.fillStyle = grad;
                roundRect(ctx, x + 4, y, w - 8, h, Math.min(h / 2, 6));
                ctx.fill();
                ctx.strokeStyle = '#333'; ctx.lineWidth = 0.5; ctx.stroke();
                if (w > 30) {
                    ctx.fillStyle = '#333';
                    ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText('40MHz', cx, cy);
                }
                break;
            }
            case 'connector': {
                ctx.fillStyle = '#222';
                ctx.fillRect(x, y + h * 0.35, w, h * 0.6);
                ctx.strokeStyle = '#555'; ctx.lineWidth = 0.5;
                ctx.strokeRect(x, y + h * 0.35, w, h * 0.6);
                // Inner slot
                ctx.fillStyle = '#0a0a0a';
                ctx.fillRect(x + 4, y + h * 0.5, w - 8, h * 0.35);
                if (w > 40) {
                    ctx.fillStyle = '#666';
                    ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText('USB-C', cx, y + h * 0.8);
                }
                break;
            }
            default: {
                ctx.fillStyle = SMD_COLORS[smd.type] || '#444';
                ctx.fillRect(x, y, w, h);
            }
        }

        // Solder joints (silver fillets at each terminal) after reflow
        if (reflowed) {
            ctx.fillStyle = 'rgba(200,200,210,0.9)';
            const joints = jointPositionsFor(smd.type, x, y, w, h);
            joints.forEach(j => {
                ctx.beginPath();
                ctx.ellipse(j.x, j.y, j.rx, j.ry, 0, 0, Math.PI * 2);
                ctx.fill();
            });
        }
        ctx.restore();
    }

    function jointPositionsFor(type, x, y, w, h) {
        const left = x + Math.max(2, w * 0.1);
        const right = x + w - Math.max(2, w * 0.1);
        const midY = y + h / 2;
        if (type === 'ic' || type === 'qfp' || type === 'connector') {
            // Multiple joints along edges
            const out = [];
            const n = 4;
            for (let i = 0; i < n; i++) {
                const t = (i + 0.5) / n;
                out.push({ x: x + 2, y: y + h * t, rx: 2, ry: 1.5 });
                out.push({ x: x + w - 2, y: y + h * t, rx: 2, ry: 1.5 });
            }
            return out;
        }
        return [
            { x: left, y: midY, rx: 2.5, ry: Math.min(2, h / 3) },
            { x: right, y: midY, rx: 2.5, ry: Math.min(2, h / 3) },
        ];
    }

    // Draw a realistic mini icon of an SMD component for the palette
    function drawSmtMiniIcon(mc, type) {
        const g = mc.getContext('2d');
        const W = mc.width, H = mc.height;
        g.clearRect(0, 0, W, H);
        const cx = W / 2, cy = H / 2;
        g.save();
        switch (type) {
            case 'resistor': {
                // SMD 0805 chip resistor: dark body with silver end caps + "103" marking
                const bw = 28, bh = 14;
                const bx = cx - bw / 2, by = cy - bh / 2;
                g.fillStyle = '#c0c0c0';
                g.fillRect(bx - 3, by, 4, bh);
                g.fillRect(bx + bw - 1, by, 4, bh);
                const grad = g.createLinearGradient(0, by, 0, by + bh);
                grad.addColorStop(0, '#2a2a2a'); grad.addColorStop(0.5, '#111'); grad.addColorStop(1, '#2a2a2a');
                g.fillStyle = grad; g.fillRect(bx, by, bw, bh);
                g.fillStyle = '#fff'; g.font = 'bold 8px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
                g.fillText('103', cx, cy);
                break;
            }
            case 'capacitor': {
                // MLCC chip cap — tan ceramic body, no marking
                const bw = 24, bh = 14;
                const bx = cx - bw / 2, by = cy - bh / 2;
                g.fillStyle = '#c0c0c0';
                g.fillRect(bx - 3, by, 4, bh);
                g.fillRect(bx + bw - 1, by, 4, bh);
                const grad = g.createLinearGradient(0, by, 0, by + bh);
                grad.addColorStop(0, '#d4a373'); grad.addColorStop(0.5, '#8b5a2b'); grad.addColorStop(1, '#d4a373');
                g.fillStyle = grad; g.fillRect(bx, by, bw, bh);
                break;
            }
            case 'led': {
                // SMD LED — clear lens on white body with red glow
                const bw = 22, bh = 16;
                const bx = cx - bw / 2, by = cy - bh / 2;
                g.fillStyle = '#f0f0f0'; g.fillRect(bx, by, bw, bh);
                g.strokeStyle = '#888'; g.lineWidth = 0.5; g.strokeRect(bx, by, bw, bh);
                const lensGrad = g.createRadialGradient(cx, cy, 1, cx, cy, 8);
                lensGrad.addColorStop(0, '#ff8a8a'); lensGrad.addColorStop(0.6, '#ff3030'); lensGrad.addColorStop(1, '#660000');
                g.fillStyle = lensGrad;
                g.beginPath(); g.arc(cx, cy, 6, 0, Math.PI * 2); g.fill();
                // Cathode mark (green triangle)
                g.fillStyle = '#00e676';
                g.beginPath(); g.moveTo(bx + 2, by + 2); g.lineTo(bx + 6, by + 2); g.lineTo(bx + 2, by + 6); g.closePath(); g.fill();
                break;
            }
            case 'ic':
            case 'qfp': {
                // Square SOIC/QFP — black body with pins + pin-1 dot
                const s = 22;
                const bx = cx - s / 2, by = cy - s / 2;
                // Pins on 4 sides
                g.fillStyle = '#c0c0c0';
                for (let i = 0; i < 4; i++) {
                    const off = -8 + i * 5;
                    g.fillRect(bx - 3, by + s / 2 + off, 3, 2);
                    g.fillRect(bx + s, by + s / 2 + off, 3, 2);
                    g.fillRect(bx + s / 2 + off, by - 3, 2, 3);
                    g.fillRect(bx + s / 2 + off, by + s, 2, 3);
                }
                const grad = g.createLinearGradient(bx, by, bx + s, by + s);
                grad.addColorStop(0, '#3a3a3a'); grad.addColorStop(1, '#0a0a0a');
                g.fillStyle = grad; g.fillRect(bx, by, s, s);
                g.strokeStyle = '#555'; g.lineWidth = 0.5; g.strokeRect(bx, by, s, s);
                // Pin-1 dot
                g.fillStyle = '#ccc'; g.beginPath(); g.arc(bx + 4, by + 4, 1.3, 0, Math.PI * 2); g.fill();
                break;
            }
            case 'diode': {
                // SOD-123 diode — black body with white cathode stripe
                const bw = 26, bh = 12;
                const bx = cx - bw / 2, by = cy - bh / 2;
                g.fillStyle = '#c0c0c0';
                g.fillRect(bx - 3, by + 2, 4, bh - 4);
                g.fillRect(bx + bw - 1, by + 2, 4, bh - 4);
                g.fillStyle = '#151515'; g.fillRect(bx, by, bw, bh);
                g.fillStyle = '#f0f0f0'; g.fillRect(bx + bw - 6, by, 2, bh);
                break;
            }
            case 'crystal': {
                // HC-49 crystal can — silver oval
                const bw = 28, bh = 16;
                const bx = cx - bw / 2, by = cy - bh / 2;
                const grad = g.createLinearGradient(0, by, 0, by + bh);
                grad.addColorStop(0, '#e0e0e0'); grad.addColorStop(0.5, '#a0a0a0'); grad.addColorStop(1, '#606060');
                g.fillStyle = grad;
                roundRect(g, bx, by, bw, bh, 7); g.fill();
                g.strokeStyle = '#333'; g.lineWidth = 0.5; g.stroke();
                g.fillStyle = '#333'; g.font = 'bold 6px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
                g.fillText('16MHz', cx, cy);
                break;
            }
            case 'connector': {
                // Pin header — gold pins on dark base
                g.fillStyle = '#222'; g.fillRect(cx - 14, cy - 3, 28, 6);
                g.fillStyle = '#ffcc33';
                for (let i = 0; i < 5; i++) {
                    g.fillRect(cx - 12 + i * 6, cy - 10, 3, 7);
                    g.fillRect(cx - 12 + i * 6, cy + 3, 3, 7);
                }
                break;
            }
            case 'solderpaste': {
                // Syringe dropping paste blobs
                g.fillStyle = '#c0c0c0';
                g.fillRect(cx - 3, cy - 14, 6, 14);
                g.fillStyle = '#888';
                g.fillRect(cx - 1.5, cy, 3, 4);
                // Paste blobs
                g.fillStyle = '#9e9e9e';
                g.beginPath(); g.arc(cx - 7, cy + 10, 3, 0, Math.PI * 2); g.fill();
                g.beginPath(); g.arc(cx, cy + 12, 3.5, 0, Math.PI * 2); g.fill();
                g.beginPath(); g.arc(cx + 7, cy + 10, 3, 0, Math.PI * 2); g.fill();
                g.strokeStyle = '#666'; g.lineWidth = 0.5;
                g.beginPath(); g.arc(cx, cy + 12, 3.5, 0, Math.PI * 2); g.stroke();
                break;
            }
            default: {
                g.fillStyle = SMD_COLORS[type] || '#888';
                g.fillRect(cx - 10, cy - 6, 20, 12);
            }
        }
        g.restore();
    }

    function getTutorialAPI() {
        return {
            getCanvas: () => canvas,
            getPhase: () => phase,
            getPasteCount: () => padsWithPaste.size,
            getPlacedCount: () => placedSMDs.length,
            getTotalPads: () => BOARDS[currentBoard].pads.length,
            getPads: () => [...BOARDS[currentBoard].pads],
            getSelectedComp: () => selectedComp,
            loadBoard: (idx) => loadBoard(idx),
        };
    }

    return { init, resizeCanvas, loadBoard, nextPhase, reset, getTutorialAPI };
})();
