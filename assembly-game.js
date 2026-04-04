const assemblyGame = (() => {
    let canvas, ctx;
    let currentModel = 0;
    let placedParts = [];
    let currentStep = 0;
    let score = 0;
    let timerInterval = null;
    let elapsedSeconds = 0;
    let selectedPart = null;

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
                <div class="comp-icon" style="padding:0;overflow:hidden;border-radius:4px;">
                    <canvas id="${iconId}" width="36" height="36" style="display:block;"></canvas>
                </div>
                <div class="comp-info">
                    <div class="comp-name">${part.name}</div>
                    <div class="comp-detail">${part.detail}</div>
                </div>
            `;
            item.onclick = () => tryPlacePart(part.id);
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
        document.getElementById('assembly-score').textContent = score;

        draw();

        if (window.tutorialEngine && tutorialEngine.isActive()) {
            tutorialEngine.onUserAction('assembly-place', {
                partId, currentStep, totalParts: model.parts.length
            });
        }

        if (currentStep >= model.parts.length) {
            clearInterval(timerInterval);
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

    function setupEvents() {
        window.addEventListener('resize', () => {
            if (document.getElementById('phone-assembly').classList.contains('active')) resizeCanvas();
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
            case 'frame':        drawFrame(ctx, x, y, w, h, part.color, false); break;
            case 'rugged-frame': drawFrame(ctx, x, y, w, h, part.color, true);  break;
            case 'innershield':  drawInnerShield(ctx, x, y, w, h, part.color);  break;
            case 'pcb':          drawPCB(ctx, x, y, w, h, mini);                break;
            case 'battery':      drawBattery(ctx, x, y, w, h, mini);            break;
            case 'camera':       drawCamera(ctx, x, y, w, h, false);            break;
            case 'periscope':    drawCamera(ctx, x, y, w, h, true);             break;
            case 'speaker':      drawSpeaker(ctx, x, y, w, h);                  break;
            case 'usbc':         drawUSBC(ctx, x, y, w, h);                     break;
            case 'display':      drawDisplay(ctx, x, y, w, h);                  break;
            case 'glass':        drawGlass(ctx, x, y, w, h);                    break;
            case 'nfc':          drawNFC(ctx, x, y, w, h);                      break;
            case 'antenna':      drawAntenna(ctx, x, y, w, h);                  break;
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

    return { init, resizeCanvas, loadModel, testPhone, reset, getTutorialAPI };
})();
