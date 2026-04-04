window.tutorialFlows = {

    // ========== PCB DESIGN LAB ==========
    'pcb-design': [
        {
            id: 'first-led',
            name: 'Your First LED Circuit',
            description: 'Build a complete LED circuit from scratch. Learn what each component does and how to wire them together.',
            difficulty: 'Beginner',
            xpReward: 250,
            completionMessage: 'You built a working LED circuit! The resistor protects the LED from too much current. Try the game freely now!',
            setup: (api) => {
                api.loadChallenge(0);
            },
            steps: [
                {
                    instruction: 'Select the Battery from the component palette',
                    detail: 'Every circuit needs a power source. The battery provides the voltage that pushes electricity through the circuit. Click on the Battery in the left panel.',
                    target: { type: 'palette-item', selector: '#pcb-components .palette-item[data-type="battery"]' },
                    action: { validate: (api, data) => api.getSelectedComponent() === 'battery' }
                },
                {
                    instruction: 'Place the Battery on the board',
                    detail: 'Click anywhere on the green PCB board to place the battery. This will be your power source. Try placing it on the left side.',
                    target: { type: 'canvas-region', computePosition: () => ({ x: 100, y: 200, w: 60, h: 60 }) },
                    action: { validate: (api) => api.getPlacedComponents().some(c => c.type === 'battery') }
                },
                {
                    instruction: 'Now select the Switch',
                    detail: 'A switch lets you turn the circuit on and off. Without it, the LED would always be on! Click on the Switch component.',
                    target: { type: 'palette-item', selector: '#pcb-components .palette-item[data-type="switch"]' },
                    action: { validate: (api, data) => api.getSelectedComponent() === 'switch' }
                },
                {
                    instruction: 'Place the Switch on the board',
                    detail: 'Place the switch to the right of the battery. Current will flow from battery through the switch.',
                    target: { type: 'canvas-region', computePosition: () => ({ x: 250, y: 200, w: 60, h: 40 }) },
                    action: { validate: (api) => api.getPlacedComponents().some(c => c.type === 'switch') }
                },
                {
                    instruction: 'Select the Resistor',
                    detail: 'The resistor limits current flow to protect the LED. Without it, too much current would burn out the LED! This is the most important safety component.',
                    target: { type: 'palette-item', selector: '#pcb-components .palette-item[data-type="resistor"]' },
                    action: { validate: (api, data) => api.getSelectedComponent() === 'resistor' }
                },
                {
                    instruction: 'Place the Resistor on the board',
                    detail: 'Place it next to the switch. The value 10k\u03a9 means it resists 10,000 ohms of current.',
                    target: { type: 'canvas-region', computePosition: () => ({ x: 400, y: 200, w: 60, h: 40 }) },
                    action: { validate: (api) => api.getPlacedComponents().some(c => c.type === 'resistor') }
                },
                {
                    instruction: 'Select the LED',
                    detail: 'LED stands for Light Emitting Diode. It converts electricity into light! This is the output of your circuit.',
                    target: { type: 'palette-item', selector: '#pcb-components .palette-item[data-type="led"]' },
                    action: { validate: (api, data) => api.getSelectedComponent() === 'led' }
                },
                {
                    instruction: 'Place the LED on the board',
                    detail: 'Place the LED to complete your component layout. LEDs have polarity - they only work in one direction.',
                    target: { type: 'canvas-region', computePosition: () => ({ x: 550, y: 200, w: 60, h: 60 }) },
                    action: { validate: (api) => api.getPlacedComponents().some(c => c.type === 'led') }
                },
                {
                    instruction: 'Switch to the Route Trace tool',
                    detail: 'Now we need to connect the components with copper traces. Click the "Route Trace" button to start wiring.',
                    target: { type: 'tool-button', selector: '#pcb-design .board-toolbar .tool-btn[data-tool="trace"]' },
                    action: { validate: (api) => api.getCurrentTool() === 'trace' }
                },
                {
                    instruction: 'Connect the components by clicking pins',
                    detail: 'Click on the green pin dots to create connections. Click one pin, then click another pin to draw a trace between them. Connect all components in a loop: Battery \u2192 Switch \u2192 Resistor \u2192 LED \u2192 Battery.',
                    target: { type: 'canvas-region', computePosition: () => ({ x: 300, y: 180, w: 200, h: 80 }) },
                    action: { validate: (api) => api.getTraces().length >= 1 }
                },
                {
                    instruction: 'Click "Power On & Test" to see your circuit work!',
                    detail: 'Time to see if your circuit works! Click the green button to send power through your circuit and watch the LED light up.',
                    target: { type: 'dom-element', selector: '#pcb-design .btn-success' },
                    action: { validate: (api, data, actionType) => actionType === 'pcb-power' }
                }
            ]
        },
        {
            id: 'meet-components',
            name: 'Meet the Components',
            description: 'Learn what each electronic component does by placing them one by one with detailed explanations.',
            difficulty: 'Beginner',
            xpReward: 200,
            completionMessage: 'You now know all the basic electronic components! Resistors limit current, capacitors store charge, LEDs emit light, transistors amplify, and ICs are mini-circuits.',
            setup: (api) => { api.loadChallenge(0); },
            steps: [
                {
                    instruction: 'Place a Resistor - the current limiter',
                    detail: 'Resistors are the most common component. They resist the flow of electricity. Measured in Ohms (\u03a9). Higher value = more resistance. Used to protect other components from too much current.',
                    target: { type: 'palette-item', selector: '#pcb-components .palette-item[data-type="resistor"]' },
                    action: { validate: (api) => api.getSelectedComponent() === 'resistor' }
                },
                {
                    instruction: 'Place it on the board, then try a Capacitor',
                    detail: 'Click the board to place the resistor. Resistors have color bands that indicate their value - this is how engineers read them.',
                    target: { type: 'canvas-region', computePosition: () => ({ x: 200, y: 200, w: 80, h: 40 }) },
                    action: { validate: (api) => api.getPlacedComponents().some(c => c.type === 'resistor') }
                },
                {
                    instruction: 'Select the Capacitor - energy storage',
                    detail: 'Capacitors store and release electrical energy. Think of them as tiny rechargeable batteries. They smooth out voltage fluctuations in circuits. Measured in Farads (F).',
                    target: { type: 'palette-item', selector: '#pcb-components .palette-item[data-type="capacitor"]' },
                    action: { validate: (api) => api.getSelectedComponent() === 'capacitor' }
                },
                {
                    instruction: 'Place the Capacitor on the board',
                    detail: 'Capacitors come in many sizes. 100\u00b5F is a medium-sized capacitor used for power filtering.',
                    target: { type: 'canvas-region', computePosition: () => ({ x: 350, y: 200, w: 60, h: 60 }) },
                    action: { validate: (api) => api.getPlacedComponents().some(c => c.type === 'capacitor') }
                },
                {
                    instruction: 'Select the Transistor - the electronic switch',
                    detail: 'Transistors are the building blocks of modern electronics. They can amplify signals or act as switches. A small current at the base controls a larger current. CPUs have billions of these!',
                    target: { type: 'palette-item', selector: '#pcb-components .palette-item[data-type="transistor"]' },
                    action: { validate: (api) => api.getSelectedComponent() === 'transistor' }
                },
                {
                    instruction: 'Place the Transistor, then try the IC Chip',
                    detail: 'The 2N2222 is one of the most popular transistors. It has 3 pins: Base (control), Collector (input), Emitter (output).',
                    target: { type: 'canvas-region', computePosition: () => ({ x: 500, y: 200, w: 60, h: 60 }) },
                    action: { validate: (api) => api.getPlacedComponents().some(c => c.type === 'transistor') }
                },
                {
                    instruction: 'Select the IC Chip - a complete circuit in one package',
                    detail: 'IC (Integrated Circuit) chips contain entire circuits miniaturized onto silicon. The NE555 timer IC is legendary - used in billions of devices for generating pulses and timing.',
                    target: { type: 'palette-item', selector: '#pcb-components .palette-item[data-type="ic"]' },
                    action: { validate: (api) => api.getSelectedComponent() === 'ic' }
                },
                {
                    instruction: 'Place the IC Chip to complete your component tour!',
                    detail: 'IC chips have multiple pins, each with a specific function. The datasheet tells you what each pin does. The NE555 has 8 pins.',
                    target: { type: 'canvas-region', computePosition: () => ({ x: 300, y: 350, w: 80, h: 60 }) },
                    action: { validate: (api) => api.getPlacedComponents().some(c => c.type === 'ic') }
                }
            ]
        },
        {
            id: 'trace-practice',
            name: 'Trace Routing Practice',
            description: 'Learn how to route copper traces between component pins. Pre-placed components let you focus on wiring.',
            difficulty: 'Beginner',
            xpReward: 150,
            completionMessage: 'You can now route traces! Remember: traces carry electricity between components. Avoid crossing traces in real PCB design.',
            setup: (api) => {
                api.loadChallenge(0);
                // Pre-place components via selecting and programmatic placement
                api.selectComponent('battery');
                api.simulatePlace(120, 200);
                api.selectComponent('switch');
                api.simulatePlace(240, 200);
                api.selectComponent('resistor');
                api.simulatePlace(380, 200);
                api.selectComponent('led');
                api.simulatePlace(520, 200);
                api.setTool('place');
            },
            steps: [
                {
                    instruction: 'Switch to the Route Trace tool',
                    detail: 'The components are already placed for you! Now you just need to connect them. Click the "Route Trace" button in the toolbar below the board.',
                    target: { type: 'tool-button', selector: '#pcb-design .board-toolbar .tool-btn[data-tool="trace"]' },
                    action: { validate: (api) => api.getCurrentTool() === 'trace' }
                },
                {
                    instruction: 'Click a green pin on any component to start a trace',
                    detail: 'See the green dots on each component? Those are pins - connection points. Click one to start a trace wire. Then click another pin to complete the connection.',
                    target: { type: 'canvas-region', computePosition: () => ({ x: 120, y: 200, w: 40, h: 40 }) },
                    action: { validate: (api) => api.getTraces().length >= 1 }
                },
                {
                    instruction: 'Keep connecting! Route a second trace',
                    detail: 'Great first trace! Now connect more pins. In a real LED circuit, current flows: Battery(+) \u2192 Switch \u2192 Resistor \u2192 LED \u2192 Battery(-). Try to follow this path.',
                    target: { type: 'canvas-region', computePosition: () => ({ x: 300, y: 200, w: 200, h: 40 }) },
                    action: { validate: (api) => api.getTraces().length >= 2 }
                },
                {
                    instruction: 'Route one more trace to complete the loop',
                    detail: 'Electricity needs a complete loop (circuit) to flow. Connect the remaining pins to close the circuit. Without a complete loop, no current flows!',
                    target: { type: 'canvas-region', computePosition: () => ({ x: 400, y: 200, w: 200, h: 40 }) },
                    action: { validate: (api) => api.getTraces().length >= 3 }
                },
                {
                    instruction: 'Power On to test your wiring!',
                    detail: 'Let\'s see if your traces carry electricity properly. Click "Power On & Test" - if the traces glow orange, current is flowing!',
                    target: { type: 'dom-element', selector: '#pcb-design .btn-success' },
                    action: { validate: (api, data, actionType) => actionType === 'pcb-power' }
                }
            ]
        }
    ],

    // ========== PHONE ASSEMBLY ==========
    'phone-assembly': [
        {
            id: 'first-phone',
            name: 'Build Your First Phone',
            description: 'Assemble a basic smartphone step by step. Learn what each internal component does and the correct assembly order.',
            difficulty: 'Beginner',
            xpReward: 300,
            completionMessage: 'You assembled a complete smartphone! The order matters - frame first, internals next, display and glass last. Just like a real factory!',
            setup: (api) => { api.loadModel(0); },
            steps: [
                {
                    instruction: 'Click "Metal Frame" in the Parts Bin',
                    detail: 'The frame is always first - it\'s the skeleton that holds everything together. In real phone factories, the aluminum frame is CNC-machined from a single block of metal.',
                    target: { type: 'palette-item', selector: '#assembly-parts [data-part-id="frame"]' },
                    action: { validate: (api, data) => data && data.partId === 'frame' }
                },
                {
                    instruction: 'Now install the Motherboard',
                    detail: 'The motherboard (PCB) is the brain of the phone. It contains the processor (SoC), RAM, storage, and all the circuits that make the phone work. It gets mounted to the frame first.',
                    target: { type: 'palette-item', selector: '#assembly-parts [data-part-id="motherboard"]' },
                    action: { validate: (api, data) => data && data.partId === 'motherboard' }
                },
                {
                    instruction: 'Install the Battery',
                    detail: 'The Li-Po (Lithium Polymer) battery provides power. At 4000mAh, it can run the phone for a full day. Batteries are glued in place with adhesive strips.',
                    target: { type: 'palette-item', selector: '#assembly-parts [data-part-id="battery"]' },
                    action: { validate: (api, data) => data && data.partId === 'battery' }
                },
                {
                    instruction: 'Add the Camera Module',
                    detail: 'The 48MP camera module connects to the motherboard via a flex cable. The image sensor (Sony IMX series) converts light into electrical signals.',
                    target: { type: 'palette-item', selector: '#assembly-parts [data-part-id="camera"]' },
                    action: { validate: (api, data) => data && data.partId === 'camera' }
                },
                {
                    instruction: 'Install the Speaker',
                    detail: 'The speaker module creates sound by vibrating a small membrane. Bottom-firing design directs sound downward so it bounces off surfaces toward you.',
                    target: { type: 'palette-item', selector: '#assembly-parts [data-part-id="speaker"]' },
                    action: { validate: (api, data) => data && data.partId === 'speaker' }
                },
                {
                    instruction: 'Add the USB-C Port',
                    detail: 'The USB-C connector handles charging and data transfer. It\'s soldered to a small flex PCB that connects to the motherboard.',
                    target: { type: 'palette-item', selector: '#assembly-parts [data-part-id="connector"]' },
                    action: { validate: (api, data) => data && data.partId === 'connector' }
                },
                {
                    instruction: 'Mount the Display Panel',
                    detail: 'The 6.5" AMOLED display is one of the most expensive parts. Each pixel emits its own light - no backlight needed. This is why AMOLED screens have perfect blacks.',
                    target: { type: 'palette-item', selector: '#assembly-parts [data-part-id="display"]' },
                    action: { validate: (api, data) => data && data.partId === 'display' }
                },
                {
                    instruction: 'Seal with the Front Glass - last step!',
                    detail: 'Gorilla Glass 5 protects the display. It\'s chemically strengthened by ion exchange - potassium ions replace sodium ions in the glass surface, creating compressive stress.',
                    target: { type: 'palette-item', selector: '#assembly-parts [data-part-id="glass"]' },
                    action: { validate: (api, data) => data && data.partId === 'glass' }
                },
                {
                    instruction: 'Click "Power On Test" to boot your phone!',
                    detail: 'In real factories, every assembled phone goes through a Power-On Self Test (POST). It checks display, touch, cameras, sensors, speakers, and connectivity.',
                    target: { type: 'dom-element', selector: '#phone-assembly .btn-success' },
                    action: { validate: (api, data, actionType) => actionType === 'assembly-test' }
                }
            ]
        },
        {
            id: 'premium-build',
            name: 'Premium Flagship Build',
            description: 'Assemble a high-end flagship with multiple cameras, NFC, and premium materials. More complex, more to learn!',
            difficulty: 'Intermediate',
            xpReward: 400,
            completionMessage: 'You assembled a premium flagship! Notice the extra components: NFC for payments, periscope zoom for photography, titanium frame for durability.',
            setup: (api) => { api.loadModel(1); },
            steps: [
                {
                    instruction: 'Start with the Titanium Frame',
                    detail: 'Grade 5 Titanium is 45% lighter than steel but equally strong. Apple and Samsung use it in their most premium phones. It\'s machined with specialized CNC tools.',
                    target: { type: 'palette-item', selector: '#assembly-parts [data-part-id="frame"]' },
                    action: { validate: (api, data) => data && data.partId === 'frame' }
                },
                {
                    instruction: 'Mount the Logic Board',
                    detail: 'Premium phones use HDI (High Density Interconnect) PCBs with 12+ layers. More layers = more routing channels = smaller board = more room for battery.',
                    target: { type: 'palette-item', selector: '#assembly-parts [data-part-id="motherboard"]' },
                    action: { validate: (api, data) => data && data.partId === 'motherboard' }
                },
                {
                    instruction: 'Install the NFC Coil',
                    detail: 'NFC (Near Field Communication) enables contactless payments and quick device pairing. The coil creates a magnetic field that transfers data over a few centimeters.',
                    target: { type: 'palette-item', selector: '#assembly-parts [data-part-id="nfc"]' },
                    action: { validate: (api, data) => data && data.partId === 'nfc' }
                },
                {
                    instruction: 'Install the Battery',
                    detail: '5000mAh Li-Po battery - 25% larger than the basic model. Premium phones need more power for larger screens and faster processors.',
                    target: { type: 'palette-item', selector: '#assembly-parts [data-part-id="battery"]' },
                    action: { validate: (api, data) => data && data.partId === 'battery' }
                },
                {
                    instruction: 'Add the Main Camera (200MP)',
                    detail: 'The Samsung HP2 200MP sensor is massive - each photo captures 200 million pixels. It uses pixel binning to combine 16 pixels into 1 for better low-light photos.',
                    target: { type: 'palette-item', selector: '#assembly-parts [data-part-id="camera1"]' },
                    action: { validate: (api, data) => data && data.partId === 'camera1' }
                },
                {
                    instruction: 'Add the Ultra-wide Camera',
                    detail: 'Ultra-wide cameras use a wider-angle lens (120\u00b0+) to capture more of the scene. Great for landscapes and group photos. Lower resolution but wider field of view.',
                    target: { type: 'palette-item', selector: '#assembly-parts [data-part-id="camera2"]' },
                    action: { validate: (api, data) => data && data.partId === 'camera2' }
                },
                {
                    instruction: 'Add the Periscope Zoom Camera',
                    detail: 'Periscope cameras use a prism to bend light 90\u00b0, allowing a telephoto lens to fit sideways inside the thin phone body. This enables 5x optical zoom without a bulky lens.',
                    target: { type: 'palette-item', selector: '#assembly-parts [data-part-id="camera3"]' },
                    action: { validate: (api, data) => data && data.partId === 'camera3' }
                },
                {
                    instruction: 'Install the Stereo Speakers',
                    detail: 'Stereo speakers use both top and bottom speakers for spatial sound. Tuned by audio engineers for balanced frequency response.',
                    target: { type: 'palette-item', selector: '#assembly-parts [data-part-id="speaker"]' },
                    action: { validate: (api, data) => data && data.partId === 'speaker' }
                },
                {
                    instruction: 'Add the USB-C Port',
                    detail: 'USB 3.2 Gen 2 supports 10 Gbps data transfer and 45W fast charging. The connector is rated for 10,000+ insertions.',
                    target: { type: 'palette-item', selector: '#assembly-parts [data-part-id="connector"]' },
                    action: { validate: (api, data) => data && data.partId === 'connector' }
                },
                {
                    instruction: 'Mount the LTPO Display',
                    detail: 'LTPO (Low-Temperature Polycrystalline Oxide) displays can vary refresh rate from 1Hz to 120Hz dynamically. Static content runs at 1Hz to save battery, scrolling ramps to 120Hz for smoothness.',
                    target: { type: 'palette-item', selector: '#assembly-parts [data-part-id="display"]' },
                    action: { validate: (api, data) => data && data.partId === 'display' }
                },
                {
                    instruction: 'Seal with Ceramic Glass',
                    detail: 'Ceramic Shield glass infuses ceramic nanocrystals into the glass matrix, making it 4x more drop-resistant than previous generations.',
                    target: { type: 'palette-item', selector: '#assembly-parts [data-part-id="glass"]' },
                    action: { validate: (api, data) => data && data.partId === 'glass' }
                },
                {
                    instruction: 'Power On Test!',
                    detail: 'Premium phones undergo 200+ quality tests including drop tests, water resistance, thermal cycling, and signal quality checks before shipping.',
                    target: { type: 'dom-element', selector: '#phone-assembly .btn-success' },
                    action: { validate: (api, data, actionType) => actionType === 'assembly-test' }
                }
            ]
        },
        {
            id: 'rugged-build',
            name: 'Rugged Phone Build',
            description: 'Build a rugged phone designed for extreme environments. Learn about waterproofing, shock absorption, and satellite SOS.',
            difficulty: 'Intermediate',
            xpReward: 350,
            completionMessage: 'You built a rugged phone! Key differences: rubber shock frame, metal inner shield for IP68, conformal-coated PCB, satellite antenna, and sapphire glass.',
            setup: (api) => { api.loadModel(2); },
            steps: [
                {
                    instruction: 'Start with the Rubber Frame',
                    detail: 'Rugged phones use shock-absorbing rubber frames that can survive 1.5m drops onto concrete. The frame is injection-molded TPU (Thermoplastic Polyurethane).',
                    target: { type: 'palette-item', selector: '#assembly-parts [data-part-id="frame"]' },
                    action: { validate: (api, data) => data && data.partId === 'frame' }
                },
                {
                    instruction: 'Install the Metal Shield',
                    detail: 'IP68 rating means dust-tight and survives 1.5m underwater for 30 minutes. This inner metal frame creates a sealed compartment for the electronics.',
                    target: { type: 'palette-item', selector: '#assembly-parts [data-part-id="shield"]' },
                    action: { validate: (api, data) => data && data.partId === 'shield' }
                },
                {
                    instruction: 'Mount the Sealed PCB',
                    detail: 'The PCB has conformal coating - a thin polymer layer that waterproofs every trace and component. Even if water enters the case, the electronics are protected.',
                    target: { type: 'palette-item', selector: '#assembly-parts [data-part-id="motherboard"]' },
                    action: { validate: (api, data) => data && data.partId === 'motherboard' }
                },
                {
                    instruction: 'Install the Battery',
                    detail: '6000mAh - the largest battery of all three models. Rugged phones prioritize battery life since they\'re used in remote areas where charging isn\'t available.',
                    target: { type: 'palette-item', selector: '#assembly-parts [data-part-id="battery"]' },
                    action: { validate: (api, data) => data && data.partId === 'battery' }
                },
                {
                    instruction: 'Add the Night Vision Camera',
                    detail: '64MP camera with infrared sensitivity for low-light and night vision photography. Used by search & rescue, military, and outdoor enthusiasts.',
                    target: { type: 'palette-item', selector: '#assembly-parts [data-part-id="camera"]' },
                    action: { validate: (api, data) => data && data.partId === 'camera' }
                },
                {
                    instruction: 'Install the Satellite Antenna Module',
                    detail: 'Satellite SOS allows emergency communication even without cell towers. Uses Iridium or Globalstar satellites. Critical for wilderness safety.',
                    target: { type: 'palette-item', selector: '#assembly-parts [data-part-id="antenna"]' },
                    action: { validate: (api, data) => data && data.partId === 'antenna' }
                },
                {
                    instruction: 'Install the Loud Speaker',
                    detail: '110dB rated - louder than a car horn! Essential for outdoor use where ambient noise is high. Uses a larger driver than standard phones.',
                    target: { type: 'palette-item', selector: '#assembly-parts [data-part-id="speaker"]' },
                    action: { validate: (api, data) => data && data.partId === 'speaker' }
                },
                {
                    instruction: 'Mount the Sunlight Display',
                    detail: 'High-brightness IPS panel designed for outdoor visibility. Can reach 1000+ nits brightness so you can read it in direct sunlight.',
                    target: { type: 'palette-item', selector: '#assembly-parts [data-part-id="display"]' },
                    action: { validate: (api, data) => data && data.partId === 'display' }
                },
                {
                    instruction: 'Seal with Sapphire Glass',
                    detail: 'Sapphire is the second hardest material after diamond (9 on Mohs scale). It\'s virtually scratch-proof. Used in premium watch faces and military optics.',
                    target: { type: 'palette-item', selector: '#assembly-parts [data-part-id="glass"]' },
                    action: { validate: (api, data) => data && data.partId === 'glass' }
                },
                {
                    instruction: 'Power On Test!',
                    detail: 'Rugged phones are tested with MIL-STD-810H military standards: extreme temperatures (-20\u00b0C to 60\u00b0C), humidity, vibration, and altitude.',
                    target: { type: 'dom-element', selector: '#phone-assembly .btn-success' },
                    action: { validate: (api, data, actionType) => actionType === 'assembly-test' }
                }
            ]
        }
    ],

    // ========== SMT PICK & PLACE ==========
    'smt-line': [
        {
            id: 'paste-place-basics',
            name: 'Paste & Place Basics',
            description: 'Learn the SMT process: apply solder paste to pads, place components, then reflow. The foundation of modern electronics manufacturing.',
            difficulty: 'Beginner',
            xpReward: 300,
            completionMessage: 'You completed the SMT process! In real factories, pick-and-place machines do this at 30,000+ components per hour. But the process is the same!',
            setup: (api) => { api.loadBoard(0); },
            steps: [
                {
                    instruction: 'Click on the R1 pad to apply solder paste',
                    detail: 'Solder paste is a mixture of tiny solder balls and flux. In factories, a stencil is placed over the PCB and paste is squeegeed through holes aligned with the pads. Here, click each pad.',
                    target: { type: 'canvas-region', computePosition: (api) => {
                        const pads = api.getPads();
                        const p = pads.find(p => p.id === 'R1');
                        return p ? { x: p.x - 5, y: p.y - 5, w: p.w + 10, h: p.h + 10 } : { x: 200, y: 180, w: 60, h: 30 };
                    }},
                    action: { validate: (api) => api.getPasteCount() >= 1 }
                },
                {
                    instruction: 'Apply paste to ALL remaining pads',
                    detail: 'Every pad needs solder paste. The paste holds components in place before reflow and creates the electrical connections. Click on each orange-outlined pad.',
                    target: { type: 'canvas-region', computePosition: () => ({ x: 300, y: 200, w: 250, h: 120 }) },
                    action: { validate: (api) => api.getPasteCount() >= api.getTotalPads() }
                },
                {
                    instruction: 'Click "Next Phase" to move to Pick & Place',
                    detail: 'All pads have paste! Now we move to the pick and place phase where components are positioned on their pads.',
                    target: { type: 'dom-element', selector: '#smt-line .btn-warning' },
                    action: { validate: (api) => api.getPhase() === 1 }
                },
                {
                    instruction: 'Select R1 (100\u03a9 resistor) from the component reel',
                    detail: 'SMT components are tiny - resistors can be as small as 0.4mm x 0.2mm! Pick-and-place machines use vacuum nozzles to pick them from tape reels and place them precisely.',
                    target: { type: 'palette-item', selector: '#smt-components [data-pad-idx="0"]' },
                    action: { validate: (api) => api.getSelectedComp() === 0 }
                },
                {
                    instruction: 'Click on the R1 pad to place the component',
                    detail: 'Place the resistor precisely on its pad. In real manufacturing, placement accuracy is within 0.05mm. The closer you click to the center, the higher your accuracy score!',
                    target: { type: 'canvas-region', computePosition: (api) => {
                        const pads = api.getPads();
                        const p = pads.find(p => p.id === 'R1');
                        return p ? { x: p.x - 5, y: p.y - 5, w: p.w + 10, h: p.h + 10 } : { x: 200, y: 180, w: 60, h: 30 };
                    }},
                    action: { validate: (api) => api.getPlacedCount() >= 1 }
                },
                {
                    instruction: 'Place all remaining components',
                    detail: 'Select each component from the reel and click its matching pad on the board. The labels match - R2 goes on R2, C1 on C1, etc. Place them all!',
                    target: { type: 'canvas-region', computePosition: () => ({ x: 200, y: 160, w: 350, h: 180 }) },
                    action: { validate: (api) => api.getPlacedCount() >= api.getTotalPads() }
                },
                {
                    instruction: 'Click "Next Phase" for the Reflow Oven!',
                    detail: 'All components placed! Time for the reflow oven. This heats the board to ~260\u00b0C to melt the solder paste and create permanent connections.',
                    target: { type: 'dom-element', selector: '#smt-line .btn-warning' },
                    action: { validate: (api) => api.getPhase() >= 2 }
                },
                {
                    instruction: 'Watch the reflow process, then click "Next Phase"',
                    detail: 'The reflow profile has 4 zones: preheat (ramp up slowly), soak (flux activates), reflow (solder melts at ~217\u00b0C), and cooling. Too fast = thermal shock = cracked components!',
                    target: { type: 'dom-element', selector: '#smt-line .btn-warning' },
                    action: { validate: (api) => api.getPhase() >= 3 }
                },
                {
                    instruction: 'Submit your board for final inspection!',
                    detail: 'After reflow, boards go through AOI (Automated Optical Inspection) to check for defects. Your accuracy score shows how well you did!',
                    target: { type: 'dom-element', selector: '#smt-line .btn-warning' },
                    action: { validate: (api, data, actionType) => actionType === 'smt-submit' }
                }
            ]
        },
        {
            id: 'precision-placement',
            name: 'Precision Placement Challenge',
            description: 'Focus on accuracy with the voltage regulator board. Learn about capacitor placement and feedback resistors.',
            difficulty: 'Intermediate',
            xpReward: 350,
            completionMessage: 'Excellent precision! In real SMT lines, machine vision cameras verify placement to within 25 microns. Practice makes perfect!',
            setup: (api) => { api.loadBoard(1); },
            steps: [
                {
                    instruction: 'Apply solder paste to all 8 pads',
                    detail: 'This voltage regulator board has 8 pads including capacitors for filtering, resistors for voltage division, and a Schottky diode for protection. Paste them all!',
                    target: { type: 'canvas-region', computePosition: () => ({ x: 150, y: 150, w: 400, h: 200 }) },
                    action: { validate: (api) => api.getPasteCount() >= api.getTotalPads() }
                },
                {
                    instruction: 'Move to Pick & Place phase',
                    detail: 'All pasted! The voltage regulator (AMS1117) converts higher voltage to a stable lower voltage. Essential in every electronic device.',
                    target: { type: 'dom-element', selector: '#smt-line .btn-warning' },
                    action: { validate: (api) => api.getPhase() === 1 }
                },
                {
                    instruction: 'Place the AMS1117 IC first - it\'s the main chip',
                    detail: 'Start with the most critical component. The AMS1117 linear voltage regulator converts input voltage to a fixed output (usually 3.3V or 5V). Aim for the center of the pad!',
                    target: { type: 'palette-item', selector: '#smt-components [data-pad-idx="5"]' },
                    action: { validate: (api) => api.getSelectedComp() === 5 }
                },
                {
                    instruction: 'Click precisely on the U1 pad',
                    detail: 'Accuracy matters! A misaligned IC can cause bridged connections or open circuits. In manufacturing, vision-guided placement ensures sub-millimeter precision.',
                    target: { type: 'canvas-region', computePosition: (api) => {
                        const pads = api.getPads();
                        const p = pads.find(p => p.id === 'U1');
                        return p ? { x: p.x - 5, y: p.y - 5, w: p.w + 10, h: p.h + 10 } : { x: 270, y: 150, w: 90, h: 70 };
                    }},
                    action: { validate: (api) => api.getPlacedCount() >= 1 }
                },
                {
                    instruction: 'Place all remaining components',
                    detail: 'Place the capacitors (C1, C2, C3), resistors (R1, R2), Schottky diode (D1), and power LED. Each plays a role in voltage regulation and protection.',
                    target: { type: 'canvas-region', computePosition: () => ({ x: 150, y: 150, w: 400, h: 200 }) },
                    action: { validate: (api) => api.getPlacedCount() >= api.getTotalPads() }
                },
                {
                    instruction: 'Run the reflow oven and submit',
                    detail: 'Advance through the reflow and inspection phases to complete your board.',
                    target: { type: 'dom-element', selector: '#smt-line .btn-warning' },
                    action: { validate: (api) => api.getPhase() >= 2 }
                }
            ]
        },
        {
            id: 'full-production',
            name: 'Microcontroller Module',
            description: 'The most complex board: an ESP32-S3 module with crystal, USB-C, and decoupling capacitors. Minimal guidance - you\'re graduating!',
            difficulty: 'Advanced',
            xpReward: 500,
            completionMessage: 'You built an ESP32 module! This is the kind of board used in IoT devices, smart home products, and robotics. You\'re ready for real PCB assembly!',
            setup: (api) => { api.loadBoard(2); },
            steps: [
                {
                    instruction: 'Paste all 10 pads on this complex board',
                    detail: 'The ESP32-S3 is a powerful WiFi+Bluetooth microcontroller. This board has 10 components including a 40MHz crystal oscillator for timing and USB-C for programming.',
                    target: { type: 'canvas-region', computePosition: () => ({ x: 150, y: 150, w: 350, h: 220 }) },
                    action: { validate: (api) => api.getPasteCount() >= api.getTotalPads() }
                },
                {
                    instruction: 'Advance to Pick & Place',
                    detail: 'In production, a single SMT line can process 1000+ boards per hour. The paste printer, pick-and-place machine, and reflow oven work in sequence.',
                    target: { type: 'dom-element', selector: '#smt-line .btn-warning' },
                    action: { validate: (api) => api.getPhase() === 1 }
                },
                {
                    instruction: 'Place all 10 components - you know the drill!',
                    detail: 'Start with the ESP32-S3 QFP package (most critical), then decoupling capacitors (placed close to IC power pins), pull-up resistors, crystal, LED, and USB connector.',
                    target: { type: 'canvas-region', computePosition: () => ({ x: 150, y: 150, w: 350, h: 220 }) },
                    action: { validate: (api) => api.getPlacedCount() >= api.getTotalPads() }
                },
                {
                    instruction: 'Run reflow and submit your board!',
                    detail: 'For QFP packages, reflow profile is critical. The larger thermal mass needs more time in the soak zone. Click Next Phase to reflow and then submit.',
                    target: { type: 'dom-element', selector: '#smt-line .btn-warning' },
                    action: { validate: (api, data, actionType) => actionType === 'smt-submit' || api.getPhase() >= 2 }
                }
            ]
        }
    ],

    // ========== QC INSPECTOR ==========
    'qc-inspector': [
        {
            id: 'learn-inspect',
            name: 'Learn to Inspect',
            description: 'Master the QC tools: magnifying glass to zoom in, flag tool to mark defects. Find all issues before they ship!',
            difficulty: 'Beginner',
            xpReward: 200,
            completionMessage: 'You found the defects! In real factories, AOI machines scan boards automatically, but human inspectors still catch things machines miss.',
            setup: (api) => {
                api.setBoardSeed(0.42);
                api.loadLevel(0);
            },
            steps: [
                {
                    instruction: 'Use the Magnify tool to inspect the board',
                    detail: 'Quality Control inspectors use magnifying lenses and microscopes to examine solder joints and component placement. Move your mouse over the board - the magnifying glass follows your cursor and zooms in 2x.',
                    target: { type: 'tool-button', selector: '#qc-inspector .qc-toolbar .tool-btn[data-tool="magnify"]' },
                    action: { type: 'auto', validate: () => true },
                    autoAdvanceDelay: 3000
                },
                {
                    instruction: 'Look at the Defect Types panel on the left',
                    detail: 'There are 8 types of defects you might find: cold solder joints (dull/grainy), solder bridges (two pads connected), missing components, tombstoned parts (standing on end), misaligned components, PCB cracks, burn marks, and lifted pads.',
                    target: { type: 'dom-element', selector: '#qc-defect-types' },
                    action: { type: 'auto', validate: () => true },
                    autoAdvanceDelay: 4000
                },
                {
                    instruction: 'Switch to the Flag tool',
                    detail: 'When you spot a defect, switch to the Flag tool and click on it to mark it. The board has 4 defects to find. Click the "Flag Defect" button now.',
                    target: { type: 'tool-button', selector: '#qc-inspector .qc-toolbar .tool-btn[data-tool="flag"]' },
                    action: { validate: (api) => api.getCurrentTool() === 'flag' }
                },
                {
                    instruction: 'Find and flag a defect on the board!',
                    detail: 'Look carefully at the board. Defects look different from normal solder joints and components. Cold solder joints appear gray and grainy. Solder bridges are metallic blobs connecting two pads. Click near a defect to flag it!',
                    target: { type: 'canvas-region', computePosition: () => ({ x: 300, y: 250, w: 200, h: 150 }) },
                    action: { validate: (api) => api.getFlaggedCount() >= 1 }
                },
                {
                    instruction: 'Find more defects! There are 4 total',
                    detail: 'Keep scanning the board. Use the magnify tool to zoom in on suspicious areas, then switch back to flag to mark them. Look for anything unusual - wrong shapes, wrong colors, missing parts.',
                    target: { type: 'canvas-region', computePosition: () => ({ x: 200, y: 150, w: 400, h: 300 }) },
                    action: { validate: (api) => api.getFlaggedCount() >= 3 }
                },
                {
                    instruction: 'Click "Submit Report" when you\'ve found all defects',
                    detail: 'Found enough defects? Submit your inspection report! You\'ll see your accuracy score and any defects you missed.',
                    target: { type: 'dom-element', selector: '#qc-inspector .btn-success' },
                    action: { validate: (api, data, actionType) => actionType === 'qc-submit' }
                }
            ]
        },
        {
            id: 'know-defects',
            name: 'Know Your Defects',
            description: 'Learn to identify each type of defect with detailed visual descriptions. Essential knowledge for any QC inspector.',
            difficulty: 'Intermediate',
            xpReward: 300,
            completionMessage: 'You can now identify all major PCB defects! Cold solder = grainy, Bridge = connected pads, Tombstone = standing up, Missing = empty pads, Misaligned = off-center.',
            setup: (api) => {
                api.setBoardSeed(0.73);
                api.loadLevel(1);
            },
            steps: [
                {
                    instruction: 'This board has 6 defects across multiple types',
                    detail: 'Level 2 boards are harder - defects are more subtle and varied. You have 90 seconds. Study the defect types panel on the left, then start hunting! Switch to flag tool when ready.',
                    target: { type: 'dom-element', selector: '#qc-defect-types' },
                    action: { type: 'auto', validate: () => true },
                    autoAdvanceDelay: 4000
                },
                {
                    instruction: 'Switch to Flag tool and start finding defects',
                    detail: 'Remember: Cold solder joints look DULL and GRAINY (good joints are smooth and shiny). Solder bridges are blobs of solder connecting adjacent pads that should be separate.',
                    target: { type: 'tool-button', selector: '#qc-inspector .qc-toolbar .tool-btn[data-tool="flag"]' },
                    action: { validate: (api) => api.getCurrentTool() === 'flag' }
                },
                {
                    instruction: 'Find at least 2 defects',
                    detail: 'Tombstone defects: one end of a component lifts off the pad during reflow (surface tension imbalance). Misaligned: component shifted off its intended pad position.',
                    target: { type: 'canvas-region', computePosition: () => ({ x: 200, y: 150, w: 400, h: 300 }) },
                    action: { validate: (api) => api.getFlaggedCount() >= 2 }
                },
                {
                    instruction: 'Keep going! Find at least 4 defects',
                    detail: 'PCB cracks appear as thin dark lines in the board substrate. Burn marks are brown/dark discoloration from excessive heat. Lifted pads show copper peeling away from the board.',
                    target: { type: 'canvas-region', computePosition: () => ({ x: 200, y: 150, w: 400, h: 300 }) },
                    action: { validate: (api) => api.getFlaggedCount() >= 4 }
                },
                {
                    instruction: 'Submit your report!',
                    detail: 'Submit when you think you\'ve found all defects. False alarms cost points - only flag things you\'re sure about!',
                    target: { type: 'dom-element', selector: '#qc-inspector .btn-success' },
                    action: { validate: (api, data, actionType) => actionType === 'qc-submit' }
                }
            ]
        },
        {
            id: 'timed-inspection',
            name: 'Speed Inspection',
            description: 'Expert mode: 8 defects, 60 seconds, minimal guidance. Can you find them all before time runs out?',
            difficulty: 'Advanced',
            xpReward: 500,
            completionMessage: 'Speed inspection complete! Professional QC inspectors can scan a board in under 30 seconds. Keep practicing to get faster!',
            setup: (api) => {
                api.setBoardSeed(0.91);
                api.loadLevel(2);
            },
            steps: [
                {
                    instruction: '60 seconds, 8 defects. Go!',
                    detail: 'Expert mode! All defect types are possible. You\'re on the clock. Use magnify to scan, flag to mark. No hand-holding this time - you know what to look for!',
                    target: { type: 'tool-button', selector: '#qc-inspector .qc-toolbar .tool-btn[data-tool="flag"]' },
                    action: { validate: (api) => api.getCurrentTool() === 'flag' }
                },
                {
                    instruction: 'Find and flag defects - find at least 4',
                    detail: 'Scan systematically: start from one corner and work your way across. Don\'t rush - a missed defect in a real factory costs money!',
                    target: { type: 'canvas-region', computePosition: () => ({ x: 200, y: 150, w: 400, h: 300 }) },
                    action: { validate: (api) => api.getFlaggedCount() >= 4 }
                },
                {
                    instruction: 'Submit when ready!',
                    detail: 'Found enough? Submit your report. Aim for 100% detection with zero false alarms.',
                    target: { type: 'dom-element', selector: '#qc-inspector .btn-success' },
                    action: { validate: (api, data, actionType) => actionType === 'qc-submit' }
                }
            ]
        }
    ]
};
