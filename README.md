# Gravity Flip Runner

Gravity Flip Runner is a polished, browser-based endless runner game built with HTML5 Canvas, CSS, and vanilla JavaScript. The player automatically runs, flips gravity between the floor and ceiling, avoids obstacles, collects coins, and uses temporary power-ups to survive as long as possible.

## Features

- Endless runner gameplay with automatic movement
- Gravity-flip controls using Space, mouse click, and a mobile flip button
- Random ground and ceiling obstacles
- Collectible coins and power-ups
- Shield, Magnet, Slow Motion, and Double Score effects
- Pause, restart, and responsive UI
- LocalStorage high score saving
- Web Audio API sound effects and music toggle
- Neon cyberpunk visual theme

## Project structure

- index.html — page structure and game UI
- style.css — dark neon styling and responsive layout
- script.js — game logic, rendering, collisions, and sound
- assets/ — optional folder for future art or audio assets
- README.md — setup and deployment guide

## How to run locally

1. Open the project folder in VS Code.
2. Double-click on `index.html` to open it in your browser.
3. Click Play to start the countdown.

You can also run a small local web server from the project folder if you prefer:

```bash
cd "c:\Users\gattu rajarameshwari\OneDrive\Desktop\game"
python -m http.server 8000
```

Then open `http://localhost:8000` in the browser.

## Controls

- Desktop:
  - Spacebar: flip gravity
  - Mouse click: flip gravity
  - P: pause or resume
  - R: restart after game over
- Mobile:
  - Flip Gravity button
  - Pause button

## How the gravity system works

The player starts on the ground and runs automatically. Pressing Space or clicking the game area flips gravity, so the player begins moving toward the ceiling. When the player reaches the ceiling, gravity is inverted again and the player runs upside down. This cycle continues until the player collides with an obstacle.

## How to customize the character

Open `script.js` and change the values in the `player` object or the `drawPlayer()` function:

- `radius`: player size
- colors in `drawPlayer()`
- animation speed inside the render loop
- starting position values in `resetGameState()`

## How to add new obstacles

Use the `spawnObstacle()` function in `script.js`:

1. Add a new obstacle type.
2. Set its `x`, `y`, `width`, and `height`.
3. Customize speed, movement, or visual style in `drawObstacles()`.

You can also adjust spawn timing in the `update()` function by changing the spawn delay values.

## Uploading to GitHub

1. Open GitHub and create a new repository.
2. In VS Code, open the terminal in the project folder.
3. Run:

```bash
git init
git add .
git commit -m "Initial Gravity Flip Runner commit"
git branch -M main
git remote add origin <your-repository-url>
git push -u origin main
```

## Deploying online

You can deploy this project to GitHub Pages or any static hosting provider:

1. Push the project to GitHub.
2. Enable GitHub Pages in the repository settings.
3. Choose the main branch and root folder.
4. Your game will be available at a public URL.

## Notes

- Sound effects require user interaction before audio playback begins, so the first click or button press starts the audio engine.
- The project uses no backend, no API keys, and no third-party assets.
- LocalStorage is used to remember the best score on the same browser.
