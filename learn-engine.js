/* ============================================================================
   LEARN ENGINE — Teach Me First guided-learning layer
   ----------------------------------------------------------------------------
   Satellite module. Zero coupling to existing game code. Hook:
       learnEngine.init()
   After init:
     • Watches tab clicks on .tab-btn[data-tab]
     • For stations with LEARN_CONTENT, shows the 3-tile gate overlay on entry
       unless localStorage flag "learn-done-{station}" is set
     • LEARN tile → lesson player (cards → checkpoint → unlock PRACTICE)
     • PRACTICE tile → closes gate, lets existing game run
     • PROVE tile → unlocked after PRACTICE pass (for now, after checkpoint)
     • Floating "📖 Review lesson" button injected into every covered station
   Persistence keys (localStorage):
     learn-lang                          : 'en' | 'hi' | 'ta' | 'te'
     learn-done-<station>                : ISO timestamp
     learn-checkpoint-<station>          : integer score 0..N
   ============================================================================ */

const learnEngine = (() => {
    'use strict';

    const SUPPORTED_LANGS = [
        { code: 'en', label: 'English',  flag: '🇬🇧' },
        { code: 'hi', label: 'हिन्दी',    flag: '🇮🇳' },
        { code: 'ta', label: 'தமிழ்',    flag: '🇮🇳' },
        { code: 'te', label: 'తెలుగు',   flag: '🇮🇳' }
    ];

    let currentLang = localStorage.getItem('learn-lang') || 'en';
    let currentStation = null;
    let currentLessonIdx = 0;
    let checkpointScore = 0;
    let overlayEl = null;
    let speechUtter = null;

    /* -- tiny i18n helper ------------------------------------------------- */
    function t(obj, fallback = '') {
        if (!obj) return fallback;
        if (typeof obj === 'string') return obj;
        return obj[currentLang] || obj.en || obj.hi || fallback;
    }

    function key(station, field) { return `learn-${field}-${station}`; }
    function isLearnDone(station)    { return !!localStorage.getItem(key(station, 'done')); }
    function markLearnDone(station)  { localStorage.setItem(key(station, 'done'), new Date().toISOString()); }
    function getCheckpointScore(st)  { return parseInt(localStorage.getItem(key(st, 'checkpoint')) || '0', 10); }
    function setCheckpointScore(s, v){ localStorage.setItem(key(s, 'checkpoint'), String(v)); }

    /* -- speech synthesis (Web Speech API fallback) -----------------------
       CRITICAL: the voice picked must always match the ACTUAL language of
       the text being spoken. Never pair English text with a ta-IN / te-IN
       voice — it produces garbled output. Caller passes text + its lang. */
    function speak(text, textLang) {
        if (!('speechSynthesis' in window) || !text) return;
        try { window.speechSynthesis.cancel(); } catch {}
        speechUtter = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const langTag = { en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN' }[textLang] || 'en-IN';
        // Strict: only pick a voice that matches the TEXT language tag.
        let voice = voices.find(v => v.lang === langTag);
        if (!voice) voice = voices.find(v => v.lang.startsWith(textLang));
        // Hard fallback: if no matching voice, force English text + English voice
        // rather than pair mismatched text+voice. Safe because we only reach this
        // branch when the actual text was already an English fallback.
        if (!voice) {
            voice = voices.find(v => v.lang === 'en-IN') || voices.find(v => v.lang.startsWith('en'));
            speechUtter.lang = 'en-IN';
        } else {
            speechUtter.lang = langTag;
        }
        if (voice) speechUtter.voice = voice;
        speechUtter.rate = 0.92;
        speechUtter.pitch = 1.0;
        window.speechSynthesis.speak(speechUtter);
    }
    function stopSpeech() {
        try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch {}
    }

    /* Return the best (text, lang) pair for a multilingual field, preferring
       the current UI language but falling back through hi → en so we NEVER
       pair a voice with text in a different language. */
    function resolveTts(obj) {
        if (!obj) return { text: '', lang: 'en' };
        if (obj[currentLang]) return { text: obj[currentLang], lang: currentLang };
        if (obj.en) return { text: obj.en, lang: 'en' };
        if (obj.hi) return { text: obj.hi, lang: 'hi' };
        const firstKey = Object.keys(obj)[0];
        return firstKey ? { text: obj[firstKey], lang: firstKey } : { text: '', lang: 'en' };
    }

    function playLessonAudio(lesson) {
        // 1. Prefer pre-recorded MP3 in the current language
        if (lesson.audio && lesson.audio[currentLang]) {
            const audio = new Audio(lesson.audio[currentLang]);
            audio.play().catch(() => {
                const { text, lang } = resolveTts(lesson.ttsText);
                speak(text, lang);
            });
            return;
        }
        // 2. Fall back to Web Speech API — but only speak text whose
        //    language matches the voice we will use.
        const { text, lang } = resolveTts(lesson.ttsText);
        if (lang !== currentLang) {
            // Native audio for currentLang is not available → flash a notice
            // so the user understands why they're hearing a different language.
            flashToast(
                currentLang === 'hi' ? 'इस भाषा में आवाज़ जल्द आएगी · अभी अंग्रेज़ी चल रही है' :
                currentLang === 'ta' ? 'இந்த மொழியில் ஒலி விரைவில் கிடைக்கும் · தற்போது ஆங்கிலம்' :
                currentLang === 'te' ? 'ఈ భాషలో ఆడియో త్వరలో వస్తుంది · ప్రస్తుతం ఇంగ్లీష్' :
                'Audio coming soon in this language · playing English for now'
            );
        }
        speak(text, lang);
    }

    /* -- overlay scaffold ------------------------------------------------- */
    function ensureOverlay() {
        if (overlayEl) return overlayEl;
        overlayEl = document.createElement('div');
        overlayEl.id = 'learn-overlay';
        overlayEl.className = 'learn-overlay';
        overlayEl.addEventListener('click', (e) => {
            if (e.target === overlayEl) closeOverlay();
        });
        document.body.appendChild(overlayEl);
        return overlayEl;
    }

    function closeOverlay() {
        stopSpeech();
        if (overlayEl) {
            overlayEl.classList.remove('is-open');
            overlayEl.innerHTML = '';
        }
    }

    function openOverlay(html) {
        const o = ensureOverlay();
        o.innerHTML = html;
        o.classList.add('is-open');
    }

    /* -- language picker (used across all screens) ----------------------- */
    function renderLangPicker() {
        return `
            <div class="learn-lang-picker">
                ${SUPPORTED_LANGS.map(l => `
                    <button class="learn-lang-btn ${l.code === currentLang ? 'active' : ''}"
                            data-lang="${l.code}">
                        <span class="learn-lang-flag">${l.flag}</span>
                        <span class="learn-lang-label">${l.label}</span>
                    </button>
                `).join('')}
            </div>`;
    }

    function wireLangPicker(root) {
        root.querySelectorAll('.learn-lang-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentLang = btn.dataset.lang;
                localStorage.setItem('learn-lang', currentLang);
                stopSpeech();
                // Re-render current screen
                if (currentLessonIdx >= 0 && overlayEl.querySelector('.learn-lesson')) {
                    showLesson(currentStation, currentLessonIdx);
                } else if (overlayEl.querySelector('.learn-checkpoint')) {
                    showCheckpoint(currentStation);
                } else {
                    showGate(currentStation);
                }
            });
        });
    }

    /* ========================================================================
       SCREEN 1 — The 3-tile gate
       ==================================================================== */
    function showGate(station) {
        const content = LEARN_CONTENT[station];
        if (!content) return;
        currentStation = station;
        currentLessonIdx = -1;

        const learnDone = isLearnDone(station);
        const cpScore = getCheckpointScore(station);
        const practiceUnlocked = learnDone;
        const proveUnlocked = cpScore >= 2; // 2 of 3 checkpoint qs

        openOverlay(`
            <div class="learn-gate-card">
                <div class="learn-gate-head">
                    <div class="learn-gate-title">
                        <span class="learn-gate-icon">${content.icon || '📚'}</span>
                        <div>
                            <h2>${t(content.title)}</h2>
                            <p class="learn-gate-sub">${t(content.factory, '')}</p>
                        </div>
                    </div>
                    ${renderLangPicker()}
                </div>

                <div class="learn-hook">
                    <span class="learn-hook-ic">💡</span>
                    <p>${t(content.hook)}</p>
                </div>

                <div class="learn-tiles">
                    <button class="learn-tile learn-tile-learn ${learnDone ? 'is-done' : 'is-active'}" data-action="learn">
                        <div class="learn-tile-ic">📖</div>
                        <div class="learn-tile-title">${currentLang === 'hi' ? 'सीखें' : 'LEARN'}</div>
                        <div class="learn-tile-dur">${t(content.duration, '4 min')}</div>
                        <div class="learn-tile-desc">${currentLang === 'hi' ? 'हर पार्ट को समझें' : 'Watch + listen'}</div>
                        <div class="learn-tile-status">${learnDone ? '✓ ' + (currentLang === 'hi' ? 'पूरा हुआ' : 'Done') : '▶ ' + (currentLang === 'hi' ? 'शुरू करें' : 'Start')}</div>
                    </button>

                    <button class="learn-tile learn-tile-practice ${practiceUnlocked ? 'is-active' : 'is-locked'}" data-action="practice">
                        <div class="learn-tile-ic">🛠️</div>
                        <div class="learn-tile-title">${currentLang === 'hi' ? 'अभ्यास' : 'PRACTICE'}</div>
                        <div class="learn-tile-dur">${currentLang === 'hi' ? 'समय मुक्त' : 'Untimed'}</div>
                        <div class="learn-tile-desc">${currentLang === 'hi' ? 'मदद के साथ करें' : 'With hints'}</div>
                        <div class="learn-tile-status">${practiceUnlocked ? '▶ ' + (currentLang === 'hi' ? 'खेलें' : 'Play') : '🔒 ' + (currentLang === 'hi' ? 'LEARN पूरा करें' : 'Finish LEARN')}</div>
                    </button>

                    <button class="learn-tile learn-tile-prove ${proveUnlocked ? 'is-active' : 'is-locked'}" data-action="prove">
                        <div class="learn-tile-ic">🏭</div>
                        <div class="learn-tile-title">${currentLang === 'hi' ? 'प्रमाण' : 'PROVE'}</div>
                        <div class="learn-tile-dur">ESSCI NSQF-4</div>
                        <div class="learn-tile-desc">${currentLang === 'hi' ? 'स्कोर + टाइमर' : 'Scored + timed'}</div>
                        <div class="learn-tile-status">${proveUnlocked ? '▶ ' + (currentLang === 'hi' ? 'शुरू करें' : 'Start') : '🔒 ' + (currentLang === 'hi' ? 'पहले PRACTICE' : 'After PRACTICE')}</div>
                    </button>
                </div>

                <div class="learn-gate-foot">
                    <div class="learn-wage">💰 ${t(content.wage, '')}</div>
                    <button class="learn-skip" data-action="skip">${currentLang === 'hi' ? 'सीधे गेम पर जाएँ →' : 'Skip to game →'}</button>
                </div>
            </div>
        `);

        wireLangPicker(overlayEl);
        overlayEl.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.dataset.action;
                if (action === 'learn') {
                    currentLessonIdx = 0;
                    showLesson(station, 0);
                } else if (action === 'practice') {
                    if (!practiceUnlocked) {
                        flashToast(currentLang === 'hi' ? 'पहले LEARN पूरा करें' : 'Finish LEARN first');
                        return;
                    }
                    closeOverlay();
                } else if (action === 'prove') {
                    if (!proveUnlocked) {
                        flashToast(currentLang === 'hi' ? 'पहले PRACTICE पास करें' : 'Finish PRACTICE first');
                        return;
                    }
                    closeOverlay();
                    // Auto-trigger Professional Mode toggle if available
                    if (station === 'phone-assembly' && typeof assemblyPro !== 'undefined' && assemblyPro.setMode) {
                        setTimeout(() => assemblyPro.setMode('pro'), 300);
                    }
                } else if (action === 'skip') {
                    closeOverlay();
                }
            });
        });
    }

    /* ========================================================================
       SCREEN 2 — Lesson card (one part at a time)
       ==================================================================== */
    function showLesson(station, idx) {
        const content = LEARN_CONTENT[station];
        const lessons = content.lessons;
        const lesson = lessons[idx];
        if (!lesson) return;
        currentLessonIdx = idx;
        stopSpeech();

        const total = lessons.length;
        const progress = ((idx + 1) / total) * 100;

        openOverlay(`
            <div class="learn-lesson">
                <div class="learn-lesson-head">
                    <button class="learn-back" data-action="back">←</button>
                    <div class="learn-progress">
                        <div class="learn-progress-bar" style="width:${progress}%"></div>
                        <span class="learn-progress-txt">${idx + 1} / ${total}</span>
                    </div>
                    ${renderLangPicker()}
                </div>

                <div class="learn-lesson-body">
                    <div class="learn-lesson-visual">
                        <canvas id="learn-lesson-canvas" width="320" height="320"></canvas>
                        <button class="learn-audio-btn" data-action="replay">
                            🔊 ${currentLang === 'hi' ? 'दोबारा सुनें' : 'Replay audio'}
                        </button>
                    </div>

                    <div class="learn-lesson-text">
                        <div class="learn-lesson-icon">${lesson.icon || '•'}</div>
                        <h2 class="learn-lesson-name">${t(lesson.name)}</h2>

                        <div class="learn-lesson-block">
                            <h4>${currentLang === 'hi' ? 'यह क्या है?' : 'What is it?'}</h4>
                            <p>${t(lesson.what)}</p>
                        </div>
                        <div class="learn-lesson-block learn-block-why">
                            <h4>${currentLang === 'hi' ? 'यह क्यों ज़रूरी है?' : 'Why does it matter?'}</h4>
                            <p>${t(lesson.why)}</p>
                        </div>
                        <div class="learn-lesson-block learn-block-how">
                            <h4>${currentLang === 'hi' ? 'कैसे करें?' : 'How to handle it'}</h4>
                            <p>${t(lesson.how)}</p>
                        </div>
                    </div>
                </div>

                <div class="learn-lesson-foot">
                    <button class="learn-btn learn-btn-ghost" data-action="prev" ${idx === 0 ? 'disabled' : ''}>
                        ← ${currentLang === 'hi' ? 'पिछला' : 'Previous'}
                    </button>
                    <button class="learn-btn learn-btn-primary" data-action="next">
                        ${idx === total - 1 ? (currentLang === 'hi' ? 'क्विज़ दें →' : 'Take quiz →') : (currentLang === 'hi' ? 'अगला →' : 'Next →')}
                    </button>
                </div>
            </div>
        `);

        wireLangPicker(overlayEl);
        const cvs = overlayEl.querySelector('#learn-lesson-canvas');
        if (cvs) drawLessonVisual(cvs, lesson);

        overlayEl.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const a = btn.dataset.action;
                if (a === 'back')    { showGate(station); }
                else if (a === 'replay') { playLessonAudio(lesson); }
                else if (a === 'prev')   { if (idx > 0) showLesson(station, idx - 1); }
                else if (a === 'next')   {
                    if (idx < total - 1) showLesson(station, idx + 1);
                    else showCheckpoint(station);
                }
            });
        });

        // Auto-play on load
        setTimeout(() => playLessonAudio(lesson), 450);
    }

    /* -- lesson visual: big version of the mini icon we already have ----- */
    function drawLessonVisual(canvas, lesson) {
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        // Dark panel
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#0f1420'); bg.addColorStop(1, '#060912');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
        // Grid
        ctx.strokeStyle = 'rgba(62,207,113,0.06)'; ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

        // Delegate to assemblyGame.drawMiniIcon IF it is exported, else inline pictogram
        // Since assembly-game.js's drawMiniIcon is not on the global, draw a large glyph
        // based on the part shape.
        const shape = lesson.partRef || lesson.id;
        ctx.save();
        ctx.translate(W / 2, H / 2);
        drawBigPictogram(ctx, shape);
        ctx.restore();

        // Floating label
        ctx.fillStyle = 'rgba(62,207,113,0.85)';
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(shape.toUpperCase(), W / 2, H - 18);
    }

    /* Simplified large-scale pictograms (standalone so engine has zero
       dependency on assembly-game.js internals). */
    function drawBigPictogram(ctx, shape) {
        const s = 1; // drawn around origin
        ctx.lineWidth = 3;
        switch (shape) {
            case 'frame':
            case 'rugged-frame': {
                // Phone outline
                rr(ctx, -55, -100, 110, 200, 18);
                const g = ctx.createLinearGradient(-55, -100, 55, 100);
                g.addColorStop(0, '#c0c8d4'); g.addColorStop(0.5, '#8892a6'); g.addColorStop(1, '#3a4556');
                ctx.fillStyle = g; ctx.fill();
                ctx.strokeStyle = '#e0e6f0'; ctx.lineWidth = 2; ctx.stroke();
                // Screen area
                ctx.fillStyle = '#0a0e16';
                rr(ctx, -45, -85, 90, 170, 10); ctx.fill();
                // Notch
                ctx.fillStyle = '#000';
                rr(ctx, -14, -95, 28, 8, 4); ctx.fill();
                // Side button
                ctx.fillStyle = '#a0a8b8';
                ctx.fillRect(55, -30, 4, 28);
                break;
            }
            case 'pcb': {
                rr(ctx, -110, -75, 220, 150, 6);
                const g = ctx.createLinearGradient(-110, -75, 110, 75);
                g.addColorStop(0, '#1e5a2a'); g.addColorStop(1, '#0f3518');
                ctx.fillStyle = g; ctx.fill();
                // Traces
                ctx.strokeStyle = '#d4a020'; ctx.lineWidth = 2;
                [[-90,-40,90,-40],[ -90,20,-20,20],[-20,20,-20,60],[20,-60,80,-60],[80,-60,80,40]].forEach(([x1,y1,x2,y2]) => {
                    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
                });
                // Big SoC chip
                ctx.fillStyle = '#0a0a0a';
                ctx.fillRect(-30, -20, 60, 40);
                ctx.strokeStyle = '#3ecf71'; ctx.lineWidth = 2;
                ctx.strokeRect(-30, -20, 60, 40);
                ctx.fillStyle = '#3ecf71';
                ctx.font = 'bold 12px "JetBrains Mono",monospace';
                ctx.textAlign = 'center';
                ctx.fillText('SoC', 0, 4);
                // Pins
                ctx.fillStyle = '#d4a020';
                for (let i = 0; i < 10; i++) {
                    ctx.fillRect(-28 + i * 6, -26, 2, 6);
                    ctx.fillRect(-28 + i * 6, 20, 2, 6);
                }
                // Vias
                ctx.fillStyle = '#d4a020';
                [[-70,-30],[-70,40],[70,-30],[70,30],[-40,60]].forEach(([vx,vy]) => {
                    ctx.beginPath(); ctx.arc(vx,vy,3,0,Math.PI*2); ctx.fill();
                });
                break;
            }
            case 'battery': {
                rr(ctx, -70, -100, 140, 200, 8);
                ctx.fillStyle = '#1a1f2e'; ctx.fill();
                ctx.strokeStyle = '#d4d4d4'; ctx.lineWidth = 3; ctx.stroke();
                // Fill 85%
                const fillH = 180 * 0.85;
                const g = ctx.createLinearGradient(0, 100 - fillH, 0, 90);
                g.addColorStop(0, '#3ecf71'); g.addColorStop(1, '#2a8a4c');
                ctx.fillStyle = g;
                ctx.fillRect(-60, 90 - fillH, 120, fillH);
                // Terminal
                ctx.fillStyle = '#d4d4d4';
                ctx.fillRect(-20, -110, 40, 12);
                // Bolt
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.moveTo(-10, -20); ctx.lineTo(15, 0); ctx.lineTo(-2, 0);
                ctx.lineTo(10, 30); ctx.lineTo(-15, 5); ctx.lineTo(2, 5);
                ctx.closePath(); ctx.fill();
                // Label
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('5000 mAh', 0, 70);
                break;
            }
            case 'display':
            case 'dynamic-island': {
                rr(ctx, -60, -110, 120, 220, 14);
                ctx.fillStyle = '#000'; ctx.fill();
                ctx.strokeStyle = '#2a3142'; ctx.lineWidth = 2; ctx.stroke();
                // Screen
                const g = ctx.createLinearGradient(-55, -100, 55, 100);
                g.addColorStop(0, '#2a6edf'); g.addColorStop(0.5, '#1a4fa6'); g.addColorStop(1, '#0c2a5c');
                ctx.fillStyle = g;
                rr(ctx, -55, -100, 110, 200, 10); ctx.fill();
                // Apps grid
                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
                    rr(ctx, -40 + c * 28, -70 + r * 35, 18, 18, 4); ctx.fill();
                }
                ctx.fillStyle = '#000';
                rr(ctx, -22, -105, 44, 12, 6); ctx.fill();
                break;
            }
            case 'camera':
            case 'periscope': {
                ctx.fillStyle = '#1a1f2e';
                ctx.beginPath(); ctx.arc(0, 0, 90, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#4a5668'; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.arc(0, 0, 90, 0, Math.PI * 2); ctx.stroke();
                const g = ctx.createRadialGradient(-15, -15, 5, 0, 0, 80);
                g.addColorStop(0, '#88b4ff'); g.addColorStop(0.4, '#2a4e8f');
                g.addColorStop(0.8, '#0c1528'); g.addColorStop(1, '#000');
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(0, 0, 80, 0, Math.PI * 2); ctx.fill();
                // Aperture blades
                ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2;
                for (let i = 0; i < 8; i++) {
                    const a = (i / 8) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(a) * 15, Math.sin(a) * 15);
                    ctx.lineTo(Math.cos(a) * 75, Math.sin(a) * 75);
                    ctx.stroke();
                }
                ctx.fillStyle = '#000';
                ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                ctx.beginPath(); ctx.arc(-18, -22, 10, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#e4b94a';
                ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('200MP', 0, 115);
                break;
            }
            case 'speaker': {
                rr(ctx, -100, -70, 200, 140, 10);
                ctx.fillStyle = '#2a3142'; ctx.fill();
                ctx.strokeStyle = '#4a5668'; ctx.lineWidth = 3; ctx.stroke();
                // Grille dots
                ctx.fillStyle = '#0a0e16';
                for (let gy = -50; gy <= 50; gy += 14) {
                    for (let gx = -80; gx <= 80; gx += 14) {
                        ctx.beginPath(); ctx.arc(gx, gy, 4, 0, Math.PI * 2); ctx.fill();
                    }
                }
                // Sound waves
                ctx.strokeStyle = '#3ecf71'; ctx.lineWidth = 3;
                for (let i = 1; i <= 3; i++) {
                    ctx.beginPath(); ctx.arc(120, 0, 12 * i, -Math.PI / 3, Math.PI / 3); ctx.stroke();
                }
                break;
            }
            case 'usbc': {
                rr(ctx, -90, -25, 180, 50, 22);
                ctx.fillStyle = '#1a1f2e'; ctx.fill();
                ctx.strokeStyle = '#c0c8d4'; ctx.lineWidth = 3; ctx.stroke();
                rr(ctx, -75, -15, 150, 30, 12);
                ctx.fillStyle = '#3a4556'; ctx.fill();
                // Gold pins
                ctx.fillStyle = '#e4b94a';
                for (let i = 0; i < 12; i++) {
                    ctx.fillRect(-70 + i * 12, -10, 3, 20);
                }
                ctx.fillStyle = '#8892a6';
                ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('USB-C · 24 pins', 0, 60);
                break;
            }
            case 'glass': {
                rr(ctx, -60, -100, 120, 200, 14);
                const g = ctx.createLinearGradient(-60, -100, 60, 100);
                g.addColorStop(0, 'rgba(180,220,255,0.9)');
                g.addColorStop(0.5, 'rgba(120,170,230,0.6)');
                g.addColorStop(1, 'rgba(60,100,160,0.5)');
                ctx.fillStyle = g; ctx.fill();
                ctx.strokeStyle = '#a0c0e8'; ctx.lineWidth = 3; ctx.stroke();
                // Shines
                ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.moveTo(-40, 60); ctx.lineTo(40, -60); ctx.stroke();
                ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(-40, 30); ctx.lineTo(30, -40); ctx.stroke();
                // Logo circle
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
                break;
            }
            default: {
                ctx.fillStyle = '#3ecf71';
                ctx.font = 'bold 48px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('?', 0, 16);
            }
        }
    }

    function rr(ctx, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    /* ========================================================================
       SCREEN 3 — Checkpoint quiz
       ==================================================================== */
    function showCheckpoint(station) {
        const content = LEARN_CONTENT[station];
        const questions = content.checkpoint || [];
        currentLessonIdx = -1;
        checkpointScore = 0;
        stopSpeech();
        renderCheckpointQuestion(station, questions, 0);
    }

    function renderCheckpointQuestion(station, questions, qIdx) {
        if (qIdx >= questions.length) {
            return showCheckpointResult(station, questions.length);
        }
        const q = questions[qIdx];
        openOverlay(`
            <div class="learn-checkpoint">
                <div class="learn-check-head">
                    <div class="learn-check-step">${qIdx + 1} / ${questions.length}</div>
                    <h2>${currentLang === 'hi' ? 'क्विक चेक' : 'Quick Check'}</h2>
                    ${renderLangPicker()}
                </div>
                <div class="learn-check-body">
                    <h3 class="learn-check-q">${t(q.q)}</h3>
                    <div class="learn-check-opts">
                        ${q.options.map(opt => `
                            <button class="learn-check-opt" data-id="${opt.id}">
                                <span class="learn-check-bullet"></span>
                                <span class="learn-check-label">${t(opt.label)}</span>
                            </button>
                        `).join('')}
                    </div>
                    <div class="learn-check-feedback" id="learn-check-feedback"></div>
                </div>
            </div>
        `);
        wireLangPicker(overlayEl);

        overlayEl.querySelectorAll('.learn-check-opt').forEach(btn => {
            btn.addEventListener('click', () => {
                const isCorrect = btn.dataset.id === q.correct;
                overlayEl.querySelectorAll('.learn-check-opt').forEach(b => {
                    b.classList.add('disabled');
                    if (b.dataset.id === q.correct) b.classList.add('is-correct');
                    else if (b === btn) b.classList.add('is-wrong');
                });
                const fb = document.getElementById('learn-check-feedback');
                fb.className = 'learn-check-feedback ' + (isCorrect ? 'is-correct' : 'is-wrong');
                fb.innerHTML = `
                    <div class="learn-check-fb-icon">${isCorrect ? '✓' : '✗'}</div>
                    <p>${t(q.explain)}</p>
                    <button class="learn-btn learn-btn-primary" id="learn-check-next">
                        ${qIdx === questions.length - 1 ? (currentLang === 'hi' ? 'नतीजा देखें →' : 'See result →') : (currentLang === 'hi' ? 'अगला →' : 'Next →')}
                    </button>`;
                if (isCorrect) checkpointScore++;
                document.getElementById('learn-check-next').addEventListener('click', () => {
                    renderCheckpointQuestion(station, questions, qIdx + 1);
                });
            });
        });
    }

    function showCheckpointResult(station, total) {
        const passed = checkpointScore >= Math.ceil(total * 0.6);
        if (passed) {
            markLearnDone(station);
            setCheckpointScore(station, checkpointScore);
        }
        const headline = passed
            ? (currentLang === 'hi' ? 'शाबाश! 🎉' : 'Well done! 🎉')
            : (currentLang === 'hi' ? 'थोड़ी और मेहनत' : 'Almost there');
        const sub = passed
            ? (currentLang === 'hi' ? 'आप PRACTICE के लिए तैयार हैं।' : 'You are ready for PRACTICE.')
            : (currentLang === 'hi' ? 'LEARN फिर से देखें और दोबारा कोशिश करें।' : 'Review the lessons and try again.');

        openOverlay(`
            <div class="learn-result">
                <div class="learn-result-grade ${passed ? 'is-pass' : 'is-fail'}">
                    ${checkpointScore} / ${total}
                </div>
                <h2>${headline}</h2>
                <p>${sub}</p>
                <div class="learn-result-actions">
                    <button class="learn-btn learn-btn-ghost" data-action="retry">
                        ${currentLang === 'hi' ? 'फिर सीखें' : 'Review again'}
                    </button>
                    ${passed ? `
                        <button class="learn-btn learn-btn-primary" data-action="practice">
                            ${currentLang === 'hi' ? 'अभ्यास शुरू करें →' : 'Start PRACTICE →'}
                        </button>
                    ` : `
                        <button class="learn-btn learn-btn-primary" data-action="retry-quiz">
                            ${currentLang === 'hi' ? 'दोबारा क्विज़' : 'Retry quiz'}
                        </button>
                    `}
                </div>
            </div>
        `);

        overlayEl.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const a = btn.dataset.action;
                if (a === 'retry')       showLesson(station, 0);
                else if (a === 'retry-quiz') showCheckpoint(station);
                else if (a === 'practice')   closeOverlay();
            });
        });
    }

    /* ========================================================================
       Integration — tab watcher + review button injection
       ==================================================================== */
    function maybeShowGateForTab(tabName) {
        if (!LEARN_CONTENT[tabName]) return;
        if (isLearnDone(tabName)) return; // already completed → don't nag
        // Delay so the section becomes visible first
        setTimeout(() => showGate(tabName), 250);
    }

    function injectReviewButton(station) {
        const section = document.getElementById(station);
        if (!section || section.querySelector('.learn-review-btn')) return;
        const header = section.querySelector('.game-header .game-controls');
        if (!header) return;
        const btn = document.createElement('button');
        btn.className = 'learn-review-btn';
        btn.innerHTML = '📖 ' + (currentLang === 'hi' ? 'पाठ दोहराएँ' : 'Review lesson');
        btn.title = 'Open Teach Me First';
        btn.addEventListener('click', () => showGate(station));
        header.appendChild(btn);
    }

    function flashToast(msg) {
        let t = document.getElementById('learn-toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'learn-toast';
            t.className = 'learn-toast';
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.classList.add('is-visible');
        setTimeout(() => t.classList.remove('is-visible'), 2200);
    }

    /* -- public init ------------------------------------------------------ */
    function init() {
        if (typeof LEARN_CONTENT === 'undefined') {
            console.warn('[learnEngine] LEARN_CONTENT not loaded; aborting.');
            return;
        }
        // Tab click interception
        document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                maybeShowGateForTab(tab);
            });
        });
        // Inject review buttons for all covered stations
        Object.keys(LEARN_CONTENT).forEach(st => injectReviewButton(st));

        // Pre-warm voices (some browsers load async)
        if ('speechSynthesis' in window) {
            window.speechSynthesis.getVoices();
            window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
        }

        // If current active tab is a covered station, show gate on first load
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab && LEARN_CONTENT[activeTab.dataset.tab] && !isLearnDone(activeTab.dataset.tab)) {
            // Don't auto-open on page load — only on explicit tab click
            // (avoids gating users on the default tab)
        }
    }

    return {
        init,
        showGate,
        closeOverlay,
        setLang: (l) => { currentLang = l; localStorage.setItem('learn-lang', l); },
        // Dev helper: reset so you can re-test
        _reset: (st) => {
            const station = st || 'phone-assembly';
            localStorage.removeItem(key(station, 'done'));
            localStorage.removeItem(key(station, 'checkpoint'));
            console.log('[learnEngine] reset', station);
        }
    };
})();

if (typeof window !== 'undefined') window.learnEngine = learnEngine;
