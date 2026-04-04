window.tutorialEngine = (() => {
    let activeFlow = null;
    let currentStepIndex = -1;
    let gameId = null;
    let pulseTarget = null;
    let pulseAnimId = null;
    let highlightCanvas = null;
    let highlightCtx = null;
    let completedFlows = {};

    // Load progress
    try {
        completedFlows = JSON.parse(localStorage.getItem('electroskill-tutorials') || '{}');
    } catch (e) { completedFlows = {}; }

    function saveProgress() {
        try { localStorage.setItem('electroskill-tutorials', JSON.stringify(completedFlows)); } catch (e) {}
    }

    // --- Flow Picker ---
    function showFlowPicker(gId) {
        gameId = gId;
        const flows = (window.tutorialFlows || {})[gId];
        if (!flows || flows.length === 0) return;

        const picker = document.getElementById('tutorial-flow-picker');
        const body = picker.querySelector('.flow-picker-body');
        const header = picker.querySelector('.flow-picker-header h2');

        const gameNames = {
            'pcb-design': 'PCB Design Lab',
            'phone-assembly': 'Phone Assembly',
            'smt-line': 'SMT Pick & Place',
            'qc-inspector': 'QC Inspector'
        };
        header.textContent = `${gameNames[gId] || gId} Tutorials`;

        body.innerHTML = '';
        flows.forEach((flow, i) => {
            const done = completedFlows[`${gId}-${flow.id}`];
            const card = document.createElement('div');
            card.className = 'flow-card';
            card.innerHTML = `
                <div class="flow-number ${done ? 'completed' : ''}">${done ? '\u2713' : i + 1}</div>
                <div class="flow-info">
                    <div class="flow-name">${flow.name}</div>
                    <div class="flow-desc">${flow.description}</div>
                    <div class="flow-meta">
                        <span>${flow.steps.length} steps</span>
                        <span>${flow.difficulty || 'Beginner'}</span>
                        ${done ? '<span style="color:var(--accent-green)">Completed</span>' : ''}
                    </div>
                </div>
            `;
            card.onclick = () => {
                picker.classList.remove('show');
                startFlow(gId, i);
            };
            body.appendChild(card);
        });

        picker.classList.add('show');
    }

    function hideFlowPicker() {
        document.getElementById('tutorial-flow-picker').classList.remove('show');
    }

    // --- Start / Stop Flow ---
    function startFlow(gId, flowIndex) {
        gameId = gId;
        const flows = window.tutorialFlows[gId];
        if (!flows || !flows[flowIndex]) return;
        activeFlow = flows[flowIndex];
        currentStepIndex = -1;

        document.body.classList.add('tutorial-active');

        // Reset the game to clean state
        const gameAPI = getGameAPI();
        if (activeFlow.setup) activeFlow.setup(gameAPI);

        // Show step bar
        renderStepBar();
        document.getElementById('tutorial-step-bar').classList.add('active');

        // Create highlight canvas in the active game board
        createHighlightCanvas();

        // Start first step
        advanceStep();
    }

    function stopFlow() {
        clearPulse();
        activeFlow = null;
        currentStepIndex = -1;
        document.body.classList.remove('tutorial-active');
        document.getElementById('tutorial-step-bar').classList.remove('active');

        const tooltip = document.getElementById('tutorial-tooltip');
        if (tooltip) tooltip.classList.remove('active');

        removeHighlightCanvas();

        // Remove any pulse classes from DOM
        document.querySelectorAll('.tutorial-pulse').forEach(el => el.classList.remove('tutorial-pulse'));
    }

    // --- Step Management ---
    function advanceStep() {
        if (!activeFlow) return;

        // Complete previous step
        if (currentStepIndex >= 0) {
            const prevStep = activeFlow.steps[currentStepIndex];
            if (prevStep.onComplete) prevStep.onComplete(getGameAPI());

            // Flash the completed dot
            const dots = document.querySelectorAll('.tutorial-dot');
            if (dots[currentStepIndex]) {
                dots[currentStepIndex].classList.remove('active');
                dots[currentStepIndex].classList.add('completed');
            }
        }

        clearPulse();
        currentStepIndex++;

        // Check if done
        if (currentStepIndex >= activeFlow.steps.length) {
            showCompletion();
            return;
        }

        const step = activeFlow.steps[currentStepIndex];

        // Update step bar dots
        const dots = document.querySelectorAll('.tutorial-dot');
        if (dots[currentStepIndex]) {
            dots[currentStepIndex].classList.add('active');
        }

        // Run onEnter
        if (step.onEnter) step.onEnter(getGameAPI());

        // Show tooltip
        showTooltip(step);

        // Pulse the target
        if (step.target) {
            startPulse(step.target);
        }

        // Auto-advance for 'auto' or 'wait' actions
        if (step.action && step.action.type === 'auto') {
            setTimeout(() => advanceStep(), step.autoAdvanceDelay || 1500);
        }
    }

    // --- Tooltip ---
    function showTooltip(step) {
        const tooltip = document.getElementById('tutorial-tooltip');
        tooltip.querySelector('.tooltip-step').textContent = `Step ${currentStepIndex + 1} of ${activeFlow.steps.length}`;
        tooltip.querySelector('.tooltip-instruction').textContent = step.instruction;
        tooltip.querySelector('.tooltip-detail').textContent = step.detail || '';

        tooltip.classList.add('active');

        // Position tooltip near the target
        requestAnimationFrame(() => positionTooltip(step, tooltip));
    }

    function positionTooltip(step, tooltip) {
        if (!step.target) {
            // Center on screen
            tooltip.style.left = '50%';
            tooltip.style.top = '30%';
            tooltip.style.transform = 'translate(-50%, -50%)';
            tooltip.querySelector('.tooltip-arrow').style.display = 'none';
            return;
        }

        const arrow = tooltip.querySelector('.tooltip-arrow');
        arrow.style.display = 'block';
        arrow.className = 'tooltip-arrow';
        tooltip.style.transform = '';

        let targetRect;
        if (step.target.type === 'dom-element' || step.target.type === 'palette-item' || step.target.type === 'tool-button') {
            const el = document.querySelector(step.target.selector);
            if (!el) { tooltip.style.left = '50%'; tooltip.style.top = '200px'; return; }
            targetRect = el.getBoundingClientRect();
        } else if (step.target.type === 'canvas-region' && step.target.computePosition) {
            const api = getGameAPI();
            const canvasPos = step.target.computePosition(api);
            const canvas = api.getCanvas();
            const canvasRect = canvas.getBoundingClientRect();
            const scaleX = canvasRect.width / canvas.width;
            const scaleY = canvasRect.height / canvas.height;
            targetRect = {
                left: canvasRect.left + canvasPos.x * scaleX,
                top: canvasRect.top + canvasPos.y * scaleY,
                width: (canvasPos.w || 40) * scaleX,
                height: (canvasPos.h || 40) * scaleY,
                right: canvasRect.left + (canvasPos.x + (canvasPos.w || 40)) * scaleX,
                bottom: canvasRect.top + (canvasPos.y + (canvasPos.h || 40)) * scaleY
            };
        } else {
            tooltip.style.left = '50%'; tooltip.style.top = '200px'; return;
        }

        const tRect = tooltip.getBoundingClientRect();
        const pad = 16;

        // Prefer placing above
        if (targetRect.top - tRect.height - pad > 60) {
            tooltip.style.top = (targetRect.top - tRect.height - pad) + 'px';
            tooltip.style.left = Math.max(pad, Math.min(window.innerWidth - tRect.width - pad,
                targetRect.left + targetRect.width / 2 - tRect.width / 2)) + 'px';
            arrow.className = 'tooltip-arrow arrow-bottom';
        } else {
            // Place below
            tooltip.style.top = (targetRect.bottom + pad) + 'px';
            tooltip.style.left = Math.max(pad, Math.min(window.innerWidth - tRect.width - pad,
                targetRect.left + targetRect.width / 2 - tRect.width / 2)) + 'px';
            arrow.className = 'tooltip-arrow arrow-top';
        }
    }

    // --- Pulse / Highlight ---
    function startPulse(target) {
        clearPulse();

        if (target.type === 'palette-item' || target.type === 'dom-element' || target.type === 'tool-button') {
            const el = document.querySelector(target.selector);
            if (el) {
                el.classList.add('tutorial-pulse');
                pulseTarget = { type: 'dom', element: el };

                // Scroll into view if needed
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        } else if (target.type === 'canvas-region' && target.computePosition) {
            pulseTarget = { type: 'canvas', computePosition: target.computePosition };
            animateCanvasPulse();
        }
    }

    function clearPulse() {
        if (pulseTarget && pulseTarget.type === 'dom' && pulseTarget.element) {
            pulseTarget.element.classList.remove('tutorial-pulse');
        }
        pulseTarget = null;
        if (pulseAnimId) {
            cancelAnimationFrame(pulseAnimId);
            pulseAnimId = null;
        }
        if (highlightCtx && highlightCanvas) {
            highlightCtx.clearRect(0, 0, highlightCanvas.width, highlightCanvas.height);
        }
    }

    function animateCanvasPulse() {
        if (!pulseTarget || pulseTarget.type !== 'canvas' || !highlightCanvas) return;

        const api = getGameAPI();
        const pos = pulseTarget.computePosition(api);
        if (!pos) return;

        const ctx = highlightCtx;
        const t = performance.now() / 1000;
        const breathe = 1 + Math.sin(t * 3) * 0.15;

        ctx.clearRect(0, 0, highlightCanvas.width, highlightCanvas.height);

        const cx = pos.x + (pos.w || 40) / 2;
        const cy = pos.y + (pos.h || 40) / 2;
        const baseR = Math.max(pos.w || 40, pos.h || 40) / 2 + 12;
        const r = baseR * breathe;

        // Outer glow
        ctx.beginPath();
        ctx.arc(cx, cy, r + 10, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(cx, cy, r - 5, cx, cy, r + 15);
        grad.addColorStop(0, 'rgba(0, 230, 118, 0.2)');
        grad.addColorStop(1, 'rgba(0, 230, 118, 0)');
        ctx.fillStyle = grad;
        ctx.fill();

        // Pulsing ring
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 230, 118, ${0.5 + Math.sin(t * 4) * 0.3})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.lineDashOffset = -t * 30;
        ctx.stroke();
        ctx.setLineDash([]);

        // Inner ring
        ctx.beginPath();
        ctx.arc(cx, cy, baseR - 5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 180, 216, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Corner brackets
        const bSize = 12;
        const bx = pos.x - 6;
        const by = pos.y - 6;
        const bw = (pos.w || 40) + 12;
        const bh = (pos.h || 40) + 12;
        ctx.strokeStyle = 'rgba(0, 230, 118, 0.7)';
        ctx.lineWidth = 2;
        // Top-left
        ctx.beginPath(); ctx.moveTo(bx, by + bSize); ctx.lineTo(bx, by); ctx.lineTo(bx + bSize, by); ctx.stroke();
        // Top-right
        ctx.beginPath(); ctx.moveTo(bx + bw - bSize, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + bSize); ctx.stroke();
        // Bottom-left
        ctx.beginPath(); ctx.moveTo(bx, by + bh - bSize); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + bSize, by + bh); ctx.stroke();
        // Bottom-right
        ctx.beginPath(); ctx.moveTo(bx + bw - bSize, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - bSize); ctx.stroke();

        pulseAnimId = requestAnimationFrame(animateCanvasPulse);
    }

    // --- Highlight Canvas ---
    function createHighlightCanvas() {
        removeHighlightCanvas();
        const container = document.querySelector(`#${gameId} .game-board-container`);
        if (!container) return;

        highlightCanvas = document.createElement('canvas');
        highlightCanvas.className = 'tutorial-highlight-canvas';
        container.appendChild(highlightCanvas);

        const gameCanvas = container.querySelector('canvas:not(.tutorial-highlight-canvas)');
        if (gameCanvas) {
            highlightCanvas.width = gameCanvas.width;
            highlightCanvas.height = gameCanvas.height;
        }
        highlightCtx = highlightCanvas.getContext('2d');
    }

    function removeHighlightCanvas() {
        if (highlightCanvas && highlightCanvas.parentNode) {
            highlightCanvas.parentNode.removeChild(highlightCanvas);
        }
        highlightCanvas = null;
        highlightCtx = null;
    }

    // --- Step Bar ---
    function renderStepBar() {
        const bar = document.getElementById('tutorial-step-bar');
        const titleEl = bar.querySelector('.tutorial-title');
        const dotsEl = bar.querySelector('.tutorial-dots');

        titleEl.innerHTML = `<span class="tutorial-badge">GUIDED</span>${activeFlow.name}`;

        dotsEl.innerHTML = '';
        activeFlow.steps.forEach((_, i) => {
            const dot = document.createElement('div');
            dot.className = 'tutorial-dot';
            dotsEl.appendChild(dot);
        });
    }

    // --- Completion ---
    function showCompletion() {
        clearPulse();
        document.getElementById('tutorial-tooltip').classList.remove('active');

        // Mark flow as completed
        completedFlows[`${gameId}-${activeFlow.id}`] = true;
        saveProgress();

        const xp = activeFlow.xpReward || 200;
        addXP(xp);
        addGamePlayed();

        // Show completion screen
        const overlay = document.getElementById('tutorial-complete');
        overlay.querySelector('.complete-flow-name').textContent = activeFlow.name;
        overlay.querySelector('.complete-xp').textContent = `+${xp} XP`;
        overlay.querySelector('.complete-message').textContent =
            activeFlow.completionMessage || 'Great job! You completed the tutorial. Try the game on your own now!';
        overlay.classList.add('show');

        // Confetti!
        spawnConfetti();
    }

    function hideCompletion() {
        document.getElementById('tutorial-complete').classList.remove('show');
        stopFlow();
    }

    function tryAnotherFlow() {
        document.getElementById('tutorial-complete').classList.remove('show');
        stopFlow();
        showFlowPicker(gameId);
    }

    function spawnConfetti() {
        const container = document.createElement('div');
        container.className = 'confetti-container';
        document.body.appendChild(container);
        const colors = ['#00e676', '#00b4d8', '#ff9100', '#b388ff', '#ff5252', '#ffd740'];
        for (let i = 0; i < 40; i++) {
            const c = document.createElement('div');
            c.className = 'confetti';
            c.style.left = Math.random() * 100 + '%';
            c.style.background = colors[Math.floor(Math.random() * colors.length)];
            c.style.animationDelay = Math.random() * 1.5 + 's';
            c.style.animationDuration = (2 + Math.random() * 2) + 's';
            c.style.width = (4 + Math.random() * 8) + 'px';
            c.style.height = (4 + Math.random() * 8) + 'px';
            c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
            container.appendChild(c);
        }
        setTimeout(() => container.remove(), 4000);
    }

    // --- User Action Callback ---
    function onUserAction(actionType, data) {
        if (!activeFlow || currentStepIndex < 0) return;
        const step = activeFlow.steps[currentStepIndex];
        if (!step || !step.action) return;

        if (step.action.validate) {
            const api = getGameAPI();
            if (step.action.validate(api, data, actionType)) {
                // Step completed - green flash on target
                if (pulseTarget && pulseTarget.type === 'dom' && pulseTarget.element) {
                    pulseTarget.element.classList.add('tutorial-step-flash');
                    setTimeout(() => pulseTarget.element?.classList.remove('tutorial-step-flash'), 500);
                }
                // Small beep
                playBeep(true);
                setTimeout(() => advanceStep(), 400);
            }
        }
    }

    // --- Audio ---
    function playBeep(success) {
        try {
            const actx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = actx.createOscillator();
            const gain = actx.createGain();
            osc.connect(gain);
            gain.connect(actx.destination);
            gain.gain.value = 0.08;
            osc.frequency.value = success ? 880 : 440;
            osc.type = 'sine';
            osc.start();
            osc.stop(actx.currentTime + 0.08);
            if (success) {
                const osc2 = actx.createOscillator();
                const gain2 = actx.createGain();
                osc2.connect(gain2);
                gain2.connect(actx.destination);
                gain2.gain.value = 0.08;
                osc2.frequency.value = 1100;
                osc2.type = 'sine';
                osc2.start(actx.currentTime + 0.12);
                osc2.stop(actx.currentTime + 0.2);
            }
        } catch (e) {}
    }

    // --- Game API Bridge ---
    function getGameAPI() {
        const games = { 'pcb-design': pcbGame, 'phone-assembly': assemblyGame, 'smt-line': smtGame, 'qc-inspector': qcGame };
        const game = games[gameId];
        return game && game.getTutorialAPI ? game.getTutorialAPI() : {};
    }

    // --- Public API ---
    return {
        showFlowPicker,
        hideFlowPicker,
        startFlow,
        stopFlow,
        onUserAction,
        hideCompletion,
        tryAnotherFlow,
        get activeFlow() { return activeFlow; },
        get currentStep() { return currentStepIndex; },
        isActive() { return !!activeFlow; }
    };
})();
