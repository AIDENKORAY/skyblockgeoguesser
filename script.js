<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Minecraft GeoGuessr</title>
  <style>
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #111;
      font-family: Arial, sans-serif;
    }

    body {
      user-select: none;
    }

    #status {
      position: fixed;
      top: 10px;
      left: 10px;
      z-index: 20;
      color: white;
      background: rgba(0, 0, 0, 0.75);
      padding: 8px 12px;
      border-radius: 8px;
      display: none;
      max-width: 320px;
    }

    #menu {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: center;
      background:
        linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.75)),
        radial-gradient(circle at top, #2a2a2a, #111 70%);
    }

    #menuCard {
      width: min(90vw, 500px);
      background: rgba(20, 20, 20, 0.92);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 18px;
      padding: 28px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.4);
      color: white;
      text-align: center;
    }

    #menuCard h1 {
      margin: 0 0 10px;
      font-size: 2rem;
    }

    #menuCard p {
      margin: 0 0 22px;
      color: #cfcfcf;
      line-height: 1.45;
    }

    .modeButtons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 18px;
    }

    .modeButton {
      border: none;
      border-radius: 12px;
      padding: 14px 16px;
      font-size: 1rem;
      cursor: pointer;
      background: #2d6cdf;
      color: white;
      transition: transform 0.15s ease, opacity 0.15s ease;
    }

    .modeButton:hover {
      transform: translateY(-2px);
      opacity: 0.95;
    }

    .modeButton.secondary {
      background: #333;
    }

    #hud {
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 20;
      color: white;
      background: rgba(0,0,0,0.75);
      padding: 10px 14px;
      border-radius: 8px;
      display: none;
      min-width: 200px;
    }

    #hud div + div {
      margin-top: 6px;
    }

    #openMapBtn {
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 25;
      display: none;
    }

    #mapPanel {
      position: fixed;
      right: 20px;
      bottom: 74px;
      width: min(420px, calc(100vw - 40px));
      height: min(320px, calc(100vh - 140px));
      z-index: 30;
      display: none;
      background: rgba(20, 20, 20, 0.96);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.45);
      overflow: hidden;
    }

    #mapPanelHeader {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      color: white;
      background: rgba(255,255,255,0.03);
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }

    #mapPanelTitle {
      font-weight: 700;
    }

    #mapZoomText {
      color: #cfcfcf;
      font-size: 0.9rem;
    }

    #mapViewport {
      position: relative;
      width: 100%;
      height: calc(100% - 112px);
      overflow: hidden;
      background: #222;
      cursor: grab;
      touch-action: none;
    }

    #mapViewport.dragging {
      cursor: grabbing;
    }

    #mapInner {
      position: absolute;
      top: 0;
      left: 0;
      transform-origin: top left;
    }

    #guessMap {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: fill;
      user-select: none;
      -webkit-user-drag: none;
      pointer-events: none;
    }

    #guessMarker {
      position: absolute;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #e53935;
      border: 3px solid white;
      transform: translate(-50%, -50%);
      display: none;
      pointer-events: none;
      box-sizing: border-box;
    }

    #mapControls {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: center;
      padding: 12px;
      border-top: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.02);
    }

    #resultsUI {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 60;
      background: rgba(0,0,0,0.82);
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    }

    .panelCard {
      background: rgba(20, 20, 20, 0.96);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 18px;
      padding: 22px;
      width: min(92vw, 950px);
      color: white;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.45);
    }

    .panelCard h2 {
      margin-top: 0;
    }

    .panelCard p {
      color: #d4d4d4;
    }

    #resultMapContainer {
      position: relative;
      margin: 20px auto;
      width: min(88vw, 900px);
      aspect-ratio: 16 / 9;
      background: #111;
      overflow: hidden;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.08);
    }

    #resultMap {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
      user-select: none;
      -webkit-user-drag: none;
      pointer-events: none;
      background: #111;
    }

    #resultGuessMarker,
    #actualMarker {
      position: absolute;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      display: none;
      pointer-events: none;
      border: 3px solid white;
      box-sizing: border-box;
    }

    #resultGuessMarker {
      background: #e53935;
    }

    #actualMarker {
      background: #2ecc71;
    }

    .buttonRow {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
      margin-top: 12px;
    }

    canvas {
      display: block;
      cursor: grab;
    }

    canvas.dragging {
      cursor: grabbing;
    }

    @media (max-width: 700px) {
      #mapPanel {
        right: 10px;
        bottom: 64px;
        width: calc(100vw - 20px);
        height: 300px;
      }

      #openMapBtn {
        right: 10px;
        bottom: 10px;
      }

      #hud {
        right: 10px;
        top: 10px;
        max-width: calc(100vw - 140px);
      }
    }
  </style>

  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
      "three/": "https://cdn.jsdelivr.net/npm/three@0.160.0/"
    }
  }
  </script>
</head>
<body>
  <div id="menu">
    <div id="menuCard">
      <h1>Skyblock GeoGuessr</h1>
      <p>
        Pick a mode to start. The world will only load after you choose,
        which helps the site run smoother.
      </p>

      <div class="modeButtons">
        <button class="modeButton" data-mode="classic">Classic</button>
        <button class="modeButton" data-mode="timed">Timed</button>
        <button class="modeButton secondary" data-mode="free">Free Explore</button>
        <button class="modeButton secondary" data-mode="hardcore">Hardcore</button>
      </div>
    </div>
  </div>

  <div id="status">Starting...</div>

  <div id="hud">
    <div>Mode: <span id="currentMode">None</span></div>
    <div>Round: <span id="roundNumber">0</span></div>
    <div>Total Score: <span id="totalScore">0</span></div>
  </div>

  <button id="openMapBtn" class="modeButton">Map</button>

  <div id="mapPanel">
    <div id="mapPanelHeader">
      <div id="mapPanelTitle">Place Your Guess</div>
      <div id="mapZoomText">Zoom: 100%</div>
    </div>

    <div id="mapViewport">
      <div id="mapInner">
        <img id="guessMap" src="topdown-map.jpg" alt="Top-down map" />
        <div id="guessMarker"></div>
      </div>
    </div>

    <div id="mapControls">
      <button id="zoomOutBtn" class="modeButton secondary" type="button">-</button>
      <button id="zoomInBtn" class="modeButton secondary" type="button">+</button>
      <button id="submitGuessBtn" class="modeButton" type="button">Submit Guess</button>
      <button id="closeMapBtn" class="modeButton secondary" type="button">Close</button>
    </div>
  </div>

  <div id="resultsUI">
    <div class="panelCard">
      <h2>Round Result</h2>
      <p id="resultText">Result goes here.</p>

      <div id="resultMapContainer">
        <img id="resultMap" src="topdown-map.jpg" alt="Result map" />
        <div id="resultGuessMarker"></div>
        <div id="actualMarker"></div>
      </div>

      <div class="buttonRow">
        <button id="nextRoundBtn" class="modeButton">Next Round</button>
      </div>
    </div>
  </div>

  <script type="module" src="./script.js"></script>
</body>
</html>
