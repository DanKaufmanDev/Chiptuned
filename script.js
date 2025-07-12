const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const gridContainer = document.getElementById('grid-container');
const noteLabelsContainer = document.getElementById('note-labels');
const bpmInput = document.getElementById('bpm');
const bpmValueSpan = document.getElementById('bpm-value');
const loopCheckbox = document.getElementById('loop');
const globalProgressBar = document.getElementById('global-progress-bar');
const globalTimestamp = document.getElementById('global-timestamp');
const globalPlayPauseButton = document.getElementById('global-play-pause');
const clearGridButton = document.getElementById('clear-grid');
const randomGridButton = document.getElementById('random-grid');
const octaveDownButton = document.getElementById('octave-down');
const octaveUpButton = document.getElementById('octave-up');
const saveMp3Button = document.getElementById('save-mp3');
const exportDialogOverlay = document.getElementById('export-dialog-overlay');
const exportMp3Button = document.getElementById('export-mp3-button');
const exportWavButton = document.getElementById('export-wav-button');
const saveProjectButton = document.getElementById('save-project');
const newProjectButton = document.getElementById('new-project');
const loadProjectButton = document.getElementById('load-project');
const confirmationDialogOverlay = document.getElementById('confirmation-dialog-overlay');
const confirmationMessage = document.getElementById('confirmation-message');
const confirmButton = document.getElementById('confirm-button');
const cancelButton = document.getElementById('cancel-button');
const columnHighlight = document.getElementById('column-highlight');
const bpmTextInput = document.getElementById('bpm-text-input');
const addLayerButton = document.getElementById('add-layer');
const layerListContainer = document.getElementById('layer-list');
const busMixerContainer = document.getElementById('bus-mixer-container');
const soundsPanel = document.getElementById('sounds-panel');
const barInput = document.getElementById('bar');
const selectionRectangle = document.getElementById('selection-rectangle');
const spliceLine = document.getElementById('splice-line');
const sequencerPrevButton = document.getElementById('sequencer-prev');
const sequencerNextButton = document.getElementById('sequencer-next');

const waveforms = ['square', 'sine', 'sawtooth', 'triangle'];
const instruments = ['kick drum', 'snare drum', 'hi-hat', 'tom drum', 'clap'];
const sfx = ['coin', 'jump', 'laser', 'explosion', 'blip', 'powerup', 'hit'];

const KEYBIND_LABELS = {
    'global-open': 'Open Project',
    'global-save': 'Save Project',
    'global-new': 'New Project',
    'global-select-all': 'Select All',
    'tool-undo': 'Undo',
    'tool-redo': 'Redo',
    'tool-cut': 'Cut',
    'tool-copy': 'Copy',
    'tool-paste': 'Paste',
    'tool-draw': 'Draw Tool',
    'tool-splice': 'Splice Tool',
    'tool-erase': 'Erase Tool',
    'tool-select': 'Select Tool',
    'tool-move': 'Grab Tool',
    'global-play': 'Play/Pause'
};

const DEFAULT_KEYBINDS = {
    'global-open': 'o',
    'global-save': 's',
    'global-new': 'p',
    'global-select-all': 'a',
    'tool-undo': 'z',
    'tool-redo': 'z',
    'tool-cut': 'x',
    'tool-copy': 'c',
    'tool-paste': 'v',
    'tool-draw': 'd',
    'tool-splice': 'x',
    'tool-erase': 'e',
    'tool-select': 's',
    'tool-move': 'g',
    'global-play': ' '
};

const defaultWaveformEffects = {
    'square': {
        adsr: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.2 },
        lfo: { rate: 0, depth: 0, waveform: 'square' },
        reverb: { mix: 0.1, decay: 0.5, predelay: 0.01 },
        delay: { time: 0, feedback: 0, mix: 0 },
        bitcrusher: { bits: 16, frequencyReduction: 1 },
        pan: 0
    },
    'sine': {
        adsr: { attack: 0.1, decay: 0.2, sustain: 0.7, release: 0.3 },
        lfo: { rate: 0, depth: 0, waveform: 'sine' },
        reverb: { mix: 0.2, decay: 1, predelay: 0.02 },
        delay: { time: 0, feedback: 0, mix: 0 },
        bitcrusher: { bits: 16, frequencyReduction: 1 },
        pan: 0
    },
    'sawtooth': {
        adsr: { attack: 0.05, decay: 0.3, sustain: 0.6, release: 0.4 },
        lfo: { rate: 0, depth: 0, waveform: 'sawtooth' },
        reverb: { mix: 0.15, decay: 0.8, predelay: 0.015 },
        delay: { time: 0, feedback: 0, mix: 0 },
        bitcrusher: { bits: 16, frequencyReduction: 1 },
        pan: 0
    },
    'triangle': {
        adsr: { attack: 0.02, decay: 0.15, sustain: 0.5, release: 0.25 },
        lfo: { rate: 0, depth: 0, waveform: 'triangle' },
        reverb: { mix: 0.1, decay: 0.6, predelay: 0.01 },
        delay: { time: 0, feedback: 0, mix: 0 },
        bitcrusher: { bits: 16, frequencyReduction: 1 },
        pan: 0
    }
};

const defaultInstrumentEffects = {
    'kick drum': {
        adsr: { attack: 0.013, decay: 0.09, sustain: 0.0, release: 0.0 }, // 0.3 0.45 0.1 0.2
        lfo: { rate: 0.1, depth: 0.1, waveform: 'triangle' }, // 0.1 0.1
        reverb: { mix: 0, decay: 0.01, predelay: 0 },
        delay: { time: 0, feedback: 0, mix: 0 },
        bitcrusher: { bits: 5, frequencyReduction: 1 },    // 15 1
        pan: 0
    },
    'snare drum': {
        adsr: { attack: 0.0, decay: 0.07, sustain: 0.0, release: 0.0 },
        lfo: { rate: 0, depth: 0, waveform: 'sine' },
        reverb: { mix: 0.10, decay: 0.25, predelay: 0.01 },
        delay: { time: 0, feedback: 0, mix: 0 },
        bitcrusher: { bits: 4, frequencyReduction: 0.15 },
        pan: 0
    },
    'hi-hat': {
        adsr: { attack: 0.0, decay: 0.035, sustain: 0.0, release: 0.0 },
        lfo: { rate: 0, depth: 0, waveform: 'sine' }, 
        reverb: { mix: 0.10, decay: 0.15, predelay: 0.01 },
        delay: { time: 0, feedback: 0, mix: 0 },
        bitcrusher: { bits: 8, frequencyReduction: 0.5 },
        pan: 0
    },
    'tom drum': {
        adsr: { attack: 0.0, decay: 0.2, sustain: 0.03, release: 0.0 }, 
        lfo: { rate: 0, depth: 0, waveform: 'square' }, 
        reverb: { mix: 0.0, decay: 0.1, predelay: 0.01 }, 
        delay: { time: 0, feedback: 0, mix: 0 }, 
        bitcrusher: { bits: 8, frequencyReduction: 0.40 }, 
        pan: 0 
    },
    'clap': {
        adsr: { attack: 0.0, decay: 0.05, sustain: 0.0, release: 2 },
        lfo: { rate: 0, depth: 0, waveform: 'triangle' },
        reverb: { mix: 0.08, decay: 0.24, predelay: 0.01 },
        delay: { time: 0, feedback: 0, mix: 0 },
        bitcrusher: { bits: 6, frequencyReduction: 0.35 },
        pan: 0
    }
};

let layers = [];
let activeLayerIndex = -1;
let masterGainNode = audioContext.createGain(); // Master Gain Node

const baseNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const baseFrequencies = [16.35, 17.32, 18.35, 19.45, 20.60, 21.83, 23.12, 24.50, 25.96, 27.50, 29.14, 30.87]; // C0 to B0

let currentOctave = 4; 
let notes = [];
let frequencies = [];
const numRows = 12; 
const numCols = 32;

let grid = Array(numRows).fill(null).map(() => []); 
let musicTimeout;
let lastHighlightedColumn = -1;
let playingNodes = [];

let isDragging = false;
let dragStartCol = -1;
let dragStartRow = -1;
let currentNote = null; 
let anchorCol = -1;
let isExtendingSelection = false;
let selectionDragData = []; 
let activeTool = 'draw';
let currentProjectFileName = 'my_chiptuned_project.cht'; 
let totalSequenceDuration = 0; 
let playbackStartTime = 0; 
let currentPlaybackTime = 0; 

let selectionStartCol = -1;
let selectionStartRow = -1;
let selectionEndCol = -1;
let selectionEndRow = -1;

let selectedNotesForMove = [];
let moveStartCol = -1;
let moveStartRow = -1;
let currentlySelectedNotes = [];
let gridOffset = 0;
let hasUnsavedChanges = false;
let clipboard = null;
let copiedEffects = null;
let keybinds = loadKeybinds();

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

function updateTotalDurationAndDisplay() {
    const bpm = parseFloat(bpmInput.value);
    const noteDurationPerColumn = 60 / bpm;
    
    let maxColWithNote = -1;
    layers.forEach(layer => {
        layer.grid.forEach(row => {
            row.forEach(note => {
                if (note.end > maxColWithNote) {
                    maxColWithNote = note.end;
                }
            });
        });
    });

    if (maxColWithNote === -1) {
        totalSequenceDuration = 0;
    } else {
        totalSequenceDuration = (maxColWithNote + 1) * noteDurationPerColumn;
    }
    
    globalProgressBar.max = totalSequenceDuration;
    globalTimestamp.textContent = `${formatTime(currentPlaybackTime)}/${formatTime(totalSequenceDuration)}`;
}

function createNewLayer(name) {
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 1.0;

    // --- Effects Nodes ---
    const reverbNode = audioContext.createConvolver();
    const reverbWetGain = audioContext.createGain();
    const reverbDryGain = audioContext.createGain();
    const delayNode = audioContext.createDelay();
    const delayFeedbackGain = audioContext.createGain();
    const delayWetGain = audioContext.createGain();
    const delayDryGain = audioContext.createGain();
    const pannerNode = audioContext.createStereoPanner();

    const layer = {
        id: Date.now(),
        name: name,
        grid: Array(numRows).fill(null).map(() => []),
        instrument: '',
        waveform: 'square',
        sfx: '',
        octave: 4,
        isMuted: false,
        isSoloed: false,
        gainNode: gainNode,
        gainValue: 1.0,
        effects: JSON.parse(JSON.stringify(defaultWaveformEffects.square)), // Apply default effects
        reverbNode: reverbNode,
        reverbWetGain: reverbWetGain,
        reverbDryGain: reverbDryGain,
        delayNode: delayNode,
        delayFeedbackGain: delayFeedbackGain,
        delayWetGain: delayWetGain,
        delayDryGain: delayDryGain,
        bitcrusherNode: null,
        pannerNode: pannerNode,
        inputNode: null
    };

    const bitcrusherNode = createBitcrusherNode(layer);
    layer.bitcrusherNode = bitcrusherNode;
    layer.inputNode = bitcrusherNode;

    // The chain is: bitcrusher -> delay -> reverb -> panner -> layer gain -> destination

    // Delay connections
    bitcrusherNode.connect(delayDryGain);
    bitcrusherNode.connect(delayWetGain);
    delayWetGain.connect(delayNode);
    delayNode.connect(delayFeedbackGain);
    delayFeedbackGain.connect(delayNode);

    const delayOutput = audioContext.createGain();
    delayDryGain.connect(delayOutput);
    delayNode.connect(delayOutput);

    // Reverb connections
    delayOutput.connect(reverbDryGain);
    delayOutput.connect(reverbWetGain);
    reverbWetGain.connect(reverbNode);

    const reverbOutput = audioContext.createGain();
    reverbDryGain.connect(reverbOutput);
    reverbNode.connect(reverbOutput);

    // Connect reverb output to panner
    reverbOutput.connect(pannerNode);

    // Connect panner to layer gain
    pannerNode.connect(gainNode);

    // Final output
    gainNode.connect(masterGainNode);
    masterGainNode.connect(audioContext.destination);

    // Set initial effect parameters
    reverbWetGain.gain.value = layer.effects.reverb.mix;
    reverbDryGain.gain.value = 1.0 - layer.effects.reverb.mix;
    delayWetGain.gain.value = layer.effects.delay.mix;
    delayDryGain.gain.value = 1.0 - layer.effects.delay.mix;
    delayFeedbackGain.gain.value = layer.effects.delay.feedback;
    delayNode.delayTime.value = layer.effects.delay.time;
    reverbNode.buffer = generateReverbImpulseResponse(layer.effects.reverb.decay, layer.effects.reverb.decay, false);
    pannerNode.pan.value = layer.effects.pan;

    return layer;
}

function deleteLayer(indexToDelete) {
    if (layers.length <= 1) {
        alert("Cannot delete the last layer.");
        return;
    }

    // Disconnect the gain node of the layer being deleted
    if (layers[indexToDelete].gainNode) {
        layers[indexToDelete].gainNode.disconnect();
        layers[indexToDelete].reverbNode.disconnect();
        layers[indexToDelete].reverbWetGain.disconnect();
        layers[indexToDelete].reverbDryGain.disconnect();
        layers[indexToDelete].delayNode.disconnect();
        layers[indexToDelete].delayFeedbackGain.disconnect();
        layers[indexToDelete].delayWetGain.disconnect();
        layers[indexToDelete].delayDryGain.disconnect();
        if (layers[indexToDelete].bitcrusherNode) {
            layers[indexToDelete].bitcrusherNode.disconnect();
        }
        if (layers[indexToDelete].pannerNode) {
            layers[indexToDelete].pannerNode.disconnect();
        }
    }

    layers.splice(indexToDelete, 1);

    if (activeLayerIndex >= indexToDelete) {
        activeLayerIndex = Math.max(0, activeLayerIndex - 1);
    }

    switchLayer(activeLayerIndex, true);
    renderBusMixer(); // Update mixer after deleting a layer
}

function generateReverbImpulseResponse(duration, decay, reverse) {
    const sampleRate = audioContext.sampleRate;
    const length = sampleRate * duration;
    const impulse = audioContext.createBuffer(2, length, sampleRate);
    const impulseL = impulse.getChannelData(0);
    const impulseR = impulse.getChannelData(1);
    const random = Math.random;

    for (let i = 0; i < length; i++) {
        const n = reverse ? length - i : i;
        impulseL[i] = (random() * 2 - 1) * Math.pow(1 - n / length, decay);
        impulseR[i] = (random() * 2 - 1) * Math.pow(1 - n / length, decay);
    }
    return impulse;
}

let isAudioWorkletReady = false;

async function setupAudioWorklet() {
    if (isAudioWorkletReady) return;
    try {
        await audioContext.audioWorklet.addModule('bitcrusher-processor.js');
        isAudioWorkletReady = true;
    } catch (e) {
        console.error('Error loading audio worklet.', e);
    }
}

function createBitcrusherNode(layer) {
    if (!isAudioWorkletReady) {
        console.error('Audio Worklet is not ready. Cannot create Bitcrusher node.');
        return null;
    }
    const node = new AudioWorkletNode(audioContext, 'bitcrusher-processor');
    const bitsParam = node.parameters.get('bits');
    const freqParam = node.parameters.get('frequencyReduction');

    bitsParam.value = layer.effects.bitcrusher.bits;
    freqParam.value = layer.effects.bitcrusher.frequencyReduction;

    return node;
}

function toggleSolo(indexToSolo) {
    const layerToSolo = layers[indexToSolo];
    layerToSolo.isSoloed = !layerToSolo.isSoloed;

    const anyLayerSoloed = layers.some(layer => layer.isSoloed);

    layers.forEach((layer, index) => {
        if (anyLayerSoloed) {
            if (layer.isSoloed) {
                // This layer is soloed, so it should be audible (if not muted)
                layer.gainNode.gain.value = layer.isMuted ? 0 : layer.gainValue;
            } else {
                // Another layer is soloed, so this one should be silent
                layer.gainNode.gain.value = 0;
            }
        } else {
            // No layers are soloed, so all layers are audible (if not muted)
            layer.gainNode.gain.value = layer.isMuted ? 0 : layer.gainValue;
        }
    });

    renderLayerList();
    renderBusMixer();
}

function renderLayerList() {
    layerListContainer.innerHTML = '';
    layers.forEach((layer, index) => {
        const layerElement = document.createElement('div');
        layerElement.classList.add('layer-item', 'p-2', 'mb-2');
        if (index === activeLayerIndex) {
            layerElement.classList.add('active-layer');
        }

        const layerNameContainer = document.createElement('div');
        layerNameContainer.classList.add('flex', 'justify-between', 'items-center', 'mb-2');
        layerNameContainer.style.position = 'relative'; // Ensure relative positioning for absolute children

        const layerNameSpan = document.createElement('span');
        layerNameSpan.textContent = layer.name;
        layerNameSpan.classList.add('font-bold', 'cursor-pointer', 'layer-name');
        layerNameContainer.appendChild(layerNameSpan);

        const layerNameInput = document.createElement('input');
        layerNameInput.type = 'text';
        layerNameInput.value = layer.name;
        layerNameInput.classList.add('hidden', 'layer-name', 'layer-name-input', 'font-bold');
        layerNameContainer.appendChild(layerNameInput);

        layerNameSpan.addEventListener('click', () => {
            layerNameSpan.classList.add('hidden');
            layerNameInput.classList.remove('hidden');
            layerNameInput.focus();
            layerNameInput.select();
        });

        const saveLayerName = () => {
            let newName = layerNameInput.value.trim();
            if (newName === '') {
                newName = `Track ${index + 1}`;
            }
            layers[index].name = newName;
            renderLayerList(); // Re-render to update the name and hide input
            renderBusMixer(); // Update the bus mixer with the new name
        };

        layerNameInput.addEventListener('blur', saveLayerName);
        layerNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveLayerName();
            } else if (e.key === 'Escape') {
                renderLayerList(); // Re-render to hide input without saving
            }
        });

        const soloBtn = document.createElement('button');
        soloBtn.textContent = 'S';
        soloBtn.classList.add('solo-layer-btn');
        if (layer.isSoloed) {
            soloBtn.classList.add('active');
        }
        soloBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSolo(index);
        });

        layerNameContainer.appendChild(soloBtn);

        const muteBtn = document.createElement('button');
        muteBtn.textContent = 'M';
        muteBtn.classList.add('mute-layer-btn');
        if (layer.isMuted) {
            muteBtn.classList.add('active'); // Add 'active' class if muted
        }
        muteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent the layer from being selected when muting
            const layer = layers[index];
            layer.isMuted = !layer.isMuted;

            if (layer.isMuted) {
                layer.gainNode.gain.value = 0;
            } else {
                layer.gainNode.gain.value = layer.gainValue;
            }

            renderLayerList(); // Re-render to update mute button state
            renderBusMixer(); // Re-render the bus to update the slider
        });

        layerNameContainer.appendChild(muteBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'X';
        deleteBtn.classList.add('delete-layer-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent the layer from being selected when deleting
            deleteLayer(index);
        });

        layerNameContainer.appendChild(deleteBtn);
        layerElement.appendChild(layerNameContainer);

        const miniGrid = document.createElement('div');
        miniGrid.classList.add('layer-item-grid');
        miniGrid.style.display = 'grid';
        miniGrid.style.gridTemplateColumns = `repeat(${numCols}, 1fr)`;
        miniGrid.style.gridTemplateRows = `repeat(${numRows}, 1fr)`;
        miniGrid.style.gap = '1px';
        miniGrid.style.height = '60px';
        miniGrid.style.border = '1px solid #555';

        for (let i = 0; i < numRows; i++) {
            for (let j = 0; j < numCols; j++) {
                const cell = document.createElement('div');
                cell.classList.add('layer-item-grid-cell');

                let coveredByNote = false;
                let noteStartingAtThisCell = null;
                const dataCol = j + gridOffset;

                for (const note of layer.grid[i]) {
                    if (dataCol >= note.start && dataCol <= note.end) {
                        coveredByNote = true;
                        if (dataCol === note.start) {
                            noteStartingAtThisCell = note;
                        }
                        break;
                    }
                }

                if (coveredByNote) {
                    if (noteStartingAtThisCell) {
                        cell.style.backgroundColor = 'var(--active-cell-bg)';
                        const visualStart = Math.max(0, noteStartingAtThisCell.start - gridOffset);
                        const visualEnd = Math.min(numCols - 1, noteStartingAtThisCell.end - gridOffset);
                        cell.style.gridColumn = `${visualStart + 1} / ${visualEnd + 2}`;
                    } else {
                        cell.style.display = 'none';
                    }
                } else {
                    cell.style.backgroundColor = '#c0c0c0';
                }
                miniGrid.appendChild(cell);
            }
        }
        layerElement.appendChild(miniGrid);

        layerElement.addEventListener('click', () => {
            switchLayer(index);
        });
        layerListContainer.appendChild(layerElement);
    });
}

function renderSoundSelectionButtons() {
    soundsPanel.innerHTML = ''; // Clear existing buttons

    const activeLayer = layers[activeLayerIndex];
    if (!activeLayer) return; // No active layer yet

    const createButton = (type, value, label) => {
        const button = document.createElement('button');
        button.textContent = label;
        button.classList.add('sound-select-button', 'retro-button', 'px-4', 'py-2', 'mb-2', 'w-full');
        button.dataset.type = type;
        button.dataset.value = value;

        let isActive = false;
        if (activeLayer.sfx) { // If an SFX is selected
            if (type === 'sfx' && activeLayer.sfx === value) {
                isActive = true;
            }
        } else if (activeLayer.instrument) { // If an Instrument is selected (and no SFX)
            if (type === 'instrument' && activeLayer.instrument === value) {
                isActive = true;
            }
        } else { // If neither SFX nor Instrument is selected, then a Waveform must be active
            if (type === 'waveform' && activeLayer.waveform === value) {
                isActive = true;
            }
        }

        if (isActive) {
            button.classList.add('active');
        }

        button.addEventListener('click', () => {
            const clickedType = type;
            const clickedValue = value;

            // Reset all sound properties for the active layer
            activeLayer.instrument = '';      // No instrument
            activeLayer.sfx = '';             // No SFX

            // Set the property corresponding to the clicked button
            if (clickedType === 'waveform') {
                activeLayer.waveform = clickedValue;
                // Apply default effects for the selected waveform
                if (defaultWaveformEffects[clickedValue]) {
                    activeLayer.effects = JSON.parse(JSON.stringify(defaultWaveformEffects[clickedValue]));
                }
            } else if (clickedType === 'instrument') {
                activeLayer.instrument = clickedValue;
                if (defaultInstrumentEffects[clickedValue]) {
                    activeLayer.effects = JSON.parse(JSON.stringify(defaultInstrumentEffects[clickedValue]));
                }
            } else if (clickedType === 'sfx') {
                activeLayer.sfx = clickedValue;
            }

            // Update the audio nodes with the new effect values
            updateLayerEffects(activeLayer);
            renderSoundSelectionButtons(); // Re-render to update active state
        });
        return button;
    };

    // Waveforms
    const waveformHeader = document.createElement('h3');
    waveformHeader.textContent = 'Waveforms';
    waveformHeader.classList.add('text-xl', 'font-bold', 'mb-2', 'text-white');
    soundsPanel.appendChild(waveformHeader);
    waveforms.forEach(wf => soundsPanel.appendChild(createButton('waveform', wf, wf.charAt(0).toUpperCase() + wf.slice(1))));

    // Instruments
    const instrumentHeader = document.createElement('h3');
    instrumentHeader.textContent = 'Instruments';
    instrumentHeader.classList.add('text-xl', 'font-bold', 'mb-2', 'mt-4', 'text-white');
    soundsPanel.appendChild(instrumentHeader);
    instruments.forEach(inst => soundsPanel.appendChild(createButton('instrument', inst, inst.charAt(0).toUpperCase() + inst.slice(1))));

    // SFX
    const sfxHeader = document.createElement('h3');
    sfxHeader.textContent = 'SFX';
    sfxHeader.classList.add('text-xl', 'font-bold', 'mb-2', 'mt-4', 'text-white');
    soundsPanel.appendChild(sfxHeader);
    sfx.forEach(s => {
        soundsPanel.appendChild(createButton('sfx', s, s.charAt(0).toUpperCase() + s.slice(1)));
    });
}

function switchLayer(index, force = false) {
    if (activeLayerIndex === index && !force) return;
    activeLayerIndex = index;
    renderActiveLayer();
    renderLayerList();
    renderBusMixer();
    renderSoundSelectionButtons(); // Call this to update sound buttons
}

function renderToolButtons() {
    const toolButtons = document.querySelectorAll('#sequencer-tools .retro-button');
    toolButtons.forEach(button => {
        if (button.dataset.toolId === activeTool) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

function renderActiveLayer() {
    const activeLayer = layers[activeLayerIndex];
    grid = activeLayer.grid;
    currentOctave = activeLayer.octave;
    updateNotesAndFrequencies();
    updateGridDisplay();
}

function addLayer() {
    const newLayer = createNewLayer(`Track ${layers.length + 1}`);
    layers.push(newLayer);
    switchLayer(layers.length - 1);
    renderBusMixer(); // Update mixer after adding a layer
}

function toggleSingleNote(row, col) {
    if (activeTool !== 'draw') return;
    // Find if any note exists at the clicked column
    const existingNoteIndex = grid[row].findIndex(note => col >= note.start && col <= note.end);

    if (existingNoteIndex === -1) {
        // No note exists here, add a new single-cell note.
        grid[row].push({ start: col, end: col });
    }
    requestAnimationFrame(() => {
        updateGridDisplay();
        renderLayerList();
        updateTotalDurationAndDisplay();
        saveState();
        debouncedAutosaveStateToLocalStorage();
    });
}

function eraseSelectedNotes() {
    if (currentlySelectedNotes.length === 0) return;

    const notesToDelete = new Set(currentlySelectedNotes.map(item => item.noteRef));

    for (let r = 0; r < grid.length; r++) {
        // Important: Ensure the row exists in the grid before filtering
        if (grid[r]) {
            grid[r] = grid[r].filter(note => !notesToDelete.has(note));
        }
    }

    clearSelection();
    requestAnimationFrame(() => {
        updateGridDisplay();
        renderLayerList();
        updateTotalDurationAndDisplay();
        saveState();
        debouncedAutosaveStateToLocalStorage();
    });
}

function eraseNote(row, col) {
    const existingNoteIndex = grid[row].findIndex(note => col >= note.start && col <= note.end);

    if (existingNoteIndex !== -1) {
        grid[row].splice(existingNoteIndex, 1);
        requestAnimationFrame(() => {
            updateGridDisplay();
            renderLayerList();
            updateTotalDurationAndDisplay();
            saveState();
            debouncedAutosaveStateToLocalStorage();
        });
    }
}

let isPlaying = false;
let currentColumn = 0;
let playbackStartBpm;
let nextNoteTime = 0.0;
const lookahead = 25.0; // How often we wake up to schedule notes (in ms)
const scheduleAheadTime = 0.1; // How far ahead to schedule audio (in s)
let schedulerTimerId = 0;
let endOfSequenceTimerId = 0;
let effectiveColumnWidth = 0;
let gridContainerOffsetLeft = 0;
let columnHighlightWidth = 0;
let gridColumnGap = 0; // Make gridColumnGap a global variable
let baseNoteFrequencyForSFX = 261.63; // Initialize with a default C4 frequency

function updateGridForBarSystem() {
    const barCount = parseInt(barInput.value, 10);
    if (isNaN(barCount) || barCount <= 0) return;

    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
            const cell = document.querySelector(`[data-row='${i}'][data-col='${j}']`);
            if (cell.classList.contains('active')) continue; // Skip active cells

            const barIndex = Math.floor(j / barCount);
            cell.classList.remove('bar-odd', 'bar-even', 'row-odd', 'row-even');

            if ((i % 2) === 0) {
                cell.classList.add('row-even');
            } else {
                cell.classList.add('row-odd');
            }

            if ((barIndex % 2) === 0) {
                cell.classList.add('bar-even');
            } else {
                cell.classList.add('bar-odd');
            }
        }
    }
}

function updateNotesAndFrequencies() {
    // console.log('updateNotesAndFrequencies called');
    // console.log('currentOctave:', currentOctave);
    notes = [];
    frequencies = [];
    noteLabelsContainer.innerHTML = ''; // Clear existing labels

    for (let i = 0; i < numRows; i++) {
        const noteName = baseNotes[i] + currentOctave;
        notes.push(noteName);
        // Calculate frequency for the current octave
        const frequency = baseFrequencies[i] * Math.pow(2, currentOctave);
        frequencies.push(frequency);

        const label = document.createElement('div');
        label.classList.add('note-label');
        label.textContent = noteName;
        if (noteName.includes('#')) {
            label.classList.add('sharp-note-label');
        }
        noteLabelsContainer.appendChild(label);
    }
    if (frequencies.length > 0) {
        baseNoteFrequencyForSFX = baseFrequencies[0];
    }
}

function createGrid() {
    gridContainer.innerHTML = '';
    noteLabelsContainer.innerHTML = '';

    // Hide the column highlight when the grid is created or recreated
    columnHighlight.classList.remove('block');
    columnHighlight.classList.add('hidden');

    updateNotesAndFrequencies(); // Call this first to populate notes and frequencies

    // Explicitly set grid properties for gridContainer
    gridContainer.style.display = 'grid';
    gridContainer.style.gridTemplateRows = `repeat(${numRows}, 1fr)`; // Use fractional units
    gridContainer.style.gridTemplateColumns = `repeat(${numCols}, 1fr)`; // Use fractional units
    gridContainer.style.width = '100%'; // Take full width
    gridContainer.style.height = '100%'; // Take full height

    // Explicitly set grid properties for noteLabelsContainer
    noteLabelsContainer.style.display = 'grid';
    noteLabelsContainer.style.gridTemplateRows = `repeat(${numRows}, 1fr)`;

    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.addEventListener('mousedown', (e) => handleMouseDown(e, i, j));
            gridContainer.appendChild(cell);
        }
    }
    // After creating cells, update their active state based on the grid data
    requestAnimationFrame(() => updateGridDisplay());

    updateColumnDimensions();
    updateGridForBarSystem();
}

function updateColumnDimensions() {
    const firstCell = gridContainer.children[0];
    if (firstCell) {
        const cellActualWidth = firstCell.offsetWidth;
        const computedStyle = window.getComputedStyle(gridContainer);
        gridColumnGap = parseFloat(computedStyle.getPropertyValue('grid-column-gap'));
        effectiveColumnWidth = cellActualWidth + gridColumnGap;
        gridContainerOffsetLeft = gridContainer.getBoundingClientRect().left;
        columnHighlightWidth = cellActualWidth;
    }
}

gridContainer.addEventListener('mousemove', (e) => {
    // Always clear previous erase hover effects first
    const allEraseHovers = document.querySelectorAll('.erase-hover');
    allEraseHovers.forEach(cell => cell.classList.remove('erase-hover'));

    if (activeTool !== 'splice' && activeTool !== 'erase') {
        spliceLine.classList.add('hidden');
        return;
    }

    const gridRect = gridContainer.getBoundingClientRect();
    const mouseX = e.clientX - gridRect.left;
    const mouseY = e.clientY - gridRect.top;

    const visualCol = Math.floor(mouseX / effectiveColumnWidth);
    const row = Math.floor(mouseY / (gridContainer.offsetHeight / numRows));
    const dataCol = visualCol + gridOffset;

    if (row < 0 || row >= numRows || visualCol < 0 || visualCol >= numCols) {
        spliceLine.classList.add('hidden');
        return;
    }

    if (activeTool === 'erase') {
        spliceLine.classList.add('hidden'); // Erase tool never shows splice line
        if (currentlySelectedNotes.length > 0) {
            // Check if the cursor is over any of the selected notes
            const isHoveringOverSelection = currentlySelectedNotes.some(selected => {
                const { noteRef, row: noteRow } = selected;
                return row === noteRow && dataCol >= noteRef.start && dataCol <= noteRef.end;
            });

            if (isHoveringOverSelection) {
                // If hovering over any part of the selection, highlight the whole selection
                currentlySelectedNotes.forEach(selected => {
                    const { noteRef, row } = selected;
                    const noteExists = grid[row] && grid[row].includes(noteRef);
                    if (noteExists) {
                        for (let c = noteRef.start; c <= noteRef.end; c++) {
                            const vCol = c - gridOffset;
                            if (vCol >= 0 && vCol < numCols) {
                                const cell = document.querySelector(`[data-row='${row}'][data-col='${vCol}']`);
                                if (cell) cell.classList.add('erase-hover');
                            }
                        }
                    }
                });
            }
        } else {
            // If no notes are selected, hover the single note under the cursor
            const note = grid[row] ? grid[row].find(note => dataCol >= note.start && dataCol <= note.end) : null;
            if (note) {
                for (let c = note.start; c <= note.end; c++) {
                    const vCol = c - gridOffset;
                    if (vCol >= 0 && vCol < numCols) {
                        const cell = document.querySelector(`[data-row='${row}'][data-col='${vCol}']`);
                        if (cell) cell.classList.add('erase-hover');
                    }
                }
            }
        }
    } else if (activeTool === 'splice') {
        const note = grid[row] ? grid[row].find(note => dataCol >= note.start && dataCol <= note.end) : null;
        if (note && dataCol > note.start) {
            const cellHeight = gridContainer.offsetHeight / numRows;
            const top = row * cellHeight;
            const left = gridContainer.offsetLeft + (visualCol * effectiveColumnWidth);

            spliceLine.style.top = `${top}px`;
            spliceLine.style.left = `${left}px`;
            spliceLine.style.height = `${cellHeight}px`;
            spliceLine.classList.remove('hidden');
        } else {
            spliceLine.classList.add('hidden');
        }
    } else {
        spliceLine.classList.add('hidden');
    }
});

gridContainer.addEventListener('mouseleave', () => {
    const allEraseHovers = document.querySelectorAll('.erase-hover');
    allEraseHovers.forEach(cell => cell.classList.remove('erase-hover'));
    spliceLine.classList.add('hidden');
});

function updateGridDisplay(displayGrid = grid) {
    // Clear all cells first
    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
            const cell = document.querySelector(`[data-row='${i}'][data-col='${j}']`);
            if (cell) {
                cell.classList.remove('active', 'erase-hover', 'selected');
                cell.style.gridColumn = '';
                cell.style.display = 'block';
            }
        }
    }

    // Now, draw the notes that are visible
    for (let i = 0; i < numRows; i++) {
        for (const note of displayGrid[i]) {
            // Check if the note is within the visible range
            if (note.start <= gridOffset + numCols - 1 && note.end >= gridOffset) {
                const visualStart = Math.max(0, note.start - gridOffset);
                const visualEnd = Math.min(numCols - 1, note.end - gridOffset);

                const startCell = document.querySelector(`[data-row='${i}'][data-col='${visualStart}']`);
                if (startCell) {
                    startCell.classList.add('active');
                    startCell.style.gridColumn = `${visualStart + 1} / ${visualEnd + 2}`;

                    // Hide the cells that are covered by this note
                    for (let j = visualStart + 1; j <= visualEnd; j++) {
                        const coveredCell = document.querySelector(`[data-row='${i}'][data-col='${j}']`);
                        if (coveredCell) {
                            coveredCell.style.display = 'none';
                        }
                    }
                }
            }
        }
    }

    // Highlight selected notes by adding a border to the start cell
    currentlySelectedNotes.forEach(selected => {
        const { noteRef, row } = selected;
        const noteExists = grid[row] && grid[row].includes(noteRef);
        if (noteExists) {
            // Check if the note is within the visible range before trying to select it
            if (noteRef.start <= gridOffset + numCols - 1 && noteRef.end >= gridOffset) {
                const visualStart = Math.max(0, noteRef.start - gridOffset);
                const cell = document.querySelector(`[data-row='${row}'][data-col='${visualStart}']`);
                if (cell) {
                    cell.classList.add('selected');
                }
            }
        }
    });

    updateGridForBarSystem();
}

function nextNote() {
    const secondsPerBeat = 60.0 / parseFloat(bpmInput.value);
    nextNoteTime += secondsPerBeat;
    currentColumn++;
}

function playSFX(sfx, time, duration, audioCtx, destinationNode, effects) {
    console.log(`Playing SFX: ${sfx}`);

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    // Example SFX: Coin (short, high-pitched tone)
    if (sfx === 'coin') {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(880, time); // A5
        gainNode.gain.setValueAtTime(0.5, time);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.1); // Quick decay
    } else if (sfx === 'laser') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(500, time);
        oscillator.frequency.exponentialRampToValueAtTime(50, time + 0.2);
        gainNode.gain.setValueAtTime(0.4, time);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    } else if (sfx === 'explosion') {
        // Noise burst for explosion
        const bufferSize = audioCtx.sampleRate * 0.5; // 0.5 seconds of noise
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        const noiseSource = audioCtx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.connect(gainNode);

        gainNode.gain.setValueAtTime(0.6, time);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
        noiseSource.start(time);
        noiseSource.stop(time + 0.5);
        oscillator.disconnect(); // Disconnect default oscillator as we're using noise
    }
    // Add more SFX implementations here

    oscillator.connect(gainNode);
    gainNode.connect(destinationNode);

    if (sfx !== 'explosion') { // Only start oscillator if not using noise for explosion
        oscillator.start(time);
        oscillator.stop(time + duration);
    }
}

function playInstrument(instrument, frequency, time, duration, audioCtx, destinationNode, effects) {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const { attack, decay, sustain, release } = effects.adsr;
    const { rate, depth, waveform } = effects.lfo;
    const startTime = Math.max(0, time);

    oscillator.frequency.setValueAtTime(frequency, startTime);

    // LFO for vibrato
    if (depth > 0) {
        const lfo = audioCtx.createOscillator();
        lfo.type = waveform;
        lfo.frequency.setValueAtTime(rate, startTime);

        const lfoGain = audioCtx.createGain();
        lfoGain.gain.setValueAtTime(depth, startTime);

        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);

        lfo.start(startTime);
        lfo.stop(startTime + duration + release); // LFO continues slightly after note ends
    }

    // Corrected ADSR envelope
    const noteEndTime = startTime + duration;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(1, startTime + attack);
    gainNode.gain.linearRampToValueAtTime(sustain, startTime + attack + decay);
    gainNode.gain.setValueAtTime(sustain, noteEndTime);
    gainNode.gain.linearRampToValueAtTime(0, noteEndTime + release);


    if (instrument === 'kick drum') {
    // --- Drum: Noise burst + pitch envelope ---
    oscillator.type = 'triangle';
    // Pitch envelope for "kick" effect
    oscillator.frequency.setValueAtTime(frequency, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.3, startTime + 0.05);
    // Noise burst for "snare" effect
    const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.08, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < output.length; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.connect(gainNode);

    // Fast gain envelope for drum
    gainNode.gain.setValueAtTime(0.7, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, noteEndTime + 0.08);

    noiseSource.start(startTime);
    noiseSource.stop(noteEndTime + 0.08);

    } else if (instrument === 'snare drum') {
    // --- Snare Drum: Noise burst + fast envelope ---
    // Create a noise buffer
    const bufferSize = audioCtx.sampleRate * 0.15; // ~150ms burst
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.connect(gainNode);

    // Fast gain envelope for snare
    gainNode.gain.setValueAtTime(0.7, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, noteEndTime + 0.15);

    noiseSource.start(startTime);
    noiseSource.stop(noteEndTime + 0.15);

    // Don't use oscillator for snare
    oscillator.disconnect();

} else if (instrument === 'hi-hat') {
    // --- Hi-Hat: Noise burst + fast envelope ---
    const bufferSize = audioCtx.sampleRate * 0.05; // ~50ms burst
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    // Optional: Highpass filter for metallic sound
    const highpass = audioCtx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 7000;
    noiseSource.connect(highpass);
    highpass.connect(gainNode);

    // Fast gain envelope
    gainNode.gain.setValueAtTime(0.5, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, noteEndTime + 0.05);

    noiseSource.start(startTime);
    noiseSource.stop(noteEndTime + 0.05);

    // Don't use oscillator for hi-hat
    oscillator.disconnect();

} else if (instrument === 'tom drum') {
    // --- Tom Drum: Lower pitch, pitch drop, short envelope ---
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(frequency / 2, startTime); // Lower pitch
    oscillator.frequency.exponentialRampToValueAtTime(frequency / 4, startTime + 0.12); // Pitch drop

    gainNode.gain.setValueAtTime(0.8, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, noteEndTime + 0.18);

} else if (instrument === 'clap') {
    const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.2, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < output.length; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2000, startTime);

    noiseSource.connect(filter);
    filter.connect(gainNode);

    // Fast gain envelope for clap
    gainNode.gain.setValueAtTime(0.6, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, noteEndTime + 0.2);

    noiseSource.start(startTime);
    noiseSource.stop(noteEndTime + release);

    oscillator.disconnect();
}

    oscillator.connect(gainNode);
    gainNode.connect(destinationNode);

    oscillator.start(startTime);
    oscillator.stop(noteEndTime + release);

    return { oscillator, gainNode };
}

function playSound(waveform, frequency, time, duration, audioCtx, destinationNode, effects) {
    const startTime = Math.max(0, time);
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const { attack, decay, sustain, release } = effects.adsr;
    const { rate, depth, waveform: lfoWaveform } = effects.lfo;

    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, startTime);

    // LFO for vibrato
    if (depth > 0) {
        const lfo = audioCtx.createOscillator();
        lfo.type = lfoWaveform;
        lfo.frequency.setValueAtTime(rate, startTime);

        const lfoGain = audioCtx.createGain();
        lfoGain.gain.setValueAtTime(depth, startTime);

        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);

        lfo.start(startTime);
        lfo.stop(startTime + duration + release);
    }

    // Corrected ADSR Envelope
    const noteEndTime = startTime + duration;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(1, startTime + attack);
    gainNode.gain.linearRampToValueAtTime(sustain, startTime + attack + decay);
    gainNode.gain.setValueAtTime(sustain, noteEndTime);
    gainNode.gain.linearRampToValueAtTime(0, noteEndTime + release);

    oscillator.connect(gainNode);
    gainNode.connect(destinationNode);

    oscillator.start(startTime);
    oscillator.stop(noteEndTime + release); // Stop after the release phase

    return { oscillator, gainNode };
}

function updateLayerEffects(layer) {
    // Update reverb
    layer.reverbWetGain.gain.value = layer.effects.reverb.mix;
    layer.reverbDryGain.gain.value = 1 - layer.effects.reverb.mix;
    layer.reverbNode.buffer = generateReverbImpulseResponse(layer.effects.reverb.decay, layer.effects.reverb.decay, false);

    // Update delay
    layer.delayNode.delayTime.value = layer.effects.delay.time;
    layer.delayFeedbackGain.gain.value = layer.effects.delay.feedback;
    layer.delayWetGain.gain.value = layer.effects.delay.mix;
    layer.delayDryGain.gain.value = 1 - layer.effects.delay.mix;

    // Update bitcrusher
    if (layer.bitcrusherNode) {
        const bitsParam = layer.bitcrusherNode.parameters.get('bits');
        const freqParam = layer.bitcrusherNode.parameters.get('frequencyReduction');
        bitsParam.setValueAtTime(layer.effects.bitcrusher.bits, audioContext.currentTime);
        freqParam.setValueAtTime(layer.effects.bitcrusher.frequencyReduction, audioContext.currentTime);
    }

    // Update panner
    if (layer.pannerNode) {
        layer.pannerNode.pan.setValueAtTime(layer.effects.pan, audioContext.currentTime);
    }
}

function scheduleNote(beatNumber, time) {
    const anyLayerSoloed = layers.some(l => l.isSoloed);

    layers.forEach(layer => {
        const isAudible = (!anyLayerSoloed && !layer.isMuted) || (anyLayerSoloed && layer.isSoloed && !layer.isMuted);
        if (!isAudible) return;

        for (let i = 0; i < numRows; i++) {
            // Find notes that start at the current beatNumber
            const notesToPlay = layer.grid[i].filter(note => beatNumber === note.start);

            notesToPlay.forEach(note => {
                const noteDurationInBeats = note.end - note.start + 1;
                const noteDurationInSeconds = noteDurationInBeats * (60.0 / parseFloat(bpmInput.value));

                const noteFrequency = baseFrequencies[i] * Math.pow(2, layer.octave);
                
                // Correctly pass the destination node for live playback
                const destinationNode = layer.inputNode || layer.gainNode;

                if (layer.sfx) {
                    playSFX(layer.sfx, time, noteDurationInSeconds, audioContext, destinationNode, layer.effects);
                } else if (layer.instrument) {
                    playInstrument(layer.instrument, noteFrequency, time, noteDurationInSeconds, audioContext, destinationNode, layer.effects);
                } else {
                    playSound(layer.waveform, noteFrequency, time, noteDurationInSeconds, audioContext, destinationNode, layer.effects);
                }
            });
        }
    });
}

let loopHappened = false;

function scheduler() {
    while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
        // If looping is enabled and we've reached the end of the sequence, reset
        if (loopCheckbox.checked && currentColumn * (60.0 / parseFloat(bpmInput.value)) >= totalSequenceDuration) {
            currentColumn = 0;
            nextNoteTime = audioContext.currentTime; // Reset nextNoteTime to current audio context time
            playbackStartTime = audioContext.currentTime;
            // Stop any currently playing notes to prevent lingering sounds
            playingNodes.forEach(node => {
                if (node.oscillator) node.oscillator.stop(0);
                if (node.gain) node.gain.disconnect();
            });
            playingNodes = [];
        }

        scheduleNote(currentColumn, nextNoteTime);
        nextNote();
    }

    if (isPlaying) {
        schedulerTimerId = setTimeout(scheduler, lookahead);
    }
}

let animationFrameId = null;

let lastPlaybackTime = 0;

function draw() {
    if (!isPlaying) {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        return;
    }

    currentPlaybackTime = audioContext.currentTime - playbackStartTime;

    // --- Loop Detection ---
    // If the current time is less than the last recorded time, a loop has occurred.
    if (currentPlaybackTime < lastPlaybackTime) {
        gridOffset = 0; // Reset scroll to the beginning
        renderActiveLayer();
        renderLayerList();
    }
    lastPlaybackTime = currentPlaybackTime;

    const secondsPerBeat = 60.0 / parseFloat(bpmInput.value);
    const currentWholeColumn = Math.floor(currentPlaybackTime / secondsPerBeat);

    if (currentPlaybackTime >= totalSequenceDuration && !loopCheckbox.checked) {
        stopPlayback();
        return;
    }

    // Auto-scroll logic
    const barCount = parseInt(barInput.value, 10);
    if (currentWholeColumn >= gridOffset + numCols) {
        gridOffset += barCount;
        renderActiveLayer();
        renderLayerList();
    }

    globalProgressBar.value = currentPlaybackTime;
    globalTimestamp.textContent = `${formatTime(currentPlaybackTime)}/${formatTime(totalSequenceDuration)}`;

    highlightColumn(currentWholeColumn);

    animationFrameId = requestAnimationFrame(draw);
}

function startPlayback(startColumn = 0) {
    if (isPlaying) return;

    // Resume AudioContext if it's suspended
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    isPlaying = true;

    updateTotalDurationAndDisplay();
    if (totalSequenceDuration === 0) {
        console.log("No notes to play.");
        isPlaying = false;
        return;
    }

    playbackStartBpm = parseFloat(bpmInput.value);
    currentColumn = startColumn; // Use the provided startColumn
    const secondsPerBeat = 60.0 / parseFloat(bpmInput.value);
    playbackStartTime = audioContext.currentTime - (currentColumn * secondsPerBeat); // Adjust playbackStartTime
    nextNoteTime = audioContext.currentTime; // This should be relative to audioContext.currentTime for scheduling
    playingNodes = [];

    scheduler();
    if (animationFrameId === null) {
        animationFrameId = requestAnimationFrame(draw);
    }

    globalPlayPauseButton.textContent = "Stop";
}

function stopPlayback(clearGridFlag = false) {
    if (!isPlaying && !clearGridFlag) return;
    isPlaying = false;

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    clearTimeout(schedulerTimerId);
    clearTimeout(endOfSequenceTimerId);

    playingNodes.forEach(node => {
        if (node.oscillator) node.oscillator.stop(0);
        if (node.gain) node.gain.disconnect();
    });
    playingNodes = [];

    columnHighlight.classList.remove('block');
    columnHighlight.classList.add('hidden');
    updateColumnDimensions();

    const highlightedCells = document.querySelectorAll('.grid-cell.highlighted');
    highlightedCells.forEach(cell => cell.classList.remove('highlighted'));

    if (clearGridFlag) {
        layers[activeLayerIndex].grid = Array(numRows).fill(null).map(() => []);
        renderActiveLayer();
        renderLayerList();
    }

    globalPlayPauseButton.textContent = "Play";
    globalProgressBar.value = 0;
    currentPlaybackTime = 0;
    globalTimestamp.textContent = `0:00/${formatTime(totalSequenceDuration)}`;
}

function handleMouseDown(e, row, col) {
    if (e.button !== 0) return; // Only left click

    let dataCol;
    // For tools that can interact with the content of a long note (like splice),
    // we must calculate the column from the mouse's X coordinate.
    if (activeTool === 'splice') {
        const gridRect = gridContainer.getBoundingClientRect();
        const mouseX = e.clientX - gridRect.left;
        const visualCurrentCol = Math.floor(mouseX / effectiveColumnWidth);
        dataCol = visualCurrentCol + gridOffset;
    } else {
        // For other tools, the provided `col` is sufficient.
        dataCol = col + gridOffset;
    }

    if (activeTool === 'draw') {
        const noteUnderCursor = grid[row] ? grid[row].find(note => dataCol >= note.start && dataCol <= note.end) : null;
        const isClickOnSelection = noteUnderCursor && currentlySelectedNotes.some(selected => selected.noteRef === noteUnderCursor && selected.row === row);

        if (isClickOnSelection) {
            // --- Start extending the selection ---
            isExtendingSelection = true;
            dragStartCol = dataCol;

            // Determine which edge is being dragged based on the initial click
            const distToStart = Math.abs(dataCol - noteUnderCursor.start);
            const distToEnd = Math.abs(dataCol - noteUnderCursor.end);
            draggedEdgeIsStart = distToStart <= distToEnd;

            selectionDragData = currentlySelectedNotes.map(selected => {
                const { noteRef, row } = selected;
                return {
                    noteRef: noteRef,
                    row: row,
                    originalStart: noteRef.start,
                    originalEnd: noteRef.end,
                };
            });
        } else {
            // --- Start drawing a new note ---
            clearSelection(); // Clear selection if drawing a new note
            isExtendingSelection = false;
            dragStartCol = dataCol;
            dragStartRow = row;
        }

        isDragging = false; // Reset drag state
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

    } else if (activeTool === 'erase') {
        // Find if a note exists at the clicked location.
        const noteUnderCursor = grid[row] ? grid[row].find(note => dataCol >= note.start && dataCol <= note.end) : null;

        if (!noteUnderCursor) {
            // Clicked on an empty cell, do nothing to prevent accidental erasure.
            return;
        }

        // Check if the clicked note is part of the current selection.
        const isClickOnSelection = currentlySelectedNotes.some(selected => selected.noteRef === noteUnderCursor && selected.row === row);

        if (isClickOnSelection) {
            // Clicked on a selected note, erase the entire selection.
            eraseSelectedNotes();
        } else {
            // Clicked on a non-selected note. Erase just that note and clear the selection.
            clearSelection();
            eraseNote(row, dataCol);
        }
    } else if (activeTool === 'splice') {
        spliceNote(row, dataCol);
    } else if (activeTool === 'select') {
        clearSelection();
        selectionStartCol = dataCol;
        selectionStartRow = row;
        selectionEndCol = dataCol;
        selectionEndRow = row;
        isDragging = true; // Indicate that a selection drag has started

        document.addEventListener('mousemove', handleSelectionMouseMove);
        document.addEventListener('mouseup', handleSelectionMouseUp);
    } else if (activeTool === 'move') {
        const noteUnderCursor = grid[row].find(note => dataCol >= note.start && dataCol <= note.end);

        // If there's no note under the cursor, do nothing.
        if (!noteUnderCursor) {
            return;
        }

        const isClickOnSelection = currentlySelectedNotes.some(selected => selected.noteRef === noteUnderCursor && selected.row === row);

        // Determine what to move.
        if (currentlySelectedNotes.length > 0 && isClickOnSelection) {
            // Scenario 1: A selection exists and the user clicked on a note within it.
            // Move the entire selection.
            selectedNotesForMove = currentlySelectedNotes.map(selected => ({
                originalNote: { ...selected.noteRef },
                originalRow: selected.row
            }));
        } else {
            // Scenario 2: No selection exists, OR the user clicked a note outside the current selection.
            // In both cases, we move only the single note that was clicked.
            selectedNotesForMove = [{
                originalNote: { ...noteUnderCursor },
                originalRow: row
            }];
        }

        // Now that we know what to move, clear the old selection state and visuals.
        clearSelection();

        // And start the move operation.
        moveStartCol = dataCol;
        moveStartRow = row;
        isDragging = true;

        document.addEventListener('mousemove', handleMoveMouseMove);
        document.addEventListener('mouseup', handleMoveMouseUp);
    }
}

function handleMouseMove(e) {
    const targetCell = e.target.closest('.grid-cell');
    if (!targetCell) return;

    const gridRect = gridContainer.getBoundingClientRect();
    const mouseX = e.clientX - gridRect.left;
    let visualCurrentCol = Math.floor(mouseX / effectiveColumnWidth);
    visualCurrentCol = Math.max(0, Math.min(numCols - 1, visualCurrentCol));
    const currentCol = visualCurrentCol + gridOffset;

    if (!isDragging && currentCol !== dragStartCol) {
        isDragging = true;
        if (!isExtendingSelection) {
            const existingNote = grid[dragStartRow].find(note => dragStartCol >= note.start && dragStartCol <= note.end);
            if (existingNote) {
                currentNote = existingNote;
                anchorCol = (dragStartCol === existingNote.start) ? existingNote.end : existingNote.start;
            } else {
                currentNote = { start: dragStartCol, end: dragStartCol };
                grid[dragStartRow].push(currentNote);
                anchorCol = dragStartCol;
            }
        }
    }

    if (!isDragging) return;

    if (isExtendingSelection) {
        const dragOffset = currentCol - dragStartCol;

        selectionDragData.forEach(data => {
            const { noteRef, originalStart, originalEnd, row } = data;

            // All notes in the row that are NOT the current note being processed
            const otherNotesInRow = grid[row].filter(note => note !== noteRef);

            const anchorCol = draggedEdgeIsStart ? originalEnd : originalStart;
            const originalMovingCol = draggedEdgeIsStart ? originalStart : originalEnd;
            let proposedMovingCol = originalMovingCol + dragOffset;

            if (proposedMovingCol > anchorCol) { // Dragging right
                // Find the closest obstacle to the right
                let boundary = Infinity;
                for (const otherNote of otherNotesInRow) {
                    // Is this other note part of the selection?
                    const otherNoteDragData = selectionDragData.find(s => s.noteRef === otherNote);
                    const otherNoteStart = otherNoteDragData ? otherNoteDragData.originalStart : otherNote.start;

                    if (otherNoteStart > anchorCol) { // Obstacle is to the right
                        boundary = Math.min(boundary, otherNoteStart);
                    }
                }
                proposedMovingCol = Math.min(proposedMovingCol, boundary - 1);

            } else if (proposedMovingCol < anchorCol) { // Dragging left
                // Find the closest obstacle to the left
                let boundary = -Infinity;
                for (const otherNote of otherNotesInRow) {
                    // Is this other note part of the selection?
                    const otherNoteDragData = selectionDragData.find(s => s.noteRef === otherNote);
                    const otherNoteEnd = otherNoteDragData ? otherNoteDragData.originalEnd : otherNote.end;

                    if (otherNoteEnd < anchorCol) { // Obstacle is to the left
                        boundary = Math.max(boundary, otherNoteEnd);
                    }
                }
                proposedMovingCol = Math.max(proposedMovingCol, boundary + 1);
            }

            noteRef.start = Math.min(proposedMovingCol, anchorCol);
            noteRef.end = Math.max(proposedMovingCol, anchorCol);
        });
    } else {
        if (!currentNote || parseInt(targetCell.dataset.row) !== dragStartRow) return;

        let proposedStart = Math.min(anchorCol, currentCol);
        let proposedEnd = Math.max(anchorCol, currentCol);

        const otherNotesInRow = grid[dragStartRow].filter(note => note !== currentNote);
        for (const otherNote of otherNotesInRow) {
            if (proposedStart <= otherNote.end && proposedEnd >= otherNote.start) {
                if (currentCol > anchorCol) {
                    proposedEnd = otherNote.start - 1;
                } else {
                    proposedStart = otherNote.end + 1;
                }
                break;
            }
        }

        currentNote.start = proposedStart;
        currentNote.end = proposedEnd;
    }

    requestAnimationFrame(() => updateGridDisplay());
}

function handleMouseUp() {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);

    if (!isDragging) {
        // This was a simple click, not a drag.
        if (!isExtendingSelection) {
            // If not extending a selection, it was a click to create/delete a single-cell note.
            toggleSingleNote(dragStartRow, dragStartCol);
        }
        // If it was a click on an existing selection, we do nothing, leaving it selected.
    } else {
        // This was a drag operation.
        if (isExtendingSelection) {
            // The drag has finished. First, get a list of the notes that were being dragged.
            const notesThatWereDragged = selectionDragData.map(d => d.noteRef);

            // Now, explicitly rebuild the selection state to ensure it's perfectly synchronized.
            clearSelection(); // Clear the old selection array.

            notesThatWereDragged.forEach(note => {
                // Check if the note is still valid (i.e., it wasn't squashed to zero size).
                if (note.start <= note.end) {
                    // Find which row this note now belongs to.
                    for (let r = 0; r < grid.length; r++) {
                        if (grid[r].includes(note)) {
                            currentlySelectedNotes.push({ noteRef: note, row: r });
                            break; // Found it, move to the next note.
                        }
                    }
                } else {
                    // If the note became invalid, find it in the grid and remove it completely.
                     for (let r = 0; r < grid.length; r++) {
                        const noteIndex = grid[r].indexOf(note);
                        if (noteIndex > -1) {
                            grid[r].splice(noteIndex, 1);
                            break;
                        }
                    }
                }
            });

        } else if (currentNote && currentNote.start > currentNote.end) {
            // If a newly drawn single note is invalid, remove it.
            const noteIndex = grid[dragStartRow].indexOf(currentNote);
            if (noteIndex > -1) {
                grid[dragStartRow].splice(noteIndex, 1);
            }
        }
    }

    // Reset all temporary state variables for the next user action.
    isDragging = false;
    dragStartCol = -1;
    dragStartRow = -1;
    currentNote = null;
    anchorCol = -1;
    isExtendingSelection = false;
    selectionDragData = [];
    draggedEdgeIsStart = false;

    // Commit the final state to the display and save.
    requestAnimationFrame(() => {
        updateGridDisplay();
        renderLayerList();
        updateTotalDurationAndDisplay();
        saveState();
        debouncedAutosaveStateToLocalStorage();
    });
}

function handleSelectionMouseMove(e) {
    const gridRect = gridContainer.getBoundingClientRect();
    const mouseX = e.clientX - gridRect.left;
    const mouseY = e.clientY - gridRect.top;

    let visualCurrentCol = Math.floor(mouseX / effectiveColumnWidth);
    let currentRow = Math.floor(mouseY / (gridContainer.offsetHeight / numRows));

    visualCurrentCol = Math.max(0, Math.min(numCols - 1, visualCurrentCol));
    currentRow = Math.max(0, Math.min(numRows - 1, currentRow));

    selectionEndCol = visualCurrentCol + gridOffset;
    selectionEndRow = currentRow;

    drawSelectionRectangle();
}

function handleSelectionMouseUp() {
    document.removeEventListener('mousemove', handleSelectionMouseMove);
    document.removeEventListener('mouseup', handleSelectionMouseUp);

    const startX = Math.min(selectionStartCol, selectionEndCol);
    const endX = Math.max(selectionStartCol, selectionEndCol);
    const startY = Math.min(selectionStartRow, selectionEndRow);
    const endY = Math.max(selectionStartRow, selectionEndRow);

    currentlySelectedNotes = [];
    const processedNotes = new Set();

    for (let r = startY; r <= endY; r++) {
        if (grid[r]) {
            for (const note of grid[r]) {
                const colIsSelected = note.start <= endX && note.end >= startX;
                if (colIsSelected) {
                    if (!processedNotes.has(note)) {
                        currentlySelectedNotes.push({ noteRef: note, row: r });
                        processedNotes.add(note);
                    }
                }
            }
        }
    }

    console.log('Selected Notes:', currentlySelectedNotes);

    selectionRectangle.style.width = '0';
    selectionRectangle.style.height = '0';
    selectionRectangle.classList.add('hidden');

    isDragging = false;
    requestAnimationFrame(() => updateGridDisplay());
}

function drawSelectionRectangle() {
    const visualStartCol = Math.min(selectionStartCol, selectionEndCol) - gridOffset;
    const visualEndCol = Math.max(selectionStartCol, selectionEndCol) - gridOffset;
    const startY = Math.min(selectionStartRow, selectionEndRow);
    const endY = Math.max(selectionStartRow, selectionEndRow);

    const clampedVisualStartCol = Math.max(0, visualStartCol);
    const clampedVisualEndCol = Math.min(numCols - 1, visualEndCol);

    const cellWidth = effectiveColumnWidth;
    const cellHeight = gridContainer.offsetHeight / numRows;

    const left = gridContainer.offsetLeft + (clampedVisualStartCol * cellWidth);
    const top = startY * cellHeight;
    const width = (clampedVisualEndCol - clampedVisualStartCol + 1) * cellWidth;
    const height = (endY - startY + 1) * cellHeight;

    selectionRectangle.style.left = `${left}px`;
    selectionRectangle.style.top = `${top}px`;
    selectionRectangle.style.width = `${width}px`;
    selectionRectangle.style.height = `${height}px`;
    selectionRectangle.classList.remove('hidden');
}

function clearSelection() {
    currentlySelectedNotes = [];
    updateGridDisplay(); // No longer async

    selectionRectangle.classList.add('hidden');
    selectionStartCol = -1;
    selectionStartRow = -1;
    selectionEndCol = -1;
    selectionEndRow = -1;
}

function copySelectedNotes() {
    if (currentlySelectedNotes.length === 0) {
        console.log("No notes selected to copy.");
        return;
    }

    // Find the top-left corner of the selection bounding box
    let minRow = Infinity;
    let minCol = Infinity;

    currentlySelectedNotes.forEach(selected => {
        if (selected.row < minRow) {
            minRow = selected.row;
        }
        if (selected.noteRef.start < minCol) {
            minCol = selected.noteRef.start;
        }
    });

    clipboard = currentlySelectedNotes.map(selected => {
        return {
            // Store position relative to the top-left corner of the selection
            relativeRow: selected.row - minRow,
            relativeStart: selected.noteRef.start - minCol,
            duration: selected.noteRef.end - selected.noteRef.start
        };
    });
    debouncedAutosaveStateToLocalStorage();
}

function cutSelectedNotes() {
    if (currentlySelectedNotes.length === 0) {
        return;
    }

    // First, copy the notes
    copySelectedNotes();

    // Now, delete the original notes
    const notesToDelete = new Set(currentlySelectedNotes.map(item => item.noteRef));

    for (let r = 0; r < grid.length; r++) {
        grid[r] = grid[r].filter(note => !notesToDelete.has(note));
    }

    clearSelection();
    requestAnimationFrame(() => {
        updateGridDisplay();
        renderLayerList();
        updateTotalDurationAndDisplay();
        saveState();
        debouncedAutosaveStateToLocalStorage();
    });
}

function pasteNotes() {
    if (!clipboard) {
        return;
    }

    // The paste will be anchored at the top-left of the current view
    const pasteStartRow = 0; // This could be changed later if we want to paste relative to cursor
    const pasteStartCol = gridOffset;

    // Create a list of new notes to be added
    const newNotes = clipboard.map(copiedNote => {
        const newRow = pasteStartRow + copiedNote.relativeRow;
        const newStart = pasteStartCol + copiedNote.relativeStart;
        const newEnd = newStart + copiedNote.duration;
        return { row: newRow, start: newStart, end: newEnd };
    });

    // --- Collision Detection and Removal ---
    // Remove any existing notes that would be overlapped by the pasted notes.
    newNotes.forEach(pastedNote => {
        if (grid[pastedNote.row]) {
            // Filter out notes that collide with the one being pasted
            grid[pastedNote.row] = grid[pastedNote.row].filter(existingNote => {
                const collision = existingNote.start <= pastedNote.end && existingNote.end >= pastedNote.start;
                return !collision; // Keep the note if there is NO collision
            });
        }
    });

    // --- Add the new notes ---
    newNotes.forEach(pastedNote => {
        if (pastedNote.row >= 0 && pastedNote.row < numRows) {
            grid[pastedNote.row].push({ start: pastedNote.start, end: pastedNote.end });
        }
    });


    clearSelection();
    requestAnimationFrame(() => {
        updateGridDisplay();
        renderLayerList();
        updateTotalDurationAndDisplay();
        saveState();
        debouncedAutosaveStateToLocalStorage();
    });
}

function selectAllNotes() {
    currentlySelectedNotes = [];
    for (let r = 0; r < numRows; r++) {
        for (const note of grid[r]) {
            currentlySelectedNotes.push({ noteRef: note, row: r });
        }
    }
    updateGridDisplay();
}

function handleMoveMouseMove(e) {
    if (!isDragging || activeTool !== 'move') return;

    const gridRect = gridContainer.getBoundingClientRect();
    const mouseX = e.clientX - gridRect.left;
    const mouseY = e.clientY - gridRect.top;

    let visualCurrentCol = Math.floor(mouseX / effectiveColumnWidth);
    let currentRow = Math.floor(mouseY / (gridContainer.offsetHeight / numRows));
    const currentCol = visualCurrentCol + gridOffset;

    const offsetX = currentCol - moveStartCol;
    const offsetY = currentRow - moveStartRow;

    const tempGrid = Array(numRows).fill(null).map(() => []);
    const isNoteInMoveList = (noteToTest, rowToTest) => {
        return selectedNotesForMove.some(movingNote =>
            movingNote.originalRow === rowToTest &&
            movingNote.originalNote.start === noteToTest.start &&
            movingNote.originalNote.end === noteToTest.end
        );
    };

    for (let r = 0; r < numRows; r++) {
        for (const note of grid[r]) {
            if (!isNoteInMoveList(note, r)) {
                tempGrid[r].push({ ...note });
            }
        }
    }

    selectedNotesForMove.forEach(noteData => {
        const { originalNote, originalRow } = noteData;
        const newRow = originalRow + offsetY;
        const newStart = originalNote.start + offsetX;
        const newEnd = originalNote.end + offsetX;

        if (newRow >= 0 && newRow < numRows) {
            tempGrid[newRow] = tempGrid[newRow] || [];
            tempGrid[newRow].push({ start: newStart, end: newEnd });
        }
    });

    updateGridDisplay(tempGrid);
}

function handleMoveMouseUp(e) {
    document.removeEventListener('mousemove', handleMoveMouseMove);
    document.removeEventListener('mouseup', handleMoveMouseUp);

    if (!isDragging || activeTool !== 'move') return;

    const gridRect = gridContainer.getBoundingClientRect();
    const mouseX = e.clientX - gridRect.left;
    const mouseY = e.clientY - gridRect.top;

    let visualCurrentCol = Math.floor(mouseX / effectiveColumnWidth);
    let currentRow = Math.floor(mouseY / (gridContainer.offsetHeight / numRows));
    const currentCol = visualCurrentCol + gridOffset;

    const offsetX = currentCol - moveStartCol;
    const offsetY = currentRow - moveStartRow;

    const newGrid = Array(numRows).fill(null).map(() => []);
    const movedNoteKeys = new Set(selectedNotesForMove.map(s => `${s.originalRow}-${s.originalNote.start}-${s.originalNote.end}`));

    for (let r = 0; r < numRows; r++) {
        for (const note of grid[r]) {
            const key = `${r}-${note.start}-${note.end}`;
            if (!movedNoteKeys.has(key)) {
                newGrid[r].push({ ...note });
            }
        }
    }

    selectedNotesForMove.forEach(noteData => {
        const { originalNote, originalRow } = noteData;
        const newRow = originalRow + offsetY;
        const newStart = originalNote.start + offsetX;
        const newEnd = originalNote.end + offsetX;

        if (newRow >= 0 && newRow < numRows && newStart >= 0) {
            newGrid[newRow] = newGrid[newRow] || [];
            newGrid[newRow].push({ start: newStart, end: newEnd });
        }
    });

    grid = newGrid;
    layers[activeLayerIndex].grid = grid; // Persist the changes to the layer

    clearSelection();
    isDragging = false;
    moveStartCol = -1;
    moveStartRow = -1;
    selectedNotesForMove = [];

    requestAnimationFrame(() => {
        updateGridDisplay();
        renderLayerList();
        updateTotalDurationAndDisplay();
        saveState();
        debouncedAutosaveStateToLocalStorage();
    });
}

globalPlayPauseButton.addEventListener('click', () => {
    if (isPlaying) {
        stopPlayback();
    } else {
        gridOffset = 0;
        renderActiveLayer();
        renderLayerList();
        startPlayback();
    }
});

function highlightColumn(col) { // col is the absolute data column based on playback time
    if (effectiveColumnWidth === 0 || !gridContainer) return;

    const visualCol = col - gridOffset;

    if (visualCol < 0 || visualCol >= numCols) {
        columnHighlight.classList.add('hidden');
        columnHighlight.classList.remove('block');
        return;
    }

    // The highlighter is a sibling of gridContainer. Its position is relative to the parent.
    const highlightLeft = gridContainer.offsetLeft + (visualCol * effectiveColumnWidth);

    columnHighlight.style.width = `${columnHighlightWidth}px`;
    columnHighlight.style.left = `${highlightLeft}px`;
    columnHighlight.style.top = '0px';
    columnHighlight.style.height = `${gridContainer.offsetHeight}px`;
    columnHighlight.classList.remove('hidden');
    columnHighlight.classList.add('block');
}

function updateColumnDimensions() {
    if (!gridContainer || gridContainer.children.length === 0) {
        effectiveColumnWidth = 0;
        columnHighlightWidth = 0;
        return;
    }

    const gridRect = gridContainer.getBoundingClientRect();
    const firstCellRect = gridContainer.children[0].getBoundingClientRect();

    effectiveColumnWidth = gridRect.width / numCols;
    columnHighlightWidth = firstCellRect.width + 2; // Make it slightly wider
}

window.addEventListener('resize', () => {
    updateColumnDimensions();
    // Re-highlighting during playback is handled by the 'draw' animation loop,
    // which will naturally pick up the new dimensions on the next frame.
});

// --- Effects Window Logic ---
const effectsWindowOverlay = document.getElementById('effects-window-overlay');
const effectsWindowTitle = document.getElementById('effects-window-title');
const effectsWindowClose = document.getElementById('effects-window-close');
const effectsWindowCopy = document.getElementById('effects-window-copy');
const effectsWindowPaste = document.getElementById('effects-window-paste');
const effectsWindowReset = document.getElementById('effects-window-reset');

let settingsWindowOverlay;
const settingsWindowClose = document.getElementById('settings-window-close');
const globalSettingsButton = document.getElementById('global-settings');
let currentEditingLayer = null;

function populateEffectsWindow(layer) {
    document.getElementById('attack-slider').value = layer.effects.adsr.attack;
    document.getElementById('decay-slider').value = layer.effects.adsr.decay;
    document.getElementById('sustain-slider').value = layer.effects.adsr.sustain;
    document.getElementById('release-slider').value = layer.effects.adsr.release;
    document.getElementById('lfo-rate-slider').value = layer.effects.lfo.rate;
    document.getElementById('lfo-depth-slider').value = layer.effects.lfo.depth;
    document.getElementById('lfo-waveform-select').value = layer.effects.lfo.waveform;
    document.getElementById('reverb-mix-slider').value = layer.effects.reverb.mix;
    document.getElementById('reverb-decay-slider').value = layer.effects.reverb.decay;
    document.getElementById('reverb-predelay-slider').value = layer.effects.reverb.predelay;
    document.getElementById('delay-time-slider').value = layer.effects.delay.time;
    document.getElementById('delay-feedback-slider').value = layer.effects.delay.feedback;
    document.getElementById('delay-mix-slider').value = layer.effects.delay.mix;
    document.getElementById('bitcrusher-bits-slider').value = layer.effects.bitcrusher.bits;
    document.getElementById('bitcrusher-frequency-slider').value = layer.effects.bitcrusher.frequencyReduction;
    document.getElementById('pan-slider').value = layer.effects.pan;
}

function openEffectsWindow(layer) {
    currentEditingLayer = layer;
    effectsWindowTitle.textContent = `Effects: ${layer.name}`;

    populateEffectsWindow(layer);
    updateLayerEffects(layer);

    effectsWindowOverlay.classList.remove('hidden');
}

function closeEffectsWindow() {
    effectsWindowOverlay.classList.add('hidden');
    currentEditingLayer = null;
    saveState(); // Save changes when closing
    debouncedAutosaveStateToLocalStorage();
}

function openSettingsWindow() {
    populateKeybindSettings();
    settingsWindowOverlay.classList.remove('hidden');
}

function closeSettingsWindow() {
    settingsWindowOverlay.classList.add('hidden');
}

effectsWindowReset.addEventListener('click', () => {
    if (currentEditingLayer) {
        const waveform = currentEditingLayer.waveform;
        const instrument = currentEditingLayer.instrument;

        if (instrument && defaultInstrumentEffects[instrument]) {
            currentEditingLayer.effects = JSON.parse(JSON.stringify(defaultInstrumentEffects[instrument]));
        } else if (waveform && defaultWaveformEffects[waveform]) {
            currentEditingLayer.effects = JSON.parse(JSON.stringify(defaultWaveformEffects[waveform]));
        }
        populateEffectsWindow(currentEditingLayer);
        updateLayerEffects(currentEditingLayer);
    }
});

// --- Tooltip Logic ---
const tooltipElement = document.getElementById('global-tooltip');
if (tooltipElement) {
    document.body.addEventListener('mouseover', (e) => {
        const icon = e.target.closest('.info-icon');
        if (icon) {
            const tooltipText = icon.getAttribute('data-tooltip');
            if (tooltipText) {
                tooltipElement.textContent = tooltipText;
                
                const iconRect = icon.getBoundingClientRect();
                tooltipElement.style.left = `${iconRect.left + (iconRect.width / 2)}px`;
                tooltipElement.style.top = `${iconRect.top}px`; // Position at the top of the icon
                
                tooltipElement.classList.add('visible');
            }
        }
    });

    document.body.addEventListener('mouseout', (e) => {
        const icon = e.target.closest('.info-icon');
        if (icon) {
            tooltipElement.classList.remove('visible');
        }
    });
}

// Add event listeners to effect controls
document.getElementById('attack-slider').addEventListener('input', (e) => currentEditingLayer.effects.adsr.attack = parseFloat(e.target.value));
document.getElementById('decay-slider').addEventListener('input', (e) => currentEditingLayer.effects.adsr.decay = parseFloat(e.target.value));
document.getElementById('sustain-slider').addEventListener('input', (e) => currentEditingLayer.effects.adsr.sustain = parseFloat(e.target.value));
document.getElementById('release-slider').addEventListener('input', (e) => currentEditingLayer.effects.adsr.release = parseFloat(e.target.value));
document.getElementById('lfo-rate-slider').addEventListener('input', (e) => currentEditingLayer.effects.lfo.rate = parseFloat(e.target.value));
document.getElementById('lfo-depth-slider').addEventListener('input', (e) => currentEditingLayer.effects.lfo.depth = parseFloat(e.target.value));
document.getElementById('lfo-waveform-select').addEventListener('change', (e) => {
    currentEditingLayer.effects.lfo.waveform = e.target.value;
    updateLayerEffects(currentEditingLayer);
});
document.getElementById('reverb-mix-slider').addEventListener('input', (e) => {
    currentEditingLayer.effects.reverb.mix = parseFloat(e.target.value);
    updateLayerEffects(currentEditingLayer);
});
document.getElementById('reverb-decay-slider').addEventListener('input', (e) => {
    currentEditingLayer.effects.reverb.decay = parseFloat(e.target.value);
    updateLayerEffects(currentEditingLayer);
});
document.getElementById('reverb-predelay-slider').addEventListener('input', (e) => {
    currentEditingLayer.effects.reverb.predelay = parseFloat(e.target.value);
    updateLayerEffects(currentEditingLayer);
});
document.getElementById('delay-time-slider').addEventListener('input', (e) => {
    currentEditingLayer.effects.delay.time = parseFloat(e.target.value);
    updateLayerEffects(currentEditingLayer);
});
document.getElementById('delay-feedback-slider').addEventListener('input', (e) => {
    currentEditingLayer.effects.delay.feedback = parseFloat(e.target.value);
    updateLayerEffects(currentEditingLayer);
});
document.getElementById('delay-mix-slider').addEventListener('input', (e) => {
    currentEditingLayer.effects.delay.mix = parseFloat(e.target.value);
    updateLayerEffects(currentEditingLayer);
});
document.getElementById('bitcrusher-bits-slider').addEventListener('input', (e) => {
    currentEditingLayer.effects.bitcrusher.bits = parseInt(e.target.value, 10);
    updateLayerEffects(currentEditingLayer);
});
document.getElementById('bitcrusher-frequency-slider').addEventListener('input', (e) => {
    currentEditingLayer.effects.bitcrusher.frequencyReduction = parseFloat(e.target.value);
    updateLayerEffects(currentEditingLayer);
});
document.getElementById('pan-slider').addEventListener('input', (e) => {
    currentEditingLayer.effects.pan = parseFloat(e.target.value);
    updateLayerEffects(currentEditingLayer);
});


function renderBusMixer() {
    busMixerContainer.innerHTML = '';

    // Master Bus
    const masterBusDiv = document.createElement('div');
    masterBusDiv.classList.add('bus-container');
    masterBusDiv.innerHTML = `
        <div class="bus-top">
        </div>
        <div class="retro-slider-container">
            <input type="range" class="retro-slider" id="master-volume-slider" min="0" max="100" value="70">
        </div>
        <label for="master-volume-slider" class="bus-label">Master</label>
    `;
    busMixerContainer.appendChild(masterBusDiv);

    const masterVolumeSlider = document.getElementById('master-volume-slider');
    const masterLabel = masterBusDiv.querySelector('.bus-label');
    masterVolumeSlider.value = linearToLog(masterGainNode.gain.value);
    masterVolumeSlider.addEventListener('input', (e) => {
        masterGainNode.gain.value = logToLinear(e.target.value);
        masterLabel.textContent = Math.round(e.target.value);
    });
    masterVolumeSlider.addEventListener('change', (e) => {
        masterLabel.textContent = 'Master';
        saveState();
        debouncedAutosaveStateToLocalStorage();
    });

    // Track Buses
    layers.forEach((layer, index) => {
        const trackBusDiv = document.createElement('div');
        trackBusDiv.classList.add('bus-container');
        if (index === activeLayerIndex) {
            trackBusDiv.classList.add('active-bus');
        }
        trackBusDiv.innerHTML = `
            <div class="bus-top">
                <button class="effects-button">...</button>
            </div>
            <div class="retro-slider-container">
                <input type="range" class="retro-slider" id="track-volume-slider-${layer.id}" min="0" max="100" value="100">
            </div>
            <label for="track-volume-slider-${layer.id}" class="bus-label">${layer.name}</label>
        `;
        busMixerContainer.appendChild(trackBusDiv);

        const effectsButton = trackBusDiv.querySelector('.effects-button');
        effectsButton.addEventListener('click', () => {
            openEffectsWindow(layer);
        });
        const trackVolumeSlider = document.getElementById(`track-volume-slider-${layer.id}`);
        const trackLabel = trackBusDiv.querySelector('.bus-label');
        trackVolumeSlider.value = linearToLog(layer.gainNode.gain.value);
        trackVolumeSlider.addEventListener('input', (e) => {
            const newGain = logToLinear(e.target.value);
            layer.gainValue = newGain;
            if (!layer.isMuted) {
                layer.gainNode.gain.value = newGain;
            }
            trackLabel.textContent = Math.round(e.target.value);
        });
        trackVolumeSlider.addEventListener('change', (e) => {
            trackLabel.textContent = layer.name;
            saveState();
            debouncedAutosaveStateToLocalStorage();
        });
    });
}

// Helper functions for logarithmic volume control
function logToLinear(value) {
    // Slider value (0-100) to gain (0-1)
    return Math.pow(value / 100, 2);
}

function linearToLog(value) {
    // Gain (0-1) to slider value (0-100)
    return Math.sqrt(value) * 100;
}


bpmInput.addEventListener('input', () => {
    bpmValueSpan.textContent = bpmInput.value;
    updateTotalDurationAndDisplay();
    if (isPlaying) {
        restartPlaybackForBpmChange();
    }
});

bpmValueSpan.addEventListener('click', () => {
    bpmValueSpan.classList.add('hidden');
    bpmTextInput.classList.remove('hidden');
    bpmTextInput.value = bpmValueSpan.textContent;
    bpmTextInput.focus();
    bpmTextInput.select();
});

function updateBpmFromTextInput() {
    let newBpm = parseInt(bpmTextInput.value, 10);

    if (isNaN(newBpm)) {
        bpmTextInput.classList.add('hidden');
        bpmValueSpan.classList.remove('hidden');
        return;
    }
    
    if (newBpm < 60) {
        newBpm = 60;
    } else if (newBpm > 240) {
        newBpm = 240;
    }

    bpmInput.value = newBpm;
    bpmValueSpan.textContent = newBpm;
    updateTotalDurationAndDisplay();

    if (isPlaying) {
        restartPlaybackForBpmChange();
    }

    bpmTextInput.classList.add('hidden');
    bpmValueSpan.classList.remove('hidden');
}

function restartPlaybackForBpmChange() {
    const oldSecondsPerBeat = 60.0 / playbackStartBpm;
    const currentColumnAtChange = Math.floor(currentPlaybackTime / oldSecondsPerBeat);

    stopPlayback();
    startPlayback(currentColumnAtChange);
}

bpmTextInput.addEventListener('blur', updateBpmFromTextInput);
bpmTextInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        updateBpmFromTextInput();
    } else if (e.key === 'Escape') {
        bpmTextInput.classList.add('hidden');
        bpmValueSpan.classList.remove('hidden');
    }
});

clearGridButton.addEventListener('click', () => {
    gridOffset = 0;
    layers[activeLayerIndex].grid = Array(numRows).fill(null).map(() => []); // Clear the active layer's grid data
    renderActiveLayer(); // Re-render the main grid
    renderLayerList(); // Re-render the layer list
    columnHighlight.classList.remove('block');
    columnHighlight.classList.add('hidden');
    updateColumnDimensions(); // Recalculate dimensions after clearing grid
    currentPlaybackTime = 0;
    updateTotalDurationAndDisplay();
    saveState();
    debouncedAutosaveStateToLocalStorage();
})

function resetProject() {
    localStorage.removeItem('chiptuned-autosave');
    stopPlayback();
    layers.forEach(layer => {
        if (layer.gainNode) layer.gainNode.disconnect();
        if (layer.reverbNode) layer.reverbNode.disconnect();
        if (layer.reverbWetGain) layer.reverbWetGain.disconnect();
        if (layer.reverbDryGain) layer.reverbDryGain.disconnect();
        if (layer.delayNode) layer.delayNode.disconnect();
        if (layer.delayFeedbackGain) layer.delayFeedbackGain.disconnect();
        if (layer.delayWetGain) layer.delayWetGain.disconnect();
        if (layer.delayDryGain) layer.delayDryGain.disconnect();
        if (layer.bitcrusherNode) layer.bitcrusherNode.disconnect();
        if (layer.pannerNode) layer.pannerNode.disconnect();
        if (layer.lfoNode) layer.lfoNode.disconnect(); 
    });

    // Disconnect master effects
    masterGainNode.disconnect();

    layers = [];
    activeLayerIndex = -1;
    gridOffset = 0;
    currentPlaybackTime = 0;
    history = [];
    historyIndex = -1;

    // Reset master gain
    masterGainNode = audioContext.createGain();
    masterGainNode.gain.value = 1.0; // Default master volume (max)

    // Reconnect master effects to destination
    masterGainNode.connect(audioContext.destination);

    // Create a single, fresh layer
    addLayer(); 

    // Reset UI elements
    bpmInput.value = 120;
    bpmValueSpan.textContent = '120';
    loopCheckbox.checked = false;
    barInput.value = 4;

    updateTotalDurationAndDisplay();
    renderBusMixer();
    updateUndoRedoButtons();
    hasUnsavedChanges = false;
    currentProjectFileName = 'my_chiptuned_project.cht';
}

let resolveConfirmationPromise;

function showConfirmationDialog(message) {
    confirmationMessage.innerHTML = message;
    confirmationDialogOverlay.classList.remove('hidden');
    return new Promise(resolve => {
        resolveConfirmationPromise = resolve;
    });
}

function hideConfirmationDialog() {
    confirmationDialogOverlay.classList.add('hidden');
}

confirmButton.addEventListener('click', () => {
    hideConfirmationDialog();
    if (resolveConfirmationPromise) {
        resolveConfirmationPromise(true);
    }
});

cancelButton.addEventListener('click', () => {
    hideConfirmationDialog();
    if (resolveConfirmationPromise) {
        resolveConfirmationPromise(false);
    }
});

newProjectButton.addEventListener('click', async () => {
    if (hasUnsavedChanges) {
        const confirmed = await showConfirmationDialog('You have unsaved changes.<br>Are you sure you want to start a new project?');
        if (confirmed) {
            resetProject();           
        }
    } else {
        resetProject();
    }
});

randomGridButton.addEventListener('click', () => {
    // Add a guard clause to ensure there's an active layer
    if (activeLayerIndex === -1 || !layers[activeLayerIndex]) {
        return;
    }

    // --- 1. Randomize settings ---
    // Random Waveform
    const randomWaveformIndex = Math.floor(Math.random() * waveforms.length);
    layers[activeLayerIndex].waveform = waveforms[randomWaveformIndex];

    // Reset Instrument and SFX
    layers[activeLayerIndex].instrument = '';
    layers[activeLayerIndex].sfx = '';

    // Random Octave
    layers[activeLayerIndex].octave = Math.floor(Math.random() * 3) + 3; // Octaves 3, 4, or 5

    // --- 2. Clear the grid ---
    layers[activeLayerIndex].grid = Array(numRows).fill(null).map(() => []);

    // --- 3. Generate Music ---
    // Define multiple chord progressions
    const progressions = [
        [{ root: 0, notes: [0, 4, 7] }, { root: 7, notes: [7, 11, 2] }, { root: 9, notes: [9, 0, 4] }, { root: 5, notes: [5, 9, 0] }], // I-V-vi-IV
        [{ root: 9, notes: [9, 0, 4] }, { root: 5, notes: [5, 9, 0] }, { root: 0, notes: [0, 4, 7] }, { root: 7, notes: [7, 11, 2] }], // vi-IV-I-V
        [{ root: 0, notes: [0, 4, 7] }, { root: 9, notes: [9, 0, 4] }, { root: 5, notes: [5, 9, 0] }, { root: 7, notes: [7, 11, 2] }], // I-vi-IV-V
        [{ root: 0, notes: [0, 4, 7] }, { root: 5, notes: [5, 9, 0] }, { root: 7, notes: [7, 11, 2] }, { root: 0, notes: [0, 4, 7] }]  // I-IV-V-I
    ];
    const selectedProgression = progressions[Math.floor(Math.random() * progressions.length)];
    const chordDuration = 8;

    // Define multiple arpeggio patterns
    const arpeggioPatterns = [
        [0, 1, 2, 1], // Up-down
        [0, 2, 1, 2], // Jumpy
        [2, 1, 0, 1], // Down-up
        [0, 1, 2, 0]  // Root-focused
    ];

    const lastGeneratedNoteInRow = Array(numRows).fill(null); // Track the last note generated for each row

    for (let chordIndex = 0; chordIndex < selectedProgression.length; chordIndex++) {
        const chord = selectedProgression[chordIndex];
        const startCol = chordIndex * chordDuration;
        const arpeggioPattern = arpeggioPatterns[Math.floor(Math.random() * arpeggioPatterns.length)];

        // Add a bass note for each chord on the first beat
        const bassNoteRow = chord.root;
        const bassNote = { start: startCol, end: startCol };
        layers[activeLayerIndex].grid[bassNoteRow].push(bassNote);
        lastGeneratedNoteInRow[bassNoteRow] = bassNote;

        // Generate arpeggiated notes for the chord duration
        for (let i = 0; i < chordDuration; i++) {
            const col = startCol + i;
            if (col >= numCols) break; // Prevent going out of bounds

            const noteIndex = arpeggioPattern[i % arpeggioPattern.length];
            const noteRow = chord.notes[noteIndex];

            // Always generate single notes
            layers[activeLayerIndex].grid[noteRow].push({ start: col, end: col });
        }
    }
    renderSoundSelectionButtons(); // Update sound buttons after randomization
    setTimeout(() => {
        renderActiveLayer();
        renderLayerList();
        saveState();
        debouncedAutosaveStateToLocalStorage();
    }, 0);

    // --- 4. Set random BPM ---
    const newBpm = Math.floor(Math.random() * (180 - 90 + 1)) + 90;
    bpmInput.value = newBpm;
    bpmValueSpan.textContent = newBpm;
    updateTotalDurationAndDisplay();
});

octaveDownButton.addEventListener('click', () => {
    if (layers[activeLayerIndex].octave > 0) {
        layers[activeLayerIndex].octave--;
        renderActiveLayer(); // Re-render active layer to update notes and grid
        debouncedAutosaveStateToLocalStorage();
    }
});

octaveUpButton.addEventListener('click', () => {
    if (layers[activeLayerIndex].octave < 9) {
        layers[activeLayerIndex].octave++;
        renderActiveLayer(); // Re-render active layer to update notes and grid
        debouncedAutosaveStateToLocalStorage();
    }
});



async function saveProject() {
    const projectData = {
        bpm: bpmInput.value,
        loop: loopCheckbox.checked,
        masterGain: masterGainNode.gain.value,
        layers: layers.map(layer => ({
            id: layer.id,
            name: layer.name,
            grid: layer.grid,
            instrument: layer.instrument,
            waveform: layer.waveform,
            sfx: layer.sfx,
            octave: layer.octave,
            isMuted: layer.isMuted,
            gainValue: layer.gainValue,
            effects: layer.effects
        }))
    };

    const dataStr = JSON.stringify(projectData);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const fileName = currentProjectFileName;

    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{
                    description: 'Chiptuned Project File',
                    accept: { 'application/json': ['.cht'] },
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            hasUnsavedChanges = false; // Reset flag after successful save
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error saving project using File System Access API:', err);
                fallbackSave(blob, fileName);
            }
        }
    } else {
        fallbackSave(blob, fileName);
    }
}

function fallbackSave(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    hasUnsavedChanges = false; // Reset flag after successful save
}

async function loadProject(data) {
    // Helper function to process the loaded data, whether decrypted or not
    const processLoadedData = (loadedData) => {
        // Basic validation
        if (!loadedData || typeof loadedData !== 'object' || !loadedData.layers || !loadedData.bpm) {
            throw new Error("Invalid project data format.");
        }

        // Clear existing layers and their gain nodes
        layers.forEach(layer => {
            // Disconnect all nodes before clearing
            if (layer.gainNode) layer.gainNode.disconnect();
            if (layer.reverbNode) layer.reverbNode.disconnect();
            if (layer.reverbWetGain) layer.reverbWetGain.disconnect();
            if (layer.reverbDryGain) layer.reverbDryGain.disconnect();
            if (layer.delayNode) layer.delayNode.disconnect();
            if (layer.delayFeedbackGain) layer.delayFeedbackGain.disconnect();
            if (layer.delayWetGain) layer.delayWetGain.disconnect();
            if (layer.delayDryGain) layer.delayDryGain.disconnect();
            if (layer.bitcrusherNode) layer.bitcrusherNode.disconnect();
            if (layer.pannerNode) layer.pannerNode.disconnect();
        });
        layers = [];


        // Load master gain
        if (typeof loadedData.masterGain === 'number') {
            masterGainNode.gain.value = loadedData.masterGain;
        }

        // Recreate layers with their audio nodes and ensure effects are present
        loadedData.layers.forEach(loadedLayer => {
            // Ensure effects property exists, defaulting if necessary
            if (!loadedLayer.effects) {
                loadedLayer.effects = JSON.parse(JSON.stringify(defaultWaveformEffects[loadedLayer.waveform || 'square']));
            }

            // Recreate gain node
            const gainNode = audioContext.createGain();
            const gainValue = typeof loadedLayer.gainValue === 'number' ? loadedLayer.gainValue : 0.7;
            gainNode.gain.value = gainValue;

            // Recreate effects nodes
            const reverbNode = audioContext.createConvolver();
            const reverbWetGain = audioContext.createGain();
            const reverbDryGain = audioContext.createGain();
            const delayNode = audioContext.createDelay();
            const delayFeedbackGain = audioContext.createGain();
            const delayWetGain = audioContext.createGain();
            const delayDryGain = audioContext.createGain();
            const pannerNode = audioContext.createStereoPanner();

            // Bitcrusher node (if using AudioWorklet)
            let bitcrusherNode = null;
            if (isAudioWorkletReady) {
                bitcrusherNode = createBitcrusherNode(loadedLayer); // Pass loadedLayer to use its effects
            }

            // Build the audio chain (same as in createNewLayer and restoreState)
            const inputNode = bitcrusherNode || gainNode;

            // Delay connections
            const sourceNodeForDelay = bitcrusherNode || gainNode;
            sourceNodeForDelay.connect(delayDryGain);
            sourceNodeForDelay.connect(delayWetGain);
            delayWetGain.connect(delayNode);
            delayNode.connect(delayFeedbackGain);
            delayFeedbackGain.connect(delayNode);

            const delayOutput = audioContext.createGain();
            delayDryGain.connect(delayOutput);
            delayNode.connect(delayOutput);

            // Reverb connections
            delayOutput.connect(reverbDryGain);
            delayOutput.connect(reverbWetGain);
            reverbWetGain.connect(reverbNode);

            const reverbOutput = audioContext.createGain();
            reverbDryGain.connect(reverbOutput);
            reverbNode.connect(reverbOutput);

            // Connect reverb output to panner
            reverbOutput.connect(pannerNode);

            // Connect panner to layer gain
            pannerNode.connect(gainNode);

            // Connect layer gain to master gain
            gainNode.connect(masterGainNode);

            // Set initial effect parameters using the loaded effects data
            reverbWetGain.gain.value = loadedLayer.effects.reverb.mix;
            reverbDryGain.gain.value = 1.0 - loadedLayer.effects.reverb.mix;
            delayWetGain.gain.value = loadedLayer.effects.delay.mix;
            delayDryGain.gain.value = 1.0 - loadedLayer.effects.delay.mix;
            delayFeedbackGain.gain.value = loadedLayer.effects.delay.feedback;
            delayNode.delayTime.value = loadedLayer.effects.delay.time;
            reverbNode.buffer = generateReverbImpulseResponse(loadedLayer.effects.reverb.decay, loadedLayer.effects.reverb.decay, false);
            pannerNode.pan.value = loadedLayer.effects.pan;


            layers.push({
                ...loadedLayer,
                gainNode: gainNode,
                gainValue: gainValue,
                reverbNode: reverbNode,
                reverbWetGain: reverbWetGain,
                reverbDryGain: reverbDryGain,
                delayNode: delayNode,
                delayFeedbackGain: delayFeedbackGain,
                delayWetGain: delayWetGain,
                delayDryGain: delayDryGain,
                bitcrusherNode: bitcrusherNode,
                pannerNode: pannerNode,
                inputNode: inputNode // Assign the start of the chain
            });
        });

        activeLayerIndex = 0;
        renderActiveLayer();
        renderLayerList();

        const loadedActiveLayerIndex = loadedData.activeLayerIndex !== undefined ? loadedData.activeLayerIndex : 0;
        switchLayer(loadedActiveLayerIndex, true);

        // Load BPM
        if (typeof loadedData.bpm === 'string' || typeof loadedData.bpm === 'number') {
            bpmInput.value = loadedData.bpm;
            bpmValueSpan.textContent = loadedData.bpm;
        }

        // Load loop state
        if (loadedData.loop) {
            loopCheckbox.checked = true;
        } else {
            loopCheckbox.checked = false;
        }

        updateTotalDurationAndDisplay();

        updateGridDisplay(); // Update the visual grid based on loaded data
        renderBusMixer(); // Render the bus mixer after loading
        hasUnsavedChanges = false; // Reset flag after successful load
    };

    try {
      //  First, try to decrypt the project data as if it's a new, encrypted project
        const importedKey = await window.crypto.subtle.importKey(
            "jwk",
            data.key,
            { name: "AES-GCM" },
            true,
            ["decrypt"]
        );
        const iv = new Uint8Array(data.iv);
        const ciphertext = new Uint8Array(data.ciphertext);

        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            importedKey,
            ciphertext
        );

        const decodedDataStr = new TextDecoder().decode(decrypted);
        const decryptedData = JSON.parse(decodedDataStr);
        processLoadedData(decryptedData);

    } catch (error) {
        console.error('Decryption failed, attempting to load as unencrypted project:', error);
        // As a fallback for old or unencrypted projects, try to load the data directly
        try {
            processLoadedData(data);
        } catch (e) {
            console.error('Could not load project. It may be corrupt or in an invalid format.', e);
            alert('Could not load project file. It may be corrupt.');
        }
    }
}


saveMp3Button.addEventListener('click', () => {
    exportDialogOverlay.classList.remove('hidden');
});

exportMp3Button.addEventListener('click', async () => {
    exportDialogOverlay.classList.add('hidden');
    await exportAudio('mp3');
});

exportWavButton.addEventListener('click', async () => {
    exportDialogOverlay.classList.add('hidden');
    await exportAudio('wav');
});

exportDialogOverlay.addEventListener('click', (e) => {
    if (e.target === exportDialogOverlay) {
        exportDialogOverlay.classList.add('hidden');
    }
});

async function exportAudio(format) {
    const bpm = parseFloat(bpmInput.value);
    const fileName = `chiptuned_${bpm}BPM_${layers[activeLayerIndex].sfx || layers[activeLayerIndex].instrument || layers[activeLayerIndex].waveform}`;

    const noteDurationPerColumn = 60 / bpm;

    let maxColWithNote = -1;
    layers.forEach(layer => {
        layer.grid.forEach(row => {
            row.forEach(note => {
                if (note.end > maxColWithNote) {
                    maxColWithNote = note.end;
                }
            });
        });
    });

    const totalDuration = (maxColWithNote + 1) * noteDurationPerColumn;

    if (totalDuration <= 0) {
        alert("Cannot export an empty track. Please add some notes first.");
        return;
    }

    const renderedBuffer = await renderAudioToBuffer(totalDuration);

    if (format === 'mp3') {
        await saveMp3(renderedBuffer, fileName + '.mp3');
    } else if (format === 'wav') {
        await saveWav(renderedBuffer, fileName + '.wav');
    }
}

async function renderAudioToBuffer(totalDuration) {
    const offlineAudioContext = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
        2,
        Math.ceil(audioContext.sampleRate * totalDuration),
        audioContext.sampleRate
    );

    // Add the worklet module once at the beginning if needed.
    if (isAudioWorkletReady && offlineAudioContext.audioWorklet) {
        try {
            await offlineAudioContext.audioWorklet.addModule('bitcrusher-processor.js');
        } catch (e) {
            console.error("Error adding AudioWorklet module to offline context:", e);
        }
    }

    const offlineMasterGain = offlineAudioContext.createGain();
    offlineMasterGain.gain.value = masterGainNode.gain.value;
    offlineMasterGain.connect(offlineAudioContext.destination);

    for (const layer of layers) {
        // Create a complete, isolated audio graph for each layer, mimicking the live graph.
        const layerGain = offlineAudioContext.createGain();
        layerGain.gain.value = layer.isMuted ? 0 : layer.gainValue; // Respect mute state
        layerGain.connect(offlineMasterGain);

        const pannerNode = offlineAudioContext.createStereoPanner();
        pannerNode.pan.value = layer.effects.pan;
        pannerNode.connect(layerGain);

        const reverbOutput = offlineAudioContext.createGain();
        reverbOutput.connect(pannerNode);
        const reverbNode = offlineAudioContext.createConvolver();
        const reverbBuffer = generateReverbImpulseResponse(layer.effects.reverb.decay, layer.effects.reverb.decay, false);
        if (reverbBuffer) {
            reverbNode.buffer = reverbBuffer;
        }
        const reverbWetGain = offlineAudioContext.createGain();
        reverbWetGain.gain.value = layer.effects.reverb.mix;
        reverbWetGain.connect(reverbNode);
        reverbNode.connect(reverbOutput);
        const reverbDryGain = offlineAudioContext.createGain();
        reverbDryGain.gain.value = 1.0 - layer.effects.reverb.mix;
        reverbDryGain.connect(reverbOutput);

        const delayOutput = offlineAudioContext.createGain();
        delayOutput.connect(reverbDryGain);
        delayOutput.connect(reverbWetGain);
        const delayNode = offlineAudioContext.createDelay();
        delayNode.delayTime.value = layer.effects.delay.time;
        const delayFeedbackGain = offlineAudioContext.createGain();
        delayFeedbackGain.gain.value = layer.effects.delay.feedback;
        delayNode.connect(delayFeedbackGain);
        delayFeedbackGain.connect(delayNode);
        const delayWetGain = offlineAudioContext.createGain();
        delayWetGain.gain.value = layer.effects.delay.mix;
        delayWetGain.connect(delayNode);
        delayNode.connect(delayOutput);
        const delayDryGain = offlineAudioContext.createGain();
        delayDryGain.gain.value = 1.0 - layer.effects.delay.mix;
        delayDryGain.connect(delayOutput);

        let inputForOscillator;
        if (isAudioWorkletReady && offlineAudioContext.audioWorklet) {
            const bitcrusherNode = new AudioWorkletNode(offlineAudioContext, 'bitcrusher-processor');
            bitcrusherNode.parameters.get('bits').value = layer.effects.bitcrusher.bits;
            bitcrusherNode.parameters.get('frequencyReduction').value = layer.effects.bitcrusher.frequencyReduction;
            bitcrusherNode.connect(delayDryGain);
            bitcrusherNode.connect(delayWetGain);
            inputForOscillator = bitcrusherNode;
        } else {
            // If no bitcrusher, the oscillator connects directly to the delay chain's inputs
            const preEffectsGain = offlineAudioContext.createGain();
            preEffectsGain.connect(delayDryGain);
            preEffectsGain.connect(delayWetGain);
            inputForOscillator = preEffectsGain;
        }

        const layerFrequencies = [];
        for (let i = 0; i < numRows; i++) {
            layerFrequencies.push(baseFrequencies[i] * Math.pow(2, layer.octave));
        }

        for (let i = 0; i < numRows; i++) {
            layer.grid[i].forEach(note => {
                const noteStartTime = note.start * (60 / parseFloat(bpmInput.value));
                const noteDuration = (note.end - note.start + 1) * (60 / parseFloat(bpmInput.value));
                const noteFrequency = layerFrequencies[i];

                // The 'layer' argument in play* functions is the destination node for the oscillator.
                if (layer.sfx) {
                    playSFX(layer.sfx, noteStartTime, noteDuration, offlineAudioContext, inputForOscillator, layer.effects);
                } else if (layer.instrument) {
                    playInstrument(layer.instrument, noteFrequency, noteStartTime, noteDuration, offlineAudioContext, inputForOscillator, layer.effects);
                } else {
                    playSound(layer.waveform, noteFrequency, noteStartTime, noteDuration, offlineAudioContext, inputForOscillator, layer.effects);
                }
            });
        }
    }

    return offlineAudioContext.startRendering();
}

async function saveMp3(renderedBuffer, fileName) {
    const mp3encoder = new lamejs.Mp3Encoder(2, renderedBuffer.sampleRate, 128); // 2 channels, sample rate, 128 kbps
    const mp3Data = [];

    const left = renderedBuffer.getChannelData(0);
    const right = renderedBuffer.getChannelData(1);
    const sampleBlockSize = 1152;

    function floatTo16BitPCM(input) {
        const output = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
            let s = Math.max(-1, Math.min(1, input[i]));
            output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return output;
    }

    const pcmLeft = floatTo16BitPCM(left);
    const pcmRight = floatTo16BitPCM(right);

    for (let i = 0; i < pcmLeft.length; i += sampleBlockSize) {
        const leftChunk = pcmLeft.subarray(i, i + sampleBlockSize);
        const rightChunk = pcmRight.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }
    }

    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
    }

    const blob = new Blob(mp3Data, { type: 'audio/mp3' });
    await saveFile(blob, fileName, 'MP3 Audio File', '.mp3');
}

async function saveWav(renderedBuffer, fileName) {
    const wavData = encodeWAV(renderedBuffer);
    const blob = new Blob([wavData], { type: 'audio/wav' });
    await saveFile(blob, fileName, 'WAV Audio File', '.wav');
}

function encodeWAV(audioBuffer) {
    const numOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;

    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = numOfChannels > 1 ? audioBuffer.getChannelData(1) : null;

    const dataLength = audioBuffer.length * numOfChannels * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* file length */
    view.setUint32(4, 36 + dataLength, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw PCM) */
    view.setUint16(20, format, true);
    /* channel count */
    view.setUint16(22, numOfChannels, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * numOfChannels * bytesPerSample, true);
    /* block align (channels * bytes per sample) */
    view.setUint16(32, numOfChannels * bytesPerSample, true);
    /* bits per sample */
    view.setUint16(34, bitDepth, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, dataLength, true);

    // Write the audio data, interleaving channels for stereo
    let offset = 44;
    for (let i = 0; i < audioBuffer.length; i++) {
        // Convert float to 16-bit PCM
        let s = Math.max(-1, Math.min(1, leftChannel[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += bytesPerSample;

        if (numOfChannels > 1 && rightChannel) {
            s = Math.max(-1, Math.min(1, rightChannel[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            offset += bytesPerSample;
        }
    }

    return buffer;
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

async function saveFile(blob, fileName, description, extension) {
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{
                    description: description,
                    accept: { 'audio/*': [extension] },
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error(`Error saving ${extension} using File System Access API:`, err);
                fallbackSave(blob, fileName);
            }
        }
    } else {
        fallbackSave(blob, fileName);
    }
}


function fallbackSaveMp3(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

const undoButton = document.getElementById('tool-undo');
const redoButton = document.getElementById('tool-redo');

let history = [];
let historyIndex = -1;

function saveState() {
    hasUnsavedChanges = true;
    const state = {
        layers: JSON.parse(JSON.stringify(layers)),
        activeLayerIndex: activeLayerIndex,
        masterGain: masterGainNode.gain.value
    };

    history.splice(historyIndex + 1);
    history.push(state);
    historyIndex++;
    updateUndoRedoButtons();
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        restoreState(history[historyIndex]);
    }
}

function spliceNote(row, col) {
    // Find the note that contains the clicked column `col`.
    const noteIndex = grid[row].findIndex(note => col >= note.start && col <= note.end);

    if (noteIndex !== -1) {
        const originalNote = grid[row][noteIndex];

        // A split is only valid if it's a sustained note and not on the first cell.
        const isSustained = originalNote.end > originalNote.start;
        const isValidSplitPoint = col > originalNote.start;

        if (isSustained && isValidSplitPoint) {
            const originalNoteEnd = originalNote.end;

            // The first part of the note ends at the column just before the click.
            originalNote.end = col - 1;

            // The second part of the note starts at the clicked column.
            const newNote = {
                start: col,
                end: originalNoteEnd
            };

            // Insert the new note into the grid right after the original one.
            grid[row].splice(noteIndex + 1, 0, newNote);

            // Update the UI and save the state.
            requestAnimationFrame(() => {
                updateGridDisplay();
                renderLayerList();
                updateTotalDurationAndDisplay();
                saveState();
                debouncedAutosaveStateToLocalStorage();
            });
        }
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        restoreState(history[historyIndex]);
    }
}

function restoreState(state) {
    layers = JSON.parse(JSON.stringify(state.layers));
    activeLayerIndex = state.activeLayerIndex;
    masterGainNode.gain.value = state.masterGain;

    // Re-create all audio nodes for each layer
    layers.forEach((layer, i) => {
        // Recreate gain node
        const gainNode = audioContext.createGain();
        gainNode.gain.value = layer.gainValue;
        gainNode.connect(masterGainNode);

        // Recreate effects nodes
        const reverbNode = audioContext.createConvolver();
        const reverbWetGain = audioContext.createGain();
        const reverbDryGain = audioContext.createGain();
        const delayNode = audioContext.createDelay();
        const delayFeedbackGain = audioContext.createGain();
        const delayWetGain = audioContext.createGain();
        const delayDryGain = audioContext.createGain();
        const pannerNode = audioContext.createStereoPanner();

        // Bitcrusher node (if using AudioWorklet)
        let bitcrusherNode = null;
        if (isAudioWorkletReady) {
            bitcrusherNode = createBitcrusherNode(layer);
        }

        // Build the audio chain
        const inputNode = bitcrusherNode || gainNode;

        // Delay connections
        if (bitcrusherNode) {
            bitcrusherNode.connect(delayDryGain);
            bitcrusherNode.connect(delayWetGain);
        } else {
            gainNode.connect(delayDryGain);
            gainNode.connect(delayWetGain);
        }
        delayWetGain.connect(delayNode);
        delayNode.connect(delayFeedbackGain);
        delayFeedbackGain.connect(delayNode);

        const delayOutput = audioContext.createGain();
        delayDryGain.connect(delayOutput);
        delayNode.connect(delayOutput);

        // Reverb connections
        delayOutput.connect(reverbDryGain);
        delayOutput.connect(reverbWetGain);
        reverbWetGain.connect(reverbNode);

        const reverbOutput = audioContext.createGain();
        reverbDryGain.connect(reverbOutput);
        reverbNode.connect(reverbOutput);

        // Connect reverb output to panner
        reverbOutput.connect(pannerNode);

        // Connect panner to layer gain
        pannerNode.connect(gainNode);

        // Set initial effect parameters
        reverbWetGain.gain.value = layer.effects.reverb.mix;
        reverbDryGain.gain.value = 1.0 - layer.effects.reverb.mix;
        delayWetGain.gain.value = layer.effects.delay.mix;
        delayDryGain.gain.value = 1.0 - layer.effects.delay.mix;
        delayFeedbackGain.gain.value = layer.effects.delay.feedback;
        delayNode.delayTime.value = layer.effects.delay.time;
        reverbNode.buffer = generateReverbImpulseResponse(layer.effects.reverb.decay, layer.effects.reverb.decay, false);
        pannerNode.pan.value = layer.effects.pan;

        // Assign all nodes back to the layer
        Object.assign(layer, {
            gainNode,
            reverbNode,
            reverbWetGain,
            reverbDryGain,
            delayNode,
            delayFeedbackGain,
            delayWetGain,
            delayDryGain,
            bitcrusherNode,
            pannerNode,
            inputNode
        });
    });

    renderActiveLayer();
    renderLayerList();
    renderBusMixer();
    renderSoundSelectionButtons();
    updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
    undoButton.disabled = historyIndex === 0;
    redoButton.disabled = historyIndex === history.length - 1;
}

document.addEventListener('keydown', (e) => {
    const isInputFocused = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
    const key = e.key.toLowerCase();

    // --- Modifier Key Shortcuts (Cmd/Ctrl) ---
    if (e.metaKey || e.ctrlKey) {
        if (isInputFocused) return;

        switch (key) {
            case keybinds['global-save']:
                e.preventDefault();
                saveProject();
                break;
            case keybinds['global-open']:
                e.preventDefault();
                loadProjectButton.click();
                break;
            case keybinds['global-select-all']:
                e.preventDefault();
                selectAllNotes();
                break;
            case keybinds['tool-undo']:
                e.preventDefault();
                undo();
                break;
            case keybinds['tool-redo']:
                 if (e.shiftKey) {
                    e.preventDefault();
                    redo();
                }
                break;
            case keybinds['tool-copy']:
                e.preventDefault();
                copySelectedNotes();
                break;
            case keybinds['tool-cut']:
                e.preventDefault();
                cutSelectedNotes();
                break;
            case keybinds['tool-paste']:
                e.preventDefault();
                pasteNotes();
                break;
            case keybinds['global-new']:
                e.preventDefault();
                newProjectButton.click();
                break;
        }
        return;
    }

    // --- Tool-switching Shortcuts (no modifier) ---
    if (isInputFocused) return;

    let newTool = null;
    switch (key) {
        case keybinds['tool-draw']:
            newTool = 'draw';
            break;
        case keybinds['tool-splice']:
            newTool = 'splice';
            break;
        case keybinds['tool-erase']:
            newTool = 'erase';
            break;
        case keybinds['tool-select']:
            newTool = 'select';
            break;
        case keybinds['tool-move']:
            newTool = 'move';
            break;
        case keybinds['global-play']:
            globalPlayPauseButton.click();
            break;
    }

    if (newTool && activeTool !== newTool) {
        activeTool = newTool;
        renderToolButtons();
    }
});

async function init() {
    settingsWindowOverlay = document.getElementById('settings-window-overlay');
    const effectsWindowClose = document.getElementById('effects-window-close');
    const settingsWindowClose = document.getElementById('settings-window-close');
    const globalSettingsButton = document.getElementById('global-settings');
    await setupAudioWorklet(); // Ensure the worklet is ready before doing anything else

    // Connect the master audio graph directly to destination
    masterGainNode.connect(audioContext.destination);

    // Finish the rest of the setup
    createGrid();
    addLayer(); // Create initial layer
    saveState(); // Save initial state
    bpmValueSpan.textContent = bpmInput.value;
    updateTotalDurationAndDisplay();
    renderBusMixer(); // Render the bus mixer on load
    renderSoundSelectionButtons(); // Render sound selection buttons on load

    barInput.addEventListener('input', updateGridForBarSystem);
    effectsWindowClose.addEventListener('click', closeEffectsWindow);
    globalSettingsButton.addEventListener('click', openSettingsWindow);
    settingsWindowClose.addEventListener('click', closeSettingsWindow);

    // Enable the saveMp3Button only if lamejs is defined
    if (typeof lamejs !== 'undefined') {
        saveMp3Button.disabled = false;
    } else {
        console.warn("lamejs is not defined. 'Save as MP3' button will remain disabled.");
    }

    addLayerButton.addEventListener('click', () => {
        addLayer();
        saveState();
        debouncedAutosaveStateToLocalStorage();
    });

    undoButton.addEventListener('click', undo);
    redoButton.addEventListener('click', redo);

    document.getElementById('tool-copy').addEventListener('click', copySelectedNotes);
    document.getElementById('tool-cut').addEventListener('click', cutSelectedNotes);
    document.getElementById('tool-paste').addEventListener('click', pasteNotes);

    saveProjectButton.addEventListener('click', saveProject);
    loadProjectButton.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.cht';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            currentProjectFileName = file.name; // Store the loaded file's name
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const loadedData = JSON.parse(event.target.result);
                    loadProject(loadedData);
                    saveState();
                } catch (error) {
                    console.error('Error loading project:', error);
                    alert('Could not load project file. It may be corrupt.');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    });

    // Initialize tool buttons
    const sequencerToolsContainer = document.getElementById('sequencer-tools');
    if (sequencerToolsContainer) {
        sequencerToolsContainer.addEventListener('click', (e) => {
            const button = e.target.closest('.retro-button');
            if (button && button.dataset.toolId) {
                activeTool = button.dataset.toolId;
                renderToolButtons();
            }
        });
    }
    renderToolButtons(); // Initial render of tool buttons

    // --- Keybind Popups ---
    const isMac = navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? 'Cmd' : 'Ctrl';

    function createDelayedPopup(button, text) {
        let timeoutId;
        button.style.position = 'relative'; // Needed for absolute positioning

        button.addEventListener('mouseenter', () => {
            timeoutId = setTimeout(() => {
                // Prevent multiple popups
                if (button.querySelector('.keybind-popup')) return;

                const popup = document.createElement('div');
                popup.classList.add('keybind-popup');
                popup.textContent = text;
                button.appendChild(popup);
            }, 500); // 500ms delay
        });

        button.addEventListener('mouseleave', () => {
            clearTimeout(timeoutId);
            const popup = button.querySelector('.keybind-popup');
            if (popup) {
                popup.remove();
            }
        });
    }

    // Tool buttons
    const toolButtons = document.querySelectorAll('#sequencer-tools .retro-button[data-keybind]');
    toolButtons.forEach(button => {
        const keybind = button.dataset.keybind;
        if (keybind) {
            createDelayedPopup(button, keybind);
        }
    });

    // Undo/Redo buttons
    createDelayedPopup(document.getElementById('tool-undo'), `${modifier}+Z`);
    createDelayedPopup(document.getElementById('tool-redo'), `${modifier}+Shift+Z`);

    // Cut/Copy/Paste buttons
    createDelayedPopup(document.getElementById('tool-cut'), `${modifier}+X`);
    createDelayedPopup(document.getElementById('tool-copy'), `${modifier}+C`);
    createDelayedPopup(document.getElementById('tool-paste'), `${modifier}+V`);

    // New: Add event listener for the grid wrapper scroll
    const gridWrapper = document.querySelector('.grid-wrapper');
    if (gridWrapper) {
        gridWrapper.addEventListener('scroll', () => {
            // When the user scrolls the grid, we need to redraw the highlight
            // to ensure it's in the correct position relative to the viewport.
            if (isPlaying) {
                const secondsPerBeat = 60.0 / parseFloat(bpmInput.value);
                const continuousCol = currentPlaybackTime / secondsPerBeat;
                highlightColumn(continuousCol);
            }
        });
    }

    sequencerNextButton.addEventListener('click', () => {
        const barCount = parseInt(barInput.value, 10);
        if (isNaN(barCount) || barCount <= 0) return;
        gridOffset += barCount;
        renderActiveLayer();
        renderLayerList();
    });

    sequencerPrevButton.addEventListener('click', () => {
        const barCount = parseInt(barInput.value, 10);
        if (isNaN(barCount) || barCount <= 0) return;
        gridOffset -= barCount;
        if (gridOffset < 0) {
            gridOffset = 0;
        }
        renderActiveLayer();
        renderLayerList();
    });

    const autosaved = localStorage.getItem('chiptuned-autosave');
    if (autosaved) {
        try {
            const data = JSON.parse(autosaved);
            await loadProject(data);
            saveState();
        } catch (e) {
            console.warn('Failed to load autosaved project:', e);
        }
    } else if (!autosaved) {
        console.log('No autosaved project found.');
    }
}

document.addEventListener('DOMContentLoaded', init);

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function autosaveStateToLocalStorage() {
    const projectData = {
        bpm: bpmInput.value,
        loop: loopCheckbox.checked,
        masterGain: masterGainNode.gain.value,
        layers: layers.map(layer => ({
            id: layer.id,
            name: layer.name,
            grid: layer.grid,
            instrument: layer.instrument,
            waveform: layer.waveform,
            sfx: layer.sfx,
            octave: layer.octave,
            isMuted: layer.isMuted,
            gainValue: layer.gainValue,
            effects: layer.effects
        }))
    };
    localStorage.setItem('chiptuned-autosave', JSON.stringify(projectData));
};
const debouncedAutosaveStateToLocalStorage = debounce(autosaveStateToLocalStorage, 10000);

function loadKeybinds() {
    const storedKeybinds = localStorage.getItem('chiptuned-keybinds');
    if (storedKeybinds) {
        try {
            return { ...DEFAULT_KEYBINDS, ...JSON.parse(storedKeybinds) };
        } catch {
            return { ...DEFAULT_KEYBINDS };
        }
    }
    return { ...DEFAULT_KEYBINDS };
}

function saveKeybinds() {
    localStorage.setItem('chiptuned-keybinds', JSON.stringify(keybinds));
}

function updateKeybinds(action, newKey) {
    keybinds[action] = newKey.toLowerCase();
    saveKeybinds(keybinds);
}

function populateKeybindSettings() {
    const container = document.getElementById('keybind-settings-container');
    container.innerHTML = ''; // Clear previous content

    const currentKeybinds = loadKeybinds();

    for (const action in DEFAULT_KEYBINDS) {
        const isMac = navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
        const modifier = isMac ? 'Cmd' : 'Ctrl';
        const isModifierAction = (action.startsWith('global-') || action.startsWith('tool-')) && !['tool-draw', 'tool-splice', 'tool-erase', 'tool-select', 'tool-move', 'global-play'].includes(action);

        const div = document.createElement('div');
        div.classList.add('flex', 'items-center', 'justify-between', 'mb-2');

        const label = document.createElement('label');
        label.textContent = KEYBIND_LABELS[action] || action;
        label.classList.add('text-white');
        label.style.textShadow = '2px 2px 0px #000000';

        const inputContainer = document.createElement('div');
        inputContainer.classList.add('flex', 'items-center', 'gap-2');

        const input = document.createElement('input');
        input.type = 'text';
        const currentValue = currentKeybinds[action] || DEFAULT_KEYBINDS[action];

        if (action === 'global-play' && currentValue === ' ') {
            input.value = 'Space';
        } else if (action === 'tool-redo') {
            input.value = `${modifier} + Shift + ${currentValue}`;
        } else if (isModifierAction) {
            input.value = `${modifier} + ${currentValue}`;
        } else {
            input.value = currentValue;
        }

        input.classList.add('w-96', 'text-center', 'bg-gray-700', 'text-white', 'font-bold', 'rounded', 'px-2');
        input.dataset.action = action;

        if (isModifierAction) {
            input.addEventListener('keydown', (e) => {
                e.preventDefault();
                let newKey;
                if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    newKey = e.key.toLowerCase();
                    if (action === 'tool-redo') {
                        e.target.value = `${modifier} + Shift + ${newKey}`;
                    } else {
                        e.target.value = `${modifier} + ${newKey}`;
                    }
                    updateKeybinds(action, newKey);
                } else if (e.key === 'Backspace') {
                    newKey = DEFAULT_KEYBINDS[action];
                    if (action === 'tool-redo') {
                        e.target.value = `${modifier} + Shift + ${newKey}`;
                    } else {
                        e.target.value = `${modifier} + ${newKey}`;
                    }
                    updateKeybinds(action, newKey);
                }
            });
        } else { // This block handles 'tool-draw', 'tool-splice', 'tool-erase', 'tool-select', 'tool-move', 'global-play'
            input.addEventListener('keydown', (e) => {
                e.preventDefault();
                let newKey;
                let displayValue;

                if (e.key === 'Backspace') {
                    newKey = DEFAULT_KEYBINDS[action];
                    displayValue = (action === 'global-play' && newKey === ' ') ? 'Space' : newKey;
                } else if (action === 'global-play' && e.key === ' ') {
                    newKey = ' ';
                    displayValue = 'Space';
                } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    newKey = e.key.toLowerCase();
                    displayValue = newKey;
                }

                if (newKey !== undefined) {
                    e.target.value = displayValue;
                    updateKeybinds(action, newKey);
                }
            });
        }

        inputContainer.appendChild(input);
        div.appendChild(label);
        div.appendChild(inputContainer);
        container.appendChild(div);
    }
}

effectsWindowCopy.addEventListener('click', () => {
    copyEffectsButton()
});

effectsWindowPaste.addEventListener('click', () => {
    pasteEffectsButton()
});

function copyEffectsButton(layerEffects) {
    copiedEffects = null;
    copiedEffects = JSON.parse(JSON.stringify(layers[activeLayerIndex].effects));
    saveState();
    debouncedAutosaveStateToLocalStorage();
};

function pasteEffectsButton() {
    if (copiedEffects && currentEditingLayer) {
        currentEditingLayer.effects = JSON.parse(JSON.stringify(copiedEffects));
        populateEffectsWindow(currentEditingLayer);
        updateLayerEffects(currentEditingLayer);
        saveState();
        debouncedAutosaveStateToLocalStorage();
    } else {
        console.log("No copied effects or no layer selected.");
    }
};