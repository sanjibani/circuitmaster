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
            required: ['battery', 'resistor', 'led', 'switch'],
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
            required: ['battery', 'resistor', 'resistor', 'potentiometer', 'led', 'transistor'],
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
            required: ['battery', 'ic', 'resistor', 'resistor', 'capacitor', 'capacitor'],
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
        document.querySelectorAll('.board-toolbar .tool-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.board-toolbar .tool-btn[data-tool="${t}"]`)?.classList.add('active');
        canvas.style.cursor = t === 'trace' ? 'crosshair' : t === 'delete' ? 'not-allowed' : 'pointer';
    }

    function setupEvents() {
        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('mousemove', handleMove);
        canvas.addEventListener('contextmenu', e => { e.preventDefault(); });
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
        const halfCount = Math.ceil(ch.checklist.length / 2);

        // First half: component placement
        for (let i = 0; i < halfCount; i++) {
            const el = document.getElementById(`pcb-check-${i}`);
            if (el && i < ch.required.length) {
                const reqSlice = ch.required.slice(0, i + 1);
                const placed = reqSlice.every((r, ri) => compTypes.filter(t => t === r).length > reqSlice.filter(t => t === r).length - 1 || compTypes.includes(r));
                if (compTypes.filter(t => t === ch.required[i]).length > 0) {
                    el.classList.add('done');
                    el.querySelector('.check-mark').textContent = '\u2713';
                    done++;
                } else {
                    el.classList.remove('done');
                    el.querySelector('.check-mark').textContent = '';
                }
            }
        }

        // Second half: connections
        for (let i = halfCount; i < ch.checklist.length; i++) {
            const el = document.getElementById(`pcb-check-${i}`);
            if (el && traces.length > i - halfCount) {
                el.classList.add('done');
                el.querySelector('.check-mark').textContent = '\u2713';
                done++;
            } else if (el) {
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

        // Draw components
        placedComponents.forEach(comp => {
            const type = COMPONENT_TYPES[comp.type];
            // Body
            ctx.fillStyle = type.color;
            ctx.globalAlpha = 0.9;
            roundRect(ctx, comp.x, comp.y, comp.w, comp.h, 4);
            ctx.fill();
            ctx.strokeStyle = powered ? '#ff9100' : type.color;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.globalAlpha = 1;

            // Label
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(type.symbol, comp.x + comp.w / 2, comp.y + comp.h / 2);

            // Pins
            comp.pins.forEach(pin => {
                ctx.beginPath();
                ctx.arc(pin.x, pin.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = powered ? '#ff9100' : '#00e676';
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.stroke();
            });

            // Power glow
            if (powered && (comp.type === 'led')) {
                ctx.beginPath();
                ctx.arc(comp.x + comp.w / 2, comp.y + comp.h / 2, GRID * 1.5, 0, Math.PI * 2);
                const grad = ctx.createRadialGradient(comp.x + comp.w / 2, comp.y + comp.h / 2, 2, comp.x + comp.w / 2, comp.y + comp.h / 2, GRID * 1.5);
                grad.addColorStop(0, 'rgba(255, 82, 82, 0.8)');
                grad.addColorStop(1, 'rgba(255, 82, 82, 0)');
                ctx.fillStyle = grad;
                ctx.fill();
            }
        });

        // Hover preview
        if (tool === 'place' && selectedComponent && hoverPos) {
            const type = COMPONENT_TYPES[selectedComponent];
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = type.color;
            roundRect(ctx, hoverPos.x, hoverPos.y, type.w * GRID, type.h * GRID, 4);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Pin highlight on hover in trace mode
        if (tool === 'trace' && hoverPos) {
            const pin = findNearestPin(hoverPos.x, hoverPos.y);
            if (pin) {
                ctx.beginPath();
                ctx.arc(pin.x, pin.y, 8, 0, Math.PI * 2);
                ctx.strokeStyle = '#00e676';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
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
