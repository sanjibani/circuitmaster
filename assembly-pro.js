// ─────────────────────────────────────────────────────────────────────────────
// assembly-pro.js — Professional Mode for Phone Assembly
//
// Implements Pack A (Pre-Line Checklist) + cross-cutting ESSCI ELE/Q3901 PC
// tags + a Live Performance Rubric. Fully opt-in via a Beginner/Professional
// toggle in the Phone Assembly header. Beginner mode is untouched.
//
// ESSCI NSQF Level 4 · Qualification Pack ELE/Q3901 v3.0 alignment:
//   NOS 1 — Prepare for smartphone assembly    PC1.1–PC1.8
//   NOS 2 — Carry out assembly operations      PC2.1–PC2.8
//   NOS 3 — Quality & FPY                      PC3.1–PC3.5
//   NOS 4 — EHS & housekeeping                 PC4.1–PC4.4
// ─────────────────────────────────────────────────────────────────────────────
const assemblyPro = (() => {
    let mode = 'beginner';          // 'beginner' | 'pro'
    let checklistPassed = false;
    let rubricEl = null;
    let checklistEl = null;
    let toggleEl = null;
    let badgeEl = null;

    // Live metrics (updated by events)
    let metrics = {
        esd: 100,           // PC2.1 ESD compliance (decays over time, refresh by wrist-check)
        sequence: 100,      // PC2.3 sequence adherence
        cycleTime: 100,     // PC2.5 cycle time vs target
        torque: 100,        // PC3.2 torque discipline
        fpy: 100,           // PC3.1 / PC4.1 first-pass yield
    };
    let placementCount = 0;
    let missCount = 0;
    let lastEsdCheck = 0;
    let esdTimer = null;
    let cycleStart = 0;
    let torquePrompts = 0;
    let torquePassed = 0;
    let activeTorquePrompt = null;
    let sessionStartTs = 0;

    // ── ESSCI Performance Criteria catalog ───────────────────────────────────
    const PC = {
        'PC1.1': 'Verify personal ESD protection (wrist strap, heel straps)',
        'PC1.2': 'Test wrist-strap continuity and ESD mat grounding',
        'PC1.3': 'Apply 5S discipline to the assembly workstation',
        'PC1.4': 'Calibrate torque drivers to model-specific screw specs',
        'PC1.5': 'Verify parts kit against travel card / BOM',
        'PC1.6': 'Record component lot numbers for traceability',
        'PC1.7': 'Install and verify assembly jig / fixture',
        'PC1.8': 'Check MSD humidity indicator and exposure log',
        'PC2.1': 'Maintain ESD compliance during assembly',
        'PC2.3': 'Follow defined assembly sequence without deviation',
        'PC2.5': 'Achieve target cycle time per unit',
        'PC3.1': 'Deliver first-pass yield ≥ 98%',
        'PC3.2': 'Apply fasteners to specified torque values',
        'PC4.1': 'Maintain EHS discipline and housekeeping',
    };

    // ── Pack A — Pre-Line Missions (interactive skill assessments) ──────────
    // Each section is an interactive mission that yields a 0–100 score. Stubs
    // (marked `stub: true`) auto-pass at 85 for now and will be replaced with
    // full missions in the next pass.
    const MISSIONS = [
        { id: 'esd',    icon: '⚡',  title: 'ESD Continuity Test',      pcs: ['PC1.1', 'PC1.2'],
          brief: 'Test three ESD devices with the multimeter. Pass only valid readings — rejecting good equipment or passing bad equipment will fail the operator.',
          render: renderEsdMission },
        { id: '5s',     icon: '🧹',  title: '5S Workstation Audit',     pcs: ['PC1.3'],
          brief: 'Spot every 5S violation on the workstation before the shift starts. Miss a hazard and the line cannot go live. False reports also lose points.',
          render: renderFiveSMission },
        { id: 'torque', icon: '🔧',  title: 'Torque Driver Calibration', pcs: ['PC1.4', 'PC3.2'],
          brief: 'Calibrate the torque driver to three model-specific specs by dialling the needle into the green band. Over-torque cracks glass; under-torque loosens screws on the line.',
          render: renderTorqueMission },
        { id: 'kit',    icon: '📦',  title: 'Kit & BOM Verification',    pcs: ['PC1.5', 'PC1.6'],
          brief: 'Match each bin to the correct BOM line. Two bins are wrong-revision or wrong-quantity — send them to the Reject tray. False-accepts fail the operator.',
          render: renderKitMission },
        { id: 'jig',    icon: '🧰',  title: 'JIG & Fixture Setup',       pcs: ['PC1.7'],
          brief: 'Drop the phone chassis into the assembly jig. Align all four corner pegs within tolerance before the clamp will lock. Mis-seat and the jig shakes — misalignment on the line means scratched bezels.',
          render: renderJigMission },
        { id: 'msd',    icon: '💧',  title: 'MSD Moisture Decision',     pcs: ['PC1.8'],
          brief: 'Read the Humidity Indicator Card and the floor-exposure log, then pick the correct disposition: Use, Bake 24 h, or Scrap.',
          render: renderMsdMission },
    ];

    // Mission state: { [id]: { score: number|null, passed: bool, attempts: int, done: bool } }
    const missionState = {};
    let activeMissionId = null;

    // ── Public API ───────────────────────────────────────────────────────────
    function init() {
        injectModeToggle();
        injectPcBadge();
        hookEvents();
    }

    function setMode(next) {
        if (next === mode) return;
        mode = next;
        if (mode === 'pro') enterPro();
        else exitPro();
    }

    function getMode() { return mode; }

    // ── Mode toggle (sits in game-controls row) ──────────────────────────────
    function injectModeToggle() {
        const header = document.querySelector('#phone-assembly .game-controls');
        if (!header) return;
        const wrap = document.createElement('div');
        wrap.className = 'pro-mode-toggle';
        wrap.innerHTML = `
            <span class="pmt-label">Mode</span>
            <button type="button" class="pmt-btn active" data-mode="beginner">
                <span class="pmt-icon">🎓</span>
                <span class="pmt-text">Beginner</span>
            </button>
            <button type="button" class="pmt-btn" data-mode="pro">
                <span class="pmt-icon">🏭</span>
                <span class="pmt-text">Professional</span>
                <span class="pmt-pill">ESSCI</span>
            </button>
        `;
        header.appendChild(wrap);
        toggleEl = wrap;
        wrap.querySelectorAll('.pmt-btn').forEach(b => {
            b.addEventListener('click', () => {
                wrap.querySelectorAll('.pmt-btn').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                setMode(b.dataset.mode);
            });
        });
    }

    function injectPcBadge() {
        const title = document.querySelector('#phone-assembly .game-header h2');
        if (!title) return;
        badgeEl = document.createElement('span');
        badgeEl.className = 'pro-mode-badge';
        badgeEl.textContent = 'PRO MODE · ESSCI ELE/Q3901';
        badgeEl.style.display = 'none';
        title.appendChild(badgeEl);
    }

    // ── Enter / exit Pro mode ────────────────────────────────────────────────
    function enterPro() {
        checklistPassed = false;
        resetMetrics();
        if (badgeEl) badgeEl.style.display = 'inline-flex';
        showChecklist();
        // Block assembly interaction until checklist is done
        const canvas = document.getElementById('assembly-canvas');
        if (canvas) canvas.classList.add('pro-locked');
        const palette = document.getElementById('assembly-palette');
        if (palette) palette.classList.add('pro-locked');
    }

    function exitPro() {
        checklistPassed = false;
        hideChecklist();
        hideRubric();
        if (badgeEl) badgeEl.style.display = 'none';
        const canvas = document.getElementById('assembly-canvas');
        if (canvas) canvas.classList.remove('pro-locked');
        const palette = document.getElementById('assembly-palette');
        if (palette) palette.classList.remove('pro-locked');
        if (esdTimer) { clearInterval(esdTimer); esdTimer = null; }
        if (activeTorquePrompt) { activeTorquePrompt.remove(); activeTorquePrompt = null; }
    }

    // ── Pre-Line Mission UI ──────────────────────────────────────────────────
    // Two-column card: left = mission list + scores, right = active mission.
    // Station Readiness = average of all completed mission scores; gate ≥ 80.
    function showChecklist() {
        Object.keys(missionState).forEach(k => delete missionState[k]);
        MISSIONS.forEach(m => { missionState[m.id] = { score: null, passed: false, attempts: 0, done: false }; });
        activeMissionId = MISSIONS[0].id;
        if (checklistEl) checklistEl.remove();

        const overlay = document.createElement('div');
        overlay.className = 'pro-checklist-overlay pro-mission-overlay';
        overlay.innerHTML = `
            <div class="pro-mission-card">
                <div class="pmc-header">
                    <div>
                        <div class="pcl-eyebrow">Professional Mode · Pre-Line Skill Missions</div>
                        <h2>Prove You Can Run the Line</h2>
                        <p class="pcl-sub">Complete 6 skill missions mapped to ESSCI ELE/Q3901 NOS 1 — <em>Prepare for smartphone assembly</em>. You need a Station Readiness Score of ≥ 80 to start production.</p>
                    </div>
                    <button class="pcl-exit" title="Return to Beginner mode">×</button>
                </div>
                <div class="pmc-body">
                    <aside class="pmc-sidebar"></aside>
                    <section class="pmc-stage"></section>
                </div>
                <div class="pmc-footer">
                    <div class="pmc-readiness">
                        <div class="pmc-readiness-label">Station Readiness</div>
                        <div class="pmc-readiness-bar"><div class="pmc-readiness-fill"></div></div>
                        <div class="pmc-readiness-val">— / 100</div>
                    </div>
                    <button class="pcl-start btn btn-success" disabled>Start Production Line →</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        checklistEl = overlay;

        overlay.querySelector('.pcl-exit').addEventListener('click', () => {
            if (toggleEl) toggleEl.querySelectorAll('.pmt-btn').forEach(b =>
                b.classList.toggle('active', b.dataset.mode === 'beginner'));
            setMode('beginner');
        });

        overlay.querySelector('.pcl-start').addEventListener('click', () => {
            if (!isStationReady()) return;
            checklistPassed = true;
            hideChecklist();
            const canvas = document.getElementById('assembly-canvas');
            if (canvas) canvas.classList.remove('pro-locked');
            const palette = document.getElementById('assembly-palette');
            if (palette) palette.classList.remove('pro-locked');
            showRubric();
            startEsdWatchdog();
            sessionStartTs = Date.now();
            cycleStart = Date.now();
            if (window.assemblyGame && assemblyGame.reset) assemblyGame.reset();
        });

        renderSidebar();
        renderStage();
        updateReadiness();
    }

    function renderSidebar() {
        const bar = checklistEl.querySelector('.pmc-sidebar');
        bar.innerHTML = '';
        MISSIONS.forEach(m => {
            const s = missionState[m.id];
            const tile = document.createElement('button');
            tile.type = 'button';
            tile.className = 'pmc-tile' + (m.id === activeMissionId ? ' active' : '') +
                             (s.done ? ' done' : '') + (m.stub ? ' stub' : '');
            tile.innerHTML = `
                <div class="pmc-tile-icon">${m.icon}</div>
                <div class="pmc-tile-body">
                    <div class="pmc-tile-title">${m.title}</div>
                    <div class="pmc-tile-tags">${m.pcs.map(p => `<span class="pc-tag">${p}</span>`).join('')}</div>
                </div>
                <div class="pmc-tile-score">
                    ${s.score === null ? '<span class="pmc-tile-status">—</span>' :
                                          `<span class="pmc-tile-num" style="color:${barColor(s.score)}">${s.score}</span>`}
                </div>
            `;
            tile.addEventListener('click', () => {
                activeMissionId = m.id;
                renderSidebar();
                renderStage();
            });
            bar.appendChild(tile);
        });
    }

    function renderStage() {
        const stage = checklistEl.querySelector('.pmc-stage');
        const m = MISSIONS.find(x => x.id === activeMissionId);
        if (!m) return;
        stage.innerHTML = `
            <div class="pmc-stage-head">
                <div class="pmc-stage-title"><span class="pmc-stage-icon">${m.icon}</span> ${m.title}</div>
                <div class="pmc-stage-tags">${m.pcs.map(p => `<span class="pc-tag" title="${PC[p]||''}">${p}</span>`).join('')}</div>
            </div>
            <div class="pmc-stage-brief">${m.brief}</div>
            <div class="pmc-stage-body"></div>
        `;
        const body = stage.querySelector('.pmc-stage-body');
        if (m.stub) renderStubMission(body, m);
        else m.render(body, m);
    }

    function renderStubMission(body, m) {
        const s = missionState[m.id];
        body.innerHTML = `
            <div class="pmc-stub">
                <div class="pmc-stub-badge">BETA</div>
                <div class="pmc-stub-text">
                    This mission is <strong>under construction</strong>. For now it auto-passes at a placeholder score of 85 so you can evaluate the full flow. The real interactive version ships in the next build.
                </div>
                <button class="btn btn-primary pmc-stub-btn">Auto-Pass (85)</button>
            </div>
        `;
        if (s.done) {
            body.querySelector('.pmc-stub-btn').textContent = `Score: ${s.score} · Already completed`;
            body.querySelector('.pmc-stub-btn').disabled = true;
        }
        body.querySelector('.pmc-stub-btn').addEventListener('click', () => {
            completeMission(m.id, 85, true);
        });
    }

    function completeMission(id, score, passed) {
        const s = missionState[id];
        s.attempts++;
        s.score = Math.round(score);
        s.passed = passed;
        s.done = true;
        renderSidebar();
        renderStage();
        updateReadiness();
    }

    function resetMission(id) {
        missionState[id] = { score: null, passed: false, attempts: 0, done: false };
        renderSidebar();
        renderStage();
        updateReadiness();
    }

    function hideChecklist() {
        if (checklistEl) { checklistEl.remove(); checklistEl = null; }
    }

    function stationReadinessScore() {
        const scores = MISSIONS.map(m => missionState[m.id].score).filter(v => v !== null);
        if (!scores.length) return 0;
        const avg = scores.reduce((a, b) => a + b, 0) / MISSIONS.length;
        return Math.round(avg);
    }

    function allMissionsDone() {
        return MISSIONS.every(m => missionState[m.id].done);
    }

    function isStationReady() {
        return allMissionsDone() && stationReadinessScore() >= 80;
    }

    function updateReadiness() {
        if (!checklistEl) return;
        const score = stationReadinessScore();
        const done = MISSIONS.filter(m => missionState[m.id].done).length;
        const fill = checklistEl.querySelector('.pmc-readiness-fill');
        const val = checklistEl.querySelector('.pmc-readiness-val');
        fill.style.width = score + '%';
        fill.style.background = barColor(score);
        if (!done) {
            val.textContent = '— / 100';
        } else {
            val.textContent = `${score} / 100 · ${done}/${MISSIONS.length} missions`;
        }
        const btn = checklistEl.querySelector('.pcl-start');
        btn.disabled = !isStationReady();
        btn.classList.toggle('ready', isStationReady());
        if (allMissionsDone() && !isStationReady()) {
            btn.textContent = `Readiness ${score} · Need ≥ 80 → Retry Missions`;
        } else {
            btn.textContent = 'Start Production Line →';
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MISSION 1 — ESD Continuity Test
    // ─ Animated analog multimeter. Three devices tested in sequence:
    //   · Wrist strap (expected 0.8–1.2 MΩ)
    //   · ESD mat ground (expected < 1 Ω)
    //   · Heel strap (expected 0.5–1.0 MΩ)
    // For each, a reading is generated (in-range or deliberately out-of-range).
    // Operator clicks [PASS] or [REJECT]. Correct judgement = +points.
    // Wrong judgement = hard penalty. Score shown at end; retry allowed.
    // ═══════════════════════════════════════════════════════════════════════
    function renderEsdMission(body, m) {
        const state = missionState[m.id];
        const rounds = [
            { device: 'Wrist Strap',   unit: 'MΩ', min: 0.8, max: 1.2, hardMin: 0.1, hardMax: 8, display: v => v.toFixed(2) + ' MΩ' },
            { device: 'ESD Mat Ground', unit: 'Ω', min: 0,   max: 1.0, hardMin: 0,   hardMax: 25, display: v => v.toFixed(2) + ' Ω' },
            { device: 'Heel Strap',     unit: 'MΩ', min: 0.5, max: 1.0, hardMin: 0.05, hardMax: 6, display: v => v.toFixed(2) + ' MΩ' },
        ];
        // Generate 3 rounds: randomise each as in-range (PASS expected) or out-of-range (REJECT expected)
        const sequence = rounds.map(r => {
            const shouldBeGood = Math.random() < 0.55;
            let reading;
            if (shouldBeGood) reading = r.min + Math.random() * (r.max - r.min);
            else {
                const low = Math.random() < 0.5;
                if (low) reading = r.hardMin + Math.random() * Math.max(0, r.min - r.hardMin) * 0.8;
                else reading = r.max + Math.random() * (r.hardMax - r.max) * 0.8;
            }
            return { ...r, reading, expectedPass: shouldBeGood };
        });
        let roundIdx = 0;
        let correctCount = 0;
        let wrongCount = 0;

        body.innerHTML = `
            <div class="esd-mission">
                <div class="esd-meter-wrap">
                    <canvas class="esd-meter" width="340" height="200"></canvas>
                    <div class="esd-readout">
                        <div class="esd-device-label">Device: <span class="esd-device">—</span></div>
                        <div class="esd-reading">—</div>
                        <div class="esd-spec">Spec: <span class="esd-spec-val">—</span></div>
                    </div>
                </div>
                <div class="esd-panel">
                    <div class="esd-progress">Round <span class="esd-round">1</span> / ${sequence.length}</div>
                    <div class="esd-instr">Judge each reading. A <em>good</em> device should be <strong>PASS</strong>. A device outside spec must be <strong>REJECTED</strong> and re-tested.</div>
                    <div class="esd-btns">
                        <button class="esd-btn esd-pass">✓ Pass</button>
                        <button class="esd-btn esd-reject">✗ Reject &amp; Retest</button>
                    </div>
                    <div class="esd-log"></div>
                </div>
            </div>
        `;

        const canvas = body.querySelector('.esd-meter');
        const ctx = canvas.getContext('2d');
        const deviceEl = body.querySelector('.esd-device');
        const readingEl = body.querySelector('.esd-reading');
        const specEl = body.querySelector('.esd-spec-val');
        const roundEl = body.querySelector('.esd-round');
        const log = body.querySelector('.esd-log');
        const passBtn = body.querySelector('.esd-pass');
        const rejectBtn = body.querySelector('.esd-reject');

        function drawMeter(value, round) {
            const w = canvas.width, h = canvas.height;
            ctx.clearRect(0, 0, w, h);
            // Bezel
            const cx = w / 2, cy = h * 0.92, r = h * 0.78;
            const g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, '#1a2234'); g.addColorStop(1, '#0a1020');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            // Dial face
            ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0); ctx.closePath();
            const fg = ctx.createRadialGradient(cx, cy - 20, 10, cx, cy, r);
            fg.addColorStop(0, '#e8e4cf'); fg.addColorStop(1, '#bfb89c');
            ctx.fillStyle = fg; ctx.fill();
            ctx.strokeStyle = '#3a3528'; ctx.lineWidth = 2; ctx.stroke();
            // Green good-band arc
            const start = Math.PI + Math.PI * (round.min - round.hardMin) / (round.hardMax - round.hardMin);
            const end   = Math.PI + Math.PI * (round.max - round.hardMin) / (round.hardMax - round.hardMin);
            ctx.beginPath(); ctx.arc(cx, cy, r - 6, start, end); ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(62, 207, 113, 0.85)'; ctx.stroke();
            // Tick marks
            for (let i = 0; i <= 10; i++) {
                const a = Math.PI + (Math.PI * i) / 10;
                const x1 = cx + Math.cos(a) * (r - 14), y1 = cy + Math.sin(a) * (r - 14);
                const x2 = cx + Math.cos(a) * (r - 4),  y2 = cy + Math.sin(a) * (r - 4);
                ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
                ctx.strokeStyle = '#2a2519'; ctx.lineWidth = i % 5 === 0 ? 2 : 1; ctx.stroke();
            }
            // Needle
            const clamped = Math.max(round.hardMin, Math.min(round.hardMax, value));
            const a = Math.PI + Math.PI * (clamped - round.hardMin) / (round.hardMax - round.hardMin);
            ctx.save(); ctx.translate(cx, cy); ctx.rotate(a + Math.PI);
            ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(0, -(r - 20)); ctx.lineTo(6, 0); ctx.closePath();
            ctx.fillStyle = '#c72c2c'; ctx.fill();
            ctx.restore();
            ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fillStyle = '#1c1511'; ctx.fill();
            // Label
            ctx.fillStyle = '#3a3528'; ctx.font = '10px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
            ctx.fillText('ESD SAFETY METER', cx, h - 8);
        }

        function animateNeedle(round) {
            const start = round.hardMin + Math.random() * (round.hardMax - round.hardMin);
            let cur = start, t = 0;
            const target = round.reading;
            const dur = 18;
            const anim = setInterval(() => {
                t++;
                cur = start + (target - start) * (1 - Math.pow(1 - t / dur, 3));
                drawMeter(cur, round);
                if (t >= dur) { clearInterval(anim); drawMeter(target, round); }
            }, 30);
        }

        function loadRound() {
            if (roundIdx >= sequence.length) return finish();
            const r = sequence[roundIdx];
            deviceEl.textContent = r.device;
            readingEl.textContent = r.display(r.reading);
            specEl.textContent = `${r.display(r.min).replace(r.unit, '').trim()} – ${r.display(r.max)}`;
            roundEl.textContent = roundIdx + 1;
            animateNeedle(r);
            passBtn.disabled = false; rejectBtn.disabled = false;
        }

        function judge(chosePass) {
            const r = sequence[roundIdx];
            const correct = (chosePass === r.expectedPass);
            const line = document.createElement('div');
            line.className = 'esd-log-line ' + (correct ? 'ok' : 'bad');
            line.innerHTML = correct
                ? `✓ ${r.device}: ${r.display(r.reading)} → correct ${chosePass ? 'PASS' : 'REJECT'}`
                : `✗ ${r.device}: ${r.display(r.reading)} → you ${chosePass ? 'passed a bad' : 'rejected a good'} device`;
            log.appendChild(line);
            if (correct) correctCount++; else wrongCount++;
            passBtn.disabled = true; rejectBtn.disabled = true;
            roundIdx++;
            setTimeout(loadRound, 600);
        }

        function finish() {
            const score = Math.max(0, Math.round((correctCount / sequence.length) * 100 - wrongCount * 10));
            const passed = wrongCount === 0 && correctCount === sequence.length;
            const summary = document.createElement('div');
            summary.className = 'esd-summary';
            summary.innerHTML = `
                <div class="esd-summary-score" style="color:${barColor(score)}">${score}</div>
                <div class="esd-summary-label">${correctCount}/${sequence.length} correct · ${wrongCount} wrong judgement${wrongCount === 1 ? '' : 's'}</div>
                <button class="btn btn-primary esd-retry">Retry Mission</button>
                <button class="btn btn-success esd-submit">Submit Score</button>
            `;
            body.querySelector('.esd-panel').appendChild(summary);
            summary.querySelector('.esd-retry').addEventListener('click', () => {
                resetMission(m.id);
            });
            summary.querySelector('.esd-submit').addEventListener('click', () => {
                completeMission(m.id, score, passed);
            });
        }

        passBtn.addEventListener('click', () => judge(true));
        rejectBtn.addEventListener('click', () => judge(false));

        if (state.done) {
            // Already completed — show summary
            body.querySelector('.esd-panel').innerHTML += `
                <div class="esd-summary">
                    <div class="esd-summary-score" style="color:${barColor(state.score)}">${state.score}</div>
                    <div class="esd-summary-label">Completed · click Retry to improve</div>
                    <button class="btn btn-primary esd-retry">Retry Mission</button>
                </div>
            `;
            body.querySelector('.esd-retry').addEventListener('click', () => resetMission(m.id));
            passBtn.disabled = true; rejectBtn.disabled = true;
            drawMeter(sequence[0].reading, sequence[0]);
        } else {
            loadRound();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MISSION 2 — Kit & BOM Verification (Match & Reject)
    // ─ 4 BOM lines, 6 bins. 4 bins match correctly; 2 are wrong-rev or
    //   wrong-qty. Operator clicks a bin to select, then clicks the correct
    //   BOM row or the REJECT tray. False-accepts count hard against score.
    // ═══════════════════════════════════════════════════════════════════════
    function renderKitMission(body, m) {
        const state = missionState[m.id];
        // BOM (source of truth)
        const bom = [
            { id: 'A', pn: 'SOC-A19-3N', rev: 'C2', qty: 1, name: 'A19 Logic Board' },
            { id: 'B', pn: 'LIP-3561',   rev: 'B',  qty: 1, name: 'Battery Pack 3561 mAh' },
            { id: 'C', pn: 'CAM-IMX903', rev: 'D',  qty: 2, name: '48 MP Camera Module' },
            { id: 'D', pn: 'DISP-6R1',   rev: 'A3', qty: 1, name: 'Super Retina XDR Panel' },
        ];
        // Bins — some correct, two deliberately wrong (shuffled positions)
        const bins = [
            { id: 1, pn: 'SOC-A19-3N', rev: 'C2', qty: 1, expected: 'A' },
            { id: 2, pn: 'LIP-3561',   rev: 'B',  qty: 1, expected: 'B' },
            { id: 3, pn: 'CAM-IMX903', rev: 'C',  qty: 2, expected: 'REJECT', reason: 'wrong revision (C vs BOM D)' },
            { id: 4, pn: 'DISP-6R1',   rev: 'A3', qty: 1, expected: 'D' },
            { id: 5, pn: 'CAM-IMX903', rev: 'D',  qty: 2, expected: 'C' },
            { id: 6, pn: 'LIP-3561',   rev: 'B',  qty: 2, expected: 'REJECT', reason: 'wrong qty (2 vs BOM 1)' },
        ].sort(() => Math.random() - 0.5);

        let selected = null;
        const placed = {}; // binId -> slotId

        body.innerHTML = `
            <div class="kit-mission">
                <div class="kit-bom">
                    <div class="kit-section-label">Bill of Materials (Source of Truth)</div>
                    <table class="kit-bom-tbl">
                        <thead><tr><th>Slot</th><th>Part Number</th><th>Rev</th><th>Qty</th><th>Description</th></tr></thead>
                        <tbody>${bom.map(b => `
                            <tr class="kit-slot" data-slot="${b.id}">
                                <td class="kit-slot-id">${b.id}</td>
                                <td class="kit-pn">${b.pn}</td>
                                <td>${b.rev}</td>
                                <td>${b.qty}</td>
                                <td class="kit-name">${b.name}</td>
                            </tr>`).join('')}
                            <tr class="kit-slot kit-reject" data-slot="REJECT">
                                <td class="kit-slot-id">⊘</td>
                                <td colspan="4" class="kit-reject-cell">REJECT TRAY · use for mismatched bins</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="kit-bins">
                    <div class="kit-section-label">Incoming Bins · click to select, then click destination slot</div>
                    <div class="kit-bin-grid"></div>
                </div>
                <div class="kit-actions">
                    <button class="btn btn-primary kit-submit" disabled>Submit Assignment</button>
                </div>
            </div>
        `;

        const grid = body.querySelector('.kit-bin-grid');
        bins.forEach(bin => {
            const el = document.createElement('div');
            el.className = 'kit-bin';
            el.dataset.bin = bin.id;
            el.innerHTML = `
                <div class="kit-bin-head">BIN ${bin.id}</div>
                <div class="kit-bin-pn">${bin.pn}</div>
                <div class="kit-bin-meta">Rev ${bin.rev} · Qty ${bin.qty}</div>
            `;
            el.addEventListener('click', () => {
                if (placed[bin.id]) return;
                selected = selected === bin.id ? null : bin.id;
                updateSel();
            });
            grid.appendChild(el);
        });

        function updateSel() {
            body.querySelectorAll('.kit-bin').forEach(b =>
                b.classList.toggle('selected', parseInt(b.dataset.bin, 10) === selected));
            body.querySelectorAll('.kit-slot').forEach(s =>
                s.classList.toggle('targetable', selected !== null && !Object.values(placed).includes(s.dataset.slot)));
        }

        body.querySelectorAll('.kit-slot').forEach(slot => {
            slot.addEventListener('click', () => {
                if (selected === null) return;
                const slotId = slot.dataset.slot;
                // Only one bin per BOM slot; REJECT can hold many
                if (slotId !== 'REJECT' && Object.values(placed).includes(slotId)) return;
                placed[selected] = slotId;
                const binEl = body.querySelector(`.kit-bin[data-bin="${selected}"]`);
                binEl.classList.add('placed');
                binEl.querySelector('.kit-bin-head').textContent = `→ ${slotId}`;
                selected = null;
                updateSel();
                updateSubmit();
            });
        });

        const submit = body.querySelector('.kit-submit');
        function updateSubmit() {
            submit.disabled = Object.keys(placed).length !== bins.length;
        }

        submit.addEventListener('click', () => {
            let correct = 0, falseAccept = 0, wrongReject = 0;
            const results = [];
            bins.forEach(bin => {
                const chosen = placed[bin.id] || null;
                const ok = chosen === bin.expected;
                if (ok) correct++;
                else if (bin.expected === 'REJECT') falseAccept++;
                else wrongReject++;
                results.push({ bin, chosen, ok });
            });
            const raw = (correct / bins.length) * 100;
            const score = Math.max(0, Math.round(raw - falseAccept * 25 - wrongReject * 10));
            const passed = falseAccept === 0 && correct === bins.length;
            showKitSummary(body, m, { correct, total: bins.length, falseAccept, wrongReject, score, passed, results });
        });

        if (state.done) {
            body.querySelector('.kit-actions').innerHTML = `
                <div class="esd-summary">
                    <div class="esd-summary-score" style="color:${barColor(state.score)}">${state.score}</div>
                    <div class="esd-summary-label">Completed · retry to improve</div>
                    <button class="btn btn-primary kit-retry">Retry Mission</button>
                </div>
            `;
            body.querySelector('.kit-retry').addEventListener('click', () => resetMission(m.id));
            body.querySelectorAll('.kit-bin').forEach(b => b.style.pointerEvents = 'none');
        }
    }

    function showKitSummary(body, m, r) {
        const actions = body.querySelector('.kit-actions');
        actions.innerHTML = `
            <div class="kit-summary">
                <div class="kit-summary-row">
                    <div class="esd-summary-score" style="color:${barColor(r.score)}">${r.score}</div>
                    <div class="kit-summary-stats">
                        <div>Correct: <strong>${r.correct}/${r.total}</strong></div>
                        <div>False-accepts (critical): <strong class="${r.falseAccept ? 'bad' : 'ok'}">${r.falseAccept}</strong></div>
                        <div>Wrong rejects: <strong class="${r.wrongReject ? 'warn' : 'ok'}">${r.wrongReject}</strong></div>
                    </div>
                </div>
                <div class="kit-summary-list">
                    ${r.results.map(x => `
                        <div class="kit-result-line ${x.ok ? 'ok' : 'bad'}">
                            ${x.ok ? '✓' : '✗'} Bin ${x.bin.id} (${x.bin.pn} · Rev ${x.bin.rev} · Qty ${x.bin.qty})
                            → ${x.chosen} ${x.ok ? '' : `<em>(should be ${x.bin.expected}${x.bin.reason ? ' — ' + x.bin.reason : ''})</em>`}
                        </div>
                    `).join('')}
                </div>
                <div class="kit-summary-btns">
                    <button class="btn btn-primary kit-retry">Retry</button>
                    <button class="btn btn-success kit-submit-final">Submit Score</button>
                </div>
            </div>
        `;
        actions.querySelector('.kit-retry').addEventListener('click', () => resetMission(m.id));
        actions.querySelector('.kit-submit-final').addEventListener('click', () => completeMission(m.id, r.score, r.passed));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MISSION 3 — MSD Moisture Decision
    // ─ Show a Humidity Indicator Card (3 dots: 10%, 20%, 30%) + floor-exposure
    //   hours. Operator picks disposition: USE / BAKE 24h / SCRAP. Rules (MSL 3):
    //     · Any 30% dot pink  → SCRAP
    //     · 20% dot pink OR exposure > 168h → BAKE
    //     · All blue AND exposure ≤ 168h → USE
    //   3 random scenarios; wrong disposition = hard fail on that round.
    // ═══════════════════════════════════════════════════════════════════════
    function renderMsdMission(body, m) {
        const state = missionState[m.id];
        const scenarios = [1, 2, 3].map(() => randomMsdScenario());
        let idx = 0;
        let correct = 0;

        body.innerHTML = `
            <div class="msd-mission">
                <div class="msd-scene">
                    <canvas class="msd-hic" width="340" height="220"></canvas>
                    <div class="msd-log-panel">
                        <div class="msd-label">Exposure Log</div>
                        <div class="msd-exposure">—</div>
                        <div class="msd-label">MSL Rating</div>
                        <div class="msd-msl">Level 3 · 168 h max floor life</div>
                        <div class="msd-label">Round</div>
                        <div class="msd-round">1 / ${scenarios.length}</div>
                    </div>
                </div>
                <div class="msd-decision">
                    <div class="msd-question">Disposition?</div>
                    <div class="msd-btns">
                        <button class="msd-btn use" data-v="USE">✓ USE<br><small>proceed to line</small></button>
                        <button class="msd-btn bake" data-v="BAKE">🔥 BAKE 24 h<br><small>reset floor life</small></button>
                        <button class="msd-btn scrap" data-v="SCRAP">⊘ SCRAP<br><small>quarantine</small></button>
                    </div>
                    <div class="msd-log"></div>
                </div>
            </div>
        `;

        const canvas = body.querySelector('.msd-hic');
        const ctx = canvas.getContext('2d');
        const expoEl = body.querySelector('.msd-exposure');
        const roundEl = body.querySelector('.msd-round');
        const log = body.querySelector('.msd-log');

        function drawHic(s) {
            const w = canvas.width, h = canvas.height;
            ctx.clearRect(0, 0, w, h);
            // Card
            ctx.fillStyle = '#f4ead4';
            roundRectPath(ctx, 30, 30, w - 60, h - 60, 10); ctx.fill();
            ctx.strokeStyle = '#8a7b4d'; ctx.lineWidth = 2; ctx.stroke();
            // Header
            ctx.fillStyle = '#2a2519';
            ctx.font = 'bold 13px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
            ctx.fillText('HUMIDITY INDICATOR CARD', w / 2, 56);
            ctx.font = '9px "JetBrains Mono", monospace';
            ctx.fillText('IF PINK, DRY BEFORE USE', w / 2, 72);
            // 3 dots
            const labels = ['10%', '20%', '30%'];
            const dotY = h / 2 + 15;
            const dotX = [w / 2 - 80, w / 2, w / 2 + 80];
            for (let i = 0; i < 3; i++) {
                const pink = s.dots[i];
                const g = ctx.createRadialGradient(dotX[i] - 5, dotY - 5, 3, dotX[i], dotY, 28);
                if (pink) { g.addColorStop(0, '#ffb0c8'); g.addColorStop(1, '#c83870'); }
                else      { g.addColorStop(0, '#9cc8f0'); g.addColorStop(1, '#2860a0'); }
                ctx.beginPath(); ctx.arc(dotX[i], dotY, 26, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
                ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1.5; ctx.stroke();
                ctx.fillStyle = '#2a2519'; ctx.font = 'bold 12px "JetBrains Mono", monospace';
                ctx.fillText(labels[i], dotX[i], dotY + 50);
            }
        }

        function loadRound() {
            if (idx >= scenarios.length) return finish();
            const s = scenarios[idx];
            drawHic(s);
            expoEl.textContent = `${s.hours} h on floor`;
            expoEl.style.color = s.hours > 168 ? '#ff9090' : '#c8d0dc';
            roundEl.textContent = `${idx + 1} / ${scenarios.length}`;
            body.querySelectorAll('.msd-btn').forEach(b => { b.disabled = false; b.classList.remove('picked'); });
        }

        function correctAnswer(s) {
            if (s.dots[2]) return 'SCRAP';
            if (s.dots[1] || s.hours > 168) return 'BAKE';
            return 'USE';
        }

        function judge(choice) {
            const s = scenarios[idx];
            const ans = correctAnswer(s);
            const ok = choice === ans;
            if (ok) correct++;
            const line = document.createElement('div');
            line.className = 'msd-log-line ' + (ok ? 'ok' : 'bad');
            const why = s.dots[2] ? '30% dot pink → critical moisture' :
                        s.dots[1] ? '20% dot pink → bake required' :
                        s.hours > 168 ? `${s.hours}h exceeds 168h floor life → bake required` :
                                        'all blue and within floor life → safe to use';
            line.innerHTML = ok
                ? `✓ Round ${idx + 1}: ${ans} — ${why}`
                : `✗ Round ${idx + 1}: you picked ${choice}, correct is ${ans} — ${why}`;
            log.appendChild(line);
            body.querySelectorAll('.msd-btn').forEach(b => b.disabled = true);
            idx++;
            setTimeout(loadRound, 700);
        }

        function finish() {
            const score = Math.round((correct / scenarios.length) * 100);
            const passed = correct === scenarios.length;
            const wrap = document.createElement('div');
            wrap.className = 'esd-summary';
            wrap.innerHTML = `
                <div class="esd-summary-score" style="color:${barColor(score)}">${score}</div>
                <div class="esd-summary-label">${correct}/${scenarios.length} correct dispositions</div>
                <button class="btn btn-primary msd-retry">Retry</button>
                <button class="btn btn-success msd-submit">Submit Score</button>
            `;
            body.querySelector('.msd-decision').appendChild(wrap);
            wrap.querySelector('.msd-retry').addEventListener('click', () => resetMission(m.id));
            wrap.querySelector('.msd-submit').addEventListener('click', () => completeMission(m.id, score, passed));
        }

        body.querySelectorAll('.msd-btn').forEach(b => {
            b.addEventListener('click', () => judge(b.dataset.v));
        });

        if (state.done) {
            drawHic(scenarios[0]);
            expoEl.textContent = `${scenarios[0].hours} h on floor`;
            body.querySelectorAll('.msd-btn').forEach(b => b.disabled = true);
            const wrap = document.createElement('div');
            wrap.className = 'esd-summary';
            wrap.innerHTML = `
                <div class="esd-summary-score" style="color:${barColor(state.score)}">${state.score}</div>
                <div class="esd-summary-label">Completed · retry to improve</div>
                <button class="btn btn-primary msd-retry">Retry Mission</button>
            `;
            body.querySelector('.msd-decision').appendChild(wrap);
            wrap.querySelector('.msd-retry').addEventListener('click', () => resetMission(m.id));
        } else {
            loadRound();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MISSION — 5S Workstation Audit (Spot-the-Violation)
    // ─ A top-down workstation illustration with 8 hotspots. 4–6 are 5S
    //   violations (food, stray tools, missing ESD strap, unlabelled bin,
    //   tripping cable, expired HIC). Operator taps every violation they
    //   spot, then hits "Submit Audit". Missed violations are critical;
    //   false reports are soft penalties. Pass requires every real
    //   violation caught and at most one false report.
    // ═══════════════════════════════════════════════════════════════════════
    function renderFiveSMission(body, m) {
        const state = missionState[m.id];
        // Each hotspot: {id, x, y, w, h, label, violation, reason}
        // Coordinates are normalised to the 640x360 canvas below.
        const ALL_SPOTS = [
            { id: 'food',     x: 40,  y: 40,  w: 60, h: 48, label: 'Tea cup on bench',      violation: true,  reason: 'Food/drink on an ESD workbench — contamination + spill risk (Sort + Shine)' },
            { id: 'stray',    x: 520, y: 36,  w: 70, h: 50, label: 'Stray screwdriver',     violation: true,  reason: 'Tool not in shadow board — loss of tool control (Set in Order)' },
            { id: 'cable',    x: 250, y: 290, w: 120,h: 42, label: 'Loose power cable',     violation: true,  reason: 'Cable across walkway — tripping hazard (Safety / Shine)' },
            { id: 'nobin',    x: 150, y: 220, w: 64, h: 58, label: 'Unlabelled scrap bin',  violation: true,  reason: 'Bin not labelled with part family — traceability loss (Standardize)' },
            { id: 'wrist',    x: 440, y: 210, w: 70, h: 60, label: 'Wrist strap unplugged', violation: true,  reason: 'ESD wrist strap coiled on bench, not worn (PC1.1 + Sustain)' },
            { id: 'hic',      x: 360, y: 130, w: 60, h: 46, label: 'Expired MSD bag',       violation: true,  reason: 'Moisture-sensitive component bag past exposure limit (PC1.8)' },
            { id: 'torque',   x: 60,  y: 200, w: 70, h: 60, label: 'Torque driver in cradle',violation: false, reason: 'Correctly stored in calibrated cradle' },
            { id: 'bom',      x: 260, y: 60,  w: 70, h: 50, label: 'Travel card posted',    violation: false, reason: 'Travel card visible at station — correct' },
            { id: 'mat',      x: 560, y: 300, w: 60, h: 40, label: 'ESD mat ground lead',   violation: false, reason: 'Grounded correctly via mat lug' },
            { id: 'parts',    x: 60,  y: 120, w: 60, h: 52, label: 'Kitted parts tray',     violation: false, reason: 'Tray matches BOM, labelled correctly' },
        ];
        // Shuffle which are violations: pick 5 violations + 3 non-violations from pools
        const violations = ALL_SPOTS.filter(s => s.violation).sort(() => Math.random() - 0.5).slice(0, 5);
        const nonViol    = ALL_SPOTS.filter(s => !s.violation).sort(() => Math.random() - 0.5).slice(0, 3);
        const spots = [...violations, ...nonViol].sort(() => Math.random() - 0.5);
        const flagged = new Set(); // spot.id

        body.innerHTML = `
            <div class="fives-mission">
                <div class="fives-scene">
                    <canvas class="fives-canvas" width="640" height="360"></canvas>
                    <div class="fives-hotspots"></div>
                </div>
                <div class="fives-panel">
                    <div class="fives-legend">
                        <div><strong>Seiri</strong> Sort · <strong>Seiton</strong> Set in Order · <strong>Seiso</strong> Shine · <strong>Seiketsu</strong> Standardize · <strong>Shitsuke</strong> Sustain</div>
                    </div>
                    <div class="fives-instr">Tap every 5S violation you can see on the bench. Clicking a non-violation is a false report. Submit when you're confident.</div>
                    <div class="fives-counter">Flagged: <span class="fives-count">0</span></div>
                    <button class="btn btn-primary fives-submit">Submit Audit</button>
                    <div class="fives-log"></div>
                </div>
            </div>
        `;

        const canvas = body.querySelector('.fives-canvas');
        const ctx = canvas.getContext('2d');
        const hostHotspots = body.querySelector('.fives-hotspots');
        const countEl = body.querySelector('.fives-count');
        const log = body.querySelector('.fives-log');
        const submitBtn = body.querySelector('.fives-submit');

        drawWorkstation();

        function drawWorkstation() {
            const w = canvas.width, h = canvas.height;
            // Floor
            const g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, '#1b2434'); g.addColorStop(1, '#0b1220');
            ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
            // Bench top
            ctx.fillStyle = '#2c3b55';
            roundRectPath(ctx, 30, 100, w - 60, 180, 10); ctx.fill();
            ctx.strokeStyle = 'rgba(160,180,210,0.25)'; ctx.lineWidth = 1.5; ctx.stroke();
            // ESD mat
            ctx.fillStyle = '#0f3a2a'; roundRectPath(ctx, 160, 130, 320, 120, 6); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.04)';
            for (let i = 0; i < 20; i++) { ctx.fillRect(160, 140 + i * 6, 320, 1); }
            ctx.fillStyle = '#8fa0b8'; ctx.font = '9px "JetBrains Mono", monospace';
            ctx.fillText('ESD SAFE WORKSTATION · LINE 4 · STATION 02', 170, 122);
            // Shadow-board outline behind
            ctx.strokeStyle = 'rgba(200,220,255,0.15)'; ctx.setLineDash([4, 3]);
            ctx.strokeRect(500, 36, 110, 60); ctx.setLineDash([]);
            ctx.fillStyle = '#8fa0b8'; ctx.fillText('TOOL SHADOW BOARD', 506, 30);
            // Walkway hint
            ctx.fillStyle = 'rgba(255,180,0,0.08)';
            ctx.fillRect(0, 290, w, 10);
        }

        spots.forEach(s => {
            const el = document.createElement('button');
            el.type = 'button';
            el.className = 'fives-spot';
            el.style.left = (s.x / 640 * 100) + '%';
            el.style.top  = (s.y / 360 * 100) + '%';
            el.style.width  = (s.w / 640 * 100) + '%';
            el.style.height = (s.h / 360 * 100) + '%';
            el.innerHTML = `<span class="fs-label">${s.label}</span>`;
            el.addEventListener('click', () => {
                if (submitBtn.disabled) return;
                if (flagged.has(s.id)) { flagged.delete(s.id); el.classList.remove('flagged'); }
                else                   { flagged.add(s.id);    el.classList.add('flagged'); }
                countEl.textContent = flagged.size;
            });
            hostHotspots.appendChild(el);
        });

        submitBtn.addEventListener('click', () => {
            const truePositives = spots.filter(s => s.violation && flagged.has(s.id));
            const missed        = spots.filter(s => s.violation && !flagged.has(s.id));
            const falsePos      = spots.filter(s => !s.violation && flagged.has(s.id));
            const totalViol     = spots.filter(s => s.violation).length;
            const raw = (truePositives.length / totalViol) * 100;
            const score = Math.max(0, Math.round(raw - missed.length * 20 - falsePos.length * 12));
            const passed = missed.length === 0 && falsePos.length <= 1;
            // Reveal answers visually
            hostHotspots.querySelectorAll('.fives-spot').forEach((el, i) => {
                const s = spots[i];
                el.classList.remove('flagged');
                if (s.violation && flagged.has(s.id))      el.classList.add('tp');
                else if (s.violation && !flagged.has(s.id)) el.classList.add('fn');
                else if (!s.violation && flagged.has(s.id)) el.classList.add('fp');
                else                                        el.classList.add('tn');
                el.disabled = true;
            });
            submitBtn.disabled = true;
            [...missed.map(s => ({ s, tag: 'missed' })),
             ...falsePos.map(s => ({ s, tag: 'false' })),
             ...truePositives.map(s => ({ s, tag: 'ok' }))].forEach(({ s, tag }) => {
                const line = document.createElement('div');
                line.className = 'fives-log-line ' + (tag === 'ok' ? 'ok' : 'bad');
                const prefix = tag === 'ok' ? '✓ caught' : tag === 'missed' ? '✗ MISSED' : '✗ false report';
                line.innerHTML = `${prefix}: ${s.label} — ${s.reason}`;
                log.appendChild(line);
            });
            const wrap = document.createElement('div');
            wrap.className = 'esd-summary';
            wrap.innerHTML = `
                <div class="esd-summary-score" style="color:${barColor(score)}">${score}</div>
                <div class="esd-summary-label">${truePositives.length}/${totalViol} violations caught · ${falsePos.length} false report${falsePos.length === 1 ? '' : 's'}</div>
                <button class="btn btn-primary fives-retry">Retry Audit</button>
                <button class="btn btn-success fives-done">Submit Score</button>
            `;
            body.querySelector('.fives-panel').appendChild(wrap);
            wrap.querySelector('.fives-retry').addEventListener('click', () => resetMission(m.id));
            wrap.querySelector('.fives-done').addEventListener('click', () => completeMission(m.id, score, passed));
        });

        if (state.done) {
            hostHotspots.querySelectorAll('.fives-spot').forEach(el => el.disabled = true);
            submitBtn.disabled = true;
            const wrap = document.createElement('div');
            wrap.className = 'esd-summary';
            wrap.innerHTML = `
                <div class="esd-summary-score" style="color:${barColor(state.score)}">${state.score}</div>
                <div class="esd-summary-label">Completed · retry to improve</div>
                <button class="btn btn-primary fives-retry">Retry Audit</button>
            `;
            body.querySelector('.fives-panel').appendChild(wrap);
            wrap.querySelector('.fives-retry').addEventListener('click', () => resetMission(m.id));
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MISSION — Torque Driver Calibration (Dial-the-Needle)
    // ─ Three fasteners in sequence (frame M1.4 = 1.5 Nm, display = 0.8 Nm,
    //   battery bracket = 1.2 Nm). Operator drags a slider to set the driver.
    //   Needle animates to their setting. Must land inside the ±0.08 Nm
    //   green band and press "Calibrate". Three attempts per fastener; each
    //   over-torque is a hard penalty (cracks glass on the line).
    // ═══════════════════════════════════════════════════════════════════════
    function renderTorqueMission(body, m) {
        const state = missionState[m.id];
        const fasteners = [
            { name: 'Titanium Frame M1.4', target: 1.5, tol: 0.08, min: 0.4, max: 2.4, hint: 'Frame screws need firm seating — consult the spec card.' },
            { name: 'Display Bracket',      target: 0.8, tol: 0.08, min: 0.4, max: 2.4, hint: 'Display ribbon is delicate — under-torque is safer than over-torque.' },
            { name: 'Battery Pull-Tab',     target: 1.2, tol: 0.08, min: 0.4, max: 2.4, hint: 'Battery bracket must hold under vibration but not crush the pouch.' },
        ];
        let idx = 0;
        let tries = 0;
        let hits = 0;
        let overTorqueHard = 0;

        body.innerHTML = `
            <div class="tcal-mission">
                <div class="tcal-stage">
                    <canvas class="tcal-dial" width="360" height="240"></canvas>
                    <div class="tcal-readout">
                        <div class="tcal-row"><span class="tcal-lbl">Fastener</span><span class="tcal-fast">—</span></div>
                        <div class="tcal-row"><span class="tcal-lbl">Spec</span><span class="tcal-spec">—</span></div>
                        <div class="tcal-row"><span class="tcal-lbl">Current</span><span class="tcal-cur">—</span></div>
                        <div class="tcal-row"><span class="tcal-lbl">Round</span><span class="tcal-round">1 / ${fasteners.length}</span></div>
                        <div class="tcal-hint tcal-hint-text">—</div>
                    </div>
                </div>
                <div class="tcal-controls">
                    <label class="tcal-slider-label">Driver setting (Nm)</label>
                    <input type="range" class="tcal-slider" min="0.4" max="2.4" step="0.01" value="1.0">
                    <div class="tcal-btns">
                        <button class="btn btn-primary tcal-lock">Calibrate at <span class="tcal-lock-val">1.00</span> Nm</button>
                    </div>
                    <div class="tcal-log"></div>
                </div>
            </div>
        `;

        const canvas = body.querySelector('.tcal-dial');
        const ctx = canvas.getContext('2d');
        const slider = body.querySelector('.tcal-slider');
        const curEl = body.querySelector('.tcal-cur');
        const specEl = body.querySelector('.tcal-spec');
        const fastEl = body.querySelector('.tcal-fast');
        const roundEl = body.querySelector('.tcal-round');
        const hintEl = body.querySelector('.tcal-hint-text');
        const lockBtn = body.querySelector('.tcal-lock');
        const lockVal = body.querySelector('.tcal-lock-val');
        const log = body.querySelector('.tcal-log');

        function drawDial(value, f) {
            const w = canvas.width, h = canvas.height;
            const cx = w / 2, cy = h * 0.95, r = h * 0.82;
            ctx.clearRect(0, 0, w, h);
            const bg = ctx.createLinearGradient(0, 0, 0, h);
            bg.addColorStop(0, '#1a2234'); bg.addColorStop(1, '#0a1020');
            ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
            // Dial face
            ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0); ctx.closePath();
            const fg = ctx.createRadialGradient(cx, cy - 30, 10, cx, cy, r);
            fg.addColorStop(0, '#1a2f26'); fg.addColorStop(1, '#081812');
            ctx.fillStyle = fg; ctx.fill();
            ctx.strokeStyle = '#2a5040'; ctx.lineWidth = 2; ctx.stroke();
            // Red danger arc (over-torque zone)
            const overStart = Math.PI + Math.PI * (f.target + f.tol - f.min) / (f.max - f.min);
            ctx.beginPath(); ctx.arc(cx, cy, r - 8, overStart, Math.PI * 2);
            ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(255, 82, 82, 0.55)'; ctx.stroke();
            // Green good band
            const s = Math.PI + Math.PI * (f.target - f.tol - f.min) / (f.max - f.min);
            const e = Math.PI + Math.PI * (f.target + f.tol - f.min) / (f.max - f.min);
            ctx.beginPath(); ctx.arc(cx, cy, r - 8, s, e);
            ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(62, 207, 113, 0.9)'; ctx.stroke();
            // Amber approach
            const as = Math.PI + Math.PI * (f.target - f.tol * 3 - f.min) / (f.max - f.min);
            ctx.beginPath(); ctx.arc(cx, cy, r - 8, as, s);
            ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(255,180,60,0.55)'; ctx.stroke();
            // Ticks + labels
            for (let i = 0; i <= 10; i++) {
                const a = Math.PI + (Math.PI * i) / 10;
                const x1 = cx + Math.cos(a) * (r - 20), y1 = cy + Math.sin(a) * (r - 20);
                const x2 = cx + Math.cos(a) * (r - 8),  y2 = cy + Math.sin(a) * (r - 8);
                ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
                ctx.strokeStyle = '#8fa0b8'; ctx.lineWidth = i % 5 === 0 ? 2 : 1; ctx.stroke();
                if (i % 2 === 0) {
                    const xn = cx + Math.cos(a) * (r - 36), yn = cy + Math.sin(a) * (r - 36);
                    const val = f.min + (f.max - f.min) * (i / 10);
                    ctx.fillStyle = '#c8d0dc'; ctx.font = '10px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
                    ctx.fillText(val.toFixed(1), xn, yn + 3);
                }
            }
            // Needle
            const v = Math.max(f.min, Math.min(f.max, value));
            const a = Math.PI + Math.PI * (v - f.min) / (f.max - f.min);
            ctx.save(); ctx.translate(cx, cy); ctx.rotate(a + Math.PI);
            ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(0, -(r - 24)); ctx.lineTo(5, 0); ctx.closePath();
            ctx.fillStyle = '#ffe16b'; ctx.fill();
            ctx.strokeStyle = '#3a2a00'; ctx.lineWidth = 1; ctx.stroke();
            ctx.restore();
            ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fillStyle = '#1c1511'; ctx.fill();
            ctx.fillStyle = '#8fa0b8'; ctx.font = '9px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
            ctx.fillText('DIGITAL TORQUE DRIVER · NM', cx, h - 6);
        }

        let animRAF = null, displayed = 0.4;
        function animateTo(target, f) {
            if (animRAF) cancelAnimationFrame(animRAF);
            const step = () => {
                displayed += (target - displayed) * 0.2;
                drawDial(displayed, f);
                if (Math.abs(displayed - target) > 0.002) animRAF = requestAnimationFrame(step);
                else { displayed = target; drawDial(displayed, f); }
            };
            step();
        }

        function loadFastener() {
            if (idx >= fasteners.length) return finish();
            const f = fasteners[idx];
            fastEl.textContent = f.name;
            specEl.textContent = `${f.target.toFixed(2)} Nm ± ${f.tol.toFixed(2)}`;
            roundEl.textContent = `${idx + 1} / ${fasteners.length}`;
            hintEl.textContent = f.hint;
            // Reset per-fastener attempt counter (critical — without this, leftover
            // tries from the previous fastener cause instant skip on first click)
            tries = 0;
            // Start the slider near the target ± a random offset so the user has
            // to fine-tune, but it's already in the right neighbourhood
            const startOffset = (Math.random() - 0.5) * 0.6;
            const startVal = Math.max(f.min, Math.min(f.max, f.target + startOffset));
            slider.value = startVal.toFixed(2);
            curEl.textContent = `${startVal.toFixed(2)} Nm`;
            lockVal.textContent = startVal.toFixed(2);
            lockBtn.disabled = false;
            animateTo(startVal, f);
        }

        slider.addEventListener('input', () => {
            const f = fasteners[idx];
            if (!f) return;
            curEl.textContent = `${(+slider.value).toFixed(2)} Nm`;
            lockVal.textContent = (+slider.value).toFixed(2);
            animateTo(+slider.value, f);
        });

        lockBtn.addEventListener('click', () => {
            const f = fasteners[idx];
            if (!f) return;
            const v = +slider.value;
            tries++;
            const delta = v - f.target;
            const inBand = Math.abs(delta) <= f.tol;
            const overHard = delta > f.tol * 2.5;
            const line = document.createElement('div');
            if (inBand) {
                hits++;
                line.className = 'tcal-log-line ok';
                line.innerHTML = `✓ ${f.name}: locked at ${v.toFixed(2)} Nm (target ${f.target.toFixed(2)})`;
                log.appendChild(line);
                idx++;
                setTimeout(loadFastener, 600);
            } else {
                if (overHard) overTorqueHard++;
                line.className = 'tcal-log-line bad';
                line.innerHTML = `✗ ${f.name}: ${v.toFixed(2)} Nm — ${delta > 0 ? 'OVER' : 'UNDER'} by ${Math.abs(delta).toFixed(2)} Nm${overHard ? ' · would crack the part' : ''}`;
                log.appendChild(line);
                if (tries >= 3) {
                    idx++;
                    setTimeout(loadFastener, 600);
                }
            }
        });

        function finish() {
            lockBtn.disabled = true;
            const raw = (hits / fasteners.length) * 100;
            const score = Math.max(0, Math.round(raw - overTorqueHard * 25));
            const passed = hits === fasteners.length && overTorqueHard === 0;
            const wrap = document.createElement('div');
            wrap.className = 'esd-summary';
            wrap.innerHTML = `
                <div class="esd-summary-score" style="color:${barColor(score)}">${score}</div>
                <div class="esd-summary-label">${hits}/${fasteners.length} calibrated · ${overTorqueHard} over-torque event${overTorqueHard === 1 ? '' : 's'}</div>
                <button class="btn btn-primary tcal-retry">Retry</button>
                <button class="btn btn-success tcal-submit">Submit Score</button>
            `;
            body.querySelector('.tcal-controls').appendChild(wrap);
            wrap.querySelector('.tcal-retry').addEventListener('click', () => resetMission(m.id));
            wrap.querySelector('.tcal-submit').addEventListener('click', () => completeMission(m.id, score, passed));
        }

        if (state.done) {
            drawDial(fasteners[0].target, fasteners[0]);
            fastEl.textContent = fasteners[0].name;
            specEl.textContent = `${fasteners[0].target.toFixed(2)} Nm ± ${fasteners[0].tol.toFixed(2)}`;
            lockBtn.disabled = true; slider.disabled = true;
            const wrap = document.createElement('div');
            wrap.className = 'esd-summary';
            wrap.innerHTML = `
                <div class="esd-summary-score" style="color:${barColor(state.score)}">${state.score}</div>
                <div class="esd-summary-label">Completed · retry to improve</div>
                <button class="btn btn-primary tcal-retry">Retry Mission</button>
            `;
            body.querySelector('.tcal-controls').appendChild(wrap);
            wrap.querySelector('.tcal-retry').addEventListener('click', () => resetMission(m.id));
        } else {
            loadFastener();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MISSION — JIG & Fixture Setup (Snap-Fit Alignment)
    // ─ Top-down jig with 4 corner pegs. Operator drags the phone chassis
    //   onto the jig; each corner shows a live distance-to-peg indicator.
    //   All four corners must be within ±6 px of nominal. Also a rotation
    //   slider must be within ±2°. Click "Lock Clamp" to submit. Score =
    //   alignment quality; fail if any peg is outside tolerance.
    // ═══════════════════════════════════════════════════════════════════════
    function renderJigMission(body, m) {
        const state = missionState[m.id];
        const TOL_POS = 6;    // px per corner
        const TOL_ROT = 2;    // degrees
        const JIG = { cx: 340, cy: 210, w: 220, h: 330 }; // nominal phone footprint inside jig
        let phone = { cx: 130, cy: 120, rot: -8 };         // start off-jig, tilted
        let dragging = false, dragOff = { x: 0, y: 0 };
        let locked = false;
        let attempts = 0;
        let bestScore = 0;

        body.innerHTML = `
            <div class="jig-mission">
                <div class="jig-stage">
                    <canvas class="jig-canvas" width="680" height="440"></canvas>
                </div>
                <div class="jig-panel">
                    <div class="jig-instr">
                        Drag the phone chassis onto the assembly jig. Line up all four corner pegs (green = in tolerance, red = out). When every corner is green, click <strong>Lock Clamp</strong>.
                    </div>
                    <div class="jig-rot">
                        <label>Rotation fine-tune</label>
                        <input type="range" class="jig-rot-slider" min="-15" max="15" step="0.1" value="-8">
                        <div class="jig-rot-val">-8.0°</div>
                    </div>
                    <div class="jig-corners">
                        <div class="jig-corner" data-k="tl">TL <span>—</span></div>
                        <div class="jig-corner" data-k="tr">TR <span>—</span></div>
                        <div class="jig-corner" data-k="bl">BL <span>—</span></div>
                        <div class="jig-corner" data-k="br">BR <span>—</span></div>
                    </div>
                    <button class="btn btn-primary jig-lock" disabled>Lock Clamp</button>
                    <div class="jig-log"></div>
                </div>
            </div>
        `;

        const canvas = body.querySelector('.jig-canvas');
        const ctx = canvas.getContext('2d');
        const slider = body.querySelector('.jig-rot-slider');
        const rotValEl = body.querySelector('.jig-rot-val');
        const lockBtn = body.querySelector('.jig-lock');
        const cornerEls = Array.from(body.querySelectorAll('.jig-corner'));
        const log = body.querySelector('.jig-log');

        function cornersOfPhone() {
            const { cx, cy, rot } = phone;
            const hw = JIG.w / 2, hh = JIG.h / 2;
            const rad = rot * Math.PI / 180;
            const cos = Math.cos(rad), sin = Math.sin(rad);
            const pts = [
                { x: -hw, y: -hh }, { x:  hw, y: -hh },
                { x: -hw, y:  hh }, { x:  hw, y:  hh },
            ];
            return pts.map(p => ({ x: cx + p.x * cos - p.y * sin, y: cy + p.x * sin + p.y * cos }));
        }
        function jigPegs() {
            const hw = JIG.w / 2, hh = JIG.h / 2;
            return [
                { x: JIG.cx - hw, y: JIG.cy - hh }, { x: JIG.cx + hw, y: JIG.cy - hh },
                { x: JIG.cx - hw, y: JIG.cy + hh }, { x: JIG.cx + hw, y: JIG.cy + hh },
            ];
        }

        function draw() {
            const w = canvas.width, h = canvas.height;
            ctx.clearRect(0, 0, w, h);
            // Bench
            const g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, '#1b2434'); g.addColorStop(1, '#0a1220');
            ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
            // Jig base plate
            ctx.fillStyle = '#2d3f5d';
            roundRectPath(ctx, JIG.cx - JIG.w / 2 - 30, JIG.cy - JIG.h / 2 - 30, JIG.w + 60, JIG.h + 60, 12); ctx.fill();
            ctx.strokeStyle = 'rgba(160,180,210,0.35)'; ctx.lineWidth = 2; ctx.stroke();
            // Nominal chassis outline (ghost)
            ctx.save();
            ctx.translate(JIG.cx, JIG.cy);
            ctx.strokeStyle = 'rgba(62,207,113,0.4)'; ctx.setLineDash([6, 4]); ctx.lineWidth = 1.5;
            roundRectPath(ctx, -JIG.w / 2, -JIG.h / 2, JIG.w, JIG.h, 18); ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
            // Pegs
            const pegs = jigPegs();
            const pc = cornersOfPhone();
            pegs.forEach((p, i) => {
                const d = Math.hypot(p.x - pc[i].x, p.y - pc[i].y);
                const ok = d <= TOL_POS;
                ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
                ctx.fillStyle = '#0a1220'; ctx.fill();
                ctx.strokeStyle = ok ? '#4ade80' : '#f87171'; ctx.lineWidth = 3; ctx.stroke();
                ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = ok ? '#4ade80' : '#f87171'; ctx.fill();
            });
            // Phone chassis (draggable)
            ctx.save();
            ctx.translate(phone.cx, phone.cy);
            ctx.rotate(phone.rot * Math.PI / 180);
            const bodyGrad = ctx.createLinearGradient(-JIG.w / 2, 0, JIG.w / 2, 0);
            bodyGrad.addColorStop(0, '#2a3850'); bodyGrad.addColorStop(0.5, '#3a4a68'); bodyGrad.addColorStop(1, '#2a3850');
            ctx.fillStyle = bodyGrad;
            roundRectPath(ctx, -JIG.w / 2, -JIG.h / 2, JIG.w, JIG.h, 18); ctx.fill();
            ctx.strokeStyle = 'rgba(200,215,240,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
            // Screen area
            ctx.fillStyle = '#050a14';
            roundRectPath(ctx, -JIG.w / 2 + 8, -JIG.h / 2 + 12, JIG.w - 16, JIG.h - 24, 12); ctx.fill();
            // Dynamic island
            ctx.fillStyle = '#0a0a0a';
            roundRectPath(ctx, -22, -JIG.h / 2 + 18, 44, 10, 5); ctx.fill();
            ctx.restore();
            // Update corner indicators
            const deltas = pegs.map((p, i) => Math.hypot(p.x - pc[i].x, p.y - pc[i].y));
            const labels = ['tl', 'tr', 'bl', 'br'];
            cornerEls.forEach((el, i) => {
                const d = deltas[i];
                const ok = d <= TOL_POS;
                el.classList.toggle('ok', ok);
                el.classList.toggle('bad', !ok);
                el.querySelector('span').textContent = `Δ ${d.toFixed(1)} px`;
            });
            const rotOk = Math.abs(phone.rot) <= TOL_ROT;
            const allOk = deltas.every(d => d <= TOL_POS) && rotOk;
            lockBtn.disabled = !allOk || locked;
            return { deltas, rotOk, allOk };
        }

        // Drag handlers
        canvas.addEventListener('mousedown', (e) => {
            if (locked) return;
            const rect = canvas.getBoundingClientRect();
            const mx = (e.clientX - rect.left) * canvas.width / rect.width;
            const my = (e.clientY - rect.top)  * canvas.height / rect.height;
            const rad = -phone.rot * Math.PI / 180;
            const lx = (mx - phone.cx) * Math.cos(rad) - (my - phone.cy) * Math.sin(rad);
            const ly = (mx - phone.cx) * Math.sin(rad) + (my - phone.cy) * Math.cos(rad);
            if (Math.abs(lx) <= JIG.w / 2 && Math.abs(ly) <= JIG.h / 2) {
                dragging = true;
                dragOff = { x: mx - phone.cx, y: my - phone.cy };
            }
        });
        canvas.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            const rect = canvas.getBoundingClientRect();
            const mx = (e.clientX - rect.left) * canvas.width / rect.width;
            const my = (e.clientY - rect.top)  * canvas.height / rect.height;
            phone.cx = mx - dragOff.x;
            phone.cy = my - dragOff.y;
            draw();
        });
        window.addEventListener('mouseup', () => { dragging = false; });

        slider.addEventListener('input', () => {
            phone.rot = parseFloat(slider.value);
            rotValEl.textContent = phone.rot.toFixed(1) + '°';
            draw();
        });

        lockBtn.addEventListener('click', () => {
            if (locked) return;
            locked = true;
            attempts++;
            const { deltas } = draw();
            const maxDelta = Math.max(...deltas);
            const rotErr = Math.abs(phone.rot);
            // Score: 100 when perfect, drops with residual error
            const posScore = Math.max(0, 100 - (maxDelta / TOL_POS) * 40);
            const rotScore = Math.max(0, 100 - (rotErr / TOL_ROT) * 40);
            const score = Math.max(0, Math.round((posScore * 0.7 + rotScore * 0.3) - (attempts - 1) * 5));
            const passed = maxDelta <= TOL_POS && rotErr <= TOL_ROT;
            bestScore = Math.max(bestScore, score);
            const line = document.createElement('div');
            line.className = 'tcal-log-line ' + (passed ? 'ok' : 'bad');
            line.innerHTML = `${passed ? '✓' : '✗'} Attempt ${attempts}: max corner Δ ${maxDelta.toFixed(1)} px · rotation ${rotErr.toFixed(1)}°`;
            log.appendChild(line);
            const wrap = document.createElement('div');
            wrap.className = 'esd-summary';
            wrap.innerHTML = `
                <div class="esd-summary-score" style="color:${barColor(score)}">${score}</div>
                <div class="esd-summary-label">${passed ? 'Jig clamped cleanly' : 'Jig rejected — realign'}</div>
                <button class="btn btn-primary jig-retry">Retry</button>
                <button class="btn btn-success jig-submit">Submit Score</button>
            `;
            body.querySelector('.jig-panel').appendChild(wrap);
            wrap.querySelector('.jig-retry').addEventListener('click', () => resetMission(m.id));
            wrap.querySelector('.jig-submit').addEventListener('click', () => completeMission(m.id, score, passed));
        });

        if (state.done) {
            // Show clamped ideal state
            phone = { cx: JIG.cx, cy: JIG.cy, rot: 0 };
            slider.value = 0; slider.disabled = true;
            rotValEl.textContent = '0.0°';
            draw();
            locked = true;
            const wrap = document.createElement('div');
            wrap.className = 'esd-summary';
            wrap.innerHTML = `
                <div class="esd-summary-score" style="color:${barColor(state.score)}">${state.score}</div>
                <div class="esd-summary-label">Completed · retry to improve</div>
                <button class="btn btn-primary jig-retry">Retry Mission</button>
            `;
            body.querySelector('.jig-panel').appendChild(wrap);
            wrap.querySelector('.jig-retry').addEventListener('click', () => resetMission(m.id));
        } else {
            draw();
        }
    }

    function randomMsdScenario() {
        // Randomise dots and hours so each scenario exercises a different rule.
        const kind = Math.floor(Math.random() * 4);
        if (kind === 0) return { dots: [false, false, false], hours: 40 + Math.floor(Math.random() * 100) };  // USE
        if (kind === 1) return { dots: [true, true, false],   hours: 50 + Math.floor(Math.random() * 100) };  // BAKE (20% pink)
        if (kind === 2) return { dots: [false, false, false], hours: 170 + Math.floor(Math.random() * 40) };  // BAKE (over floor time)
        return              { dots: [true, true, true],     hours: 80 + Math.floor(Math.random() * 100) };  // SCRAP
    }

    function roundRectPath(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    // ── Live Rubric Panel ────────────────────────────────────────────────────
    function showRubric() {
        if (rubricEl) rubricEl.remove();
        const host = document.querySelector('#phone-assembly .game-info-panel');
        if (!host) return;
        const el = document.createElement('div');
        el.className = 'pro-rubric';
        el.innerHTML = `
            <div class="rubric-head">
                <h3>Live Performance Rubric</h3>
                <span class="rubric-sub">ESSCI cross-cutting PCs</span>
            </div>
            <div class="rubric-overall">
                <div class="rubric-overall-label">Station Score</div>
                <div class="rubric-overall-value" id="rubric-overall">100</div>
            </div>
            <div class="rubric-rows">
                ${rubricRow('esd', 'ESD Compliance', 'PC2.1')}
                ${rubricRow('sequence', 'Sequence Adherence', 'PC2.3')}
                ${rubricRow('cycleTime', 'Cycle Time', 'PC2.5')}
                ${rubricRow('torque', 'Torque Discipline', 'PC3.2')}
                ${rubricRow('fpy', 'First-Pass Yield', 'PC3.1')}
            </div>
            <div class="rubric-esd-action">
                <button class="rubric-wrist-btn" title="Tap your wrist strap to log an ESD compliance check">
                    ⚡ Tap Wrist Strap
                </button>
                <div class="rubric-esd-timer">Next check in <span id="esd-countdown">45</span>s</div>
            </div>
        `;
        host.appendChild(el);
        rubricEl = el;
        el.querySelector('.rubric-wrist-btn').addEventListener('click', logEsdCheck);
        renderRubric();
    }

    function rubricRow(key, label, pc) {
        return `
            <div class="rubric-row" data-key="${key}">
                <div class="rr-label">${label} <span class="pc-tag inline" title="${PC[pc]||''}">${pc}</span></div>
                <div class="rr-bar"><div class="rr-fill"></div></div>
                <div class="rr-val">100</div>
            </div>
        `;
    }

    function hideRubric() {
        if (rubricEl) { rubricEl.remove(); rubricEl = null; }
    }

    function renderRubric() {
        if (!rubricEl) return;
        Object.keys(metrics).forEach(k => {
            const row = rubricEl.querySelector(`.rubric-row[data-key="${k}"]`);
            if (!row) return;
            const v = Math.max(0, Math.min(100, Math.round(metrics[k])));
            row.querySelector('.rr-fill').style.width = v + '%';
            row.querySelector('.rr-fill').style.background = barColor(v);
            row.querySelector('.rr-val').textContent = v;
        });
        const overall = Math.round(
            metrics.esd * 0.2 +
            metrics.sequence * 0.25 +
            metrics.cycleTime * 0.15 +
            metrics.torque * 0.15 +
            metrics.fpy * 0.25
        );
        const ov = rubricEl.querySelector('#rubric-overall');
        if (ov) {
            ov.textContent = overall;
            ov.style.color = barColor(overall);
        }
    }

    function barColor(v) {
        if (v >= 90) return '#4ade80';
        if (v >= 75) return '#facc15';
        if (v >= 50) return '#fb923c';
        return '#f87171';
    }

    function resetMetrics() {
        metrics = { esd: 100, sequence: 100, cycleTime: 100, torque: 100, fpy: 100 };
        placementCount = 0;
        missCount = 0;
        torquePrompts = 0;
        torquePassed = 0;
        lastEsdCheck = Date.now();
        if (activeTorquePrompt) { activeTorquePrompt.remove(); activeTorquePrompt = null; }
    }

    // ── ESD watchdog: require periodic wrist-strap check ─────────────────────
    function startEsdWatchdog() {
        if (esdTimer) clearInterval(esdTimer);
        lastEsdCheck = Date.now();
        esdTimer = setInterval(() => {
            if (mode !== 'pro' || !checklistPassed) return;
            const since = (Date.now() - lastEsdCheck) / 1000;
            const remaining = Math.max(0, Math.ceil(45 - since));
            const cd = document.getElementById('esd-countdown');
            if (cd) cd.textContent = remaining;
            // After 45s window, start decaying ESD metric 1/s until refreshed
            if (since > 45) {
                metrics.esd = Math.max(0, metrics.esd - 1.5);
                if (rubricEl) {
                    rubricEl.querySelector('.rubric-wrist-btn')?.classList.add('pulse');
                }
                renderRubric();
            } else {
                rubricEl?.querySelector('.rubric-wrist-btn')?.classList.remove('pulse');
            }
        }, 1000);
    }

    function logEsdCheck() {
        lastEsdCheck = Date.now();
        metrics.esd = Math.min(100, metrics.esd + 5);
        renderRubric();
        const btn = rubricEl?.querySelector('.rubric-wrist-btn');
        if (btn) {
            btn.classList.add('ok');
            setTimeout(() => btn.classList.remove('ok'), 400);
        }
    }

    // ── Torque prompts: shown for certain parts (frame, display, glass) ──────
    function maybeTorquePrompt(part) {
        if (!part) return;
        const isFastener = /frame|display|glass|shield/i.test(part.id) || /frame|screen|display|bracket/i.test(part.shape || '');
        if (!isFastener) return;
        const specs = { frame: '1.5 Nm', shield: '1.5 Nm', display: '0.8 Nm', glass: '0.8 Nm' };
        const key = Object.keys(specs).find(k => part.id.includes(k) || (part.shape || '').includes(k)) || 'frame';
        const correct = specs[key];
        const options = ['0.8 Nm', '1.2 Nm', '1.5 Nm'];
        showTorquePrompt(part, correct, options);
    }

    function showTorquePrompt(part, correct, options) {
        if (activeTorquePrompt) activeTorquePrompt.remove();
        torquePrompts++;
        const el = document.createElement('div');
        el.className = 'torque-prompt';
        el.innerHTML = `
            <div class="tp-head">
                <span class="tp-icon">🔧</span>
                <span class="tp-title">Torque Check · ${part.name}</span>
                <span class="pc-tag inline" title="${PC['PC3.2']}">PC3.2</span>
            </div>
            <div class="tp-q">Select the correct torque for this fastener:</div>
            <div class="tp-opts">
                ${options.map(o => `<button class="tp-opt" data-v="${o}">${o}</button>`).join('')}
            </div>
        `;
        document.body.appendChild(el);
        activeTorquePrompt = el;
        el.querySelectorAll('.tp-opt').forEach(b => {
            b.addEventListener('click', () => {
                const chosen = b.dataset.v;
                const ok = chosen === correct;
                if (ok) {
                    torquePassed++;
                    b.classList.add('ok');
                } else {
                    b.classList.add('bad');
                    el.querySelector(`.tp-opt[data-v="${correct}"]`)?.classList.add('reveal');
                }
                metrics.torque = torquePrompts ? (torquePassed / torquePrompts) * 100 : 100;
                renderRubric();
                setTimeout(() => {
                    el.remove();
                    if (activeTorquePrompt === el) activeTorquePrompt = null;
                }, 900);
            });
        });
    }

    // ── Event hooks ──────────────────────────────────────────────────────────
    function hookEvents() {
        document.addEventListener('assembly:reset', () => {
            if (mode !== 'pro') return;
            resetMetrics();
            cycleStart = Date.now();
            renderRubric();
        });

        document.addEventListener('assembly:placed', (e) => {
            if (mode !== 'pro' || !checklistPassed) return;
            placementCount++;
            // FPY = (placements without preceding miss) / (placements + misses)
            const total = placementCount + missCount;
            metrics.fpy = total ? (placementCount / total) * 100 : 100;
            metrics.sequence = total ? (placementCount / total) * 100 : 100;

            // Cycle time: target 12s per step
            const state = assemblyGame.getState?.();
            const target = 12;
            const per = state && state.currentStep ? state.elapsed / state.currentStep : 0;
            if (per > 0) {
                const ratio = target / per;           // >1 = faster than target
                metrics.cycleTime = Math.max(0, Math.min(100, ratio * 90));
            }
            renderRubric();

            // Torque prompt for fastener parts
            maybeTorquePrompt(e.detail.part);
        });

        document.addEventListener('assembly:miss', () => {
            if (mode !== 'pro' || !checklistPassed) return;
            missCount++;
            const total = placementCount + missCount;
            metrics.sequence = total ? (placementCount / total) * 100 : 100;
            metrics.fpy = Math.max(0, metrics.fpy - 8);
            renderRubric();
        });

        document.addEventListener('assembly:complete', () => {
            if (mode !== 'pro' || !checklistPassed) return;
            showProReport();
        });
    }

    // ── End-of-run professional report ───────────────────────────────────────
    function showProReport() {
        const overall = Math.round(
            metrics.esd * 0.2 + metrics.sequence * 0.25 + metrics.cycleTime * 0.15 +
            metrics.torque * 0.15 + metrics.fpy * 0.25
        );
        const grade = overall >= 90 ? 'A · Line-Ready'
                    : overall >= 80 ? 'B · Minor Coaching'
                    : overall >= 70 ? 'C · Re-train Required'
                                    : 'D · Do Not Certify';
        const el = document.createElement('div');
        el.className = 'pro-report-overlay';
        el.innerHTML = `
            <div class="pro-report-card">
                <div class="prp-head">
                    <div class="prp-eyebrow">ESSCI ELE/Q3901 · Station Assessment</div>
                    <h2>Professional Run Complete</h2>
                    <div class="prp-grade prp-grade-${grade[0]}">${grade}</div>
                </div>
                <div class="prp-score">
                    <div class="prp-score-big">${overall}</div>
                    <div class="prp-score-lbl">/ 100 station score</div>
                </div>
                <table class="prp-tbl">
                    <tr><td>ESD Compliance</td><td><span class="pc-tag">PC2.1</span></td><td class="prp-v">${Math.round(metrics.esd)}</td></tr>
                    <tr><td>Sequence Adherence</td><td><span class="pc-tag">PC2.3</span></td><td class="prp-v">${Math.round(metrics.sequence)}</td></tr>
                    <tr><td>Cycle Time</td><td><span class="pc-tag">PC2.5</span></td><td class="prp-v">${Math.round(metrics.cycleTime)}</td></tr>
                    <tr><td>Torque Discipline</td><td><span class="pc-tag">PC3.2</span></td><td class="prp-v">${Math.round(metrics.torque)}</td></tr>
                    <tr><td>First-Pass Yield</td><td><span class="pc-tag">PC3.1</span></td><td class="prp-v">${Math.round(metrics.fpy)}</td></tr>
                </table>
                <div class="prp-actions">
                    <button class="btn btn-primary" id="prp-retry">Run Another Unit</button>
                    <button class="btn" id="prp-close">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(el);
        el.querySelector('#prp-retry').addEventListener('click', () => {
            el.remove();
            resetMetrics();
            cycleStart = Date.now();
            renderRubric();
            if (window.assemblyGame && assemblyGame.reset) assemblyGame.reset();
        });
        el.querySelector('#prp-close').addEventListener('click', () => el.remove());
    }

    return { init, setMode, getMode };
})();
