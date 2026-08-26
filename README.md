# Snake Game

A classic snake game built with pure HTML, CSS, and JavaScript — no frameworks, no build step. The snake's head is a cute face image that rotates to follow the direction of travel.

## Run

Open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Controls

- Arrow keys or WASD to move (pressing one also starts the game)
- On touch devices: swipe on the board, or use the on-screen d-pad
- Space or the d-pad center button to pause / resume
- Enter or the Play button to start
- Auto Play button to let the AI play for you (click again to pause it and take back control)

## Features

- Fully responsive: the board fits any screen size and orientation, with a side-by-side layout on landscape phones
- 20x20 grid rendered on a canvas, sharp on high-DPI displays and resized crisply with the window
- Speed increases as you eat
- Glowing pulsing apple food
- Body gradient that fades and tapers toward the tail
- High score saved in `localStorage`
- Auto Play mode: a built-in AI that follows a Hamiltonian cycle with safe shortcuts, guaranteed to fill the board and win; taking over mid-game triggers a safe recovery mode until the body realigns with the cycle

## Files

- `index.html` — page structure, score UI, start/game-over overlay
- `style.css` — light purple theme styling
- `game.js` — game loop, input, and rendering
- `assets/snake-face.png` — the snake face sprite (transparent PNG)
