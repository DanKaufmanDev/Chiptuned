## 🎶 Chiptuned
A retro-inspired, browser-based 8-bit step sequencer and DAW built with vanilla JavaScript and the Web Audio API.

## 🌟 Overview
Chiptuned is a fully client-side web application that lets you compose authentic 8-bit music directly in your browser. Chiptuned offers a modern 8-bit chiptune workflow — no downloads, plugins, or accounts required.

Originally developed as an in-house tool for designing retro soundtracks and sound effects for indie video game projects, Chiptuned has been refined into a polished public tool so anyone can create 8-bit chiptune sounds for their games, videos, or creative projects.

Built entirely in vanilla JavaScript with the Web Audio API, Chiptuned is fast, lightweight, and runs fully in your browser.

## 🙌 About the Project
This app began as a personal tool for designing game music and retro sound effects during the development of several indie game prototypes.

After refining the workflow for internal use, I realized this tool could help other musicians, game developers, and retro music enthusiasts — so I polished the UI, added export support, and released it as a free web app for everyone.

## 🚀 Live Demo
👉 [(add your live link here)]

## 🎛️ Features
- 🎹 Multi-layer step sequencer with pattern editing
- 🔊 Built-in audio engine with:
    - Square, Sine, Sawtooth, and Triangle waveforms
    - A library of pre-made instruments and SFX
    - ADSR envelopes
    - Bitcrusher, reverb, delay, and panning
    - LFO modulation
    - Per-channel effect chains
- 🎚️ Bus mixer for individual track control
- 📝 Full undo/redo system
- 💾 Save/load as `.cht` project files
- ⚙️ Customizable keyboard shortcuts
- 🎵 Export to `.wav` and `.mp3`
- 🎨 Theme switching (planned)

## 🏁 Getting Started
1.  **Add a track:** Click the "Add Track" button to create a new layer.
2.  **Select a sound:** Choose a waveform, instrument, or SFX from the "Sounds" panel.
3.  **Draw notes:** Use the "Draw" tool to add notes to the sequencer grid.
4.  **Add effects:** Open the effects window from the bus mixer to add and tweak effects.
5.  **Play your creation:** Use the global play/pause button or the spacebar to listen to your track.

## ⌨️ Keyboard Shortcuts
Chiptuned features customizable keyboard shortcuts for a faster workflow. You can view and edit the keybinds in the settings menu.

**Default Shortcuts:**

| Action | Windows/Linux | macOS |
| :--- | :--- | :--- |
| **File** | |
| Open Project | `Ctrl` + `O` | `Cmd` + `O` |
| Save Project | `Ctrl` + `S` | `Cmd` + `S` |
| New Project | `Ctrl` + `P` | `Cmd` + `P` |
| **Edit** | |
| Undo | `Ctrl` + `Z` | `Cmd` + `Z` |
| Redo | `Ctrl` + `Shift` + `Z` | `Cmd` + `Shift` + `Z` |
| Cut | `Ctrl` + `X` | `Cmd` + `X` |
| Copy | `Ctrl` + `C` | `Cmd` + `C` |
| Paste | `Ctrl` + `V` | `Cmd` + `V` |
| Select All | `Ctrl` + `A` | `Cmd` + `A` |
| **Tools** | |
| Draw Tool | `D` | `D` |
| Splice Tool | `X` | `X`|
| Erase Tool | `E` | `E` |
| Select Tool | `S` | `S` |
| Grab Tool | `G` | `G` |
| **Playback** | |
| Play/Pause | `Space` | `Space` |

## 💾 Save, Load & Export
- **Save Project:** Saves your work as a `.cht` file.
- **Load Project:** Load a `.cht` file from your computer to restore your session.
- **Export Audio:** Render your composition to `.wav` or `.mp3` entirely in the browser.
- **Autosave:** Your session is automatically saved to your browser's local storage every 30 seconds from last autosave action.

## 📜 License
CC0 License — free to use, and share.