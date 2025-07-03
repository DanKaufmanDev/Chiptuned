const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const waveformSelect = document.getElementById('waveform');
const instrumentSelect = document.getElementById('instrument');
const sfxSelect = document.getElementById('sfx');
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
const saveProjectButton = document.getElementById('save-project');
const loadProjectButton = document.getElementById('load-project');
const columnHighlight = document.getElementById('column-highlight');
const bpmTextInput = document.getElementById('bpm-text-input');
const addLayerButton = document.getElementById('add-layer');
const layerListContainer = document.getElementById('layer-list');
const busMixerContainer = document.getElementById('bus-mixer-container'); // New

let layers = [];
let activeLayerIndex = -1;
let masterGainNode = audioContext.createGain(); // Master Gain Node
masterGainNode.connect(audioContext.destination);

const baseNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const baseFrequencies = [16.35, 17.32, 18.35, 19.45, 20.60, 21.83, 23.12, 24.50, 25.96, 27.50, 29.14, 30.87]; // C0 to B0

let currentOctave = 4; // Starting octave
let notes = [];
let frequencies = [];
const numRows = 12; // Chromatic scale
const numCols = 32;

let grid = Array(numRows).fill(null).map(() => []); // Each row will store an array of note objects {start: col, end: col}
let musicTimeout;
let lastHighlightedColumn = -1;
let playingNodes = [];

let isDragging = false;
let dragStartCol = -1;
let dragStartRow = -1;
let currentNote = null; // Stores the note object being dragged/modified
let anchorCol = -1;
let currentProjectFileName = 'my_chiptuned_project.cht'; // New global variable to store the current project filename
let totalSequenceDuration = 0; // Total duration of the sequence in seconds
let playbackStartTime = 0; // AudioContext time when playback started
let currentPlaybackTime = 0; // Current playback time in seconds

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
    gainNode.gain.value = 1.0; // Default gain for new tracks
    gainNode.connect(masterGainNode); // Connect track bus to master bus

    return {
        id: Date.now(),
        name: name,
        grid: Array(numRows).fill(null).map(() => []),
        instrument: 'default',
        waveform: 'square',
        sfx: '',
        octave: 4,
        isMuted: false,
        gainNode: gainNode, // Store the gain node for this layer
        gainValue: 1.0 // Store the gain value for saving/loading
    };
}

function deleteLayer(indexToDelete) {
    if (layers.length <= 1) {
        alert("Cannot delete the last layer.");
        return;
    }

    // Disconnect the gain node of the layer being deleted
    if (layers[indexToDelete].gainNode) {
        layers[indexToDelete].gainNode.disconnect();
    }

    layers.splice(indexToDelete, 1);

    if (activeLayerIndex >= indexToDelete) {
        activeLayerIndex = Math.max(0, activeLayerIndex - 1);
    }

    switchLayer(activeLayerIndex, true);
    renderBusMixer(); // Update mixer after deleting a layer
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

                for (const note of layer.grid[i]) {
                    if (j >= note.start && j <= note.end) {
                        coveredByNote = true;
                        if (j === note.start) {
                            noteStartingAtThisCell = note;
                        }
                        break;
                    }
                }

                if (coveredByNote) {
                    if (noteStartingAtThisCell) {
                        cell.style.backgroundColor = 'var(--active-cell-bg)';
                        cell.style.gridColumn = `${noteStartingAtThisCell.start + 1} / ${noteStartingAtThisCell.end + 2}`;
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

function switchLayer(index, force = false) {
    if (activeLayerIndex === index && !force) return;
    activeLayerIndex = index;
    renderActiveLayer();
    renderLayerList();
    renderBusMixer(); // Add this line to update the mixer
}

function renderActiveLayer() {
    const activeLayer = layers[activeLayerIndex];
    grid = activeLayer.grid;
    instrumentSelect.value = activeLayer.instrument;
    waveformSelect.value = activeLayer.waveform;
    sfxSelect.value = activeLayer.sfx;
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
    // Find if any note exists at the clicked column
    const existingNoteIndex = grid[row].findIndex(note => col >= note.start && col <= note.end);

    if (existingNoteIndex !== -1) {
        // A note exists here, remove it.
        grid[row].splice(existingNoteIndex, 1);
    } else {
        // No note exists here, add a new single-cell note.
        grid[row].push({ start: col, end: col });
    }
    requestAnimationFrame(() => {
        updateGridDisplay();
        renderLayerList();
        updateTotalDurationAndDisplay();
    });
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

    // Hide the column highlight when the grid is created or recreated
    columnHighlight.classList.remove('block');
    columnHighlight.classList.add('hidden');

    updateNotesAndFrequencies(); // Call this first to populate notes and frequencies

    // Explicitly set grid properties for gridContainer
    gridContainer.style.display = 'grid';
    gridContainer.style.gridTemplateRows = `repeat(${numRows}, 40px)`; // Explicitly define row height
    gridContainer.style.gridTemplateColumns = `repeat(${numCols}, 40px)`; // Explicitly define column width
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
            cell.addEventListener('mousedown', (e) => handleMouseDown(e, i, j));
            gridContainer.appendChild(cell);
        }
    }
    // After creating cells, update their active state based on the grid data
    requestAnimationFrame(updateGridDisplay);

    // Calculate column width and offset once
    const firstCell = gridContainer.children[0];
    if (firstCell) {
        const cellActualWidth = firstCell.offsetWidth;
        const computedStyle = window.getComputedStyle(gridContainer);
        gridColumnGap = parseFloat(computedStyle.getPropertyValue('grid-column-gap'));
        effectiveColumnWidth = cellActualWidth + gridColumnGap;
        gridContainerOffsetLeft = gridContainer.offsetLeft; // Get the actual offset of the grid container
        columnHighlightWidth = cellActualWidth; // Set the highlighter width to the cell width
    }
}

function updateGridDisplay() {
    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
            const cell = document.querySelector(`[data-row='${i}'][data-col='${j}']`);

            // Reset all styles for the current cell
            cell.classList.remove('active');
            cell.style.gridColumn = '';
            cell.style.display = 'block'; // Default to visible

            let coveredByNote = false;
            let noteStartingAtThisCell = null;

            // Check if this cell is covered by any note in the current row
            for (const note of grid[i]) {
                if (j >= note.start && j <= note.end) {
                    coveredByNote = true;
                    if (j === note.start) {
                        noteStartingAtThisCell = note;
                    }
                    break; // Found a note covering this cell, no need to check further
                }
            }

            if (coveredByNote) {
                if (noteStartingAtThisCell) {
                    // This cell is the start of a note
                    cell.classList.add('active');
                    cell.style.gridColumn = `${noteStartingAtThisCell.start + 1} / ${noteStartingAtThisCell.end + 2}`;
                } else {
                    // This cell is part of a note, but not the start
                    cell.style.display = 'none';
                }
            }
            // If not covered by any note, it remains display: 'block' (default)
        }
    }
}

function nextNote() {
    const secondsPerBeat = 60.0 / parseFloat(bpmInput.value);
    nextNoteTime += secondsPerBeat;
    currentColumn++;
}

function playSFX(sfx, time, duration, frequency, audioCtx) {
    // TODO: Implement SFX playback
    console.log(`Playing SFX: ${sfx}`);
}

function playInstrument(instrument, frequency, time, duration, audioCtx, destinationNode) {
    // TODO: Implement instrument playback
    console.log(`Playing instrument: ${instrument}`);
    return { oscillator: null, gainNode: null };
}

function playSound(waveform, frequency, time, duration, audioCtx, destinationNode) {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, time);

    gainNode.gain.setValueAtTime(0.2, time);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    oscillator.connect(gainNode);
    gainNode.connect(destinationNode);

    oscillator.start(time);
    oscillator.stop(time + duration);

    return { oscillator, gainNode };
}

function scheduleNote(beatNumber, time) {
    layers.forEach(layer => {
        if (layer.isMuted) return; // Skip muted layers

        for (let i = 0; i < numRows; i++) {
            // Find notes that start at the current beatNumber
            const notesToPlay = layer.grid[i].filter(note => beatNumber === note.start);

            notesToPlay.forEach(note => {
                const noteDurationInBeats = note.end - note.start + 1;
                const noteDurationInSeconds = noteDurationInBeats * (60.0 / parseFloat(bpmInput.value));

                const noteFrequency = baseFrequencies[i] * Math.pow(2, layer.octave);

                const selectedSfx = layer.sfx;
                if (selectedSfx) {
                    playSFX(selectedSfx, time, noteDurationInSeconds, noteFrequency);
                } else {
                    const selectedInstrument = layer.instrument;
                    if (selectedInstrument === 'default') {
                        const { oscillator, gainNode } = playSound(layer.waveform, noteFrequency, time, noteDurationInSeconds, audioContext, layer.gainNode);
                        playingNodes.push({ oscillator, gainNode });
                    } else {
                        const { oscillator, gainNode } = playInstrument(selectedInstrument, noteFrequency, time, noteDurationInSeconds, audioContext, layer.gainNode);
                        playingNodes.push({ oscillator, gainNode });
                    }
                }
            });
        }
    });
}

function scheduler() {
    while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
        // If looping is enabled and we've reached the end of the sequence, reset
        if (loopCheckbox.checked && currentColumn * (60.0 / parseFloat(bpmInput.value)) >= totalSequenceDuration) {
            currentColumn = 0;
            nextNoteTime = audioContext.currentTime; // Reset nextNoteTime to current audio context time
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

function draw() {
    if (!isPlaying) {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        return;
    }

    currentPlaybackTime = audioContext.currentTime - playbackStartTime;

    // The loop handling is now primarily in the scheduler function
    // This ensures the UI updates smoothly even if the audio loop resets
    if (currentPlaybackTime >= totalSequenceDuration && loopCheckbox.checked) {
        // If looping, reset currentPlaybackTime for smooth progress bar animation
        currentPlaybackTime = currentPlaybackTime % totalSequenceDuration;
    } else if (currentPlaybackTime >= totalSequenceDuration && !loopCheckbox.checked) {
        // If not looping and reached end, stop playback
        stopPlayback();
        return;
    }

    globalProgressBar.value = currentPlaybackTime;
    globalTimestamp.textContent = `${formatTime(currentPlaybackTime)}/${formatTime(totalSequenceDuration)}`;

    const secondsPerBeat = 60.0 / parseFloat(bpmInput.value);
    const continuousCol = currentPlaybackTime / secondsPerBeat;

    highlightColumn(continuousCol);

    animationFrameId = requestAnimationFrame(draw);
}

function startPlayback(startColumn = 0) {
    if (isPlaying) return;
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

    dragStartCol = col;
    dragStartRow = row;
    isDragging = false; // Reset drag state

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
}

function handleMouseMove(e) {
    const targetCell = e.target.closest('.grid-cell');
    if (!targetCell || parseInt(targetCell.dataset.row) !== dragStartRow) return;

    const gridRect = gridContainer.getBoundingClientRect();
    const mouseX = e.clientX - gridRect.left;
    let currentCol = Math.floor(mouseX / effectiveColumnWidth);
    currentCol = Math.max(0, Math.min(numCols - 1, currentCol));

    // Only start a drag if the mouse has moved to a different column.
    if (!isDragging && currentCol !== dragStartCol) {
        isDragging = true;
        const existingNote = grid[dragStartRow].find(note => dragStartCol >= note.start && dragStartCol <= note.end);
        if (existingNote) {
            currentNote = existingNote;
            const distToStart = Math.abs(dragStartCol - currentNote.start);
            const distToEnd = Math.abs(dragStartCol - currentNote.end);
            anchorCol = (distToStart <= distToEnd) ? currentNote.end : currentNote.start;
        } else {
            currentNote = { start: dragStartCol, end: dragStartCol };
            grid[dragStartRow].push(currentNote);
            anchorCol = dragStartCol;
        }
    }

    if (!isDragging) return;

    if (!currentNote) return;

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

    requestAnimationFrame(updateGridDisplay);
}

function handleMouseUp() {
    // Stop listening for mouse movements.
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);

    if (!isDragging) {
        // If the mouse never moved, it was a simple click.
        toggleSingleNote(dragStartRow, dragStartCol);
    } else if (currentNote && currentNote.start > currentNote.end) {
        // If the drag ended with the note being invalid (e.g., squashed to zero size by a collision), remove it.
        const noteIndex = grid[dragStartRow].indexOf(currentNote);
        if (noteIndex > -1) {
            grid[dragStartRow].splice(noteIndex, 1);
        }
    }

    // Reset all state variables for the next drag operation.
    isDragging = false;
    dragStartCol = -1;
    dragStartRow = -1;
    currentNote = null;
    anchorCol = -1;

    // Perform a final render to commit the changes to the display.
    requestAnimationFrame(() => {
        updateGridDisplay();
        renderLayerList();
        updateTotalDurationAndDisplay();
    });
}

globalPlayPauseButton.addEventListener('click', () => {
    console.log("Global Play/Pause button clicked. isPlaying before:", isPlaying);
    if (isPlaying) {
        stopPlayback();
    } else {
        startPlayback();
    }
    console.log("Global Play/Pause button clicked. isPlaying after:", isPlaying);
});

function highlightColumn(col) {
    if (effectiveColumnWidth === 0) return;

    const gridWrapperScrollLeft = Math.round(gridContainer.parentElement.scrollLeft);

    // Highlight the current whole column
    const currentWholeColumn = Math.floor(col);
    const highlightLeft = Math.round(gridContainerOffsetLeft) + Math.round(currentWholeColumn * effectiveColumnWidth) - gridWrapperScrollLeft;

    columnHighlight.style.width = `${Math.round(columnHighlightWidth)}px`;
    columnHighlight.style.left = `${highlightLeft}px`;
    columnHighlight.style.height = `auto`;
    columnHighlight.style.top = `0`;
    columnHighlight.classList.remove('hidden');
    columnHighlight.classList.add('block');

    // Scroll the grid-wrapper to the current column
    gridContainer.parentElement.scrollLeft = Math.round(currentWholeColumn * effectiveColumnWidth);
}

function renderBusMixer() {
    busMixerContainer.innerHTML = '';

    // Master Bus
    const masterBusDiv = document.createElement('div');
    masterBusDiv.classList.add('bus-container');
    masterBusDiv.innerHTML = `
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
    });

    // Track Buses
    layers.forEach((layer, index) => {
        const trackBusDiv = document.createElement('div');
        trackBusDiv.classList.add('bus-container');
        if (index === activeLayerIndex) {
            trackBusDiv.classList.add('active-bus');
        }
        trackBusDiv.innerHTML = `
            <div class="retro-slider-container">
                <input type="range" class="retro-slider" id="track-volume-slider-${layer.id}" min="0" max="100" value="100">
            </div>
            <label for="track-volume-slider-${layer.id}" class="bus-label">${layer.name}</label>
        `;
        busMixerContainer.appendChild(trackBusDiv);

        const trackVolumeSlider = document.getElementById(`track-volume-slider-${layer.id}`);
        const trackLabel = trackBusDiv.querySelector('.bus-label');
        trackVolumeSlider.value = linearToLog(layer.gainNode.gain.value);
        trackVolumeSlider.addEventListener('input', (e) => {
            const newGain = logToLinear(e.target.value);
            layer.gainValue = newGain; // Store the "true" volume
            layer.gainNode.gain.value = newGain; // Apply it to the sound
            trackLabel.textContent = Math.round(e.target.value);

            // If the new gain is 0, mute the track. Otherwise, unmute it.
            const shouldBeMuted = newGain === 0;
            if (layer.isMuted !== shouldBeMuted) {
                layer.isMuted = shouldBeMuted;
                renderLayerList(); // Update the mute button in the layer list
            }
        });
        trackVolumeSlider.addEventListener('change', (e) => {
            trackLabel.textContent = layer.name;
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

sfxSelect.addEventListener('change', (event) => {
    const selectedSfx = event.target.value;
    layers[activeLayerIndex].sfx = selectedSfx; // Save to active layer
    if (selectedSfx) {
        // Clear instrument and waveform selections when an SFX is chosen
        layers[activeLayerIndex].instrument = 'default'; // Save to active layer
        layers[activeLayerIndex].waveform = 'square'; // Save to active layer
        instrumentSelect.value = 'default';
        waveformSelect.value = 'square';
    }
});

waveformSelect.addEventListener('change', () => {
    layers[activeLayerIndex].waveform = waveformSelect.value; // Save to active layer
    // Clear SFX selection and reset instrument when waveform is changed
    layers[activeLayerIndex].sfx = ''; // Save to active layer
    layers[activeLayerIndex].instrument = 'default'; // Save to active layer
    sfxSelect.value = '';
    instrumentSelect.value = 'default';
});

instrumentSelect.addEventListener('change', () => {
    layers[activeLayerIndex].instrument = instrumentSelect.value; // Save to active layer
    // Clear SFX selection and reset waveform when instrument is changed
    layers[activeLayerIndex].sfx = ''; // Save to active layer
    layers[activeLayerIndex].waveform = 'square'; // Save to active layer
    sfxSelect.value = '';
    waveformSelect.value = 'square';
});

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
    layers[activeLayerIndex].grid = Array(numRows).fill(null).map(() => []); // Clear the active layer's grid data
    renderActiveLayer(); // Re-render the main grid
    renderLayerList(); // Re-render the layer list
    columnHighlight.classList.remove('block');
    columnHighlight.classList.add('hidden');
    currentPlaybackTime = 0;
    updateTotalDurationAndDisplay();
});

randomGridButton.addEventListener('click', () => {
    // --- 1. Randomize settings ---
    // Random Waveform
    const waveformOptions = waveformSelect.options;
    const randomWaveformIndex = Math.floor(Math.random() * waveformOptions.length);
    layers[activeLayerIndex].waveform = waveformOptions[randomWaveformIndex].value;

    // Reset Instrument and SFX dropdowns
    layers[activeLayerIndex].instrument = 'default';
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
    setTimeout(() => {
        renderActiveLayer();
        renderLayerList();
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
    }
});

octaveUpButton.addEventListener('click', () => {
    if (layers[activeLayerIndex].octave < 9) {
        layers[activeLayerIndex].octave++;
        renderActiveLayer(); // Re-render active layer to update notes and grid
    }
});

document.addEventListener('DOMContentLoaded', () => {
    createGrid();
    addLayer(); // Create initial layer
    bpmValueSpan.textContent = bpmInput.value;
    updateTotalDurationAndDisplay();
    renderBusMixer(); // Render the bus mixer on load

    // Enable the saveMp3Button only if lamejs is defined
    if (typeof lamejs !== 'undefined') {
        saveMp3Button.disabled = false;
    } else {
        console.warn("lamejs is not defined. 'Save as MP3' button will remain disabled.");
    }

    addLayerButton.addEventListener('click', addLayer);
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
                } catch (error) {
                    console.error('Error loading project:', error);
                    alert('Could not load project file. It may be corrupt.');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    });
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
            gainValue: layer.gainValue
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
            if (layer.gainNode) {
                layer.gainNode.disconnect();
            }
        });
        layers = [];

        // Load master gain
        if (typeof loadedData.masterGain === 'number') {
            masterGainNode.gain.value = loadedData.masterGain;
        }

        // Recreate layers with their gain nodes
        loadedData.layers.forEach(loadedLayer => {
            const newGainNode = audioContext.createGain();
            newGainNode.connect(masterGainNode);
            
            // Set gain value, with a default for older projects
            const gainValue = typeof loadedLayer.gainValue === 'number' ? loadedLayer.gainValue : 0.7;
            newGainNode.gain.value = gainValue;

            layers.push({
                ...loadedLayer,
                gainNode: newGainNode,
                gainValue: gainValue // Ensure gainValue is explicitly set on the new layer object
            });
        });

        activeLayerIndex = 0;
        renderActiveLayer();
        renderLayerList();

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
    };

    try {
        // First, try to decrypt the project data as if it's a new, encrypted project
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
            alert('Could not load project file. It may be corrupt or in an invalid format.');
        }
    }
}

saveMp3Button.addEventListener('click', async () => {
    const bpm = parseFloat(bpmInput.value);
    let activeSoundType = '';
    if (sfxSelect.value) {
        activeSoundType = sfxSelect.value;
    } else if (instrumentSelect.value !== 'default') {
        activeSoundType = instrumentSelect.value;
    } else {
        activeSoundType = waveformSelect.value;
    }

    const fileName = `chiptuned_${bpm}BPM_${activeSoundType}.mp3`;

    const noteDurationPerColumn = 60 / bpm;

    // Calculate the actual duration based on the last note
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
        alert("Cannot save an empty track. Please add some notes first.");
        return;
    }

    const offlineAudioContext = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
        2, // Number of channels (stereo)
        Math.ceil(audioContext.sampleRate * totalDuration), // Use Math.ceil for safety
        audioContext.sampleRate // Sample rate
    );

    // Create an offline master gain node that mirrors the main one
    const offlineMasterGain = offlineAudioContext.createGain();
    offlineMasterGain.gain.value = masterGainNode.gain.value;
    offlineMasterGain.connect(offlineAudioContext.destination);

    layers.forEach(layer => {
        // We don't need to check for isMuted here because the gainNode's value will be 0 if muted.
        
        // Create an offline gain node for this layer that mirrors the main one
        const offlineLayerGain = offlineAudioContext.createGain();
        offlineLayerGain.gain.value = layer.gainNode.gain.value; // This will be 0 if muted
        offlineLayerGain.connect(offlineMasterGain);

        const layerFrequencies = [];
        for (let i = 0; i < numRows; i++) {
            layerFrequencies.push(baseFrequencies[i] * Math.pow(2, layer.octave));
        }

        for (let i = 0; i < numRows; i++) {
            layer.grid[i].forEach(note => {
                const noteStartTime = note.start * noteDurationPerColumn;
                const noteDuration = (note.end - note.start + 1) * noteDurationPerColumn;
                const noteFrequency = layerFrequencies[i];

                // Use the existing play functions, passing the offline context and the layer's offline gain node
                if (layer.sfx) {
                    playSFX(layer.sfx, noteStartTime, noteDuration, noteFrequency, offlineAudioContext, offlineLayerGain);
                } else if (layer.instrument !== 'default') {
                    playInstrument(layer.instrument, noteFrequency, noteStartTime, noteDuration, offlineAudioContext, offlineLayerGain);
                } else {
                    playSound(layer.waveform, noteFrequency, noteStartTime, noteDuration, offlineAudioContext, offlineLayerGain);
                }
            });
        }
    });

    offlineAudioContext.startRendering().then(async function(renderedBuffer) {
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

        // Try to use the File System Access API
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{
                        description: 'MP3 Audio File',
                        accept: { 'audio/mp3': ['.mp3'] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Error saving MP3 using File System Access API:', err);
                    fallbackSaveMp3(blob, fileName);
                }
            }
        } else {
            // Fallback for browsers that do not support File System Access API
            fallbackSaveMp3(blob, fileName);
        }

    }).catch(function(err) {
        console.error('Rendering failed: ' + err);
    });
});

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

