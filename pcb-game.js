const pcbGame = (() => {
    let canvas, ctx;
    const GRID = 20;
    let tool = 'place';
    let selectedComponent = null;
    let placedComponents = [];
    let traces = [];
    let traceStart = null;
    let tracePoints = [];
    let currentChallenge = 0;
    let score = 0;
    let powered = false;

    const COMPONENT_TYPES = {
        resistor: { name: 'Resistor', w: 3, h: 1, color: '#e8a87c', pins: [{dx:0,dy:0},{dx:2,dy:0}], symbol: 'R', detail: '10k\u03a9' },
        capacitor: { name: 'Capacitor', w: 2, h: 2, color: '#41b3a3', pins: [{dx:0,dy:0},{dx:1,dy:1}], symbol: 'C', detail: '100\u00b5F' },
        led: { name: 'LED', w: 2, h: 2, color: '#ff5252', pins: [{dx:0,dy:1},{dx:1,dy:1}], symbol: 'LED', detail: 'Red 3mm' },
        ic: { name: 'IC Chip', w: 4, h: 3, color: '#303030', pins: [{dx:0,dy:0},{dx:0,dy:2},{dx:3,dy:0},{dx:3,dy:2}], symbol: 'IC', detail: 'NE555' },
        transistor: { name: 'Transistor', w: 2, h: 2, color: '#7c4dff', pins: [{dx:0,dy:1},{dx:1,dy:0},{dx:1,dy:1}], symbol: 'Q', detail: '2N2222' },
        battery: { name: 'Battery', w: 2, h: 3, color: '#ff9100', pins: [{dx:0,dy:0},{dx:0,dy:2}], symbol: 'BAT', detail: '9V' },
        switch: { name: 'Switch', w: 2, h: 1, color: '#00e5ff', pins: [{dx:0,dy:0},{dx:1,dy:0}], symbol: 'SW', detail: 'SPST' },
        potentiometer: { name: 'Potentiometer', w: 2, h: 2, color: '#69f0ae', pins: [{dx:0,dy:0},{dx:1,dy:0},{dx:0,dy:1}], symbol: 'POT', detail: '10k\u03a9' },
    };

    const challenges = [
        {
            name: 'LED Circuit',
            // required order MUST match checklist text order (first N items)
            required: ['battery', 'switch', 'resistor', 'led'],
            connections: [
                ['battery:0', 'switch:0'],
                ['switch:1', 'resistor:0'],
                ['resistor:1', 'led:0'],
                ['led:1', 'battery:1']
            ],
            checklist: ['Place a battery (power source)', 'Place a switch', 'Place a resistor (current limiting)', 'Place an LED', 'Connect battery + to switch', 'Connect switch to resistor', 'Connect resistor to LED anode', 'Connect LED cathode to battery -'],
            hint: 'A basic LED circuit needs: Battery -> Switch -> Resistor -> LED -> Battery. The resistor limits current to protect the LED.',
            schematic: 'BAT+ -- SW -- R -- LED+ -- LED- -- BAT-'
        },
        {
            name: 'Sensor Module',
            // Checklist: battery, potentiometer, transistor, resistor, LED
            required: ['battery', 'potentiometer', 'transistor', 'resistor', 'led'],
            connections: [
                ['battery:0', 'potentiometer:0'],
                ['potentiometer:1', 'transistor:1'],
                ['transistor:0', 'resistor:0'],
                ['resistor:1', 'led:0'],
                ['led:1', 'battery:1'],
                ['potentiometer:2', 'battery:1']
            ],
            checklist: ['Place a battery', 'Place a potentiometer (sensor sim)', 'Place a transistor (switch)', 'Place a current-limiting resistor', 'Place an LED (output indicator)', 'Wire the voltage divider', 'Connect transistor base', 'Complete the output circuit'],
            hint: 'The potentiometer simulates a sensor. When its output exceeds the transistor threshold, the LED turns on.',
            schematic: 'BAT+ -- POT -- Q(base)\nQ(collector) -- R -- LED -- BAT-'
        },
        {
            name: 'Audio Amplifier',
            // Checklist: IC, battery, capacitor, capacitor, resistor (x2)
            required: ['ic', 'battery', 'capacitor', 'capacitor', 'resistor'],
            connections: [
                ['battery:0', 'ic:0'],
                ['ic:1', 'battery:1'],
                ['capacitor:0', 'ic:2'],
                ['ic:3', 'capacitor:1'],
                ['resistor:0', 'ic:2'],
                ['resistor:1', 'ic:3']
            ],
            checklist: ['Place the IC (amplifier chip)', 'Place the battery', 'Place input coupling capacitor', 'Place output coupling capacitor', 'Place feedback resistors (x2)', 'Connect power to IC', 'Wire input stage', 'Wire output and feedback'],
            hint: 'The IC amplifies the signal from input to output. Capacitors block DC, resistors set the gain.',
            schematic: 'IN -- C1 -- IC(in) ... IC(out) -- C2 -- OUT\nR1,R2 as feedback'
        }
    ];

    function init() {
        canvas = document.getElementById('pcb-canvas');
        ctx = canvas.getContext('2d');
        resizeCanvas();
        loadChallenge(0);
        setupEvents();
    }

    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight - 40;
        draw();
    }

    function loadChallenge(idx) {
        currentChallenge = parseInt(idx);
        const ch = challenges[currentChallenge];
        placedComponents = [];
        traces = [];
        score = 0;
        powered = false;
        document.getElementById('pcb-score').textContent = '0';

        // Build palette
        const palette = document.getElementById('pcb-components');
        palette.innerHTML = '';
        const compCounts = {};
        ch.required.forEach(type => {
            compCounts[type] = (compCounts[type] || 0) + 1;
        });

        Object.keys(COMPONENT_TYPES).forEach(type => {
            const comp = COMPONENT_TYPES[type];
            const count = compCounts[type] || 0;
            const item = document.createElement('div');
            item.className = 'palette-item';
            item.dataset.type = type;
            item.innerHTML = `
                <div class="comp-icon" style="background:${comp.color}22;color:${comp.color}">${comp.symbol}</div>
                <div class="comp-info">
                    <div class="comp-name">${comp.name}${count > 0 ? ' <span style="color:var(--accent-green)">x' + count + '</span>' : ''}</div>
                    <div class="comp-detail">${comp.detail}</div>
                </div>
            `;
            item.onclick = () => selectComponent(type, item);
            palette.appendChild(item);
        });

        // Build checklist
        const checklist = document.getElementById('pcb-checklist');
        checklist.innerHTML = '<h3>Checklist</h3>';
        ch.checklist.forEach((text, i) => {
            checklist.innerHTML += `<div class="check-item" id="pcb-check-${i}"><div class="check-mark"></div><span>${text}</span></div>`;
        });

        // Hints
        document.getElementById('pcb-hints').innerHTML = `<div class="hint-text">${ch.hint}</div>`;

        // Schematic
        document.getElementById('schematic-preview').innerHTML = `<h4>Schematic</h4><pre style="font-size:10px;color:var(--accent-blue);white-space:pre-wrap">${ch.schematic}</pre>`;

        draw();
    }

    function selectComponent(type, elem) {
        selectedComponent = type;
        document.querySelectorAll('#pcb-components .palette-item').forEach(p => p.classList.remove('selected'));
        if (elem) elem.classList.add('selected');
        setTool('place');
        if (window.tutorialEngine && tutorialEngine.isActive()) {
            tutorialEngine.onUserAction('pcb-click', { tool: 'place', component: selectedComponent, placedCount: placedComponents.length, traceCount: traces.length });
        }
    }

    function setTool(t) {
        tool = t;
        traceStart = null;
        tracePoints = [];
        // Clear component selection when switching away from place mode
        // so hovering/clicking won't accidentally place a component
        if (t !== 'place') {
            selectedComponent = null;
            document.querySelectorAll('#pcb-components .palette-item').forEach(p => p.classList.remove('selected'));
        }
        document.querySelectorAll('.board-toolbar .tool-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.board-toolbar .tool-btn[data-tool="${t}"]`)?.classList.add('active');
        canvas.style.cursor = t === 'trace' ? 'crosshair' : t === 'delete' ? 'not-allowed' : 'pointer';
        draw();
    }

    function setupEvents() {
        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('mousemove', handleMove);
        canvas.addEventListener('contextmenu', e => {
            e.preventDefault();
            // Right-click-to-delete shortcut (any tool mode)
            const pos = getCanvasCoords(canvas, e);
            const gx = snapToGrid(pos.x, GRID), gy = snapToGrid(pos.y, GRID);
            const idx = placedComponents.findIndex(c =>
                gx >= c.x && gx <= c.x + c.w && gy >= c.y && gy <= c.y + c.h
            );
            if (idx >= 0) { placedComponents.splice(idx, 1); updateChecklist(); draw(); return; }
            const tIdx = traces.findIndex(t =>
                t.points.some(p => Math.abs(p.x - gx) < GRID && Math.abs(p.y - gy) < GRID)
            );
            if (tIdx >= 0) { traces.splice(tIdx, 1); draw(); }
        });
        window.addEventListener('resize', () => { if (document.getElementById('pcb-design').classList.contains('active')) resizeCanvas(); });
    }

    let hoverPos = null;

    function handleMove(e) {
        const pos = getCanvasCoords(canvas, e);
        hoverPos = { x: snapToGrid(pos.x, GRID), y: snapToGrid(pos.y, GRID) };
        draw();
    }

    function handleClick(e) {
        const pos = getCanvasCoords(canvas, e);
        const gx = snapToGrid(pos.x, GRID);
        const gy = snapToGrid(pos.y, GRID);

        // Auto-switch to trace mode if clicking near a pin while in place mode
        // This makes connecting intuitive — just click a green dot to start wiring
        if (tool === 'place') {
            const nearPin = findNearestPin(gx, gy);
            if (nearPin) {
                setTool('trace');
                // Fall through to trace handling below
                tool = 'trace';
            }
        }

        if (tool === 'place' && selectedComponent) {
            const comp = COMPONENT_TYPES[selectedComponent];
            const newComp = {
                type: selectedComponent,
                x: gx,
                y: gy,
                w: comp.w * GRID,
                h: comp.h * GRID,
                pins: comp.pins.map(p => ({ x: gx + p.dx * GRID, y: gy + p.dy * GRID }))
            };
            // Check no overlap
            const overlaps = placedComponents.some(c =>
                newComp.x < c.x + c.w && newComp.x + newComp.w > c.x &&
                newComp.y < c.y + c.h && newComp.y + newComp.h > c.y
            );
            if (!overlaps && gx > 0 && gy > 0 && gx + newComp.w < canvas.width && gy + newComp.h < canvas.height) {
                placedComponents.push(newComp);
                updateChecklist();
                draw();
            }
        } else if (tool === 'trace') {
            const pin = findNearestPin(gx, gy);
            if (pin) {
                if (!traceStart) {
                    traceStart = pin;
                    tracePoints = [{ x: pin.x, y: pin.y }];
                } else {
                    tracePoints.push({ x: pin.x, y: pin.y });
                    traces.push({
                        points: [...tracePoints],
                        startPin: traceStart,
                        endPin: pin
                    });
                    traceStart = null;
                    tracePoints = [];
                    updateChecklist();
                }
            } else if (traceStart) {
                tracePoints.push({ x: gx, y: gy });
            }
            draw();
        } else if (tool === 'delete') {
            // Delete component under cursor
            const idx = placedComponents.findIndex(c =>
                gx >= c.x && gx <= c.x + c.w && gy >= c.y && gy <= c.y + c.h
            );
            if (idx >= 0) {
                placedComponents.splice(idx, 1);
                // Remove traces connected to this component
                updateChecklist();
                draw();
            }
            // Delete trace near cursor
            const tIdx = traces.findIndex(t =>
                t.points.some(p => Math.abs(p.x - gx) < GRID && Math.abs(p.y - gy) < GRID)
            );
            if (tIdx >= 0) {
                traces.splice(tIdx, 1);
                draw();
            }
        }

        // Tutorial hook
        if (window.tutorialEngine && tutorialEngine.isActive()) {
            tutorialEngine.onUserAction('pcb-click', {
                tool, component: selectedComponent,
                placedCount: placedComponents.length,
                traceCount: traces.length,
            });
        }
    }

    function findNearestPin(x, y) {
        let closest = null;
        let minDist = GRID * 1.5;
        placedComponents.forEach((comp, ci) => {
            comp.pins.forEach((pin, pi) => {
                const d = Math.hypot(pin.x - x, pin.y - y);
                if (d < minDist) {
                    minDist = d;
                    closest = { x: pin.x, y: pin.y, compIdx: ci, pinIdx: pi, compType: comp.type };
                }
            });
        });
        return closest;
    }

    function updateChecklist() {
        const ch = challenges[currentChallenge];
        const compTypes = placedComponents.map(c => c.type);
        let done = 0;
        const reqCount = ch.required.length;

        // Component placement checks (first reqCount items in checklist)
        // For each required[i], count how many of that type are needed up to index i
        // and check if enough of that type are placed
        for (let i = 0; i < reqCount; i++) {
            const el = document.getElementById(`pcb-check-${i}`);
            if (!el) continue;
            const reqType = ch.required[i];
            // How many of this type are needed in required[0..i]?
            const neededSoFar = ch.required.slice(0, i + 1).filter(t => t === reqType).length;
            // How many of this type are actually placed?
            const placedOfType = compTypes.filter(t => t === reqType).length;
            if (placedOfType >= neededSoFar) {
                el.classList.add('done');
                el.querySelector('.check-mark').textContent = '\u2713';
                done++;
            } else {
                el.classList.remove('done');
                el.querySelector('.check-mark').textContent = '';
            }
        }

        // Connection checks (remaining items after reqCount)
        for (let i = reqCount; i < ch.checklist.length; i++) {
            const el = document.getElementById(`pcb-check-${i}`);
            if (!el) continue;
            if (traces.length > i - reqCount) {
                el.classList.add('done');
                el.querySelector('.check-mark').textContent = '\u2713';
                done++;
            } else {
                el.classList.remove('done');
                el.querySelector('.check-mark').textContent = '';
            }
        }

        score = done * 50;
        document.getElementById('pcb-score').textContent = score;
    }

    function powerOn() {
        const ch = challenges[currentChallenge];
        const compTypes = placedComponents.map(c => c.type);

        // Check all required components placed
        const reqCount = {};
        ch.required.forEach(r => reqCount[r] = (reqCount[r] || 0) + 1);
        let allPlaced = true;
        for (const [type, count] of Object.entries(reqCount)) {
            if (compTypes.filter(t => t === type).length < count) {
                allPlaced = false;
                break;
            }
        }

        const connectionScore = Math.min(traces.length / ch.connections.length, 1);
        const totalScore = allPlaced ? Math.round((0.5 + connectionScore * 0.5) * 1000) : Math.round(connectionScore * 300);

        powered = true;
        draw();
        addGamePlayed();

        const xp = Math.round(totalScore * 0.5);
        addXP(xp);

        const success = allPlaced && connectionScore >= 0.5;

        if (window.tutorialEngine && tutorialEngine.isActive()) {
            tutorialEngine.onUserAction('pcb-power', {});
        }

        showModal(
            success ? 'Circuit Working!' : 'Circuit Needs Work',
            `<div class="result-row"><span class="result-label">Components Placed</span><span class="result-value ${allPlaced ? 'good' : 'bad'}">${allPlaced ? 'All Required' : 'Missing Some'}</span></div>
             <div class="result-row"><span class="result-label">Connections</span><span class="result-value">${traces.length}/${ch.connections.length}</span></div>
             <div class="result-row"><span class="result-label">Score</span><span class="result-value good">${totalScore}</span></div>
             <div class="xp-earned">+${xp} XP</div>`,
            success
        );
    }

    function reset() {
        loadChallenge(currentChallenge);
    }

    function draw() {
        if (!ctx) return;
        const w = canvas.width, h = canvas.height;
        // PCB background
        ctx.fillStyle = '#1a3a2a';
        ctx.fillRect(0, 0, w, h);

        // Grid
        drawGrid(ctx, w, h, GRID, 'rgba(0, 100, 50, 0.3)');

        // Draw traces
        traces.forEach(trace => {
            ctx.strokeStyle = powered ? '#ff9100' : '#00b4d8';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            trace.points.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.stroke();

            // Glow
            if (powered) {
                ctx.strokeStyle = 'rgba(255, 145, 0, 0.3)';
                ctx.lineWidth = 8;
                ctx.stroke();
            }
        });

        // In-progress trace
        if (traceStart && tracePoints.length > 0) {
            ctx.strokeStyle = 'rgba(0, 180, 216, 0.6)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            tracePoints.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            if (hoverPos) ctx.lineTo(hoverPos.x, hoverPos.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw components (realistic visuals)
        placedComponents.forEach(comp => {
            drawComponentRealistic(ctx, comp, COMPONENT_TYPES[comp.type], powered);
        });

        // Hover preview (realistic component with visible backing)
        if (tool === 'place' && selectedComponent && hoverPos) {
            const type = COMPONENT_TYPES[selectedComponent];
            const pw = type.w * GRID, ph = type.h * GRID;
            const fakeComp = { type: selectedComponent, x: hoverPos.x, y: hoverPos.y, w: pw, h: ph,
                pins: type.pins.map(p => ({ x: hoverPos.x + p.dx * GRID, y: hoverPos.y + p.dy * GRID })) };
            // Backing glow so preview is visible on dark PCB
            ctx.fillStyle = 'rgba(62,207,113,0.12)';
            roundRect(ctx, hoverPos.x - 4, hoverPos.y - 4, pw + 8, ph + 8, 6);
            ctx.fill();
            ctx.strokeStyle = 'rgba(62,207,113,0.5)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 4]);
            roundRect(ctx, hoverPos.x - 4, hoverPos.y - 4, pw + 8, ph + 8, 6);
            ctx.stroke();
            ctx.setLineDash([]);
            // Draw realistic component at good visibility
            ctx.globalAlpha = 0.75;
            drawComponentRealistic(ctx, fakeComp, type, false);
            ctx.globalAlpha = 1;
        }

        // Delete mode: red highlight on hovered component
        if (tool === 'delete' && hoverPos) {
            const hc = placedComponents.find(c =>
                hoverPos.x >= c.x && hoverPos.x <= c.x + c.w && hoverPos.y >= c.y && hoverPos.y <= c.y + c.h);
            if (hc) {
                ctx.strokeStyle = '#ff5252';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 4]);
                roundRect(ctx, hc.x - 3, hc.y - 3, hc.w + 6, hc.h + 6, 6);
                ctx.stroke();
                ctx.setLineDash([]);
                // "×" icon
                ctx.fillStyle = 'rgba(255,82,82,0.85)';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('×', hc.x + hc.w + 4, hc.y - 4);
            }
        }

        // Pin highlight on hover — show in ALL modes so pins are always interactive
        if (hoverPos) {
            const pin = findNearestPin(hoverPos.x, hoverPos.y);
            if (pin) {
                ctx.beginPath();
                ctx.arc(pin.x, pin.y, 9, 0, Math.PI * 2);
                ctx.strokeStyle = tool === 'trace' ? '#00e676' : 'rgba(0,230,118,0.5)';
                ctx.lineWidth = 2;
                ctx.stroke();
                // "Click to wire" hint when hovering a pin in non-trace mode
                if (tool !== 'trace') {
                    ctx.fillStyle = 'rgba(0,230,118,0.75)';
                    ctx.font = '9px Inter,sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('click to wire', pin.x, pin.y - 14);
                }
            }
        }
    }

    // ─── Realistic component drawing ────────────────────────────────────────
    function drawComponentRealistic(ctx, comp, type, powered) {
        const x = comp.x, y = comp.y, w = comp.w, h = comp.h;
        const cx = x + w / 2, cy = y + h / 2;

        ctx.save();
        switch (comp.type) {
            case 'resistor': drawResistor(ctx, x, y, w, h, powered); break;
            case 'capacitor': drawCapacitor(ctx, x, y, w, h, powered); break;
            case 'led': drawLED(ctx, x, y, w, h, powered); break;
            case 'ic': drawIC(ctx, x, y, w, h, powered); break;
            case 'transistor': drawTransistor(ctx, x, y, w, h, powered); break;
            case 'battery': drawBatteryComp(ctx, x, y, w, h, powered); break;
            case 'switch': drawSwitch(ctx, x, y, w, h, powered); break;
            case 'potentiometer': drawPot(ctx, x, y, w, h, powered); break;
            default:
                ctx.fillStyle = type.color; roundRect(ctx, x, y, w, h, 4); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(type.symbol, cx, cy);
        }
        ctx.restore();

        // Pins (always drawn same way)
        comp.pins.forEach(pin => {
            ctx.beginPath();
            ctx.arc(pin.x, pin.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = powered ? '#ff9100' : '#00e676';
            ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
        });

        // LED power glow
        if (powered && comp.type === 'led') {
            ctx.beginPath();
            ctx.arc(cx, cy, GRID * 1.8, 0, Math.PI * 2);
            const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, GRID * 1.8);
            grad.addColorStop(0, 'rgba(255,82,82,0.7)');
            grad.addColorStop(1, 'rgba(255,82,82,0)');
            ctx.fillStyle = grad; ctx.fill();
        }
    }

    // ── Resistor: body with color bands ──────────────────────────────────────
    function drawResistor(ctx, x, y, w, h, powered) {
        const cx = x + w / 2, cy = y + h / 2;
        // Wire leads
        ctx.strokeStyle = '#aaa'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + w * 0.2, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + w * 0.8, cy); ctx.lineTo(x + w, cy); ctx.stroke();
        // Body (cylinder shape)
        const bx = x + w * 0.2, bw = w * 0.6, bh = h * 0.85, by = cy - bh / 2;
        const grad = ctx.createLinearGradient(bx, by, bx, by + bh);
        grad.addColorStop(0, '#f0dcc0');
        grad.addColorStop(0.3, '#e8c8a0');
        grad.addColorStop(0.7, '#d4a870');
        grad.addColorStop(1, '#c09860');
        ctx.fillStyle = grad;
        roundRect(ctx, bx, by, bw, bh, 3); ctx.fill();
        // Resistance bands (10kΩ = brown-black-orange-gold)
        const bands = ['#8b4513', '#000', '#ff8c00', '#daa520'];
        const bandW = bw * 0.08;
        bands.forEach((color, i) => {
            const bxOff = bx + bw * (0.18 + i * 0.18);
            ctx.fillStyle = color;
            ctx.fillRect(bxOff, by + 1, bandW, bh - 2);
        });
        // Outline
        ctx.strokeStyle = 'rgba(120,80,40,0.5)'; ctx.lineWidth = 0.8;
        roundRect(ctx, bx, by, bw, bh, 3); ctx.stroke();
    }

    // ── Capacitor: electrolytic barrel ───────────────────────────────────────
    function drawCapacitor(ctx, x, y, w, h, powered) {
        const cx = x + w / 2, cy = y + h / 2;
        const r = Math.min(w, h) * 0.4;
        // Barrel body
        const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r);
        grad.addColorStop(0, '#3a9a85');
        grad.addColorStop(1, '#1a6050');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        // Polarity stripe
        ctx.fillStyle = 'rgba(200,200,200,0.4)';
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.5, cy - r);
        ctx.arc(cx, cy, r, -0.5, 0.5);
        ctx.lineTo(cx + r * 0.5, cy - r);
        ctx.fill();
        // "−" stripe markings
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.5;
        for (let i = -3; i <= 3; i++) {
            const my = cy + i * (r * 0.2);
            ctx.beginPath(); ctx.moveTo(cx + r * 0.4, my); ctx.lineTo(cx + r * 0.85, my); ctx.stroke();
        }
        // Top marking
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('100µF', cx, cy);
        // Circle outline
        ctx.strokeStyle = 'rgba(40,100,80,0.8)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        // Lead wires
        ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.3, cy - r); ctx.lineTo(cx - r * 0.3, cy - r - 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + r * 0.3, cy + r); ctx.lineTo(cx + r * 0.3, cy + r + 4); ctx.stroke();
    }

    // ── LED: bullet dome with cathode flat ───────────────────────────────────
    function drawLED(ctx, x, y, w, h, powered) {
        const cx = x + w / 2, cy = y + h / 2;
        const r = Math.min(w, h) * 0.38;
        // Dome (top half = curved, bottom = flat)
        const bodyGrad = ctx.createRadialGradient(cx, cy - r * 0.3, 1, cx, cy, r * 1.2);
        bodyGrad.addColorStop(0, powered ? 'rgba(255,120,120,0.95)' : 'rgba(255,100,100,0.7)');
        bodyGrad.addColorStop(0.5, powered ? 'rgba(220,40,40,0.9)' : 'rgba(180,40,40,0.6)');
        bodyGrad.addColorStop(1, powered ? 'rgba(180,0,0,0.9)' : 'rgba(120,20,20,0.5)');
        ctx.fillStyle = bodyGrad;
        // Dome shape
        ctx.beginPath();
        ctx.arc(cx, cy - r * 0.1, r, Math.PI, 0);
        ctx.lineTo(cx + r, cy + r * 0.6);
        ctx.lineTo(cx + r * 0.7, cy + r * 0.6); // cathode flat
        ctx.lineTo(cx - r, cy + r * 0.6);
        ctx.closePath();
        ctx.fill();
        // Internal die triangle
        ctx.fillStyle = 'rgba(255,200,200,0.25)';
        ctx.beginPath();
        ctx.moveTo(cx, cy - r * 0.4);
        ctx.lineTo(cx - r * 0.35, cy + r * 0.3);
        ctx.lineTo(cx + r * 0.35, cy + r * 0.3);
        ctx.closePath(); ctx.fill();
        // Specular highlight
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath(); ctx.arc(cx - r * 0.25, cy - r * 0.35, r * 0.18, 0, Math.PI * 2); ctx.fill();
        // Cathode mark (flat edge)
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(cx + r * 0.55, cy + r * 0.35, r * 0.2, r * 0.25);
        // Outline
        ctx.strokeStyle = 'rgba(150,30,30,0.5)'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(cx, cy - r * 0.1, r, Math.PI, 0);
        ctx.lineTo(cx + r, cy + r * 0.6); ctx.lineTo(cx - r, cy + r * 0.6); ctx.closePath(); ctx.stroke();
        // Lead wires
        ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.3, cy + r * 0.6); ctx.lineTo(cx - r * 0.3, cy + r + 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + r * 0.3, cy + r * 0.6); ctx.lineTo(cx + r * 0.3, cy + r + 6); ctx.stroke();
    }

    // ── IC Chip: DIP package ─────────────────────────────────────────────────
    function drawIC(ctx, x, y, w, h, powered) {
        const cx = x + w / 2, cy = y + h / 2;
        // Body
        ctx.fillStyle = '#1a1a1a';
        roundRect(ctx, x + 3, y + 2, w - 6, h - 4, 2); ctx.fill();
        // Subtle texture
        const tGrad = ctx.createLinearGradient(x, y, x + w, y + h);
        tGrad.addColorStop(0, 'rgba(50,50,50,0.4)');
        tGrad.addColorStop(0.5, 'rgba(30,30,30,0)');
        tGrad.addColorStop(1, 'rgba(50,50,50,0.3)');
        ctx.fillStyle = tGrad;
        roundRect(ctx, x + 3, y + 2, w - 6, h - 4, 2); ctx.fill();
        // Pin 1 notch (top-left semicircle)
        ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x + 3, cy, 4, -Math.PI / 2, Math.PI / 2); ctx.stroke();
        // Pin 1 dot
        ctx.fillStyle = '#555';
        ctx.beginPath(); ctx.arc(x + 10, y + 8, 2, 0, Math.PI * 2); ctx.fill();
        // Pin rows (left side)
        for (let i = 0; i < 4; i++) {
            const py = y + 4 + i * ((h - 8) / 3);
            ctx.fillStyle = '#aaa';
            ctx.fillRect(x - 2, py, 6, 3);
        }
        // Pin rows (right side)
        for (let i = 0; i < 4; i++) {
            const py = y + 4 + i * ((h - 8) / 3);
            ctx.fillStyle = '#aaa';
            ctx.fillRect(x + w - 4, py, 6, 3);
        }
        // Label
        ctx.fillStyle = '#888'; ctx.font = '7px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('NE555', cx, cy - 4);
        ctx.fillStyle = '#555'; ctx.font = '5px monospace';
        ctx.fillText('DIP-8', cx, cy + 5);
        // Outline
        ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
        roundRect(ctx, x + 3, y + 2, w - 6, h - 4, 2); ctx.stroke();
    }

    // ── Transistor: TO-92 D-shape ────────────────────────────────────────────
    function drawTransistor(ctx, x, y, w, h, powered) {
        const cx = x + w / 2, cy = y + h / 2;
        const r = Math.min(w, h) * 0.38;
        // D-shaped body (flat face left, curve right)
        const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
        grad.addColorStop(0, '#2a1a40');
        grad.addColorStop(1, '#5a3a80');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.5, cy - r * 0.9);
        ctx.lineTo(cx - r * 0.5, cy + r * 0.9);
        ctx.arc(cx, cy, r * 0.9, Math.PI * 0.58, -Math.PI * 0.58);
        ctx.closePath(); ctx.fill();
        // Flat face surface
        ctx.fillStyle = 'rgba(180,160,200,0.15)';
        ctx.fillRect(cx - r * 0.5, cy - r * 0.8, r * 0.3, r * 1.6);
        // Label
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '5px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('2N2222', cx + r * 0.1, cy);
        // 3 leads
        ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.3, cy + r * 0.9); ctx.lineTo(cx - r * 0.3, cy + r + 6); ctx.stroke(); // E
        ctx.beginPath(); ctx.moveTo(cx, cy + r * 0.9); ctx.lineTo(cx, cy + r + 6); ctx.stroke(); // B
        ctx.beginPath(); ctx.moveTo(cx + r * 0.3, cy + r * 0.9); ctx.lineTo(cx + r * 0.3, cy + r + 6); ctx.stroke(); // C
        // Lead labels
        ctx.fillStyle = 'rgba(200,180,255,0.6)'; ctx.font = 'bold 6px monospace';
        ctx.fillText('E', cx - r * 0.3, cy + r + 10);
        ctx.fillText('B', cx, cy + r + 10);
        ctx.fillText('C', cx + r * 0.3, cy + r + 10);
        // Outline
        ctx.strokeStyle = 'rgba(100,60,160,0.6)'; ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.5, cy - r * 0.9);
        ctx.lineTo(cx - r * 0.5, cy + r * 0.9);
        ctx.arc(cx, cy, r * 0.9, Math.PI * 0.58, -Math.PI * 0.58);
        ctx.closePath(); ctx.stroke();
    }

    // ── Battery: cell with terminals ─────────────────────────────────────────
    function drawBatteryComp(ctx, x, y, w, h, powered) {
        const cx = x + w / 2, cy = y + h / 2;
        // Cell body
        const grad = ctx.createLinearGradient(x, y, x + w, y);
        grad.addColorStop(0, '#cc7000');
        grad.addColorStop(0.5, '#ff9f20');
        grad.addColorStop(1, '#cc7000');
        ctx.fillStyle = grad;
        roundRect(ctx, x + 2, y + 6, w - 4, h - 12, 4); ctx.fill();
        // + terminal (red nub at top)
        ctx.fillStyle = '#cc2222';
        roundRect(ctx, cx - 6, y, 12, 8, 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('+', cx, y + 4);
        // − terminal (black/flat bottom)
        ctx.fillStyle = '#333';
        roundRect(ctx, cx - 8, y + h - 6, 16, 6, 2); ctx.fill();
        ctx.fillStyle = '#aaa'; ctx.font = 'bold 8px sans-serif';
        ctx.fillText('−', cx, y + h - 3);
        // Label
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.font = 'bold 8px monospace';
        ctx.fillText('9V', cx, cy);
        // Voltage marking outline
        ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 0.5;
        roundRect(ctx, x + 2, y + 6, w - 4, h - 12, 4); ctx.stroke();
    }

    // ── Switch: toggle lever ─────────────────────────────────────────────────
    function drawSwitch(ctx, x, y, w, h, powered) {
        const cx = x + w / 2, cy = y + h / 2;
        // Base plate
        ctx.fillStyle = '#1a2a3a';
        roundRect(ctx, x + 2, y + 1, w - 4, h - 2, 3); ctx.fill();
        // Metal contacts
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(x + 4, cy - 2, 6, 4);
        ctx.fillRect(x + w - 10, cy - 2, 6, 4);
        // Toggle lever
        const leverOn = powered;
        ctx.strokeStyle = '#ddd'; ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x + 7, cy);
        if (leverOn) {
            ctx.lineTo(x + w - 7, cy);
        } else {
            ctx.lineTo(cx, cy - h * 0.6);
        }
        ctx.stroke();
        ctx.lineCap = 'butt';
        // Lever knob
        const kx = leverOn ? x + w - 7 : cx;
        const ky = leverOn ? cy : cy - h * 0.6;
        ctx.fillStyle = '#eee';
        ctx.beginPath(); ctx.arc(kx, ky, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#888'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.arc(kx, ky, 3.5, 0, Math.PI * 2); ctx.stroke();
        // ON/OFF label
        ctx.fillStyle = leverOn ? '#3ecf71' : '#ff5252';
        ctx.font = 'bold 6px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(leverOn ? 'ON' : 'OFF', cx, y + h + 1);
        ctx.textBaseline = 'alphabetic';
        // Outline
        ctx.strokeStyle = 'rgba(100,160,200,0.4)'; ctx.lineWidth = 0.8;
        roundRect(ctx, x + 2, y + 1, w - 4, h - 2, 3); ctx.stroke();
    }

    // ── Potentiometer: circular dial ─────────────────────────────────────────
    function drawPot(ctx, x, y, w, h, powered) {
        const cx = x + w / 2, cy = y + h / 2;
        const r = Math.min(w, h) * 0.4;
        // Base
        ctx.fillStyle = '#204060';
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        // Resistance track ring
        ctx.strokeStyle = 'rgba(200,180,60,0.6)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.75, 0.3, Math.PI * 2 - 0.3); ctx.stroke();
        // Wiper arrow
        ctx.strokeStyle = '#eee'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + r * 0.65, cy - r * 0.3); ctx.stroke();
        // Arrow head
        ctx.fillStyle = '#eee';
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.65, cy - r * 0.3);
        ctx.lineTo(cx + r * 0.45, cy - r * 0.15);
        ctx.lineTo(cx + r * 0.5, cy - r * 0.45);
        ctx.closePath(); ctx.fill();
        // Center dot (shaft)
        ctx.fillStyle = '#888';
        ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
        // Knob grip lines
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 0.5;
        for (let a = 0; a < Math.PI * 2; a += 0.5) {
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * r * 0.85, cy + Math.sin(a) * r * 0.85);
            ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
            ctx.stroke();
        }
        // Label
        ctx.fillStyle = 'rgba(200,220,255,0.5)'; ctx.font = '5px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('10kΩ', cx, cy + r + 6);
        // Outline
        ctx.strokeStyle = 'rgba(60,120,180,0.5)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    }

    function getTutorialAPI() {
        return {
            getPlacedComponents: () => [...placedComponents],
            getTraces: () => [...traces],
            getCurrentTool: () => tool,
            getSelectedComponent: () => selectedComponent,
            getCanvas: () => canvas,
            selectComponent,
            setTool,
            loadChallenge: (idx) => loadChallenge(idx),
            simulatePlace: (x, y) => {
                if (!selectedComponent) return;
                const comp = COMPONENT_TYPES[selectedComponent];
                const gx = snapToGrid(x, GRID);
                const gy = snapToGrid(y, GRID);
                const newComp = {
                    type: selectedComponent, x: gx, y: gy,
                    w: comp.w * GRID, h: comp.h * GRID,
                    pins: comp.pins.map(p => ({ x: gx + p.dx * GRID, y: gy + p.dy * GRID }))
                };
                placedComponents.push(newComp);
                updateChecklist();
                draw();
            }
        };
    }

    return { init, resizeCanvas, loadChallenge, setTool, powerOn, reset, getTutorialAPI };
})();
