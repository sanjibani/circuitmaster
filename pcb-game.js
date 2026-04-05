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
    let circuitComplete = false;

    const COMPONENT_TYPES = {
        resistor: { name: 'Resistor', w: 3, h: 1, color: '#e8a87c', pins: [{dx:0,dy:0},{dx:2,dy:0}], symbol: 'R', detail: '10k\u03a9', role: 'Limits current flow — protects LEDs and other parts from burning out. Measured in Ohms (\u03a9).' },
        capacitor: { name: 'Capacitor', w: 2, h: 2, color: '#41b3a3', pins: [{dx:0,dy:0},{dx:1,dy:1}], symbol: 'C', detail: '100\u00b5F', role: 'Stores energy and smooths voltage. Used for filtering, decoupling, and timing circuits.' },
        led: { name: 'LED', w: 2, h: 2, color: '#ff5252', pins: [{dx:0,dy:1},{dx:1,dy:1}], symbol: 'LED', detail: 'Red 3mm', role: 'Light Emitting Diode. Only conducts one way — longer leg is anode (+), shorter is cathode (-).' },
        ic: { name: 'IC Chip', w: 4, h: 3, color: '#303030', pins: [{dx:0,dy:0},{dx:0,dy:2},{dx:3,dy:0},{dx:3,dy:2}], symbol: 'IC', detail: 'NE555', role: 'Integrated Circuit — contains thousands of components in one package. NE555 is a classic timer IC.' },
        transistor: { name: 'Transistor', w: 2, h: 2, color: '#7c4dff', pins: [{dx:0,dy:1},{dx:1,dy:0},{dx:1,dy:1}], symbol: 'Q', detail: '2N2222', role: 'Electronic switch/amplifier. Small current on base controls large current between collector and emitter.' },
        battery: { name: 'Battery', w: 2, h: 3, color: '#ff9100', pins: [{dx:0,dy:0},{dx:0,dy:2}], symbol: 'BAT', detail: '9V', role: 'Power source. Provides the voltage that drives current through your circuit.' },
        switch: { name: 'Switch', w: 2, h: 1, color: '#00e5ff', pins: [{dx:0,dy:0},{dx:1,dy:0}], symbol: 'SW', detail: 'SPST', role: 'Opens or closes the circuit. Controls when current can flow.' },
        potentiometer: { name: 'Potentiometer', w: 2, h: 2, color: '#69f0ae', pins: [{dx:0,dy:0},{dx:1,dy:0},{dx:0,dy:1}], symbol: 'POT', detail: '10k\u03a9', role: 'Variable resistor — turn the knob to adjust resistance. Used for volume, brightness, sensor inputs.' },
    };

    const challenges = [
        {
            name: '💡 LED Circuit',
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
            name: '🎛️ Sensor Module',
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
            name: '🔊 Audio Amplifier',
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
        },

        // ────────────────────────────────────────────────────────────────────
        // Real-world Indian use cases — circuits you see in every home & street
        // ────────────────────────────────────────────────────────────────────
        {
            name: '🌧️ Monsoon Rain Alarm',
            story: 'Your clothes are drying on the balcony and the sky turns grey. This circuit screams the moment rain touches the sensor probes — so you can rescue the washing before Ma shouts.',
            bom: '₹45 · Used in: homes, rooftop tanks, terrace gardens',
            required: ['battery', 'switch', 'transistor', 'resistor', 'led'],
            connections: [
                ['battery:0', 'switch:0'],
                ['switch:1', 'transistor:1'],
                ['transistor:0', 'resistor:0'],
                ['resistor:1', 'led:0'],
                ['led:1', 'battery:1'],
                ['transistor:2', 'battery:1']
            ],
            checklist: [
                'Place a 9V battery (power)',
                'Place a switch (rain-sensor probes)',
                'Place a transistor (amplifier)',
                'Place a current-limit resistor',
                'Place the alarm LED',
                'Wire battery + to sensor',
                'Sensor output → transistor base',
                'Transistor collector → resistor',
                'Resistor → LED anode',
                'LED cathode → battery -',
                'Transistor emitter → battery -'
            ],
            hint: 'The two sensor probes sit on the balcony. When a raindrop bridges them, water conducts enough current into the transistor base to switch it ON — the LED (or buzzer on a real build) fires and you dash out to save the washing.',
            schematic: 'BAT+ -- PROBES -- Q(base)\nBAT+ -- R -- LED -- Q(collector)\nQ(emitter) -- BAT-'
        },
        {
            name: '🪔 Diwali LED Diya',
            story: 'Real oil diyas are beautiful but risky around kids and curtains. Build a 555 astable that makes a warm LED flicker like a real flame — line them along the balcony this Diwali.',
            bom: '₹60 · Used in: festive lighting, rangoli decor, puja rooms',
            // Order MUST match checklist text order (IC first, then battery, cap, resistor, LED)
            required: ['ic', 'battery', 'capacitor', 'resistor', 'led'],
            connections: [
                ['battery:0', 'ic:0'],
                ['ic:1', 'battery:1'],
                ['resistor:0', 'ic:0'],
                ['resistor:1', 'ic:2'],
                ['capacitor:0', 'ic:2'],
                ['capacitor:1', 'battery:1'],
                ['ic:3', 'led:0'],
                ['led:1', 'battery:1']
            ],
            checklist: [
                'Place the NE555 timer IC',
                'Place a 9V battery',
                'Place the timing capacitor',
                'Place the timing resistor',
                'Place the diya LED',
                'VCC: battery + → IC pin 8',
                'GND: IC pin 1 → battery -',
                'Timing resistor → charge path',
                'Timing resistor → threshold pin',
                'Timing capacitor → trigger pin',
                'Capacitor → ground',
                'IC output → LED anode',
                'LED cathode → battery -'
            ],
            hint: 'NE555 in astable mode: the capacitor charges through the resistor, then discharges through pin 7. Blink rate = 1.44 / ((R1+2·R2)·C). Pick C = 10µF and R = 47kΩ for a candle-flicker speed of ~2 Hz.',
            schematic: 'BAT+ -- VCC(8)  GND(1) -- BAT-\nR -- THRES(6) -- TRIG(2) -- C -- GND\nOUT(3) -- LED -- BAT-'
        },
        {
            name: '🔌 Mobile USB Charger',
            story: 'The charger brick you plug in every night. Inside: a regulator IC, smoothing caps and a power-indicator LED. Build the output stage — the exact thing that keeps your phone alive during 4 G streaming.',
            bom: '₹80 · Used in: every phone charger, power bank, set-top box',
            // Order MUST match checklist text order (IC first, battery second, then caps, resistor, LED)
            required: ['ic', 'battery', 'capacitor', 'capacitor', 'resistor', 'led'],
            connections: [
                ['battery:0', 'ic:0'],
                ['ic:1', 'battery:1'],
                ['capacitor:0', 'ic:0'],
                ['capacitor:1', 'battery:1'],
                ['ic:2', 'capacitor:0'],
                ['ic:3', 'capacitor:1'],
                ['ic:2', 'resistor:0'],
                ['resistor:1', 'led:0'],
                ['led:1', 'battery:1']
            ],
            checklist: [
                'Place the 7805 regulator IC',
                'Place the raw DC source (battery)',
                'Place input smoothing cap',
                'Place output smoothing cap',
                'Place the power-indicator resistor',
                'Place the power LED',
                'Raw DC + → regulator input',
                'Regulator ground → battery -',
                'Input cap across input → GND',
                'Output cap across output → GND',
                'Regulator output → resistor',
                'Regulator GND → cap → GND',
                'Resistor → LED anode',
                'LED cathode → battery -'
            ],
            hint: 'A 7805 linear regulator takes 9–12 V DC and outputs a rock-steady 5 V. The input cap kills ripple from the bridge rectifier; the output cap kills fast transients when your phone pulls sudden current. The LED tells you the charger is live.',
            schematic: 'RAW+ -- Cin -- 7805(IN) ... 7805(OUT) -- Cout -- 5V\n5V -- R -- LED -- GND'
        },
        {
            name: '🛎️ Apartment Doorbell',
            story: 'The classic "ding" of every Indian flat door. A push switch triggers a 555 monostable, which fires a single tone pulse to the speaker (LED here). Visitors press it a hundred times — your circuit only chimes once per press.',
            bom: '₹90 · Used in: apartments, office reception, school bells',
            required: ['battery', 'switch', 'ic', 'capacitor', 'resistor', 'led'],
            connections: [
                ['battery:0', 'ic:0'],
                ['ic:1', 'battery:1'],
                ['switch:0', 'battery:0'],
                ['switch:1', 'ic:2'],
                ['resistor:0', 'ic:0'],
                ['resistor:1', 'ic:3'],
                ['capacitor:0', 'ic:3'],
                ['capacitor:1', 'battery:1'],
                ['ic:3', 'led:0'],
                ['led:1', 'battery:1']
            ],
            checklist: [
                'Place a 9V battery',
                'Place the doorbell push switch',
                'Place the NE555 IC',
                'Place the timing capacitor',
                'Place the timing resistor',
                'Place the chime LED (speaker sim)',
                'VCC: battery + → IC',
                'GND: IC → battery -',
                'Switch one side → VCC',
                'Switch other side → trigger pin',
                'Timing resistor → VCC',
                'Timing resistor → discharge',
                'Capacitor → discharge',
                'Capacitor → GND',
                'IC output → LED',
                'LED → battery -'
            ],
            hint: 'NE555 in monostable mode: pressing the switch pulls the trigger pin low, output goes HIGH for t = 1.1 · R · C seconds, then returns LOW automatically. Use R = 100 kΩ and C = 10 µF for a ~1 s chime — long enough to be noticed, short enough to not annoy the neighbours.',
            schematic: 'SW -- TRIG(2) -- 555\nR -- DISCH(7) -- THRES(6) -- C -- GND\nOUT(3) -- LED -- GND'
        },
        {
            name: '🔋 Inverter Low-Battery Alarm',
            story: 'Every Indian home with a UPS/inverter has one. When the lead-acid battery voltage sags below 10.5 V, this circuit lights up a warning so you can shut down the TV before deep-discharge kills the battery for good.',
            bom: '₹55 · Used in: inverters, solar banks, UPS, e-rickshaws',
            required: ['battery', 'potentiometer', 'transistor', 'resistor', 'led'],
            connections: [
                ['battery:0', 'potentiometer:0'],
                ['potentiometer:1', 'battery:1'],
                ['potentiometer:2', 'transistor:1'],
                ['transistor:0', 'resistor:0'],
                ['resistor:1', 'led:0'],
                ['led:1', 'battery:1'],
                ['transistor:2', 'battery:1']
            ],
            checklist: [
                'Place the inverter battery',
                'Place the threshold pot (sets cut-off voltage)',
                'Place the transistor (comparator sim)',
                'Place the LED current-limit resistor',
                'Place the warning LED',
                'Battery + → pot top',
                'Pot bottom → battery -',
                'Pot wiper → transistor base',
                'Transistor collector → resistor',
                'Resistor → LED anode',
                'LED cathode → battery -',
                'Transistor emitter → battery -'
            ],
            hint: 'The potentiometer forms a voltage divider sampling the battery. Set the wiper so the transistor base sees ~0.65 V when the battery is at your warning threshold (e.g. 10.5 V). As the battery sags, the divider output drops — invert the logic with a second stage in a real build, or swap to a PNP for on-low-voltage behaviour.',
            schematic: 'BAT+ -- POT -- BAT-\nPOT(wiper) -- Q(base)\nQ(collector) -- R -- LED -- BAT-'
        }
    ];

    function init() {
        canvas = document.getElementById('pcb-canvas');
        ctx = canvas.getContext('2d');
        resizeCanvas();
        populateChallengeDropdown();
        loadChallenge(0);
        setupEvents();
    }

    // Rebuild the challenge <select> from the challenges array so new
    // challenges added in this file show up without editing index.html.
    function populateChallengeDropdown() {
        const sel = document.getElementById('pcb-challenge');
        if (!sel) return;
        sel.innerHTML = '';
        challenges.forEach((ch, i) => {
            const opt = document.createElement('option');
            opt.value = String(i);
            opt.textContent = `Challenge ${i + 1}: ${ch.name}`;
            sel.appendChild(opt);
        });
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
        circuitComplete = false;
        const pBtn = document.querySelector('button[onclick="pcbGame.powerOn()"]');
        if (pBtn) pBtn.classList.remove('btn-pulse');
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
            const iconId = `pcb-icon-${type}`;
            item.innerHTML = `
                <div class="comp-icon" style="background:${comp.color}1a;padding:0;overflow:hidden;border-radius:6px;display:flex;align-items:center;justify-content:center;">
                    <canvas id="${iconId}" width="40" height="32" style="display:block;width:40px;height:32px;max-width:none;max-height:none;"></canvas>
                </div>
                <div class="comp-info">
                    <div class="comp-name">${comp.name}${count > 0 ? ' <span style="color:var(--accent-green)">x' + count + '</span>' : ''}</div>
                    <div class="comp-detail">${comp.detail}</div>
                </div>
            `;
            item.onclick = () => selectComponent(type, item);
            // Hover tooltip with component role/description
            item.addEventListener('mouseenter', (e) => showPaletteTip(comp, e.clientX, e.clientY));
            item.addEventListener('mousemove', (e) => showPaletteTip(comp, e.clientX, e.clientY));
            item.addEventListener('mouseleave', hidePaletteTip);
            palette.appendChild(item);
            // Render realistic mini-icon for this component
            setTimeout(() => {
                const mc = document.getElementById(iconId);
                if (mc) drawPaletteMiniIcon(mc, type);
            }, 0);
        });

        // Build checklist
        const checklist = document.getElementById('pcb-checklist');
        checklist.innerHTML = '<h3>Checklist</h3>';
        ch.checklist.forEach((text, i) => {
            checklist.innerHTML += `<div class="check-item" id="pcb-check-${i}"><div class="check-mark"></div><span>${text}</span></div>`;
        });

        // Hints (with optional real-world story + BOM cost line)
        const storyBlock = ch.story
            ? `<div class="pcb-story">
                   <div class="pcb-story-title">${ch.name} — Real-World Use</div>
                   <div class="pcb-story-text">${ch.story}</div>
                   ${ch.bom ? `<div class="pcb-story-bom">${ch.bom}</div>` : ''}
               </div>`
            : '';
        document.getElementById('pcb-hints').innerHTML = `${storyBlock}<div class="hint-text">${ch.hint}</div>`;

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

    // Distance from point to line segment — used for trace hit-testing
    function pointToSegmentDist(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1, dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.hypot(px - x1, py - y1);
        let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    }

    // Find index of the trace nearest to (px, py) within threshold pixels
    function findTraceAt(px, py, threshold = 10) {
        for (let i = 0; i < traces.length; i++) {
            const pts = traces[i].points;
            for (let j = 0; j < pts.length - 1; j++) {
                if (pointToSegmentDist(px, py, pts[j].x, pts[j].y, pts[j + 1].x, pts[j + 1].y) < threshold) {
                    return i;
                }
            }
        }
        return -1;
    }

    function deleteAtPos(px, py) {
        // Try component first
        const idx = placedComponents.findIndex(c =>
            px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h
        );
        if (idx >= 0) { placedComponents.splice(idx, 1); updateChecklist(); draw(); return true; }
        // Then trace — check along line segments, not just vertices
        const tIdx = findTraceAt(px, py);
        if (tIdx >= 0) { traces.splice(tIdx, 1); updateChecklist(); draw(); return true; }
        return false;
    }

    // ─── Palette hover tooltip ───────────────────────────────────────────────
    function ensurePaletteTip() {
        let tip = document.getElementById('pcb-palette-tip');
        if (tip) return tip;
        tip = document.createElement('div');
        tip.id = 'pcb-palette-tip';
        tip.className = 'pcb-palette-tip';
        document.body.appendChild(tip);
        return tip;
    }
    function showPaletteTip(comp, x, y) {
        const tip = ensurePaletteTip();
        tip.innerHTML = `
            <div class="tip-head"><span class="tip-name">${comp.name}</span><span class="tip-detail">${comp.detail}</span></div>
            <div class="tip-role">${comp.role || ''}</div>
        `;
        tip.style.left = (x + 16) + 'px';
        tip.style.top = (y + 16) + 'px';
        tip.classList.add('visible');
        // Keep on-screen
        requestAnimationFrame(() => {
            const r = tip.getBoundingClientRect();
            if (r.right > window.innerWidth - 8) tip.style.left = (x - r.width - 16) + 'px';
            if (r.bottom > window.innerHeight - 8) tip.style.top = (y - r.height - 16) + 'px';
        });
    }
    function hidePaletteTip() {
        const tip = document.getElementById('pcb-palette-tip');
        if (tip) tip.classList.remove('visible');
    }

    function setupEvents() {
        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('mousemove', handleMove);
        canvas.addEventListener('contextmenu', e => {
            e.preventDefault();
            const pos = getCanvasCoords(canvas, e);
            deleteAtPos(pos.x, pos.y);
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
            // Delete component or trace under cursor (use raw pos, not snapped)
            deleteAtPos(pos.x, pos.y);
            // Legacy block below kept for fallback — will be skipped if already deleted
            const idx = -1;
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

    // Parse "type:pinIndex" spec and check if a pin matches it
    function pinMatchesSpec(pin, spec) {
        if (!pin || !spec) return false;
        const parts = spec.split(':');
        const type = parts[0];
        const pinIdx = parseInt(parts[1], 10);
        return pin.compType === type && pin.pinIdx === pinIdx;
    }

    // Is a required connection [specA, specB] actually made by any trace?
    function isConnectionMade(conn) {
        return traces.some(t =>
            (pinMatchesSpec(t.startPin, conn[0]) && pinMatchesSpec(t.endPin, conn[1])) ||
            (pinMatchesSpec(t.startPin, conn[1]) && pinMatchesSpec(t.endPin, conn[0]))
        );
    }

    // Find the actual pin coordinates for a "type:pinIdx" spec
    function findPinBySpec(spec) {
        const parts = spec.split(':');
        const type = parts[0];
        const pinIdx = parseInt(parts[1], 10);
        for (const comp of placedComponents) {
            if (comp.type === type && comp.pins[pinIdx]) {
                return { x: comp.pins[pinIdx].x, y: comp.pins[pinIdx].y, comp };
            }
        }
        return null;
    }

    // Find the first required connection that hasn't been made yet,
    // where both endpoints have placed components — used for hint highlighting.
    function getNextHintConnection() {
        const ch = challenges[currentChallenge];
        if (!ch || !ch.connections) return null;
        for (const conn of ch.connections) {
            if (isConnectionMade(conn)) continue;
            const a = findPinBySpec(conn[0]);
            const b = findPinBySpec(conn[1]);
            if (a && b) return { a, b, conn };
        }
        return null;
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

        // Connection checks — validate each SPECIFIC required connection is actually made
        // (matching the correct component type + pin index on both ends)
        for (let i = reqCount; i < ch.checklist.length; i++) {
            const el = document.getElementById(`pcb-check-${i}`);
            if (!el) continue;
            const conn = ch.connections[i - reqCount];
            if (conn && isConnectionMade(conn)) {
                el.classList.add('done');
                el.querySelector('.check-mark').textContent = '\u2713';
                done++;
            } else {
                el.classList.remove('done');
                el.querySelector('.check-mark').textContent = '';
            }
        }

        const prevScore = score;
        score = done * 50;
        const scoreEl = document.getElementById('pcb-score');
        scoreEl.textContent = score;
        if (score !== prevScore) {
            scoreEl.classList.remove('score-bump');
            // Force reflow so animation re-triggers
            void scoreEl.offsetWidth;
            scoreEl.classList.add('score-bump');
        }

        // Detect completion — all checklist items done
        const nowComplete = (done === ch.checklist.length) && ch.checklist.length > 0;
        const pBtn = document.querySelector('button[onclick="pcbGame.powerOn()"]');
        if (nowComplete && !circuitComplete) {
            circuitComplete = true;
            if (pBtn) pBtn.classList.add('btn-pulse');
            draw();
        } else if (!nowComplete && circuitComplete) {
            circuitComplete = false;
            if (pBtn) pBtn.classList.remove('btn-pulse');
            draw();
        }
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

        // Count how many of the specific required connections are actually made
        const correctConns = ch.connections.filter(isConnectionMade).length;
        const connectionScore = correctConns / ch.connections.length;
        const totalScore = allPlaced ? Math.round((0.5 + connectionScore * 0.5) * 1000) : Math.round(connectionScore * 300);

        powered = true;
        const pBtn = document.querySelector('button[onclick="pcbGame.powerOn()"]');
        if (pBtn) pBtn.classList.remove('btn-pulse');
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
             <div class="result-row"><span class="result-label">Correct Connections</span><span class="result-value ${correctConns === ch.connections.length ? 'good' : 'bad'}">${correctConns}/${ch.connections.length}</span></div>
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

        // Delete mode: red highlight on hovered component OR trace
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
                ctx.fillStyle = 'rgba(255,82,82,0.85)';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('×', hc.x + hc.w + 4, hc.y - 4);
            } else {
                // Trace hover highlight
                const tIdx = findTraceAt(hoverPos.x, hoverPos.y);
                if (tIdx >= 0) {
                    const t = traces[tIdx];
                    ctx.strokeStyle = '#ff5252';
                    ctx.lineWidth = 5;
                    ctx.setLineDash([6, 4]);
                    ctx.beginPath();
                    t.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.fillStyle = 'rgba(255,82,82,0.85)';
                    ctx.font = 'bold 14px sans-serif';
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText('× click to delete wire', hoverPos.x, hoverPos.y - 14);
                }
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

        // Hint: highlight the next unmet connection so the user knows what to wire
        // Only shown when components are placed and circuit isn't already complete.
        if (!circuitComplete && !powered && placedComponents.length > 0) {
            const hint = getNextHintConnection();
            if (hint) {
                const t = Date.now() / 400;
                const pulse = 0.5 + 0.35 * Math.sin(t);
                ctx.save();
                // Dashed guide line between the two pins
                ctx.strokeStyle = 'rgba(255, 214, 0, ' + (0.55 + 0.3 * Math.sin(t)) + ')';
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 6]);
                ctx.lineDashOffset = -((Date.now() / 40) % 28);
                ctx.beginPath();
                ctx.moveTo(hint.a.x, hint.a.y);
                ctx.lineTo(hint.b.x, hint.b.y);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.lineDashOffset = 0;
                // Pulsing rings around each endpoint
                [hint.a, hint.b].forEach(p => {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 10 + 4 * pulse, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(255, 214, 0, ' + (0.9 - 0.4 * pulse) + ')';
                    ctx.lineWidth = 2.5;
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 16 + 8 * pulse, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(255, 214, 0, ' + (0.35 - 0.25 * pulse) + ')';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                });
                // Label — positioned in empty space so it never overlaps any component
                const label = 'HINT: connect ' + hint.conn[0] + ' \u2194 ' + hint.conn[1];
                ctx.font = 'bold 11px Inter, sans-serif';
                const tw = ctx.measureText(label).width;
                const lw = tw + 12, lh = 18;
                // Candidate positions: above topmost component, below bottommost, left, right
                const pad = 10;
                const topY = Math.min(...placedComponents.map(c => c.y)) - lh - pad;
                const botY = Math.max(...placedComponents.map(c => c.y + c.h)) + pad;
                const midX = (hint.a.x + hint.b.x) / 2 - lw / 2;
                const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
                const candidates = [
                    { x: clamp(midX, 6, w - lw - 6), y: topY },
                    { x: clamp(midX, 6, w - lw - 6), y: botY },
                    { x: clamp(midX, 6, w - lw - 6), y: 6 },
                    { x: clamp(midX, 6, w - lw - 6), y: h - lh - 6 },
                ];
                function overlapsAny(bx, by) {
                    if (bx < 0 || by < 0 || bx + lw > w || by + lh > h) return true;
                    return placedComponents.some(c =>
                        bx < c.x + c.w + 4 && bx + lw > c.x - 4 &&
                        by < c.y + c.h + 4 && by + lh > c.y - 4
                    );
                }
                let pick = candidates.find(p => !overlapsAny(p.x, p.y)) || candidates[0];
                // Leader line from pick to midpoint of the guide segment
                const midLineX = (hint.a.x + hint.b.x) / 2;
                const midLineY = (hint.a.y + hint.b.y) / 2;
                ctx.strokeStyle = 'rgba(255, 214, 0, 0.45)';
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(pick.x + lw / 2, pick.y + lh / 2);
                ctx.lineTo(midLineX, midLineY);
                ctx.stroke();
                ctx.setLineDash([]);
                // Label box
                ctx.fillStyle = 'rgba(20, 20, 10, 0.92)';
                roundRect(ctx, pick.x, pick.y, lw, lh, 4);
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 214, 0, 0.8)';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.fillStyle = '#ffd600';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, pick.x + lw / 2, pick.y + lh / 2);
                ctx.restore();
                // Keep animating
                if (!draw._hintAnim) {
                    draw._hintAnim = true;
                    requestAnimationFrame(() => {
                        draw._hintAnim = false;
                        if (!circuitComplete && !powered && getNextHintConnection()) draw();
                    });
                }
            }
        }

        // Circuit complete banner — shown when all checklist items done, before powering on
        if (circuitComplete && !powered) {
            const bw = 440, bh = 72;
            const bx = (w - bw) / 2, by = 18;
            const pulse = 0.55 + 0.25 * Math.sin(Date.now() / 300);
            ctx.save();
            // Glow
            ctx.shadowColor = 'rgba(62,207,113,' + pulse + ')';
            ctx.shadowBlur = 24;
            ctx.fillStyle = 'rgba(12, 38, 22, 0.92)';
            roundRect(ctx, bx, by, bw, bh, 12);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(62,207,113,' + pulse + ')';
            ctx.lineWidth = 2.5;
            roundRect(ctx, bx, by, bw, bh, 12);
            ctx.stroke();
            // Check icon
            ctx.beginPath();
            ctx.arc(bx + 30, by + bh / 2, 16, 0, Math.PI * 2);
            ctx.fillStyle = '#3ecf71';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(bx + 22, by + bh / 2 + 1);
            ctx.lineTo(bx + 28, by + bh / 2 + 7);
            ctx.lineTo(bx + 38, by + bh / 2 - 5);
            ctx.stroke();
            // Text
            ctx.fillStyle = '#3ecf71';
            ctx.font = 'bold 17px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText('Circuit Complete!', bx + 56, by + 24);
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.font = '12px Inter, sans-serif';
            ctx.fillText('Click "Power On & Test" to verify your design', bx + 56, by + 48);
            ctx.restore();
            // Keep animating while waiting for power on
            if (!draw._animating) {
                draw._animating = true;
                requestAnimationFrame(() => { draw._animating = false; if (circuitComplete && !powered) draw(); });
            }
        }

        // Powered-on success overlay
        if (powered) {
            ctx.save();
            const bw = 360, bh = 54;
            const bx = (w - bw) / 2, by = 18;
            ctx.fillStyle = 'rgba(20, 50, 30, 0.92)';
            ctx.shadowColor = 'rgba(255,145,0,0.6)';
            ctx.shadowBlur = 20;
            roundRect(ctx, bx, by, bw, bh, 10);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ff9100';
            ctx.lineWidth = 2;
            roundRect(ctx, bx, by, bw, bh, 10);
            ctx.stroke();
            ctx.fillStyle = '#ff9100';
            ctx.font = 'bold 16px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚡ CIRCUIT POWERED — CURRENT FLOWING ⚡', bx + bw / 2, by + bh / 2);
            ctx.restore();
        }
    }

    // Draw a realistic, scaled-to-fit mini icon of a component for the palette
    function drawPaletteMiniIcon(miniCanvas, type) {
        const mctx = miniCanvas.getContext('2d');
        const CW = miniCanvas.width, CH = miniCanvas.height;
        mctx.clearRect(0, 0, CW, CH);
        const ct = COMPONENT_TYPES[type];
        if (!ct) return;
        const baseW = ct.w * GRID, baseH = ct.h * GRID;
        const pad = 5;
        const scale = Math.min((CW - pad * 2) / baseW, (CH - pad * 2) / baseH);
        const dw = baseW * scale, dh = baseH * scale;
        const dx = (CW - dw) / 2, dy = (CH - dh) / 2;
        mctx.save();
        mctx.translate(dx, dy);
        mctx.scale(scale, scale);
        switch (type) {
            case 'resistor': drawResistor(mctx, 0, 0, baseW, baseH, false); break;
            case 'capacitor': drawCapacitor(mctx, 0, 0, baseW, baseH, false); break;
            case 'led': drawLED(mctx, 0, 0, baseW, baseH, false); break;
            case 'ic': drawIC(mctx, 0, 0, baseW, baseH, false); break;
            case 'transistor': drawTransistor(mctx, 0, 0, baseW, baseH, false); break;
            case 'battery': drawBatteryComp(mctx, 0, 0, baseW, baseH, false); break;
            case 'switch': drawSwitch(mctx, 0, 0, baseW, baseH, false); break;
            case 'potentiometer': drawPot(mctx, 0, 0, baseW, baseH, false); break;
        }
        mctx.restore();
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
