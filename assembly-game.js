const assemblyGame = (() => {
    let canvas, ctx;
    let currentModel = 0;
    let placedParts = [];
    let currentStep = 0;
    let score = 0;
    let timerInterval = null;
    let elapsedSeconds = 0;
    let selectedPart = null;
    let hoveredCanvasPart = null;
    let infoCard = null;

    // ─── Component role descriptions ─────────────────────────────────────────
    const PART_ROLES = {
        frame: {
            emoji: '🔧',
            role: 'Structural Chassis',
            what: 'The skeleton of the phone. CNC-machined aluminum or titanium that holds every internal part in exact position and provides rigidity against drops and flex.',
            fact: 'A flagship frame tolerates up to 400N of compressive force without bending.'
        },
        'rugged-frame': {
            emoji: '🛡️',
            role: 'Shock-Absorbing Frame',
            what: 'TPU rubber outer shell that deforms on impact to absorb kinetic energy before it reaches the internals — like a crumple zone in a car.',
            fact: 'Rated for 1.8m drop onto concrete per MIL-STD-810H standard.'
        },
        innershield: {
            emoji: '🛡️',
            role: 'EMI Shield / Inner Frame',
            what: 'Metal inner chassis that blocks electromagnetic interference between radio chips and logic circuits, while also sealing out water (IP68) and spreading heat.',
            fact: 'The metal cage acts as a Faraday shield — blocks signals above ~1 GHz.'
        },
        pcb: {
            emoji: '💻',
            role: 'Main Logic Board',
            what: 'The brain of the phone. The SoC (System-on-Chip) processes all computation; DRAM handles active memory; NAND stores your apps and files; PMIC regulates power to every chip.',
            fact: 'A flagship PCB has up to 12 copper layers and traces finer than a human hair (0.075mm).'
        },
        battery: {
            emoji: '🔋',
            role: 'Li-Po Power Cell',
            what: 'Lithium Polymer pouch cell that stores energy via reversible electrochemical reactions. Supplies stable 3.7–4.4V to all components through the PMIC.',
            fact: 'Li-Po can charge at up to 240W (Xiaomi) — 0→100% in under 10 minutes.'
        },
        camera: {
            emoji: '📷',
            role: 'CMOS Imaging Sensor',
            what: 'Millions of photodiodes convert photons to electrons. The multi-ring lens stack focuses light precisely onto the sensor. OIS gyroscopes shift the lens to cancel hand-shake.',
            fact: '200MP sensors capture more pixels than a 4K TV has — in a 1cm² chip.'
        },
        periscope: {
            emoji: '🔭',
            role: 'Periscope Telephoto Lens',
            what: 'A prism bends light 90° into a long folded lens path inside the phone body — giving 5–10× optical zoom without a large camera bump protruding from the back.',
            fact: 'The folded optical path can be up to 30mm long inside a 7mm thin phone.'
        },
        speaker: {
            emoji: '🔊',
            role: 'Speaker / Audio Driver',
            what: 'Electrical audio signals vibrate a voice coil which pushes a membrane, creating pressure waves (sound). The staggered mesh grille protects the membrane from dust.',
            fact: 'Modern phone speakers can reach 100dB+ — as loud as a power tool at 1m.'
        },
        usbc: {
            emoji: '⚡',
            role: 'USB-C Charging & Data Port',
            what: 'Reversible 24-pin connector handling charging (up to 240W), data (USB 3.2 = 20Gbps), video out (DisplayPort), and audio — all through one small oval port.',
            fact: 'USB-C pins are spaced 0.5mm apart. The connector withstands 10,000+ insertion cycles.'
        },
        display: {
            emoji: '📱',
            role: 'AMOLED / LTPO Display',
            what: 'Each pixel has its own OLED emitter — no backlight needed. LTPO transistors vary refresh rate from 1Hz (static image) to 120Hz (fast scrolling) automatically to save power.',
            fact: 'A 6.8" AMOLED panel has ~2,340×1,080 = ~2.5 million individually controlled pixels.'
        },
        glass: {
            emoji: '✨',
            role: 'Cover Glass & Touch Digitizer',
            what: 'Chemically strengthened via ion-exchange (K⁺ ions replace Na⁺, creating compressive stress). Also contains a transparent ITO grid that senses finger capacitance for touch input.',
            fact: 'Gorilla Glass 7i can survive drops from 1m onto rough surfaces like asphalt.'
        },
        nfc: {
            emoji: '📡',
            role: 'NFC Coil Antenna',
            what: 'Flat copper spiral that resonates at 13.56 MHz. Inductively couples with payment terminals, transit card readers, and other NFC devices within ~4cm.',
            fact: 'NFC transfers up to 424 Kbps — enough for a payment token in under 50ms.'
        },
        antenna: {
            emoji: '📶',
            role: 'RF Antenna Array',
            what: 'Thin copper traces tuned to specific wavelengths for 5G (mmWave + Sub-6GHz), Wi-Fi 6E, Bluetooth 5.3, and GPS. Placed away from your hand to avoid signal attenuation.',
            fact: '5G mmWave antennas (28GHz) are only ~5mm long — shorter than a grain of rice.'
        },
        'dynamic-island': {
            emoji: '🎯',
            role: 'Face ID + Dynamic Island',
            what: 'Pill-shaped cutout housing the TrueDepth camera: a dot projector emitting 30,000 IR dots, an IR camera, and a flood illuminator build a 3D depth map of your face in milliseconds for secure unlock. The surrounding software "island" hosts live activities.',
            fact: 'Face ID is 20× more secure than Touch ID — 1 in 1,000,000 false-accept rate vs 1 in 50,000.'
        },
        taptic: {
            emoji: '📳',
            role: 'Taptic Engine',
            what: 'Linear resonant actuator that moves a weighted mass electromagnetically to produce precise, silent haptic pulses. Fires in under 1ms to simulate button clicks, keyboard taps, and navigation feedback — no buzzy spinning motor.',
            fact: 'Apple\'s Taptic Engine can distinguish 3 distinct "tap strengths" — light, medium, heavy — each with a different waveform.'
        },
        spen: {
            emoji: '✏️',
            role: 'S Pen EMR Stylus',
            what: 'Passive electromagnetic resonance stylus — no battery needed. The WACOM EMR digitizer layer in the display generates a magnetic field; the S Pen\'s coil resonates at its own frequency, letting the screen triangulate position to sub-pixel accuracy.',
            fact: 'S Pen latency dropped from 45ms (S21) to 2.8ms (S25 Ultra) — faster response than ink from a real pen on paper.'
        },
        tempsensor: {
            emoji: '🌡️',
            role: 'Infrared Temperature Sensor',
            what: 'Thermopile array detects infrared radiation emitted by any surface and converts it to temperature readings accurate to ±0.1°C. Can measure skin, food, ambient air, or any object — no contact needed.',
            fact: 'Pixel 9 Pro\'s sensor received FDA-clearance for body temperature monitoring in several markets.'
        },
    };

    const PHONE_MODELS = [
        {
            name: 'Basic Smartphone',
            width: 220,
            height: 420,
            parts: [
                { id: 'frame',       name: 'Metal Frame',     detail: 'Aluminum chassis',      order: 0, x: 0,   y: 0,   w: 220, h: 420, shape: 'frame',       color: '#7a8a9a' },
                { id: 'motherboard', name: 'Motherboard',     detail: 'Main PCB with SoC',     order: 1, x: 20,  y: 55,  w: 180, h: 175, shape: 'pcb',         color: '#1b4d1e' },
                { id: 'battery',     name: 'Battery',         detail: 'Li-Po 4000mAh',         order: 2, x: 20,  y: 242, w: 180, h: 130, shape: 'battery',     color: '#2a2a3a' },
                { id: 'camera',      name: 'Camera Module',   detail: '48MP Sony IMX',         order: 3, x: 148, y: 65,  w: 44,  h: 44,  shape: 'camera',      color: '#0d1a2e' },
                { id: 'speaker',     name: 'Speaker',         detail: 'Bottom-firing 1W',      order: 4, x: 60,  y: 388, w: 100, h: 16,  shape: 'speaker',     color: '#1c1c1c' },
                { id: 'connector',   name: 'USB-C Port',      detail: 'Type-C connector',      order: 5, x: 80,  y: 404, w: 60,  h: 10,  shape: 'usbc',        color: '#555' },
                { id: 'display',     name: 'Display Panel',   detail: '6.5" AMOLED',           order: 6, x: 6,   y: 6,   w: 208, h: 395, shape: 'display',     color: '#050d1a' },
                { id: 'glass',       name: 'Front Glass',     detail: 'Gorilla Glass 5',       order: 7, x: 0,   y: 0,   w: 220, h: 420, shape: 'glass',       color: 'rgba(160,200,255,0.12)' },
            ]
        },
        {
            name: 'Premium Flagship',
            width: 220,
            height: 440,
            parts: [
                { id: 'frame',       name: 'Titanium Frame',  detail: 'Grade 5 Titanium',      order: 0,  x: 0,   y: 0,   w: 220, h: 440, shape: 'frame',       color: '#8a9aaa' },
                { id: 'motherboard', name: 'Logic Board',     detail: 'HDI 12-layer PCB',      order: 1,  x: 18,  y: 48,  w: 184, h: 155, shape: 'pcb',         color: '#112b14' },
                { id: 'nfc',         name: 'NFC Coil',        detail: 'Wireless NFC antenna',  order: 2,  x: 18,  y: 210, w: 184, h: 24,  shape: 'nfc',         color: '#b84000' },
                { id: 'battery',     name: 'Battery',         detail: 'Li-Po 5000mAh',         order: 3,  x: 18,  y: 242, w: 184, h: 148, shape: 'battery',     color: '#1e1e2e' },
                { id: 'camera1',     name: 'Main Camera',     detail: '200MP Samsung HP2',     order: 4,  x: 28,  y: 60,  w: 56,  h: 56,  shape: 'camera',      color: '#0d1520' },
                { id: 'camera2',     name: 'Ultra-wide',      detail: '12MP Ultra-wide',       order: 5,  x: 92,  y: 60,  w: 42,  h: 42,  shape: 'camera',      color: '#0d1520' },
                { id: 'camera3',     name: 'Periscope Zoom',  detail: '50MP 5x Optical',       order: 6,  x: 142, y: 60,  w: 42,  h: 42,  shape: 'periscope',   color: '#0d1520' },
                { id: 'speaker',     name: 'Stereo Speaker',  detail: 'Dolby Atmos',           order: 7,  x: 50,  y: 415, w: 120, h: 14,  shape: 'speaker',     color: '#1a1a1a' },
                { id: 'connector',   name: 'USB-C 3.2',       detail: 'USB 3.2 Gen 2',         order: 8,  x: 78,  y: 429, w: 64,  h: 10,  shape: 'usbc',        color: '#555' },
                { id: 'display',     name: 'LTPO Display',    detail: '6.8" 120Hz LTPO',       order: 9,  x: 5,   y: 5,   w: 210, h: 418, shape: 'display',     color: '#030b15' },
                { id: 'glass',       name: 'Ceramic Shield',  detail: 'Ceramic Shield glass',  order: 10, x: 0,   y: 0,   w: 220, h: 440, shape: 'glass',       color: 'rgba(160,200,255,0.1)' },
            ]
        },
        {
            name: 'Rugged Phone',
            width: 240,
            height: 460,
            parts: [
                { id: 'frame',       name: 'Rubber Frame',    detail: 'Shock-absorbing TPU',   order: 0, x: 0,   y: 0,   w: 240, h: 460, shape: 'rugged-frame', color: '#3e2a1e' },
                { id: 'shield',      name: 'Metal Shield',    detail: 'IP68 inner chassis',    order: 1, x: 12,  y: 12,  w: 216, h: 436, shape: 'innershield',  color: '#607080' },
                { id: 'motherboard', name: 'Sealed PCB',      detail: 'Conformal coated',      order: 2, x: 28,  y: 58,  w: 184, h: 165, shape: 'pcb',         color: '#1a3a1a' },
                { id: 'battery',     name: 'Battery',         detail: 'Li-Po 6000mAh',         order: 3, x: 28,  y: 235, w: 184, h: 165, shape: 'battery',     color: '#222233' },
                { id: 'camera',      name: 'Camera Module',   detail: '64MP Night Vision',     order: 4, x: 88,  y: 68,  w: 52,  h: 52,  shape: 'camera',      color: '#0a0f1a' },
                { id: 'antenna',     name: 'Antenna Module',  detail: 'Satellite SOS array',   order: 5, x: 28,  y: 28,  w: 184, h: 22,  shape: 'antenna',     color: '#c85000' },
                { id: 'speaker',     name: 'Loud Speaker',    detail: '110dB Rated',           order: 6, x: 55,  y: 422, w: 130, h: 18,  shape: 'speaker',     color: '#111' },
                { id: 'display',     name: 'Display Panel',   detail: '6.1" IPS Sunlight',     order: 7, x: 18,  y: 18,  w: 204, h: 408, shape: 'display',     color: '#050e1a' },
                { id: 'glass',       name: 'Sapphire Glass',  detail: 'Sapphire coated screen',order: 8, x: 0,   y: 0,   w: 240, h: 460, shape: 'glass',       color: 'rgba(160,200,255,0.09)' },
            ]
        },

        // ── Real phones ───────────────────────────────────────────────────────
        {
            name: 'iPhone 17',
            width: 215,
            height: 440,
            parts: [
                { id: 'frame',    name: 'Aluminum Frame',      detail: 'Alloy 7000 CNC-machined',        order: 0,  x: 0,   y: 0,   w: 215, h: 440, shape: 'frame',          color: '#b0b8c4' },
                { id: 'logic',    name: 'A19 Logic Board',     detail: 'TSMC 3nm · 8GB LPDDR5X',        order: 1,  x: 15,  y: 52,  w: 185, h: 148, shape: 'pcb',            color: '#0d2010' },
                { id: 'battery',  name: 'Battery Pack',        detail: 'Li-Ion 3,561mAh · 25W MagSafe', order: 2,  x: 15,  y: 210, w: 185, h: 172, shape: 'battery',        color: '#1a1a2a' },
                { id: 'cam_main', name: '48MP Main Camera',    detail: 'Sony IMX903 · f/1.6 · OIS',     order: 3,  x: 130, y: 62,  w: 50,  h: 50,  shape: 'camera',         color: '#0a1018' },
                { id: 'cam_uw',   name: '12MP Ultra-Wide',     detail: '13mm · f/2.2 · 120° FoV',       order: 4,  x: 130, y: 118, w: 38,  h: 38,  shape: 'camera',         color: '#0a1018' },
                { id: 'face_id',  name: 'Face ID Module',      detail: 'TrueDepth · Dynamic Island',    order: 5,  x: 68,  y: 9,   w: 79,  h: 18,  shape: 'dynamic-island', color: '#000' },
                { id: 'taptic',   name: 'Taptic Engine',       detail: 'Linear actuator · haptics',     order: 6,  x: 15,  y: 393, w: 90,  h: 14,  shape: 'taptic',         color: '#606060' },
                { id: 'speaker',  name: 'Bottom Speaker',      detail: 'Stereo w/ earpiece · Spatial',  order: 7,  x: 65,  y: 420, w: 85,  h: 12,  shape: 'speaker',        color: '#111' },
                { id: 'usbc',     name: 'USB-C Port',          detail: 'USB 3 · 10Gbps · 25W charging', order: 8,  x: 78,  y: 428, w: 59,  h: 10,  shape: 'usbc',           color: '#555' },
                { id: 'display',  name: 'Super Retina XDR',    detail: '6.1" OLED 2556×1179 · 2000nit', order: 9,  x: 5,   y: 5,   w: 205, h: 423, shape: 'display',        color: '#030911' },
                { id: 'glass',    name: 'Ceramic Shield',      detail: 'Nano-ceramic Corning glass',     order: 10, x: 0,   y: 0,   w: 215, h: 440, shape: 'glass',          color: 'rgba(200,220,255,0.09)' },
            ]
        },

        {
            name: 'Samsung Galaxy S25 Ultra',
            width: 210,
            height: 460,
            parts: [
                { id: 'frame',    name: 'Titanium Frame',      detail: 'Grade 2 armor titanium',         order: 0,  x: 0,   y: 0,   w: 210, h: 460, shape: 'frame',      color: '#8a9aa8' },
                { id: 'board',    name: 'Main Board',          detail: 'Snapdragon 8 Elite · 4nm TSMC',  order: 1,  x: 14,  y: 48,  w: 182, h: 148, shape: 'pcb',        color: '#0c2210' },
                { id: 'nfc',      name: 'NFC Antenna',         detail: 'Samsung Pay · Galaxy Ring pair', order: 2,  x: 14,  y: 205, w: 182, h: 22,  shape: 'nfc',        color: '#c05000' },
                { id: 'battery',  name: 'Battery',             detail: '5,000mAh · 45W · 15W wireless',  order: 3,  x: 14,  y: 235, w: 182, h: 172, shape: 'battery',    color: '#181828' },
                { id: 'cam_main', name: '200MP Main',          detail: 'ISOCELL HP9 · f/1.7 · OIS',     order: 4,  x: 18,  y: 60,  w: 54,  h: 54,  shape: 'camera',     color: '#08101a' },
                { id: 'cam_uw',   name: '50MP Ultra-Wide',     detail: 'ISOCELL JN5 · 120° · f/1.9',    order: 5,  x: 80,  y: 60,  w: 40,  h: 40,  shape: 'camera',     color: '#08101a' },
                { id: 'cam_t3',   name: '10MP 3× Telephoto',   detail: 'f/2.4 · PDAF · OIS',            order: 6,  x: 80,  y: 106, w: 40,  h: 40,  shape: 'camera',     color: '#08101a' },
                { id: 'cam_p5',   name: '50MP 5× Periscope',   detail: 'ISOCELL HP2 · 111mm eq · OIS',  order: 7,  x: 130, y: 60,  w: 50,  h: 86,  shape: 'periscope',  color: '#08101a' },
                { id: 'spen',     name: 'S Pen',               detail: '4096 pressure · 0.7mm tip',     order: 8,  x: 0,   y: 392, w: 8,   h: 60,  shape: 'spen',       color: '#1c1c1c' },
                { id: 'speaker',  name: 'Dolby Atmos Speaker', detail: 'AKG-tuned stereo',               order: 9,  x: 48,  y: 436, w: 114, h: 14,  shape: 'speaker',    color: '#111' },
                { id: 'usbc',     name: 'USB-C 3.2 Gen 2',     detail: '10Gbps · DP 1.4 · 45W PD',      order: 10, x: 68,  y: 445, w: 74,  h: 12,  shape: 'usbc',       color: '#555' },
                { id: 'display',  name: 'Dynamic AMOLED 2X',   detail: '6.9" 3088×1440 · 2600nit',      order: 11, x: 5,   y: 5,   w: 200, h: 442, shape: 'display',    color: '#020a12' },
                { id: 'glass',    name: 'Gorilla Glass Armor 2',detail: 'Anti-reflective · IP68',        order: 12, x: 0,   y: 0,   w: 210, h: 460, shape: 'glass',      color: 'rgba(180,210,255,0.08)' },
            ]
        },

        {
            name: 'Google Pixel 9 Pro',
            width: 210,
            height: 440,
            parts: [
                { id: 'frame',     name: 'Polished Aluminum',   detail: 'Matte flat-edge chassis',       order: 0,  x: 0,   y: 0,   w: 210, h: 440, shape: 'frame',       color: '#9098a8' },
                { id: 'board',     name: 'Tensor G4 Board',     detail: 'Samsung 4nm · 16GB LPDDR5X',    order: 1,  x: 14,  y: 50,  w: 182, h: 148, shape: 'pcb',         color: '#102210' },
                { id: 'battery',   name: 'Battery',             detail: '4,700mAh · 37W · 23W wireless', order: 2,  x: 14,  y: 208, w: 182, h: 175, shape: 'battery',     color: '#1c1c2a' },
                { id: 'cam_main',  name: '50MP Main Camera',    detail: 'Samsung GN1 · f/1.68 · OIS',   order: 3,  x: 18,  y: 60,  w: 54,  h: 54,  shape: 'camera',      color: '#080f18' },
                { id: 'cam_uw',    name: '48MP Ultra-Wide',     detail: '126° · f/1.7 · macro AF',       order: 4,  x: 82,  y: 60,  w: 44,  h: 44,  shape: 'camera',      color: '#080f18' },
                { id: 'cam_tele',  name: '48MP 5× Periscope',   detail: 'f/2.8 · 5× optical · OIS',     order: 5,  x: 136, y: 60,  w: 46,  h: 76,  shape: 'periscope',   color: '#080f18' },
                { id: 'tempsense', name: 'Temperature Sensor',  detail: 'Infrared skin temp sensor',     order: 6,  x: 136, y: 142, w: 46,  h: 20,  shape: 'tempsensor',  color: '#1a0a00' },
                { id: 'speaker',   name: 'Stereo Speakers',     detail: 'Tuned by Google · Spatial',     order: 7,  x: 58,  y: 418, w: 94,  h: 12,  shape: 'speaker',     color: '#111' },
                { id: 'usbc',      name: 'USB-C 3.2',           detail: '10Gbps · DP · 37W charging',    order: 8,  x: 72,  y: 428, w: 66,  h: 10,  shape: 'usbc',        color: '#555' },
                { id: 'display',   name: 'LTPO OLED Display',   detail: '6.3" 2992×1344 · 3000nit',     order: 9,  x: 5,   y: 5,   w: 200, h: 420, shape: 'display',     color: '#030b12' },
                { id: 'glass',     name: 'Gorilla Glass Victus 2',detail: 'Front & back protection',     order: 10, x: 0,   y: 0,   w: 210, h: 440, shape: 'glass',       color: 'rgba(180,215,255,0.09)' },
            ]
        }
    ];

    function init() {
        canvas = document.getElementById('assembly-canvas');
        ctx = canvas.getContext('2d');
        resizeCanvas();
        loadModel(0);
        setupEvents();
    }

    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight - 40;
        draw();
    }

    function loadModel(idx) {
        currentModel = parseInt(idx);
        const model = PHONE_MODELS[currentModel];
        placedParts = [];
        currentStep = 0;
        score = 0;
        elapsedSeconds = 0;
        document.dispatchEvent(new CustomEvent('assembly:reset', {
            detail: { modelIdx: currentModel, modelName: model.name, total: model.parts.length }
        }));
        if (timerInterval) clearInterval(timerInterval);
        document.getElementById('assembly-score').textContent = '0';
        document.getElementById('assembly-time').textContent = '0:00';
        document.getElementById('assembly-step').textContent = `0/${model.parts.length}`;

        const palette = document.getElementById('assembly-parts');
        palette.innerHTML = '';
        const shuffled = [...model.parts].sort(() => Math.random() - 0.5);
        shuffled.forEach(part => {
            const item = document.createElement('div');
            item.className = 'palette-item';
            item.dataset.partId = part.id;

            // Mini canvas icon for each part
            const iconId = `part-icon-${part.id}`;
            item.innerHTML = `
                <div class="comp-icon" style="padding:0;overflow:hidden;border-radius:6px;display:flex;align-items:center;justify-content:center;">
                    <canvas id="${iconId}" width="40" height="32" style="display:block;width:40px;height:32px;max-width:none;max-height:none;"></canvas>
                </div>
                <div class="comp-info">
                    <div class="comp-name">${part.name}</div>
                    <div class="comp-detail">${part.detail}</div>
                </div>
            `;
            item.onclick = () => tryPlacePart(part.id);

            // Palette hover → info card
            item.addEventListener('mouseenter', (e) => {
                showInfoCard(part, e.clientX, e.clientY);
            });
            item.addEventListener('mousemove', (e) => {
                showInfoCard(part, e.clientX, e.clientY);
            });
            item.addEventListener('mouseleave', hideInfoCard);

            palette.appendChild(item);

            // Draw mini icon after DOM insertion
            setTimeout(() => {
                const miniCanvas = document.getElementById(iconId);
                if (miniCanvas) drawMiniIcon(miniCanvas, part);
            }, 0);
        });

        const guide = document.getElementById('assembly-guide');
        guide.innerHTML = '<h3>Assembly Guide</h3>';
        model.parts.forEach((part, i) => {
            guide.innerHTML += `<div class="check-item" id="asm-step-${i}"><div class="check-mark">${i + 1}</div><span>${part.name}</span></div>`;
        });

        startTimer();
        draw();
    }

    function drawMiniIcon(miniCanvas, part) {
        const mctx = miniCanvas.getContext('2d');
        const w = miniCanvas.width, h = miniCanvas.height;
        mctx.fillStyle = '#1a1f2e';
        mctx.fillRect(0, 0, w, h);
        // Scale and center the part
        const scale = Math.min(w / part.w, h / part.h) * 0.75;
        const offX = (w - part.w * scale) / 2;
        const offY = (h - part.h * scale) / 2;
        mctx.save();
        mctx.translate(offX, offY);
        mctx.scale(scale, scale);
        drawPart(mctx, part, 0, 0, 1, true);
        mctx.restore();
    }

    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            elapsedSeconds++;
            const min = Math.floor(elapsedSeconds / 60);
            const sec = elapsedSeconds % 60;
            document.getElementById('assembly-time').textContent = `${min}:${sec.toString().padStart(2, '0')}`;
        }, 1000);
    }

    function tryPlacePart(partId) {
        const model = PHONE_MODELS[currentModel];
        const part = model.parts.find(p => p.id === partId);
        if (!part) return;

        if (part.order !== currentStep) {
            const palette = document.querySelector(`[data-part-id="${partId}"]`);
            if (palette) {
                palette.style.borderColor = 'var(--accent-red)';
                palette.style.background = 'rgba(255,82,82,0.15)';
                setTimeout(() => {
                    palette.style.borderColor = '';
                    palette.style.background = '';
                }, 500);
            }
            document.dispatchEvent(new CustomEvent('assembly:miss', {
                detail: { partId, expectedOrder: currentStep, attemptedOrder: part.order }
            }));
            return;
        }

        placedParts.push(part);
        currentStep++;

        const stepEl = document.getElementById(`asm-step-${part.order}`);
        if (stepEl) {
            stepEl.classList.add('done');
            stepEl.querySelector('.check-mark').textContent = '\u2713';
        }

        const paletteItem = document.querySelector(`[data-part-id="${partId}"]`);
        if (paletteItem) {
            paletteItem.style.opacity = '0.3';
            paletteItem.style.pointerEvents = 'none';
        }

        document.getElementById('assembly-step').textContent = `${currentStep}/${model.parts.length}`;

        const timeBonus = Math.max(0, 200 - elapsedSeconds * 2);
        score += 100 + timeBonus;
        const sEl = document.getElementById('assembly-score');
        sEl.textContent = score;
        sEl.classList.remove('score-bump');
        void sEl.offsetWidth;
        sEl.classList.add('score-bump');

        draw();

        if (window.tutorialEngine && tutorialEngine.isActive()) {
            tutorialEngine.onUserAction('assembly-place', {
                partId, currentStep, totalParts: model.parts.length
            });
        }

        document.dispatchEvent(new CustomEvent('assembly:placed', {
            detail: {
                partId, part, currentStep, total: model.parts.length,
                elapsed: elapsedSeconds, score
            }
        }));

        if (currentStep >= model.parts.length) {
            clearInterval(timerInterval);
            document.dispatchEvent(new CustomEvent('assembly:complete', {
                detail: { total: model.parts.length, elapsed: elapsedSeconds, score }
            }));
        }
    }

    function testPhone() {
        const model = PHONE_MODELS[currentModel];
        if (currentStep < model.parts.length) {
            showModal('Assembly Incomplete',
                `<div class="result-row"><span class="result-label">Parts Placed</span><span class="result-value bad">${currentStep}/${model.parts.length}</span></div>
                 <p style="color:var(--text-secondary);margin-top:12px;font-size:13px">Place all parts in the correct order before testing!</p>`,
                false);
            return;
        }

        if (window.tutorialEngine && tutorialEngine.isActive()) {
            tutorialEngine.onUserAction('assembly-test', { currentStep });
        }

        if (timerInterval) clearInterval(timerInterval);
        addGamePlayed();

        const timeBonus = Math.max(0, 500 - elapsedSeconds * 3);
        const finalScore = score + timeBonus;
        const xp = Math.round(finalScore * 0.3);
        addXP(xp);

        const min = Math.floor(elapsedSeconds / 60);
        const sec = elapsedSeconds % 60;

        showModal('Phone Assembled & Working!',
            `<div class="result-row"><span class="result-label">Model</span><span class="result-value">${model.name}</span></div>
             <div class="result-row"><span class="result-label">Parts</span><span class="result-value good">${model.parts.length}/${model.parts.length}</span></div>
             <div class="result-row"><span class="result-label">Time</span><span class="result-value">${min}:${sec.toString().padStart(2, '0')}</span></div>
             <div class="result-row"><span class="result-label">Time Bonus</span><span class="result-value good">+${timeBonus}</span></div>
             <div class="result-row"><span class="result-label">Total Score</span><span class="result-value good">${finalScore}</span></div>
             <div class="xp-earned">+${xp} XP</div>`,
            true);
    }

    function reset() { loadModel(currentModel); }

    // ─── Info card ────────────────────────────────────────────────────────────
    function ensureInfoCard() {
        if (infoCard) return infoCard;
        infoCard = document.createElement('div');
        infoCard.id = 'asm-info-card';
        infoCard.innerHTML = '';
        document.body.appendChild(infoCard);
        return infoCard;
    }

    function showInfoCard(part, x, y) {
        const card = ensureInfoCard();
        const info = PART_ROLES[part.shape] || {
            emoji: '🔩', role: part.name,
            what: part.detail, fact: ''
        };
        card.innerHTML = `
            <div class="aic-header">
                <span class="aic-emoji">${info.emoji}</span>
                <div>
                    <div class="aic-role">${info.role}</div>
                    <div class="aic-name">${part.name} · <em>${part.detail}</em></div>
                </div>
            </div>
            <div class="aic-what">${info.what}</div>
            ${info.fact ? `<div class="aic-fact">⚡ ${info.fact}</div>` : ''}
        `;
        card.classList.add('visible');

        // Position: keep inside viewport
        const vw = window.innerWidth, vh = window.innerHeight;
        const cw = 280, ch = 160;
        let left = x + 16, top = y - 10;
        if (left + cw > vw - 12) left = x - cw - 10;
        if (top + ch > vh - 12) top = vh - ch - 12;
        if (top < 8) top = 8;
        card.style.left = left + 'px';
        card.style.top  = top  + 'px';
    }

    function hideInfoCard() {
        if (infoCard) infoCard.classList.remove('visible');
        hoveredCanvasPart = null;
    }

    function setupEvents() {
        window.addEventListener('resize', () => {
            if (document.getElementById('phone-assembly').classList.contains('active')) resizeCanvas();
        });

        // Canvas hover — detect placed parts under cursor
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const model = PHONE_MODELS[currentModel];
            const phoneX = Math.floor((canvas.width  - model.width)  / 2);
            const phoneY = Math.floor((canvas.height - model.height) / 2);

            let found = null;
            // Check in reverse so top-most (last drawn) wins
            for (let i = placedParts.length - 1; i >= 0; i--) {
                const p = placedParts[i];
                const px = phoneX + p.x, py = phoneY + p.y;
                if (mx >= px && mx <= px + p.w && my >= py && my <= py + p.h) {
                    found = p; break;
                }
            }
            if (found !== hoveredCanvasPart) {
                hoveredCanvasPart = found;
                draw(); // redraw to show/hide highlight ring
            }
            if (found) {
                showInfoCard(found, e.clientX, e.clientY);
            } else {
                hideInfoCard();
            }
        });

        canvas.addEventListener('mouseleave', () => {
            hideInfoCard();
            if (hoveredCanvasPart) { hoveredCanvasPart = null; draw(); }
        });
    }

    // ─── Main scene draw ──────────────────────────────────────────────────────
    function draw() {
        if (!ctx) return;
        const w = canvas.width, h = canvas.height;

        // Workbench background
        ctx.fillStyle = '#10151f';
        ctx.fillRect(0, 0, w, h);

        // Subtle dot grid
        for (let gx = 0; gx < w; gx += 28) {
            for (let gy = 0; gy < h; gy += 28) {
                ctx.fillStyle = 'rgba(60,100,160,0.12)';
                ctx.fillRect(gx, gy, 1, 1);
            }
        }

        const model = PHONE_MODELS[currentModel];
        const phoneX = Math.floor((w - model.width) / 2);
        const phoneY = Math.floor((h - model.height) / 2);

        // Dashed drop-zone outline
        ctx.strokeStyle = 'rgba(62,207,113,0.25)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        rrPath(ctx, phoneX - 8, phoneY - 8, model.width + 16, model.height + 16, 22);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ghost of next expected part (very faint)
        if (currentStep < model.parts.length) {
            const ghost = model.parts[currentStep];
            drawPart(ctx, ghost, phoneX, phoneY, 0.12);
        }

        // Placed parts
        placedParts.forEach(part => drawPart(ctx, part, phoneX, phoneY, 1));

        // Hover highlight ring on canvas-hovered placed part
        if (hoveredCanvasPart) {
            const hp = hoveredCanvasPart;
            const hx = phoneX + hp.x - 4, hy = phoneY + hp.y - 4;
            const hw = hp.w + 8, hh = hp.h + 8;
            ctx.save();
            ctx.strokeStyle = 'rgba(62,207,113,0.85)';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#3ecf71';
            ctx.shadowBlur = 12;
            rrPath(ctx, hx, hy, hw, hh, 8);
            ctx.stroke();
            ctx.shadowBlur = 0;
            // Part name label above highlight
            const info = PART_ROLES[hp.shape] || {};
            ctx.fillStyle = 'rgba(15,17,23,0.82)';
            const labelY = hy - 26;
            ctx.beginPath();
            ctx.roundRect(hx, labelY, hw, 22, 5);
            ctx.fill();
            ctx.fillStyle = '#3ecf71';
            ctx.font = 'bold 11px Inter,sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${info.emoji || ''} ${info.role || hp.name}`, hx + hw / 2, labelY + 15);
            ctx.restore();
        }

        // "Next part" label
        if (currentStep < model.parts.length) {
            const next = model.parts[currentStep];
            const cx = phoneX + next.x + next.w / 2;
            const cy = phoneY + next.y + next.h / 2;
            ctx.fillStyle = 'rgba(62,207,113,0.85)';
            ctx.font = 'bold 11px Inter,sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`▼ ${next.name}`, cx, phoneY - 16);
        }

        // Model label
        ctx.fillStyle = 'rgba(120,150,190,0.6)';
        ctx.font = '12px Inter,sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(model.name, 16, h - 12);
    }

    // ─── Individual component drawing ─────────────────────────────────────────
    function drawPart(ctx, part, ox, oy, alpha, mini = false) {
        ctx.save();
        ctx.globalAlpha = alpha;
        const x = ox + part.x, y = oy + part.y, w = part.w, h = part.h;

        switch (part.shape) {
            case 'frame':           drawFrame(ctx, x, y, w, h, part.color, false); break;
            case 'rugged-frame':    drawFrame(ctx, x, y, w, h, part.color, true);  break;
            case 'innershield':     drawInnerShield(ctx, x, y, w, h, part.color);  break;
            case 'pcb':             drawPCB(ctx, x, y, w, h, mini);                break;
            case 'battery':         drawBattery(ctx, x, y, w, h, mini);            break;
            case 'camera':          drawCamera(ctx, x, y, w, h, false);            break;
            case 'periscope':       drawCamera(ctx, x, y, w, h, true);             break;
            case 'speaker':         drawSpeaker(ctx, x, y, w, h);                  break;
            case 'usbc':            drawUSBC(ctx, x, y, w, h);                     break;
            case 'display':         drawDisplay(ctx, x, y, w, h);                  break;
            case 'glass':           drawGlass(ctx, x, y, w, h);                    break;
            case 'nfc':             drawNFC(ctx, x, y, w, h);                      break;
            case 'antenna':         drawAntenna(ctx, x, y, w, h);                  break;
            case 'dynamic-island':  drawDynamicIsland(ctx, x, y, w, h);            break;
            case 'taptic':          drawTaptic(ctx, x, y, w, h);                   break;
            case 'spen':            drawSPen(ctx, x, y, w, h);                     break;
            case 'tempsensor':      drawTempSensor(ctx, x, y, w, h);               break;
        }
        ctx.restore();
    }

    // Helper: rounded-rect path
    function rrPath(ctx, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
    }

    // ── FRAME ────────────────────────────────────────────────────────────────
    function drawFrame(ctx, x, y, w, h, color, rugged) {
        const r = rugged ? 12 : 18;
        const edgeW = rugged ? 10 : 6;

        // Outer shell gradient
        const grd = ctx.createLinearGradient(x, y, x + w, y + h);
        grd.addColorStop(0, lighten(color, 40));
        grd.addColorStop(0.5, color);
        grd.addColorStop(1, darken(color, 30));
        ctx.fillStyle = grd;
        rrPath(ctx, x, y, w, h, r);
        ctx.fill();

        // Edge sheen
        ctx.strokeStyle = lighten(color, 60);
        ctx.lineWidth = 1;
        rrPath(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r);
        ctx.stroke();

        // Inner cutout
        ctx.fillStyle = '#0d1117';
        rrPath(ctx, x + edgeW, y + edgeW, w - edgeW * 2, h - edgeW * 2, r - 4);
        ctx.fill();

        // Side buttons (right side)
        const btnColor = lighten(color, 25);
        ctx.fillStyle = btnColor;
        // Power button
        ctx.fillRect(x + w - 3, y + h * 0.25, 3, 28);
        // Volume up
        ctx.fillRect(x + w - 3, y + h * 0.4, 3, 20);
        // Volume down
        ctx.fillRect(x + w - 3, y + h * 0.47, 3, 20);

        // Left SIM tray
        ctx.fillStyle = darken(color, 10);
        ctx.fillRect(x, y + h * 0.18, 3, 20);
        ctx.strokeStyle = lighten(color, 20);
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x + 0.5, y + h * 0.18 + 0.5, 2, 19);

        // Screw bosses at corners
        const screw = (sx, sy) => {
            ctx.fillStyle = darken(color, 20);
            ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = lighten(color, 15); ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.stroke();
            // Cross slot
            ctx.strokeStyle = '#000'; ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(sx - 2, sy); ctx.lineTo(sx + 2, sy); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sx, sy - 2); ctx.lineTo(sx, sy + 2); ctx.stroke();
        };
        screw(x + edgeW + 8,  y + edgeW + 8);
        screw(x + w - edgeW - 8, y + edgeW + 8);
        screw(x + edgeW + 8,  y + h - edgeW - 8);
        screw(x + w - edgeW - 8, y + h - edgeW - 8);

        if (rugged) {
            // Rubber ridge lines around edges
            ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 6; i++) {
                ctx.beginPath();
                ctx.moveTo(x + 2 + i * 1.2, y + 2);
                ctx.lineTo(x + 2 + i * 1.2, y + h - 2);
                ctx.stroke();
            }
        }
    }

    // ── INNER SHIELD ─────────────────────────────────────────────────────────
    function drawInnerShield(ctx, x, y, w, h, color) {
        const grd = ctx.createLinearGradient(x, y, x, y + h);
        grd.addColorStop(0, lighten(color, 20));
        grd.addColorStop(1, darken(color, 20));
        ctx.fillStyle = grd;
        rrPath(ctx, x, y, w, h, 10);
        ctx.fill();

        // Cross-hatch texture
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 0.5;
        for (let i = x; i < x + w; i += 8) {
            ctx.beginPath(); ctx.moveTo(i, y); ctx.lineTo(i, y + h); ctx.stroke();
        }
        for (let j = y; j < y + h; j += 8) {
            ctx.beginPath(); ctx.moveTo(x, j); ctx.lineTo(x + w, j); ctx.stroke();
        }

        // Flex cable cutouts
        ctx.fillStyle = '#0d1117';
        ctx.fillRect(x + w * 0.3, y + h * 0.3, 60, 8);
        ctx.fillRect(x + w * 0.5, y + h * 0.6, 50, 8);

        // EMI shield patches
        for (let p = 0; p < 3; p++) {
            const px = x + 20 + p * (w / 3.2);
            const py = y + 30;
            ctx.fillStyle = darken(color, 15);
            ctx.strokeStyle = lighten(color, 10);
            ctx.lineWidth = 0.5;
            ctx.fillRect(px, py, 35, 25);
            ctx.strokeRect(px, py, 35, 25);
        }

        ctx.strokeStyle = lighten(color, 30);
        ctx.lineWidth = 1;
        rrPath(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 10);
        ctx.stroke();
    }

    // ── PCB ──────────────────────────────────────────────────────────────────
    function drawPCB(ctx, x, y, w, h, mini) {
        // Board substrate
        const grd = ctx.createLinearGradient(x, y, x + w, y + h);
        grd.addColorStop(0, '#1a4020');
        grd.addColorStop(1, '#0f2a12');
        ctx.fillStyle = grd;
        rrPath(ctx, x, y, w, h, 4);
        ctx.fill();

        if (!mini) {
            // Gold trace network
            ctx.strokeStyle = 'rgba(200,160,30,0.55)';
            ctx.lineWidth = 0.7;
            const traces = [
                [[x+10,y+20],[x+80,y+20],[x+80,y+50]],
                [[x+80,y+50],[x+140,y+50],[x+140,y+90]],
                [[x+20,y+70],[x+20,y+130],[x+100,y+130]],
                [[x+30,y+40],[x+60,y+40],[x+60,y+120],[x+160,y+120]],
                [[x+120,y+20],[x+120,y+80],[x+80,y+80]],
                [[x+160,y+30],[x+160,y+100]],
                [[x+10,y+100],[x+50,y+100]],
            ];
            traces.forEach(segs => {
                ctx.beginPath();
                ctx.moveTo(segs[0][0], segs[0][1]);
                for (let i = 1; i < segs.length; i++) ctx.lineTo(segs[i][0], segs[i][1]);
                ctx.stroke();
            });

            // Solder mask vias (small dots)
            ctx.fillStyle = 'rgba(200,160,30,0.7)';
            [[x+80,y+50],[x+80,y+80],[x+140,y+90],[x+120,y+20],
             [x+160,y+100],[x+100,y+130],[x+20,y+70]].forEach(([vx,vy]) => {
                ctx.beginPath();
                ctx.arc(vx, vy, 2, 0, Math.PI*2); ctx.fill();
                ctx.beginPath();
                ctx.arc(vx, vy, 3.5, 0, Math.PI*2);
                ctx.strokeStyle='rgba(200,160,30,0.3)'; ctx.lineWidth=0.5; ctx.stroke();
            });

            // Main SoC chip (large, center-ish)
            drawIC(ctx, x+30, y+20, 55, 45, '#111', 'SoC', '#3ecf71');
            // DRAM
            drawIC(ctx, x+30, y+72, 40, 30, '#141414', 'DRAM', '#60aaff');
            // Power management IC
            drawIC(ctx, x+100, y+22, 35, 28, '#181818', 'PMIC', '#ffaa30');
            // RF / Modem
            drawIC(ctx, x+100, y+58, 35, 28, '#181818', 'RF', '#ff6060');
            // Flash storage
            drawIC(ctx, x+145, y+22, 25, 40, '#111', 'NAND', '#aaccff');

            // Passive components (caps, resistors) row
            for (let c = 0; c < 7; c++) {
                const cx = x + 8 + c * 10;
                const cy = y + h - 18;
                ctx.fillStyle = '#222';
                ctx.fillRect(cx, cy, 7, 4);
                ctx.fillStyle = 'rgba(200,160,30,0.6)';
                ctx.fillRect(cx - 1, cy + 1, 2, 2);
                ctx.fillRect(cx + 7, cy + 1, 2, 2);
            }

            // Board edge connector pads
            for (let p = 0; p < 10; p++) {
                ctx.fillStyle = 'rgba(200,160,30,0.8)';
                ctx.fillRect(x + 8 + p * 16, y + h - 5, 8, 4);
            }
        } else {
            // Mini icon: just chip squares and a cross-trace
            ctx.fillStyle = '#111';
            ctx.fillRect(x+4, y+4, w*0.4, h*0.4);
            ctx.fillRect(x+w*0.55, y+4, w*0.35, h*0.35);
            ctx.strokeStyle = 'rgba(200,160,30,0.5)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(x, y + h/2); ctx.lineTo(x + w, y + h/2);
            ctx.moveTo(x + w/2, y); ctx.lineTo(x + w/2, y + h);
            ctx.stroke();
        }

        // Board outline
        ctx.strokeStyle = 'rgba(100,180,100,0.3)';
        ctx.lineWidth = 0.5;
        rrPath(ctx, x, y, w, h, 4);
        ctx.stroke();
    }

    function drawIC(ctx, x, y, w, h, bodyColor, label, labelColor) {
        // Body
        ctx.fillStyle = bodyColor;
        rrPath(ctx, x, y, w, h, 2);
        ctx.fill();
        // Pin rows
        ctx.fillStyle = 'rgba(200,160,30,0.7)';
        const pinH = 3, pinW = 2, pinCount = Math.floor(w / 5);
        for (let i = 0; i < pinCount; i++) {
            const px = x + 3 + i * (w - 6) / pinCount;
            ctx.fillRect(px, y - 2, pinW, 3);
            ctx.fillRect(px, y + h - 1, pinW, 3);
        }
        const pinCountV = Math.floor(h / 5);
        for (let i = 0; i < pinCountV; i++) {
            const py = y + 3 + i * (h - 6) / pinCountV;
            ctx.fillRect(x - 2, py, 3, pinH);
            ctx.fillRect(x + w - 1, py, 3, pinH);
        }
        // Label
        ctx.fillStyle = labelColor;
        ctx.font = `bold ${Math.min(8, w * 0.2)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + w / 2, y + h / 2);
        ctx.textBaseline = 'alphabetic';
    }

    // ── BATTERY ──────────────────────────────────────────────────────────────
    function drawBattery(ctx, x, y, w, h, mini) {
        // Metallic foil pouch
        const grd = ctx.createLinearGradient(x, y, x + w, y);
        grd.addColorStop(0, '#3a3a50');
        grd.addColorStop(0.25, '#4a4a64');
        grd.addColorStop(0.5, '#55556e');
        grd.addColorStop(0.75, '#4a4a64');
        grd.addColorStop(1, '#3a3a50');
        ctx.fillStyle = grd;
        rrPath(ctx, x, y, w, h, 5);
        ctx.fill();

        // Foil heat-seal lines (horizontal seams)
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        for (let s = 0; s < 3; s++) {
            const sy = y + (h / 4) * (s + 1);
            ctx.beginPath(); ctx.moveTo(x + 4, sy); ctx.lineTo(x + w - 4, sy); ctx.stroke();
        }

        // Battery level indicator bar
        const barX = x + 12, barY = y + h * 0.35, barW = w - 24, barH = 14;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        rrPath(ctx, barX, barY, barW, barH, 3);
        ctx.fill();
        const filled = barW * 0.8;
        const barGrd = ctx.createLinearGradient(barX, barY, barX + filled, barY);
        barGrd.addColorStop(0, '#3ecf71');
        barGrd.addColorStop(1, '#20a050');
        ctx.fillStyle = barGrd;
        rrPath(ctx, barX + 1, barY + 1, filled - 2, barH - 2, 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('4000 mAh  3.87V', barX + barW / 2, barY + barH / 2);
        ctx.textBaseline = 'alphabetic';

        if (!mini) {
            // Brand / safety label
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.font = '7px Inter,sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Li-Polymer  Do Not Puncture  CE  ⚠', x + w / 2, y + h - 12);

            // Connector tab at top
            ctx.fillStyle = '#888';
            const tabW = 40, tabH = 8;
            ctx.fillRect(x + w / 2 - tabW / 2, y - tabH + 2, tabW, tabH);
            // Connector pins
            for (let p = 0; p < 4; p++) {
                ctx.fillStyle = '#ffd700';
                ctx.fillRect(x + w / 2 - 14 + p * 8, y - tabH + 3, 4, 6);
            }
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 0.5;
        rrPath(ctx, x, y, w, h, 5);
        ctx.stroke();
    }

    // ── CAMERA ───────────────────────────────────────────────────────────────
    function drawCamera(ctx, x, y, w, h, periscope) {
        const cx = x + w / 2, cy = y + h / 2;
        const r = Math.min(w, h) / 2 - 2;

        // Module housing
        const grd = ctx.createRadialGradient(cx - r*0.3, cy - r*0.3, 1, cx, cy, r + 3);
        grd.addColorStop(0, '#2a3545');
        grd.addColorStop(1, '#0d1520');
        ctx.fillStyle = grd;
        rrPath(ctx, x, y, w, h, 5);
        ctx.fill();

        // OIS marker ring
        ctx.strokeStyle = 'rgba(100,140,200,0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, r + 1, 0, Math.PI * 2); ctx.stroke();

        if (!periscope) {
            // Lens rings (outer to inner)
            const rings = [
                { r: r,     color: '#1a2535', stroke: '#3a5070' },
                { r: r*0.8, color: '#0a1520', stroke: '#5080b0' },
                { r: r*0.6, color: '#1a2535', stroke: '#4a7090' },
                { r: r*0.4, color: '#050a10', stroke: '#3060a0' },
                { r: r*0.22,color: '#0d1a30', stroke: '#60aaff' },
            ];
            rings.forEach(ring => {
                ctx.beginPath(); ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
                ctx.fillStyle = ring.color; ctx.fill();
                ctx.strokeStyle = ring.stroke; ctx.lineWidth = 0.8; ctx.stroke();
            });

            // AR coating shimmer
            const shimmer = ctx.createRadialGradient(cx - r*0.3, cy - r*0.3, 0, cx, cy, r*0.6);
            shimmer.addColorStop(0, 'rgba(100,180,255,0.12)');
            shimmer.addColorStop(0.5, 'rgba(80,100,255,0.06)');
            shimmer.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.beginPath(); ctx.arc(cx, cy, r*0.6, 0, Math.PI*2);
            ctx.fillStyle = shimmer; ctx.fill();

            // Specular highlight
            ctx.fillStyle = 'rgba(255,255,255,0.18)';
            ctx.beginPath();
            ctx.arc(cx - r*0.22, cy - r*0.22, r*0.12, 0, Math.PI*2);
            ctx.fill();

            // Flex connector stub
            ctx.fillStyle = 'rgba(200,160,30,0.5)';
            ctx.fillRect(x + w*0.2, y + h - 3, w*0.6, 3);
        } else {
            // Periscope: rectangular optics path visible
            ctx.fillStyle = '#0a1020';
            rrPath(ctx, x + 4, y + 4, w - 8, h - 8, 4);
            ctx.fill();
            // Prism outline
            ctx.strokeStyle = 'rgba(100,150,220,0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx, y + 6); ctx.lineTo(x + w - 6, cy);
            ctx.lineTo(cx, y + h - 6); ctx.lineTo(x + 6, cy);
            ctx.closePath(); ctx.stroke();
            // Inner lens
            ctx.beginPath(); ctx.arc(cx, cy, r*0.35, 0, Math.PI*2);
            ctx.strokeStyle = '#5080b0'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.fillStyle = '#050a10'; ctx.fill();
            // Zoom label
            ctx.fillStyle = 'rgba(100,180,255,0.6)';
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('5×', cx, y + h - 6);
        }

        // Module outline highlight
        ctx.strokeStyle = 'rgba(60,100,160,0.5)';
        ctx.lineWidth = 0.8;
        rrPath(ctx, x, y, w, h, 5);
        ctx.stroke();
    }

    // ── SPEAKER ──────────────────────────────────────────────────────────────
    function drawSpeaker(ctx, x, y, w, h) {
        // Housing
        ctx.fillStyle = '#111';
        rrPath(ctx, x, y, w, h, 4);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 0.5;
        rrPath(ctx, x, y, w, h, 4);
        ctx.stroke();

        // Speaker mesh (staggered dot array)
        const dotR = 1.2, gapX = 5.5, gapY = 4;
        const rowCount = Math.floor((h - 4) / gapY);
        const colCount = Math.floor((w - 8) / gapX);
        for (let row = 0; row < rowCount; row++) {
            const offsetX = (row % 2 === 0) ? 0 : gapX / 2;
            for (let col = 0; col < colCount; col++) {
                const dx = x + 5 + col * gapX + offsetX;
                const dy = y + 3 + row * gapY;
                if (dx > x + 3 && dx < x + w - 3 && dy > y + 1 && dy < y + h - 1) {
                    ctx.beginPath();
                    ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(90,90,90,0.8)';
                    ctx.fill();
                }
            }
        }

        // Membrane outline visible through mesh
        ctx.strokeStyle = 'rgba(80,80,80,0.4)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, w * 0.35, h * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    // ── USB-C ────────────────────────────────────────────────────────────────
    function drawUSBC(ctx, x, y, w, h) {
        // Housing
        ctx.fillStyle = '#3a3a3a';
        rrPath(ctx, x, y, w, h, h / 2);
        ctx.fill();

        // Port opening (stadium shape)
        ctx.fillStyle = '#111';
        rrPath(ctx, x + 4, y + 1.5, w - 8, h - 3, (h - 3) / 2);
        ctx.fill();

        // Internal tongue
        ctx.fillStyle = '#555';
        rrPath(ctx, x + 7, y + 2.5, w - 14, h - 5, 1.5);
        ctx.fill();

        // Gold contact pads
        for (let p = 0; p < 6; p++) {
            ctx.fillStyle = 'rgba(200,160,30,0.7)';
            ctx.fillRect(x + 10 + p * ((w - 20) / 6), y + 3, (w - 20) / 7, 1.5);
            ctx.fillRect(x + 10 + p * ((w - 20) / 6), y + h - 4.5, (w - 20) / 7, 1.5);
        }

        // Outer sheen
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 0.5;
        rrPath(ctx, x, y, w, h, h / 2);
        ctx.stroke();
    }

    // ── DISPLAY ──────────────────────────────────────────────────────────────
    function drawDisplay(ctx, x, y, w, h) {
        // Panel body
        const grd = ctx.createLinearGradient(x, y, x + w, y + h);
        grd.addColorStop(0, '#050d1a');
        grd.addColorStop(1, '#030811');
        ctx.fillStyle = grd;
        rrPath(ctx, x, y, w, h, 12);
        ctx.fill();

        // Active pixel area (slightly lighter)
        ctx.fillStyle = '#060f1e';
        rrPath(ctx, x + 2, y + 2, w - 4, h - 4, 10);
        ctx.fill();

        // Subtle OLED grid shimmer
        ctx.strokeStyle = 'rgba(30,60,120,0.15)';
        ctx.lineWidth = 0.5;
        for (let row = y + 4; row < y + h - 4; row += 8) {
            ctx.beginPath(); ctx.moveTo(x + 4, row); ctx.lineTo(x + w - 4, row); ctx.stroke();
        }

        // Status bar area
        ctx.fillStyle = 'rgba(62,207,113,0.06)';
        rrPath(ctx, x + 2, y + 2, w - 4, 18, 10);
        ctx.fill();

        // Punch-hole camera notch
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(x + w / 2, y + 14, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(60,100,160,0.4)'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.arc(x + w / 2, y + 14, 6, 0, Math.PI * 2); ctx.stroke();

        // Screen content simulation
        ctx.fillStyle = 'rgba(62,207,113,0.08)';
        ctx.fillRect(x + 10, y + 28, w - 20, 6);
        ctx.fillStyle = 'rgba(100,150,220,0.06)';
        ctx.fillRect(x + 10, y + 40, (w - 20) * 0.6, 5);

        // Flex cable at bottom
        ctx.fillStyle = 'rgba(200,160,30,0.4)';
        ctx.fillRect(x + w / 2 - 20, y + h - 3, 40, 3);

        // Panel outline
        ctx.strokeStyle = 'rgba(60,100,180,0.3)';
        ctx.lineWidth = 0.5;
        rrPath(ctx, x, y, w, h, 12);
        ctx.stroke();
    }

    // ── GLASS ────────────────────────────────────────────────────────────────
    function drawGlass(ctx, x, y, w, h) {
        const r = 18;
        // Clear glass fill
        ctx.fillStyle = 'rgba(160,200,255,0.06)';
        rrPath(ctx, x, y, w, h, r);
        ctx.fill();

        // Edge highlight (the glass "edge")
        ctx.strokeStyle = 'rgba(200,230,255,0.25)';
        ctx.lineWidth = 1.5;
        rrPath(ctx, x, y, w, h, r);
        ctx.stroke();

        // Inner edge bevel
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 0.5;
        rrPath(ctx, x + 2, y + 2, w - 4, h - 4, r - 2);
        ctx.stroke();

        // Curved reflection streak (left side)
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x + 20, y + 18);
        ctx.bezierCurveTo(x + 15, y + h * 0.2, x + 10, y + h * 0.5, x + 18, y + h - 22);
        ctx.stroke();

        // Subtle right streak
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath();
        ctx.moveTo(x + w * 0.7, y + 14);
        ctx.bezierCurveTo(x + w * 0.72, y + h * 0.3, x + w * 0.68, y + h * 0.6, x + w * 0.65, y + h - 18);
        ctx.stroke();
        ctx.lineCap = 'butt';
    }

    // ── NFC COIL ─────────────────────────────────────────────────────────────
    function drawNFC(ctx, x, y, w, h) {
        // Substrate
        ctx.fillStyle = 'rgba(40,18,6,0.8)';
        rrPath(ctx, x, y, w, h, 3);
        ctx.fill();

        // Flat spiral coil (concentric rounded rects)
        const turns = 4;
        const margin = 3;
        const shrink = 3;
        for (let t = 0; t < turns; t++) {
            const lx = x + margin + t * shrink;
            const ly = y + margin + t * (h / (turns * 2));
            const lw = w - margin * 2 - t * shrink * 2;
            const lh = h - margin * 2 - t * (h / turns);
            if (lw < 4 || lh < 2) break;
            ctx.strokeStyle = `rgba(200,110,30,${0.7 - t * 0.1})`;
            ctx.lineWidth = 1.2;
            rrPath(ctx, lx, ly, lw, lh, 2);
            ctx.stroke();
        }

        // NFC label
        ctx.fillStyle = 'rgba(220,120,40,0.5)';
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('NFC', x + w / 2, y + h / 2);
        ctx.textBaseline = 'alphabetic';

        ctx.strokeStyle = 'rgba(180,90,20,0.3)';
        ctx.lineWidth = 0.5;
        rrPath(ctx, x, y, w, h, 3);
        ctx.stroke();
    }

    // ── ANTENNA ──────────────────────────────────────────────────────────────
    function drawAntenna(ctx, x, y, w, h) {
        // Substrate
        ctx.fillStyle = 'rgba(30,12,4,0.85)';
        rrPath(ctx, x, y, w, h, 3);
        ctx.fill();

        // Antenna trace zig-zag
        ctx.strokeStyle = 'rgba(220,100,20,0.8)';
        ctx.lineWidth = 1.2;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        const segW = w / 12;
        ctx.moveTo(x + 4, y + h / 2);
        for (let s = 0; s < 11; s++) {
            const nx = x + 4 + (s + 1) * segW;
            const ny = (s % 2 === 0) ? y + 3 : y + h - 3;
            ctx.lineTo(nx, ny);
        }
        ctx.stroke();

        // Connector pads
        ctx.fillStyle = 'rgba(200,160,30,0.8)';
        ctx.fillRect(x + 4, y + 1, 6, h - 2);
        ctx.fillRect(x + w - 10, y + 1, 6, h - 2);

        // Label
        ctx.fillStyle = 'rgba(220,100,20,0.5)';
        ctx.font = '6px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ANTENNA', x + w / 2, y + h / 2);
        ctx.textBaseline = 'alphabetic';

        ctx.strokeStyle = 'rgba(180,80,10,0.35)';
        ctx.lineWidth = 0.5;
        rrPath(ctx, x, y, w, h, 3);
        ctx.stroke();
    }

    // ── DYNAMIC ISLAND (Face ID) ─────────────────────────────────────────────
    function drawDynamicIsland(ctx, x, y, w, h) {
        const r = h / 2;
        // Black pill cutout
        ctx.fillStyle = '#000';
        rrPath(ctx, x, y, w, h, r);
        ctx.fill();

        // IR dot projector — grid of tiny dots on left side
        const dotZoneW = w * 0.35;
        ctx.fillStyle = 'rgba(120,60,180,0.7)';
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 5; col++) {
                ctx.beginPath();
                ctx.arc(x + 6 + col * (dotZoneW / 5), y + 3 + row * (h / 3.5), 0.8, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Camera lens (right side of island)
        const camCX = x + w - h * 0.62, camCY = y + h / 2;
        ctx.beginPath(); ctx.arc(camCX, camCY, h * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = '#0d1a2e'; ctx.fill();
        ctx.beginPath(); ctx.arc(camCX, camCY, h * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = '#1a3050'; ctx.fill();
        ctx.beginPath(); ctx.arc(camCX - 1, camCY - 1, h * 0.08, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(100,160,255,0.4)'; ctx.fill();

        // Flood illuminator — small dot right of camera
        ctx.beginPath(); ctx.arc(x + w - 5, y + h / 2, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,200,100,0.6)'; ctx.fill();

        // Pill outline glow
        ctx.strokeStyle = 'rgba(80,80,120,0.5)'; ctx.lineWidth = 0.5;
        rrPath(ctx, x, y, w, h, r); ctx.stroke();
    }

    // ── TAPTIC ENGINE ─────────────────────────────────────────────────────────
    function drawTaptic(ctx, x, y, w, h) {
        // Housing
        const grd = ctx.createLinearGradient(x, y, x, y + h);
        grd.addColorStop(0, '#888'); grd.addColorStop(1, '#444');
        ctx.fillStyle = grd;
        rrPath(ctx, x, y, w, h, 3); ctx.fill();

        // Coil windings visible through housing
        ctx.strokeStyle = 'rgba(200,160,30,0.5)';
        ctx.lineWidth = 1;
        const coilCount = Math.floor(w / 6);
        for (let i = 0; i < coilCount; i++) {
            const cx2 = x + 4 + i * ((w - 8) / coilCount);
            ctx.beginPath(); ctx.moveTo(cx2, y + 2); ctx.lineTo(cx2, y + h - 2); ctx.stroke();
        }

        // Moving mass indicator (center block)
        ctx.fillStyle = 'rgba(150,150,180,0.6)';
        ctx.fillRect(x + w * 0.3, y + 1, w * 0.4, h - 2);

        // Flex connector tabs
        ctx.fillStyle = 'rgba(200,160,30,0.7)';
        ctx.fillRect(x, y + (h - 4) / 2, 5, 4);
        ctx.fillRect(x + w - 5, y + (h - 4) / 2, 5, 4);

        ctx.strokeStyle = 'rgba(200,200,200,0.2)'; ctx.lineWidth = 0.5;
        rrPath(ctx, x, y, w, h, 3); ctx.stroke();
    }

    // ── S PEN ─────────────────────────────────────────────────────────────────
    function drawSPen(ctx, x, y, w, h) {
        const r = w / 2;
        // Stylus body — rounded rectangle (tall and thin)
        const penGrd = ctx.createLinearGradient(x, y, x + w, y);
        penGrd.addColorStop(0, '#3a3a3a');
        penGrd.addColorStop(0.4, '#555');
        penGrd.addColorStop(1, '#222');
        ctx.fillStyle = penGrd;
        rrPath(ctx, x, y, w, h, r); ctx.fill();

        // Clip ridge
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(x + 1.5, y + h * 0.1); ctx.lineTo(x + 1.5, y + h * 0.7); ctx.stroke();

        // Pressure-sensitive tip (bottom pointed nib)
        ctx.fillStyle = '#aaa';
        ctx.beginPath();
        ctx.moveTo(x + 1, y + h - 8);
        ctx.lineTo(x + w - 1, y + h - 8);
        ctx.lineTo(x + w / 2, y + h);
        ctx.closePath(); ctx.fill();

        // Top button
        ctx.fillStyle = 'rgba(100,100,140,0.6)';
        ctx.fillRect(x + 1, y + 4, w - 2, 6);

        // Samsung branding line
        ctx.strokeStyle = 'rgba(100,180,255,0.3)'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(x + 2, y + h * 0.45); ctx.lineTo(x + w - 2, y + h * 0.45); ctx.stroke();

        ctx.strokeStyle = 'rgba(120,120,140,0.4)'; ctx.lineWidth = 0.5;
        rrPath(ctx, x, y, w, h, r); ctx.stroke();
    }

    // ── TEMPERATURE SENSOR ────────────────────────────────────────────────────
    function drawTempSensor(ctx, x, y, w, h) {
        ctx.fillStyle = '#1a0a00';
        rrPath(ctx, x, y, w, h, 3); ctx.fill();

        // Thermopile array — grid of tiny sensing elements
        const cols = 6, rows = 2;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const ex = x + 4 + c * ((w - 8) / cols);
                const ey = y + 3 + r * ((h - 6) / rows);
                ctx.fillStyle = `rgba(255,${80 + c * 25},0,${0.4 + c * 0.08})`;
                ctx.fillRect(ex, ey, (w - 8) / cols - 1, (h - 6) / rows - 1);
            }
        }

        // IR window lens
        ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(80,20,0,0.6)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,80,0,0.4)'; ctx.lineWidth = 0.5; ctx.stroke();

        // Label
        ctx.fillStyle = 'rgba(255,100,30,0.6)'; ctx.font = '5px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText('IR TEMP', x + w / 2, y + h - 1);
        ctx.textBaseline = 'alphabetic';

        ctx.strokeStyle = 'rgba(180,60,0,0.35)'; ctx.lineWidth = 0.5;
        rrPath(ctx, x, y, w, h, 3); ctx.stroke();
    }

    // ─── Color helpers ────────────────────────────────────────────────────────
    function lighten(hex, amt) {
        const num = parseInt(hex.replace('#',''), 16);
        const r = Math.min(255, (num >> 16) + amt);
        const g = Math.min(255, ((num >> 8) & 0xff) + amt);
        const b = Math.min(255, (num & 0xff) + amt);
        return `rgb(${r},${g},${b})`;
    }
    function darken(hex, amt) { return lighten(hex, -amt); }

    function getTutorialAPI() {
        return {
            getCanvas: () => canvas,
            getCurrentStep: () => currentStep,
            getPlacedParts: () => [...placedParts],
            loadModel: (idx) => loadModel(idx),
        };
    }

    function getState() {
        const model = PHONE_MODELS[currentModel];
        return {
            modelIdx: currentModel,
            modelName: model.name,
            currentStep,
            total: model.parts.length,
            placedParts: [...placedParts],
            elapsed: elapsedSeconds,
            score,
        };
    }

    return { init, resizeCanvas, loadModel, testPhone, reset, getTutorialAPI, getState };
})();
