# ⚡ CircuitMaster India

> **Gamified Electronics Manufacturing Skills Training Platform**
> Aligned with NIELIT, ESSCI & iSMT certification programs

![CircuitMaster India](https://img.shields.io/badge/CircuitMaster-India-3ecf71?style=for-the-badge&logo=lightning&logoColor=white)
![Vanilla JS](https://img.shields.io/badge/Vanilla-JS-f7df1e?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5 Canvas](https://img.shields.io/badge/HTML5-Canvas-e34f26?style=for-the-badge&logo=html5&logoColor=white)
![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-3ecf71?style=for-the-badge)

---

## 🎯 What Is This?

CircuitMaster India is an interactive, browser-based training platform that teaches **electronics manufacturing skills** through gamified simulations. Built for India's growing electronics workforce, it supports learners preparing for:

- 🏛️ **NIELIT** – National Institute of Electronics & IT
- 🏭 **ESSCI** – Electronics Sector Skills Council of India
- 📋 **iSMT** – India Surface Mount Technology certifications

No installation. No framework. Just open `index.html` and learn by doing.

---

## 🕹️ Games & Modules

### 1. 🔌 PCB Design Lab *(Intermediate)*
Design working circuits by placing components on a PCB and routing traces.
- Drag & drop components (Resistor, Capacitor, LED, IC, Transistor, Battery, Switch)
- Route copper traces between component pads
- Power on & simulate the circuit
- Match schematics to earn points
- **3 challenge levels**: LED Circuit → Timer Circuit → H-Bridge Motor Driver

### 2. 📱 Smartphone Assembly Line *(Beginner)*
Assemble a smartphone layer-by-layer in the correct manufacturing order.
- Realistic component visuals drawn on HTML5 Canvas:
  - Aluminum/titanium frame with side buttons and screw bosses
  - Green PCB motherboard with gold trace network and labeled IC packages (SoC, DRAM, PMIC, RF, NAND)
  - Li-Po battery pouch with capacity bar and connector tabs
  - Camera module with multi-ring lens and AR coating shimmer
  - Speaker mesh with staggered dot array
  - USB-C port with internal tongue and gold contact pads
  - AMOLED display with punch-hole camera notch
  - Glass panel with curved reflection streaks
- **3 phone models**: Basic Smartphone, Premium Flagship, Rugged Phone

### 3. ⚙️ SMT Pick & Place *(Advanced)*
Operate a Surface Mount Technology production line.
- Apply solder paste to PCB pads
- Pick & place SMD components with precision
- Reflow soldering simulation
- Inspection phase
- **3 board types** with increasing component density

### 4. 🔍 QC Inspector *(Beginner)*
Spot defects on assembled PCBs before they ship.
- Use inspection tools (Visual, Magnifier, X-Ray, Thermal)
- Identify solder bridges, missing components, lifted pads, cold joints
- Time-pressured accuracy scoring
- Defect detection rate tracking

---

## 🎓 Guided Mode (Beginner / Tutorial System)

Every game has a **GUIDED MODE** — a full tutorial overlay engine with:

- **Flow Picker** — Choose from 3 tutorial flows per game (12 total)
- **Step-by-step tooltips** with instructions and detail text
- **Pulsing highlight rings** on the exact element to interact with
- **Canvas overlay highlights** for canvas-based targets
- **Auto-advance** on correct user action
- **Completion screen** with confetti and XP reward

### Tutorial Flows
| Game | Flow 1 | Flow 2 | Flow 3 |
|------|--------|--------|--------|
| PCB Design Lab | LED Circuit Basics | Timer & Oscillator | Motor Driver |
| Phone Assembly | Basic Smartphone | Premium Flagship | Rugged Build |
| SMT Pick & Place | Intro to SMT | QFN Placement | BGA Rework |
| QC Inspector | Visual Inspection | X-Ray Analysis | Thermal Imaging |

---

## 🏆 Progression System

| Stat | Description |
|------|-------------|
| **XP** | Earned every game, scales with score |
| **Level** | Increases every 500 XP |
| **Games Played** | Running total across all modules |

Progress is saved in `localStorage` — no backend required.

---

## 🖥️ Tech Stack

| Layer | Tech |
|-------|------|
| Markup | HTML5 (semantic, no framework) |
| Styling | CSS3 with custom properties (variables) |
| Logic | Vanilla JavaScript (ES6, IIFE modules) |
| Rendering | HTML5 Canvas 2D API |
| Fonts | Inter + JetBrains Mono (Google Fonts) |
| Storage | localStorage (XP, level, game count) |
| Server | Python3 `http.server` (dev only) |

**Zero npm. Zero build step. Zero dependencies.**

---

## 🚀 Getting Started

### Option A — Just open it
```bash
git clone https://github.com/sanjibani/circuitmaster-india.git
cd circuitmaster-india
open index.html
```

### Option B — Local dev server (recommended for full feature support)
```bash
git clone https://github.com/sanjibani/circuitmaster-india.git
cd circuitmaster-india
python3 -m http.server 8765
# Open http://localhost:8765
```

No Node.js, no npm install, no config — it just works.

---

## 📁 Project Structure

```
circuitmaster-india/
├── index.html           # Main HTML — tabs, tutorial overlay, all game sections
├── styles.css           # CircuitMaster theme — dark green industrial PCB aesthetic
├── app.js               # Global state, XP system, tab switching, shared utilities
├── pcb-game.js          # PCB Design Lab — grid snapping, trace routing, simulation
├── assembly-game.js     # Phone Assembly — realistic component canvas rendering
├── smt-game.js          # SMT Pick & Place — paste, pick, reflow, inspect phases
├── qc-game.js           # QC Inspector — defect detection with multiple tool modes
├── tutorial-engine.js   # Tutorial overlay engine — flow picker, step advancement
├── tutorial-flows.js    # 12 tutorial flows — step definitions and validate functions
└── tutorial-styles.css  # Tutorial UI styles — tooltips, pulse rings, confetti
```

---

## 🎨 Design System

Built on a **dark industrial PCB aesthetic** inspired by real manufacturing environments:

```css
--bg-dark:       #0f1117   /* Near-black background */
--bg-card:       #161b27   /* Card / panel surface */
--accent-green:  #3ecf71   /* Primary action / success */
--accent-blue:   #4db8ff   /* Info / highlight */
--accent-red:    #ff5252   /* Error / defect */
--text-primary:  #e8edf5   /* Main text */
--text-secondary:#7a8ba5   /* Muted / labels */
```

Fonts:
- **Inter** — UI text, labels, body
- **JetBrains Mono** — scores, values, technical data

---

## 🗺️ Roadmap

- [ ] Sound effects (correct placement chime, error buzz, power-on boot)
- [ ] Mobile / tablet responsive layout
- [ ] More phone models (flip phone, feature phone teardown)
- [ ] Soldering simulation module (through-hole)
- [ ] Component identification quiz mode
- [ ] Regional language support (Hindi, Tamil, Telugu, Kannada)
- [ ] Trainer dashboard — track student progress
- [ ] Certificate generation on module completion
- [ ] Offline PWA support

---

## 🤝 Contributing

Pull requests welcome! For major changes, open an issue first.

```bash
git checkout -b feature/your-feature-name
# make changes
git commit -m "feat: describe your change"
git push origin feature/your-feature-name
```

---

## 📄 License

MIT License — free to use, modify, and distribute for educational purposes.

---

<div align="center">
  <strong>Built for India's electronics manufacturing workforce</strong><br/>
  NIELIT · ESSCI · iSMT aligned training
</div>
