const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const waveformSelect = document.getElementById('waveform');
const instrumentSelect = document.getElementById('instrument');
const sfxSelect = document.getElementById('sfx');
const gridContainer = document.getElementById('grid-container');
const noteLabelsContainer = document.getElementById('note-labels');
const bpmInput = document.getElementById('bpm');
const bpmValueSpan = document.getElementById('bpm-value');
const loopCheckbox = document.getElementById('loop');
const playMusicButton = document.getElementById('play-music');
const clearGridButton = document.getElementById('clear-grid');
const randomGridButton = document.getElementById('random-grid');
const octaveDownButton = document.getElementById('octave-down');
const octaveUpButton = document.getElementById('octave-up');
const saveMp3Button = document.getElementById('save-mp3');
const columnHighlight = document.getElementById('column-highlight');

const baseNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const baseFrequencies = [16.35, 17.32, 18.35, 19.45, 20.60, 21.83, 23.12, 24.50, 25.96, 27.50, 29.14, 30.87]; // C0 to B0

let currentOctave = 4; // Starting octave
let notes = [];
let frequencies = [];
const numRows = 12; // Chromatic scale
const numCols = 32;

let grid = Array(numRows).fill(null).map(() => Array(numCols).fill(false));
let musicTimeout;
let lastHighlightedColumn = -1;
let playingNodes = [];

let isPlaying = false;
let currentColumn = 0;
let nextNoteTime = 0.0;
const lookahead = 25.0; // How often we wake up to schedule notes (in ms)
const scheduleAheadTime = 0.1; // How far ahead to schedule audio (in s)
let schedulerTimerId = 0;
let endOfSequenceTimerId = 0;
let effectiveColumnWidth = 0;
let gridContainerOffsetLeft = 0;
let columnHighlightWidth = 0;
let baseNoteFrequencyForSFX = 261.63; // Initialize with a default C4 frequency


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
    // console.log('createGrid called');
    // Clear existing grid and labels before recreating
    gridContainer.innerHTML = '';
    noteLabelsContainer.innerHTML = '';

    // Reset the grid array
    grid = Array(numRows).fill(null).map(() => Array(numCols).fill(false));

    // Hide the column highlight when the grid is created or recreated
    columnHighlight.classList.remove('block');
    columnHighlight.classList.add('hidden');

    updateNotesAndFrequencies(); // Call this first to populate notes and frequencies
    // console.log('Notes and frequencies updated');

    // Explicitly set grid properties for gridContainer
    gridContainer.style.display = 'grid';
    gridContainer.style.gridTemplateRows = `repeat(${numRows}, minmax(0, 40px))`; // Explicitly define row height
    gridContainer.style.gridTemplateColumns = `repeat(${numCols}, minmax(0, 40px))`; // Explicitly define column width
    gridContainer.style.minWidth = `${numCols * 40 + (numCols - 1) * 2}px`; // Calculate min-width based on cells and gaps

    // Explicitly set grid properties for noteLabelsContainer
    noteLabelsContainer.style.display = 'grid';
    noteLabelsContainer.style.gridTemplateRows = `repeat(${numRows}, 1fr)`;

    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.addEventListener('click', () => toggleCell(i, j));
            gridContainer.appendChild(cell);
        }
    }
    // console.log('Grid cells appended');

    // Calculate column width and offset once
    const firstCell = gridContainer.children[0];
    if (firstCell) {
        const cellActualWidth = firstCell.offsetWidth;
        const computedStyle = window.getComputedStyle(gridContainer);
        const gridColumnGap = parseFloat(computedStyle.getPropertyValue('grid-column-gap'));
        effectiveColumnWidth = cellActualWidth + gridColumnGap;
        gridContainerOffsetLeft = noteLabelsContainer.offsetWidth + 8; // Explicitly calculate offset
        columnHighlightWidth = cellActualWidth; // Set the highlighter width to the cell width
    }
}

function toggleCell(row, col, playPreview = true) {
    grid[row][col] = !grid[row][col];
    const cell = document.querySelector(`[data-row='${row}'][data-col='${col}']`);
    cell.classList.toggle('active', grid[row][col]);
    if (grid[row][col] && playPreview && !isPlaying) {
        playSound(waveformSelect.value, frequencies[row], audioContext.currentTime, 0.5);
    }
}

function nextNote() {
    const bpm = parseFloat(bpmInput.value);
    const secondsPerBeat = 60.0 / bpm;
    nextNoteTime += secondsPerBeat;

    currentColumn++;
    if (currentColumn === numCols) {
        if (!loopCheckbox.checked) {
            const stopDelay = (60.0 / bpm) * 1000; // Delay in ms for one beat
            endOfSequenceTimerId = setTimeout(() => {
                stopPlayback(false); // Don't clear the grid, just stop
            }, stopDelay);
            return; // Exit without resetting column
        } else {
            currentColumn = 0;
        }
    }
    console.log(`nextNote: currentColumn is now ${currentColumn}`);
}

function scheduleNote(beatNumber, time) {
    for (let i = 0; i < numRows; i++) {
        if (grid[i][beatNumber]) {
            const selectedSfx = sfxSelect.value;
            if (selectedSfx) {
                playSFX(selectedSfx, time, undefined, frequencies[i]); // Pass frequency to SFX
            } else {
                const selectedInstrument = instrumentSelect.value;
                if (selectedInstrument === 'default') {
                    const { oscillator, gainNode } = playSound(waveformSelect.value, frequencies[i], time);
                    playingNodes.push({ oscillator, gainNode });
                } else {
                    const { oscillator, gainNode } = playInstrument(selectedInstrument, frequencies[i], time);
                    playingNodes.push({ oscillator, gainNode });
                }
            }
        }
    }
}

function scheduler() {
    while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
        scheduleNote(currentColumn, nextNoteTime);
        nextNote();
    }

    if (isPlaying) {
        schedulerTimerId = setTimeout(scheduler, lookahead);
    }
}

function draw() {
    if (!isPlaying) return;

    const secondsPerBeat = 60.0 / parseFloat(bpmInput.value);
    const timeSinceLastNote = audioContext.currentTime - (nextNoteTime - secondsPerBeat);
    const percentageOfBeat = timeSinceLastNote / secondsPerBeat;
    const highlightCol = (currentColumn - 1 + numCols) % numCols;

    // Clear previous highlights
    const previouslyHighlighted = document.querySelectorAll('.grid-cell.highlighted');
    previouslyHighlighted.forEach(cell => cell.classList.remove('highlighted'));

    // Add new highlights
    const currentlyHighlighted = document.querySelectorAll(`[data-col='${highlightCol}']`);
    currentlyHighlighted.forEach(cell => cell.classList.add('highlighted'));

    highlightColumn(highlightCol);

    requestAnimationFrame(draw);
}

function startPlayback() {
    if (isPlaying) return;
    isPlaying = true;
    console.log("playMusic: Starting playback.");
    clearTimeout(endOfSequenceTimerId);
    currentColumn = 0;
    nextNoteTime = audioContext.currentTime;
    playingNodes = [];
    scheduler();
    requestAnimationFrame(draw);
    playMusicButton.textContent = "Stop";
}

function stopPlayback(clearGridFlag = false) {
    if (!isPlaying && !clearGridFlag) return;
    isPlaying = false;
    console.log("playMusic: Stopping playback.");
    clearTimeout(schedulerTimerId);
    clearTimeout(endOfSequenceTimerId);
    playingNodes.forEach(node => {
        node.oscillator.stop(0);
        node.gainNode.disconnect();
    });
    playingNodes = [];
    columnHighlight.classList.remove('block');
    columnHighlight.classList.add('hidden');
    playMusicButton.textContent = "Play";

    // Clear all highlighted cells
    const highlightedCells = document.querySelectorAll('.grid-cell.highlighted');
    highlightedCells.forEach(cell => cell.classList.remove('highlighted'));

    if (clearGridFlag) {
        for (let i = 0; i < numRows; i++) {
            for (let j = 0; j < numCols; j++) {
                if (grid[i][j]) {
                    toggleCell(i, j, false);
                }
            }
        }
    }
}

playMusicButton.addEventListener('click', () => {
    if (isPlaying) {
        stopPlayback();
    } else {
        startPlayback();
    }
});

function highlightColumn(col) {
    if (effectiveColumnWidth === 0) return;

    const gridWrapperScrollLeft = gridContainer.parentElement.scrollLeft;

    columnHighlight.style.width = `${columnHighlightWidth}px`;
    columnHighlight.style.left = `${gridContainerOffsetLeft + (col * effectiveColumnWidth) - gridWrapperScrollLeft}px`;
    columnHighlight.style.height = `auto`;
    columnHighlight.style.top = `0`;
    columnHighlight.classList.remove('hidden');
    columnHighlight.classList.add('block');

    // Scroll the grid-wrapper to the current column
    gridContainer.parentElement.scrollLeft = col * effectiveColumnWidth;
}

function playSound(waveform, frequency, time, duration, context = audioContext) {
    // console.log(`playSound: Playing ${waveform} at ${frequency}Hz at time ${time}`);
    if (context.state === 'suspended') {
        context.resume();
    }

    const selectedSfx = sfxSelect.value;
    if (selectedSfx) {
        // If an SFX is selected, play it instead of a note/instrument
        playSFX(selectedSfx, time, duration, frequency, context); // Pass time, duration, and frequency for scheduling
        return { oscillator: null, gainNode: null }; // SFX are fire-and-forget, no nodes to stop
    }

    const selectedInstrument = instrumentSelect.value;
    if (selectedInstrument !== 'default') {
        return playInstrument(selectedInstrument, frequency, time, duration, context);
    }

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const noteDuration = duration || 60.0 / parseFloat(bpmInput.value);

    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, time);

    gainNode.gain.setValueAtTime(0.1, time);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + noteDuration);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(time);
    oscillator.stop(time + noteDuration); // Ensure the oscillator stops after its duration
    return { oscillator, gainNode };
}

function playInstrument(instrument, frequency, time, duration, context = audioContext) {
    const noteDuration = duration || 60.0 / parseFloat(bpmInput.value);
    let oscillator, gainNode;
    let oscillator2, octUpOscillator, octDownOscillator, fluteVibratoLFO, fluteVibratoGain, vibratoLFO, vibratoGain, filter;

    switch (instrument) {
        case 'piano': {
            const masterGain = context.createGain();
            const filter = context.createBiquadFilter();
            filter.type = 'lowpass';
            filter.Q.setValueAtTime(3.5, time); // Increased Q for more resonance

            // Dynamic filter for hammer and decay - more pronounced sweep
            filter.frequency.setValueAtTime(8000, time); // Start very bright
            filter.frequency.exponentialRampToValueAtTime(frequency * 1.5, time + noteDuration * 1.8);

            // Main volume envelope - slightly longer decay
            masterGain.gain.setValueAtTime(0, time);
            masterGain.gain.linearRampToValueAtTime(0.05, time + 0.01);
            masterGain.gain.exponentialRampToValueAtTime(0.15, time + 0.5);
            masterGain.gain.exponentialRampToValueAtTime(0.0001, time + noteDuration * 3);

            const oscillators = [];

            // Multi-string simulation (2 triangles, 1 filtered saw for richness)
            const coreWaveforms = ['triangle', 'triangle', 'sawtooth'];
            for (let i = 0; i < coreWaveforms.length; i++) {
                const osc = context.createOscillator();
                osc.type = coreWaveforms[i];
                // Detune each string slightly for a natural chorus
                osc.detune.setValueAtTime((i - 1) * 3 + (Math.random() - 0.5) * 2, time);

                // Hammer pitch attack - quick and subtle
                osc.frequency.setValueAtTime(frequency * 1.008, time);
                osc.frequency.exponentialRampToValueAtTime(frequency, time + 0.1);

                if (osc.type === 'sawtooth') {
                    // Heavily filter the sawtooth to prevent buzz, keeping its complexity
                    const sawFilter = context.createBiquadFilter();
                    sawFilter.type = 'lowpass';
                    // Frequency-dependent cutoff for sawtooth - lower for low notes
                    sawFilter.frequency.setValueAtTime(Math.min(frequency * 3, 2000), time); // Cap at 2000Hz
                    osc.connect(sawFilter);
                    sawFilter.connect(filter);
                } else {
                    osc.connect(filter);
                }

                osc.start(time);
                osc.stop(time + noteDuration * 3);
                oscillators.push(osc);
            }

            // Sympathetic Resonance (Octave + Fifth) - subtle and long-decaying
            const resonanceFrequencies = [frequency * 2, frequency * 1.5];
            for (const resFreq of resonanceFrequencies) {
                const resOsc = context.createOscillator();
                resOsc.type = 'sine';
                resOsc.frequency.setValueAtTime(resFreq, time);
                const resGain = context.createGain();
                resGain.gain.setValueAtTime(0, time);
                resGain.gain.linearRampToValueAtTime(0.05, time + 0.4); // Slower, more subtle fade-in
                resGain.gain.exponentialRampToValueAtTime(0.0001, time + noteDuration * 2.5);
                resOsc.connect(resGain);
                resGain.connect(masterGain);
                resOsc.start(time);
                resOsc.stop(time + noteDuration * 3);
                oscillators.push(resOsc);
            }

            filter.connect(masterGain);
            masterGain.connect(context.destination);

            return {
                oscillator: {
                    stop: (stopTime) => oscillators.forEach(o => o.stop(stopTime))
                },
                gainNode: masterGain
            };
        }
        case 'organ': {
            const oscillators = [];
            const masterGain = context.createGain();
            const filter = context.createBiquadFilter();
            filter.type = 'lowpass';
            // A gentle filter to remove high-end graininess, cutoff is frequency dependent
            filter.frequency.setValueAtTime(Math.min(8000, frequency * 8), time);
            filter.Q.setValueAtTime(2.0, time); // Increased Q for more pronounced smoothing

            // --- Organ Harmonic Series (Drawbars) ---
            const harmonicRatios = [
                { ratio: 1, gain: 0.6, type: 'sine' },   // 8' Principal (fundamental)
                { ratio: 2, gain: 0.4, type: 'sine' },   // 4' Octave
                { ratio: 3, gain: 0.2, type: 'sine' },   // 2 2/3' Quint (fifth harmonic)
                { ratio: 4, gain: 0.2, type: 'sine' },   // 2' Superoctave
                { ratio: 0.5, gain: 0.2, type: 'sine' }  // 16' Sub-octave
            ];

            // --- Slow Vibrato ---
            const vibratoLFO = context.createOscillator();
            vibratoLFO.type = 'sine';
            vibratoLFO.frequency.setValueAtTime(4, time); // Slightly faster vibrato for more character
            const vibratoGain = context.createGain();
            // Capping vibrato depth to prevent high-frequency graininess
            const vibratoDepth = Math.min(frequency * 0.004, 2); // Further reduced vibrato depth, capped at 2Hz
            vibratoGain.gain.setValueAtTime(vibratoDepth, time);
            vibratoLFO.connect(vibratoGain);

            for (const harmonic of harmonicRatios) {
                const osc = context.createOscillator();
                osc.type = harmonic.type;
                osc.frequency.setValueAtTime(frequency * harmonic.ratio, time);
                // Subtle random detune for organic feel
                osc.detune.setValueAtTime((Math.random() - 0.5) * 0.2, time); // Further reduced detune

                // Apply vibrato to each oscillator's frequency
                vibratoGain.connect(osc.frequency);

                const oscGain = context.createGain();
                oscGain.gain.setValueAtTime(harmonic.gain, time);

                osc.connect(oscGain);
                oscGain.connect(filter); // Connect to filter instead of masterGain

                osc.start(time);
                osc.stop(time + noteDuration * 4); // Much longer sustain for organic decay
                oscillators.push(osc);
            }

            // ADSR envelope for organ (slow attack, long sustain, long release)
            masterGain.gain.setValueAtTime(0, time); // Start from silence
            masterGain.gain.linearRampToValueAtTime(0.15, time + 0.08); // Further reduced attack gain
            masterGain.gain.linearRampToValueAtTime(0.5, time + noteDuration * 1.5); // Long sustain
            masterGain.gain.exponentialRampToValueAtTime(0.0001, time + noteDuration * 4); // Much longer release for organic decay

            filter.connect(masterGain); // Connect filter to master gain
            masterGain.connect(context.destination);

            vibratoLFO.start(time);
            vibratoLFO.stop(time + noteDuration * 2);

            return {
                oscillator: {
                    stop: (stopTime) => {
                        oscillators.forEach(o => o.stop(stopTime));
                        vibratoLFO.stop(stopTime);
                    }
                },
                gainNode: masterGain
            };
        }
        break;
        case 'synth_lead':
            oscillator = context.createOscillator();
            oscillator2 = context.createOscillator(); // Second oscillator for detune
            gainNode = context.createGain();

            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(frequency, time);

            oscillator2.type = 'sawtooth';
            oscillator2.frequency.setValueAtTime(frequency * 1.005, time); // Slightly detuned

            // ADSR envelope for gain
            gainNode.gain.setValueAtTime(0.1, time); // Stronger attack
            gainNode.gain.linearRampToValueAtTime(0.3, time + 0.1); // Quick decay to sustain
            gainNode.gain.linearRampToValueAtTime(0.3, time + noteDuration * 0.7); // Sustain
            gainNode.gain.exponentialRampToValueAtTime(0.0001, time + noteDuration * 1.2); // Longer release

            oscillator.connect(gainNode);
            oscillator2.connect(gainNode); // Connect both oscillators
            gainNode.connect(context.destination);

            oscillator.start(time);
            oscillator2.start(time);
            oscillator.stop(time + noteDuration * 1.2);
            oscillator2.stop(time + noteDuration * 1.2);
            break;
        case 'bass': {
            const masterGain = context.createGain();
            const filter = context.createBiquadFilter();
            filter.type = 'lowpass';
            filter.Q.setValueAtTime(0.8, time); // Subtle resonance

            // Filter envelope for tone shaping
            filter.frequency.setValueAtTime(frequency * 3, time); // Start bright
            filter.frequency.exponentialRampToValueAtTime(frequency * 0.8, time + noteDuration * 0.5); // Mellow out

            // Main volume envelope
            masterGain.gain.setValueAtTime(0, time);
            masterGain.gain.linearRampToValueAtTime(0.15, time + 0.01); // Quick attack
            masterGain.gain.exponentialRampToValueAtTime(0.3, time + 0.1); // Initial decay
            masterGain.gain.exponentialRampToValueAtTime(0.0001, time + noteDuration * 1.5); // Longer sustain

            const oscillators = [];

            // Primary oscillator (square wave for punch)
            const mainOsc = context.createOscillator();
            mainOsc.type = 'square';
            // Pitch bend for pluck effect
            mainOsc.frequency.setValueAtTime(frequency * 1.005, time);
            mainOsc.frequency.exponentialRampToValueAtTime(frequency, time + 0.05);
            mainOsc.connect(filter);
            mainOsc.start(time);
            mainOsc.stop(time + noteDuration * 1.5);
            oscillators.push(mainOsc);

            // Second oscillator (triangle for richness and harmonics)
            const subOsc = context.createOscillator();
            subOsc.type = 'triangle';
            subOsc.frequency.setValueAtTime(frequency * 0.5, time); // One octave down
            const subGain = context.createGain();
            subGain.gain.setValueAtTime(0.4, time); // Lower volume
            subOsc.connect(subGain);
            subGain.connect(filter);
            subOsc.start(time);
            subOsc.stop(time + noteDuration * 1.5);
            oscillators.push(subOsc);

            // Pluck noise
            const pluckNoise = context.createBufferSource();
            const pluckNoiseFilter = context.createBiquadFilter();
            pluckNoiseFilter.type = 'highpass';
            pluckNoiseFilter.frequency.setValueAtTime(1000, time);
            pluckNoiseFilter.Q.setValueAtTime(5, time);

            const pluckNoiseBufferSize = context.sampleRate * 0.01;
            const pluckNoiseBuffer = context.createBuffer(1, pluckNoiseBufferSize, context.sampleRate);
            const pluckNoiseOutput = pluckNoiseBuffer.getChannelData(0);
            for (let i = 0; i < pluckNoiseBufferSize; i++) {
                pluckNoiseOutput[i] = Math.random() * 2 - 1;
            }
            pluckNoise.buffer = pluckNoiseBuffer;
            const pluckNoiseGain = context.createGain();
            pluckNoiseGain.gain.setValueAtTime(0.3, time);
            pluckNoiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
            pluckNoise.connect(pluckNoiseFilter);
            pluckNoiseFilter.connect(pluckNoiseGain);
            pluckNoiseGain.connect(masterGain);

            // Body resonance (subtle)
            const bodyResonance = context.createOscillator();
            bodyResonance.type = 'sine';
            bodyResonance.frequency.setValueAtTime(frequency * 0.25, time); // Two octaves down
            const bodyGain = context.createGain();
            bodyGain.gain.setValueAtTime(0.1, time);
            bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);
            bodyResonance.connect(bodyGain);
            bodyGain.connect(masterGain);

            filter.connect(masterGain);
            masterGain.connect(context.destination);

            pluckNoise.start(time);
            bodyResonance.start(time);
            bodyResonance.stop(time + 0.3);

            return {
                oscillator: {
                    stop: (stopTime) => oscillators.forEach(o => o.stop(stopTime))
                },
                gainNode: masterGain
            };
        }
        case 'flute':
            oscillator = context.createOscillator();
            gainNode = context.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, time);

            // White noise for breathiness - reduced and shorter
            const whiteNoise = context.createBufferSource();
            const bufferSize = context.sampleRate * 0.5; // Shorter noise duration
            const noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1; // White noise
            }
            whiteNoise.buffer = noiseBuffer;
            whiteNoise.loop = false; // No loop

            const noiseGain = context.createGain();
            noiseGain.gain.setValueAtTime(0.01, time); // Even more subtle noise level
            noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.1); // Quick decay

            whiteNoise.connect(noiseGain);
            noiseGain.connect(gainNode); // Mix noise with main gain

            // Subtle Vibrato LFO
            fluteVibratoLFO = context.createOscillator();
            fluteVibratoLFO.type = 'sine';
            fluteVibratoLFO.frequency.setValueAtTime(4, time); // 4 Hz vibrato rate

            const fluteVibratoGain = context.createGain();
            fluteVibratoGain.gain.setValueAtTime(frequency * 0.005, time); // Subtle vibrato depth

            fluteVibratoLFO.connect(fluteVibratoGain);
            fluteVibratoGain.connect(oscillator.frequency); // Connect LFO to oscillator frequency

            // ADSR envelope for gain (softer attack, longer release for floaty sound)
            gainNode.gain.setValueAtTime(0.0001, time); // Start very low
            gainNode.gain.linearRampToValueAtTime(0.075, time + 0.1); // Gentle attack
            gainNode.gain.linearRampToValueAtTime(0.3, time + noteDuration * 0.8); // Sustain
            gainNode.gain.exponentialRampToValueAtTime(0.0001, time + noteDuration * 1.5); // Longer, floaty release

            oscillator.connect(gainNode);
            gainNode.connect(context.destination);

            oscillator.start(time);
            fluteVibratoLFO.start(time);
            whiteNoise.start(time);

            oscillator.stop(time + noteDuration * 1.5);
            fluteVibratoLFO.stop(time + noteDuration * 1.5);
            whiteNoise.stop(time + 0.15); // Stop white noise quickly
            break;
        case 'trumpet':
            oscillator = context.createOscillator();
            gainNode = context.createGain();
            const trumpetFilter = context.createBiquadFilter();

            // Main oscillator for the brassy tone
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(frequency, time);

            // --- Airy Breath Sound ---
            const trumpetNoise = context.createBufferSource();
            const trumpetBufferSize = context.sampleRate * (noteDuration * 1.5);
            const trumpetNoiseBuffer = context.createBuffer(1, trumpetBufferSize, context.sampleRate);
            const trumpetOutput = trumpetNoiseBuffer.getChannelData(0);
            for (let i = 0; i < trumpetBufferSize; i++) {
                trumpetOutput[i] = (Math.random() * 2 - 1) * 0.5;
            }
            trumpetNoise.buffer = trumpetNoiseBuffer;
            trumpetNoise.loop = false;

            const trumpetNoiseGain = context.createGain();
            trumpetNoiseGain.gain.setValueAtTime(0.05, time);
            trumpetNoiseGain.gain.linearRampToValueAtTime(0.02, time + 0.1);
            trumpetNoiseGain.gain.exponentialRampToValueAtTime(0.0001, time + noteDuration);

            trumpetNoise.connect(trumpetNoiseGain);
            trumpetNoiseGain.connect(gainNode);

            // --- Brassy Filter Envelope ---
            trumpetFilter.type = 'lowpass';
            trumpetFilter.Q.setValueAtTime(2, time);
            trumpetFilter.frequency.setValueAtTime(frequency * 1.5, time);
            trumpetFilter.frequency.linearRampToValueAtTime(frequency * 3, time + 0.1);
            trumpetFilter.frequency.linearRampToValueAtTime(frequency * 2, time + noteDuration);

            // --- Main Gain Envelope ---
            gainNode.gain.setValueAtTime(0, time);
            gainNode.gain.linearRampToValueAtTime(0.15, time + 0.05);
            gainNode.gain.linearRampToValueAtTime(0.4, time + noteDuration * 0.7);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, time + noteDuration * 1.5);

            // --- Vibrato ---
            vibratoLFO = context.createOscillator();
            vibratoLFO.type = 'sine';
            vibratoLFO.frequency.setValueAtTime(5, time);

            vibratoGain = context.createGain();
            vibratoGain.gain.setValueAtTime(frequency * 0.01, time);

            vibratoLFO.connect(vibratoGain);
            vibratoGain.connect(oscillator.frequency);

            // --- Connections ---
            oscillator.connect(trumpetFilter);
            trumpetFilter.connect(gainNode);
            gainNode.connect(context.destination);

            // --- Start and Stop ---
            oscillator.start(time);
            trumpetNoise.start(time);
            vibratoLFO.start(time);

            oscillator.stop(time + noteDuration * 1.5);
            trumpetNoise.stop(time + noteDuration * 1.5);
            vibratoLFO.stop(time + noteDuration * 1.5);
            break;
        case 'strings': {
            const masterGain = context.createGain();
            const stringsFilter = context.createBiquadFilter();
            stringsFilter.type = 'lowpass';
            stringsFilter.Q.setValueAtTime(0.7, time); // Lower resonance to reduce buzz

            const initialCutoff = Math.min(1500 + frequency * 1.5, 10000);
            stringsFilter.frequency.setValueAtTime(initialCutoff, time);
            stringsFilter.frequency.exponentialRampToValueAtTime(initialCutoff / 2.5, time + noteDuration * 1.2);

            // --- Vibrato (Pitch Modulation) ---
            const stringsVibratoLFO = context.createOscillator();
            stringsVibratoLFO.type = 'sine';
            stringsVibratoLFO.frequency.setValueAtTime(4.5, time); // Slightly slower vibration
            const stringsVibratoGain = context.createGain();
            stringsVibratoGain.gain.setValueAtTime(2, time); // Reduced depth - even more subtle
            stringsVibratoLFO.connect(stringsVibratoGain);

            // --- Tremolo (Amplitude Modulation) ---
            const stringsTremoloLFO = context.createOscillator();
            stringsTremoloLFO.type = 'sine';
            stringsTremoloLFO.frequency.setValueAtTime(3.5, time); // Slower pulse
            const stringsTremoloGain = context.createGain();
            stringsTremoloGain.gain.setValueAtTime(0.03, time); // Reduced modulation to 3%
            stringsTremoloLFO.connect(stringsTremoloGain);
            stringsTremoloGain.connect(masterGain.gain); // Connect to the master gain

            masterGain.gain.setValueAtTime(0.125, time); // Set initial gain before modulation
            masterGain.gain.linearRampToValueAtTime(0.5, time + 0.01);
            masterGain.gain.exponentialRampToValueAtTime(0.0001, time + noteDuration * 1.5);

            const oscillators = [];
            const numStrings = 3;
            const baseStrumDelay = 0.011;
            const strumUp = Math.random() > 0.5;

            for (let i = 0; i < numStrings; i++) {
                const osc = context.createOscillator();
                osc.type = 'triangle';
                const detune = (Math.random() - 0.5) * 10;
                osc.detune.setValueAtTime(detune, time);
                stringsVibratoGain.connect(osc.detune); // Apply vibrato to each oscillator
                osc.frequency.setValueAtTime(frequency, time);

                const randomizedDelay = baseStrumDelay + (Math.random() - 0.5) * 0.006;
                const currentStringDelay = strumUp ? (numStrings - 1 - i) * randomizedDelay : i * randomizedDelay;

                osc.connect(stringsFilter);
                osc.start(time + currentStringDelay);
                osc.stop(time + noteDuration * 1.5 + currentStringDelay);
                oscillators.push(osc);
            }

            const pickNoise = context.createBufferSource();
            const pickNoiseFilter = context.createBiquadFilter();
            pickNoiseFilter.type = 'highpass';
            pickNoiseFilter.frequency.setValueAtTime(Math.min(2000 + frequency, 8000), time);
            pickNoiseFilter.Q.setValueAtTime(5, time);

            const pickNoiseBufferSize = context.sampleRate * 0.01;
            const pickNoiseBuffer = context.createBuffer(1, pickNoiseBufferSize, context.sampleRate);
            const pickNoiseOutput = pickNoiseBuffer.getChannelData(0);
            for (let i = 0; i < pickNoiseBufferSize; i++) {
                pickNoiseOutput[i] = Math.random() * 2 - 1;
            }
            pickNoise.buffer = pickNoiseBuffer;
            const pickNoiseGain = context.createGain();
            pickNoiseGain.gain.setValueAtTime(0.3, time); // Reduced volume
            pickNoiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.015);
            pickNoise.connect(pickNoiseFilter);
            pickNoiseFilter.connect(pickNoiseGain);
            pickNoiseGain.connect(masterGain);

            const bodyResonance = context.createOscillator();
            bodyResonance.type = 'sine';
            bodyResonance.frequency.setValueAtTime(frequency * 0.5, time);
            const bodyGain = context.createGain();
            const bodyVolume = Math.max(0, 0.15 - (frequency / 10000));
            bodyGain.gain.setValueAtTime(bodyVolume, time);
            bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
            bodyResonance.connect(bodyGain);
            bodyGain.connect(masterGain);

            stringsFilter.connect(masterGain);
            masterGain.connect(context.destination);

            pickNoise.start(time);
            bodyResonance.start(time);
            stringsVibratoLFO.start(time);
            stringsTremoloLFO.start(time);

            bodyResonance.stop(time + 0.2);
            stringsVibratoLFO.stop(time + noteDuration * 1.5);
            stringsTremoloLFO.stop(time + noteDuration * 1.5);

            return {
                oscillator: {
                    stop: (stopTime) => {
                        oscillators.forEach(o => o.stop(stopTime));
                    }
                },
                gainNode: masterGain
            };
        }
        break;
        default:
            // Fallback to default waveform if instrument not recognized
            oscillator = context.createOscillator();
            gainNode = context.createGain();
            oscillator.type = waveformSelect.value;
            oscillator.frequency.setValueAtTime(frequency, time);
            gainNode.gain.setValueAtTime(0.4, time);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, time + noteDuration);
            oscillator.connect(gainNode);
            gainNode.connect(context.destination);
            oscillator.start(time);
            oscillator.stop(time + noteDuration);
            break;
    }
    return { oscillator, gainNode };
}

function playSFX(sfxType, time, duration, frequency, context = audioContext) {
    if (context.state === 'suspended') {
        context.resume();
    }

    const actualTime = time || context.currentTime; // Use scheduled time or current time
    const actualDuration = duration || 0.5; // Default SFX duration if not provided

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    switch (sfxType) {
        case 'coin':
            // First tone
            const osc1 = context.createOscillator();
            const gain1 = context.createGain();
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(1000 * (frequency / baseNoteFrequencyForSFX), actualTime);
            gain1.gain.setValueAtTime(0.1, actualTime);
            gain1.gain.exponentialRampToValueAtTime(0.0001, actualTime + 0.05);
            osc1.connect(gain1);
            gain1.connect(context.destination);
            osc1.start(actualTime);
            osc1.stop(actualTime + 0.05);

            // Second tone, slightly higher and immediately after
            const osc2 = context.createOscillator();
            const gain2 = context.createGain();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(1200 * (frequency / baseNoteFrequencyForSFX), actualTime + 0.03); // Start slightly after
            gain2.gain.setValueAtTime(0.1, actualTime + 0.03);
            gain2.gain.exponentialRampToValueAtTime(0.0001, actualTime + 0.08);
            osc2.connect(gain2);
            gain2.connect(context.destination);
            osc2.start(actualTime + 0.03);
            osc2.stop(actualTime + 0.08);
            return; // Return early as we are handling multiple oscillators
        case 'jump':
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(400 * (frequency / baseNoteFrequencyForSFX), actualTime); // Scale frequency
            oscillator.frequency.linearRampToValueAtTime(800 * (frequency / baseNoteFrequencyForSFX), actualTime + 0.1); // Scale frequency
            gainNode.gain.setValueAtTime(0.1, actualTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, actualTime + 0.2);
            oscillator.start(actualTime);
            oscillator.stop(actualTime + 0.2);
            break;
        case 'laser':
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(800 * (frequency / baseNoteFrequencyForSFX), actualTime); // Scale frequency
            oscillator.frequency.linearRampToValueAtTime(100 * (frequency / baseNoteFrequencyForSFX), actualTime + 0.2); // Scale frequency
            gainNode.gain.setValueAtTime(0.1, actualTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, actualTime + 0.2);
            oscillator.start(actualTime);
            oscillator.stop(actualTime + 0.2);
            break;
        case 'explosion':
            // Noise burst for explosion (frequency scaling doesn't apply here)
            const bufferSize = context.sampleRate * 0.5; // 0.5 seconds of noise
            const noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1; // White noise
            }
            const noiseSource = context.createBufferSource();
            noiseSource.buffer = noiseBuffer;
            
            gainNode.gain.setValueAtTime(0.15, actualTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, actualTime + 0.5);

            noiseSource.connect(gainNode);
            gainNode.connect(context.destination);
            noiseSource.start(actualTime);
            noiseSource.stop(actualTime + 0.5);
            return; // Noise doesn't use an oscillator
        case 'blip':
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(800 * (frequency / baseNoteFrequencyForSFX), actualTime);
            gainNode.gain.setValueAtTime(0.075, actualTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, actualTime + 0.05);
            oscillator.start(actualTime);
            oscillator.stop(actualTime + 0.05);
            break;
        case 'powerup':
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(400 * (frequency / baseNoteFrequencyForSFX), actualTime);
            oscillator.frequency.linearRampToValueAtTime(800 * (frequency / baseNoteFrequencyForSFX), actualTime + 0.2);
            gainNode.gain.setValueAtTime(0.1, actualTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, actualTime + 0.3);
            oscillator.start(actualTime);
            oscillator.stop(actualTime + 0.3);
            break;
        case 'hit':
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(200 * (frequency / baseNoteFrequencyForSFX), actualTime);
            gainNode.gain.setValueAtTime(0.125, actualTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, actualTime + 0.1);
            oscillator.start(actualTime);
            oscillator.stop(actualTime + 0.1);
            break;
        default:
            return;
    }

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
}

sfxSelect.addEventListener('change', (event) => {
    const selectedSfx = event.target.value;
    if (selectedSfx) {
        // Clear instrument and waveform selections when an SFX is chosen
        instrumentSelect.value = 'default';
        waveformSelect.value = 'square';
    }
});

waveformSelect.addEventListener('change', () => {
    // Clear SFX selection and reset instrument when waveform is changed
    sfxSelect.value = '';
    instrumentSelect.value = 'default';
});

instrumentSelect.addEventListener('change', () => {
    // Clear SFX selection and reset waveform when instrument is changed
    sfxSelect.value = '';
    waveformSelect.value = 'square';
});

bpmInput.addEventListener('input', () => {
    bpmValueSpan.textContent = bpmInput.value;
});



clearGridButton.addEventListener('click', () => {
    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
            if (grid[i][j]) {
                toggleCell(i, j);
            }
        }
    }
    columnHighlight.classList.remove('block');
    columnHighlight.classList.add('hidden');
});

randomGridButton.addEventListener('click', () => {
    // --- 1. Randomize settings ---
    // Random Waveform
    const waveformOptions = waveformSelect.options;
    const randomWaveformIndex = Math.floor(Math.random() * waveformOptions.length);
    waveformSelect.value = waveformOptions[randomWaveformIndex].value;

    // Reset Instrument and SFX dropdowns
    instrumentSelect.value = 'default';
    sfxSelect.value = '';

    // Random Octave
    currentOctave = Math.floor(Math.random() * 3) + 3; // Octaves 3, 4, or 5
    updateNotesAndFrequencies();

    // --- 2. Clear the grid ---
    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
            if (grid[i][j]) {
                toggleCell(i, j, false);
            }
        }
    }

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
    const noteSkipProbability = Math.random() * 0.4; // 0.0 to 0.4

    for (let chordIndex = 0; chordIndex < selectedProgression.length; chordIndex++) {
        const chord = selectedProgression[chordIndex];
        const startCol = chordIndex * chordDuration;
        const arpeggioPattern = arpeggioPatterns[Math.floor(Math.random() * arpeggioPatterns.length)];

        // Add a bass note for each chord on the first beat
        const bassNoteRow = chord.root;
        if (!grid[bassNoteRow][startCol]) {
            toggleCell(bassNoteRow, startCol, false);
        }

        // Place the arpeggio pattern
        for (let i = 0; i < chordDuration; i++) {
            const col = startCol + i;
            if (i > 0) { // Don't conflict with bass note
                const noteIndex = arpeggioPattern[i % arpeggioPattern.length];
                const noteRow = chord.notes[noteIndex];
                if (Math.random() > noteSkipProbability) {
                    if (!grid[noteRow][col]) {
                        toggleCell(noteRow, col, false);
                    }
                }
            }
        }
    }

    // --- 4. Set random BPM ---
    const newBpm = Math.floor(Math.random() * (180 - 90 + 1)) + 90;
    bpmInput.value = newBpm;
    bpmValueSpan.textContent = newBpm;
});

octaveDownButton.addEventListener('click', () => {
    if (currentOctave > 0) {
        currentOctave--;
        updateNotesAndFrequencies();
    }
});

octaveUpButton.addEventListener('click', () => {
    if (currentOctave < 9) {
        currentOctave++;
        updateNotesAndFrequencies();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    createGrid();
    bpmValueSpan.textContent = bpmInput.value;

    // Enable the saveMp3Button only if lamejs is defined
    if (typeof lamejs !== 'undefined') {
        saveMp3Button.disabled = false;
    } else {
        console.warn("lamejs is not defined. 'Save as MP3' button will remain disabled.");
    }
});

saveMp3Button.addEventListener('click', () => {
    const bpm = parseFloat(bpmInput.value);
    const noteDuration = 60 / bpm;
    const totalDuration = numCols * noteDuration;

    const offlineAudioContext = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
        2, // Number of channels (stereo)
        audioContext.sampleRate * totalDuration, // Length of the rendering in samples
        audioContext.sampleRate // Sample rate
    );

    let renderTime = 0;
    for (let currentCol = 0; currentCol < numCols; currentCol++) {
        for (let i = 0; i < numRows; i++) {
            if (grid[i][currentCol]) {
                const selectedSfx = sfxSelect.value;
                const selectedInstrument = instrumentSelect.value;

                if (selectedSfx) {
                    playSFX(selectedSfx, renderTime, noteDuration, frequencies[i], offlineAudioContext);
                } else if (selectedInstrument !== 'default') {
                    playInstrument(selectedInstrument, frequencies[i], renderTime, noteDuration, offlineAudioContext);
                } else {
                    // Default waveform sound
                    const oscillator = offlineAudioContext.createOscillator();
                    const gainNode = offlineAudioContext.createGain();

                    oscillator.type = waveformSelect.value;
                    oscillator.frequency.setValueAtTime(frequencies[i], renderTime);

                    gainNode.gain.setValueAtTime(0.05, renderTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.0001, renderTime + noteDuration);

                    oscillator.connect(gainNode);
                    gainNode.connect(offlineAudioContext.destination);

                    oscillator.start(renderTime);
                    oscillator.stop(renderTime + noteDuration);
                }
            }
        }
        renderTime += noteDuration;
    }

    offlineAudioContext.startRendering().then(function(renderedBuffer) {
        const mp3encoder = new lamejs.Mp3Encoder(2, renderedBuffer.sampleRate, 128); // 2 channels, sample rate, 128 kbps
        const mp3Data = [];

        const left = renderedBuffer.getChannelData(0);
        const right = renderedBuffer.getChannelData(1);
        const sampleBlockSize = 1152; // Can be anything, but 1152 is a typical MP3 frame size

        // Convert Float32Array to Int16Array
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

        const mp3buf = mp3encoder.flush(); // Flush any remaining data
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }

        const blob = new Blob(mp3Data, { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `chiptuned.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    }).catch(function(err) {
        console.error('Rendering failed: ' + err);
        alert('Error rendering audio: ' + err.message);
    });
});
