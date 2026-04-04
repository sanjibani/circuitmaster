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
                <div class="comp-icon" style="background:#c0c0c033;color:#c0c0c0">SP</div>
                <div class="comp-info">
                    <div class="comp-name">Solder Paste</div>
                    <div class="comp-detail">Click each pad</div>
                </div>
            `;
            palette.appendChild(item);
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
                item.innerHTML = `
                    <div class="comp-icon" style="background:${SMD_COLORS[pad.type]}33;color:${SMD_COLORS[pad.type]}">${pad.type[0].toUpperCase()}</div>
                    <div class="comp-info">
                        <div class="comp-name">${pad.label}</div>
                        <div class="comp-detail">${pad.type}</div>
                    </div>
                `;
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

        // Draw pads
        board.pads.forEach(pad => {
            // Copper pad
            ctx.fillStyle = padsWithPaste.has(pad.id) ? '#c0c0c0' : '#b87333';
            roundRect(ctx, pad.x, pad.y, pad.w, pad.h, 3);
            ctx.fill();

            // Solder paste overlay
            if (padsWithPaste.has(pad.id) && phase <= 1) {
                ctx.fillStyle = 'rgba(192, 192, 192, 0.6)';
                roundRect(ctx, pad.x + 2, pad.y + 2, pad.w - 4, pad.h - 4, 2);
                ctx.fill();
            }

            // Pad label (silkscreen)
            ctx.fillStyle = '#fff';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(pad.label, pad.x + pad.w / 2, pad.y - 5);

            // Outline for pad
            ctx.strokeStyle = phase === 0 && !padsWithPaste.has(pad.id) ? '#ff9100' :
                             phase === 1 && !placedSMDs.some(p => p.padId === pad.id) ? '#00e676' : '#4a6a4a';
            ctx.lineWidth = 1;
            ctx.strokeRect(pad.x - 1, pad.y - 1, pad.w + 2, pad.h + 2);
        });

        // Draw placed SMD components
        placedSMDs.forEach(smd => {
            const pad = board.pads.find(p => p.id === smd.padId);
            if (!pad) return;

            ctx.fillStyle = SMD_COLORS[smd.type] || '#444';
            ctx.globalAlpha = reflowed ? 1 : 0.85;
            roundRect(ctx, smd.x, smd.y, pad.w, pad.h, 2);
            ctx.fill();

            // Component marking
            ctx.fillStyle = '#888';
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(smd.type[0].toUpperCase(), smd.x + pad.w / 2, smd.y + pad.h / 2 + 3);
            ctx.globalAlpha = 1;

            // Solder joints after reflow
            if (reflowed) {
                ctx.fillStyle = '#c0c0c0';
                ctx.beginPath();
                ctx.arc(smd.x + 3, smd.y + pad.h / 2, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(smd.x + pad.w - 3, smd.y + pad.h / 2, 3, 0, Math.PI * 2);
                ctx.fill();
            }
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
