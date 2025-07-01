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
const baseFrequencies = [261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392.00, 415.30, 440.00, 466.16, 493.88]; // C4 to B4

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
        const frequency = baseFrequencies[i] * Math.pow(2, (currentOctave - 4)); // Assuming baseFrequencies are for C4-B4
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
        baseNoteFrequencyForSFX = frequencies[0];
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

function playSound(waveform, frequency, time, duration) {
    // console.log(`playSound: Playing ${waveform} at ${frequency}Hz at time ${time}`);
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    const selectedSfx = sfxSelect.value;
    if (selectedSfx) {
        // If an SFX is selected, play it instead of a note/instrument
        playSFX(selectedSfx, time, duration, frequency); // Pass time, duration, and frequency for scheduling
        return { oscillator: null, gainNode: null }; // SFX are fire-and-forget, no nodes to stop
    }

    const selectedInstrument = instrumentSelect.value;
    if (selectedInstrument !== 'default') {
        return playInstrument(selectedInstrument, frequency, time, duration);
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const noteDuration = duration || 60.0 / parseFloat(bpmInput.value);

    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, time);

    gainNode.gain.setValueAtTime(0.1, time);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + noteDuration);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(time);
    oscillator.stop(time + noteDuration); // Ensure the oscillator stops after its duration
    return { oscillator, gainNode };
}

function playInstrument(instrument, frequency, time, duration) {
    const noteDuration = duration || 60.0 / parseFloat(bpmInput.value);
    let oscillator, gainNode;

    switch (instrument) {
        case 'piano':
            oscillator = audioContext.createOscillator();
            gainNode = audioContext.createGain();
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(frequency, time);
            gainNode.gain.setValueAtTime(0.5, time);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, time + noteDuration);
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start(time);
            oscillator.stop(time + noteDuration);
            break;
        case 'organ':
            oscillator = audioContext.createOscillator();
            gainNode = audioContext.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, time);
            gainNode.gain.setValueAtTime(0.3, time);
            gainNode.gain.linearRampToValueAtTime(0.3, time + noteDuration * 0.8);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, time + noteDuration);
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start(time);
            oscillator.stop(time + noteDuration);
            break;
        case 'synth_lead':
            oscillator = audioContext.createOscillator();
            gainNode = audioContext.createGain();
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(frequency, time);
            gainNode.gain.setValueAtTime(0.4, time);
            gainNode.gain.linearRampToValueAtTime(0.2, time + noteDuration * 0.5);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, time + noteDuration);
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start(time);
            oscillator.stop(time + noteDuration);
            break;
        case 'bass':
            oscillator = audioContext.createOscillator();
            gainNode = audioContext.createGain();
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(frequency / 2, time); // Lower octave for bass
            gainNode.gain.setValueAtTime(0.6, time);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, time + noteDuration * 0.8);
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start(time);
            oscillator.stop(time + noteDuration);
            break;
        case 'flute':
            oscillator = audioContext.createOscillator();
            gainNode = audioContext.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, time);
            gainNode.gain.setValueAtTime(0.3, time);
            gainNode.gain.linearRampToValueAtTime(0.1, time + noteDuration * 0.5);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, time + noteDuration);
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start(time);
            oscillator.stop(time + noteDuration);
            break;
        case 'trumpet':
            oscillator = audioContext.createOscillator();
            gainNode = audioContext.createGain();
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(frequency, time);
            gainNode.gain.setValueAtTime(0.5, time);
            gainNode.gain.linearRampToValueAtTime(0.3, time + noteDuration * 0.3);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, time + noteDuration);
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start(time);
            oscillator.stop(time + noteDuration);
            break;
        case 'strings':
            oscillator = audioContext.createOscillator();
            gainNode = audioContext.createGain();
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(frequency, time);
            gainNode.gain.setValueAtTime(0.2, time);
            gainNode.gain.linearRampToValueAtTime(0.2, time + noteDuration * 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, time + noteDuration * 1.5); // Longer release
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start(time);
            oscillator.stop(time + noteDuration * 1.5);
            break;
        default:
            // Fallback to default waveform if instrument not recognized
            return playSound(waveformSelect.value, frequency, time, duration);
    }
    return { oscillator, gainNode };
}

function playSFX(sfxType, time, duration, frequency) {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    const actualTime = time || audioContext.currentTime; // Use scheduled time or current time
    const actualDuration = duration || 0.5; // Default SFX duration if not provided

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    switch (sfxType) {
        case 'coin':
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(1000 * (frequency / baseNoteFrequencyForSFX), actualTime); // Scale frequency
            gainNode.gain.setValueAtTime(0.5, actualTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, actualTime + 0.1);
            oscillator.start(actualTime);
            oscillator.stop(actualTime + 0.1);
            break;
        case 'jump':
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(400 * (frequency / baseNoteFrequencyForSFX), actualTime); // Scale frequency
            oscillator.frequency.linearRampToValueAtTime(800 * (frequency / baseNoteFrequencyForSFX), actualTime + 0.1); // Scale frequency
            gainNode.gain.setValueAtTime(0.5, actualTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, actualTime + 0.2);
            oscillator.start(actualTime);
            oscillator.stop(actualTime + 0.2);
            break;
        case 'laser':
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(800 * (frequency / baseNoteFrequencyForSFX), actualTime); // Scale frequency
            oscillator.frequency.linearRampToValueAtTime(100 * (frequency / baseNoteFrequencyForSFX), actualTime + 0.2); // Scale frequency
            gainNode.gain.setValueAtTime(0.4, actualTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, actualTime + 0.2);
            oscillator.start(actualTime);
            oscillator.stop(actualTime + 0.2);
            break;
        case 'explosion':
            // Noise burst for explosion (frequency scaling doesn't apply here)
            const bufferSize = audioContext.sampleRate * 0.5; // 0.5 seconds of noise
            const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1; // White noise
            }
            const noiseSource = audioContext.createBufferSource();
            noiseSource.buffer = noiseBuffer;
            
            gainNode.gain.setValueAtTime(0.8, actualTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, actualTime + 0.5);

            noiseSource.connect(gainNode);
            gainNode.connect(audioContext.destination);
            noiseSource.start(actualTime);
            noiseSource.stop(actualTime + 0.5);
            return; // Noise doesn't use an oscillator
        case 'blip':
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(800 * (frequency / baseNoteFrequencyForSFX), actualTime);
            gainNode.gain.setValueAtTime(0.3, actualTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, actualTime + 0.05);
            oscillator.start(actualTime);
            oscillator.stop(actualTime + 0.05);
            break;
        case 'powerup':
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(400 * (frequency / baseNoteFrequencyForSFX), actualTime);
            oscillator.frequency.linearRampToValueAtTime(800 * (frequency / baseNoteFrequencyForSFX), actualTime + 0.2);
            gainNode.gain.setValueAtTime(0.6, actualTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, actualTime + 0.3);
            oscillator.start(actualTime);
            oscillator.stop(actualTime + 0.3);
            break;
        case 'hit':
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(200 * (frequency / baseNoteFrequencyForSFX), actualTime);
            gainNode.gain.setValueAtTime(0.7, actualTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, actualTime + 0.1);
            oscillator.start(actualTime);
            oscillator.stop(actualTime + 0.1);
            break;
        default:
            return;
    }

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
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
                const oscillator = offlineAudioContext.createOscillator();
                const gainNode = offlineAudioContext.createGain();

                oscillator.type = waveformSelect.value;
                oscillator.frequency.setValueAtTime(frequencies[i], renderTime);

                gainNode.gain.setValueAtTime(0.1, renderTime);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, renderTime + noteDuration);

                oscillator.connect(gainNode);
                gainNode.connect(offlineAudioContext.destination);

                oscillator.start(renderTime);
                oscillator.stop(renderTime + noteDuration);
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