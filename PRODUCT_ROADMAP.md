# CircuitMaster India — Product Roadmap

> Gamified electronics manufacturing training for Indian NIELIT / ESSCI / iSMT certifications.
> ESSCI Qualification Pack: ELE/Q3901 v3.0 · NSQF Level 4

---

## Shipped (v1.0 – v1.8)

### v1.0 — Foundation (Initial Release)
- 4-station training platform: PCB Design Lab, Phone Assembly, SMT Pick & Place, QC Inspector
- HTML5 Canvas 2D rendering engine
- Tab-based station navigation
- Score + XP + Level progression system
- Responsive layout with dark theme

### v1.1 — PCB Design Lab Enhancements
- Realistic component drawings (resistor color bands, capacitor markings, IC package, LED dome, battery, transistor, potentiometer, switch)
- Hover info cards with component roles and specs
- Right-click-to-delete for components and traces
- Hover preview clearly visible on dark PCB background
- Click-any-pin wiring (no separate "Trace" tool required)
- Delete wires by clicking anywhere along their path

### v1.2 — Phone Assembly Expansion
- Added iPhone 17, Samsung S25 Ultra, and Pixel 9 Pro assembly models
- Hover info cards for phone components
- Shape-specific pictogram icons (56x56) for palette items (frame, PCB, battery, camera, speaker, USB-C, glass, NFC, antenna, taptic, S-Pen, temp sensor, display, dynamic island, inner shield)
- Fix: checklist items now match placed components correctly

### v1.3 — QC Inspector Beginner Mode
- Interactive defect training station
- Visual inspection gameplay with pass/fail judgement
- Skip-to-inspection option for experienced users
- Fix: prevent text selection on drag in game panels

### v1.4 — Professional Mode (ESSCI ELE/Q3901)
- Beginner/Professional toggle in Phone Assembly header
- 6 Pre-Line Skill Missions (Pack A — NOS 1: Prepare for Assembly):
  - ESD Continuity Test (PC1.1, PC1.2) — analog multimeter with 3 devices
  - Kit & BOM Verification (PC1.5, PC1.6) — match 6 bins to BOM, reject wrong-rev/qty
  - MSD Moisture Decision (PC1.8) — humidity indicator card + exposure log, 3 scenarios
- Station Readiness Score gate (average >= 80 to proceed)
- Live Performance Rubric during assembly:
  - ESD Compliance (PC2.1) with wrist-strap watchdog timer
  - Sequence Adherence (PC2.3)
  - Cycle Time vs target (PC2.5)
  - Torque Discipline (PC3.2) with in-line torque prompts
  - First-Pass Yield (PC3.1)
- End-of-run Professional Report with A/B/C/D grading

### v1.5 — Teach Me First (Guided Learning Layer)
- LEARN → PRACTICE → PROVE gate for fresh users
- 8 Phone Assembly lessons (frame, PCB, battery, display, camera, speaker, USB-C, glass)
- Multilingual content: English, Hindi, Tamil, Telugu
- Web Speech API TTS with strict voice-to-text language matching
- Language picker with flag buttons (en, hi, ta, te)
- Checkpoint quizzes (3 questions per station)
- localStorage gating (learn-lang, learn-done, learn-checkpoint)
- Offline TTS generation tool (`tools/generate_tts.py`) supporting AI4Bharat Indic Parler-TTS
- Scoped CSS (`.learn-*`) with zero coupling to existing game code
- Factory context with wage info for motivation

### v1.6 — Pro Mode Missions Complete (No More Stubs)
- 5S Workstation Audit (PC1.3) — Spot-the-Violation:
  - Top-down ESD bench canvas with 8 hotspots (6 violations, 4 decoys)
  - Score: -20 per missed violation, -12 per false report
- Torque Driver Calibration (PC1.4, PC3.2) — Dial-the-Needle:
  - Animated torque gauge with green tolerance band + red over-torque arc
  - 3 fasteners (Frame 1.5 Nm, Display 0.8 Nm, Battery 1.2 Nm), +/-0.08 Nm tolerance
  - Slider starts near target with random offset for fine-tuning
  - 3 attempts per fastener, hard penalty for over-torque
- JIG & Fixture Setup (PC1.7) — Snap-Fit Alignment:
  - Draggable phone chassis onto 4-peg assembly jig
  - Live corner-delta indicators (green/red within +/-6 px)
  - Rotation fine-tune slider (+/-2 degree tolerance)
  - Lock Clamp enables only when all 5 conditions pass

### v1.7 — Real-World Indian PCB Challenges
- 5 new culturally-resonant circuit challenges:
  - Monsoon Rain Alarm (rain probes + transistor + LED) — Rs.45 BOM
  - Diwali LED Diya (NE555 astable flameless festive light) — Rs.60 BOM
  - Mobile USB Charger (7805 regulator + filter caps + power LED) — Rs.80 BOM
  - Apartment Doorbell (push switch + NE555 monostable chime) — Rs.90 BOM
  - Inverter Low-Battery Alarm (voltage divider + transistor warning) — Rs.55 BOM
- Each challenge has a real-world story card with BOM cost and usage context
- Challenge dropdown auto-populates from the challenges array (adding new ones is a 1-liner)

### v1.8 — PCB Wiring UX Overhaul
- Trace status coloring:
  - Correct wires render GREEN and fade to 40% opacity (declutter)
  - Wrong wires render RED with pulsing glow + cross marker at midpoint
- Pin labels on every pin (V+, V-, A+, K-, VCC, GND, IN, OUT, B, C, E, W)
- Color-coded pins: yellow (next target), blue (pending), green (connected), gray (unused)
- Human-readable hint: "NEXT: Battery (V+) -> Switch (1)" instead of raw spec strings
- Wire progress badge on canvas: "Wires: 3/8 . 1 wrong"
- Auto-reclassification when components are deleted/moved

---

## Planned (Next)

### v1.9 — SMT Pick & Place Station Rebuild
- Realistic feeder-to-board pick-and-place simulation
- Component orientation and polarity checking
- Solder paste stencil alignment mini-game

### v2.0 — Multilingual UI (Full i18n)
- Translate all UI strings (not just TTS) to Hindi, Tamil, Telugu
- RTL-safe layout for future Urdu support
- NSQF certificate PDF generation in selected language

### v2.1 — Content Expansion
- Teach Me First lessons for PCB Design, SMT, QC stations
- Additional phone models (OnePlus, Vivo, Xiaomi — India market leaders)
- Advanced Professional Mode missions for NOS 2-4

### v2.2 — Assessment & Certification
- Timed skill assessment mode
- Score history and progress dashboard
- ESSCI-aligned certificate generation
- Instructor dashboard for ITI/Polytechnic batch tracking

### v2.3 — Offline & Mobile
- PWA with service worker for offline use (factory floor has no WiFi)
- Touch-optimized controls for tablet/phone
- Pre-recorded Parler-TTS audio bundles (no browser TTS dependency)

---

## Architecture

```
index.html              Entry point, tab navigation
app.js                  XP/level system, tab switching, modal framework
pcb-game.js             PCB Design Lab (canvas, components, traces, challenges)
assembly-game.js        Phone Assembly (drag-drop parts, wiring)
assembly-pro.js         Professional Mode (missions, rubric, ESD watchdog)
smt-game.js             SMT Pick & Place
qc-game.js              QC Inspector
learn-engine.js         Teach Me First engine (gate, lessons, checkpoints)
learn-content.js        Lesson data (localized text, TTS content)
tutorial-engine.js      Guided mode overlay engine
tutorial-flows.js       Step-by-step tutorial definitions
styles.css              Global + PCB + Pro mode styles
learn-styles.css        Scoped learn-mode styles
tutorial-styles.css     Tutorial overlay styles
tools/generate_tts.py   Offline TTS generation (Parler-TTS / MMS)
```

## Tech Stack
- Vanilla JS (IIFE module pattern, CustomEvent coupling)
- HTML5 Canvas 2D
- Web Speech API (SpeechSynthesisUtterance)
- localStorage persistence
- Python + HuggingFace Transformers (offline TTS tooling)
- Static hosting (Vercel via GitHub auto-deploy)
