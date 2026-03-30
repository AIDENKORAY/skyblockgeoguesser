import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/MTLLoader.js";

const menu = document.getElementById("menu");
const statusBox = document.getElementById("status");
const hud = document.getElementById("hud");
const currentModeText = document.getElementById("currentMode");
const modeButtons = document.querySelectorAll(".modeButton[data-mode]");

const roundNumberText = document.getElementById("roundNumber");
const totalScoreText = document.getElementById("totalScore");

const openMapBtn = document.getElementById("openMapBtn");
const mapPanel = document.getElementById("mapPanel");
const mapViewport = document.getElementById("mapViewport");
const mapInner = document.getElementById("mapInner");
const guessMarker = document.getElementById("guessMarker");
const zoomText = document.getElementById("mapZoomText");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const submitGuessBtn = document.getElementById("submitGuessBtn");
const closeMapBtn = document.getElementById("closeMapBtn");

const resultsUI = document.getElementById("resultsUI");
const resultText = document.getElementById("resultText");
const resultGuessMarker = document.getElementById("resultGuessMarker");
const actualMarker = document.getElementById("actualMarker");
const nextRoundBtn = document.getElementById("nextRoundBtn");

let scene;
let camera;
let renderer;
let controls;
let animationStarted = false;
let modelLoaded = false;
let selectedMode = null;
let worldRoot = null;
let worldBounds = null;

let currentRound = null;
let currentGuess = null;
let totalScore = 0;
let roundNumber = 0;
const usedRoundIndexes = [];

const PLAYER_EYE_HEIGHT = 2;
const LOOK_DISTANCE = 18;

const MAP_BASE_WIDTH = 1000;
const MAP_BASE_HEIGHT = 562.5;
let mapZoom = 1;
const MIN_MAP_ZOOM = 1;
const MAX_MAP_ZOOM = 5;

const raycaster = new THREE.Raycaster();

const roundLocations = [
  {
    name: "Spawn Island",
    world: { x: 0, z: 0, fallbackY: 80 },
    map: { x: 50, y: 50 }
  },
  {
    name: "Shop Area",
    world: { x: 120, z: -40, fallbackY: 82 },
    map: { x: 68, y: 42 }
  },
  {
    name: "Farm",
    world: { x: -90, z: 160, fallbackY: 78 },
    map: { x: 28, y: 75 }
  },
  {
    name: "Bridge",
    world: { x: 210, z: 120, fallbackY: 84 },
    map: { x: 82, y: 62 }
  }
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000000
  );

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(100, 200, 100);
  scene.add(dirLight);

  const grid = new THREE.GridHelper(500, 50);
  grid.visible = false;
  scene.add(grid);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.rotateSpeed = 0.75;

  camera.position.set(100, 100, 100);
  controls.target.set(120, 100, 120);
  controls.update();

  window.addEventListener("resize", onWindowResize);

  setupMapUI();
}

function setupMapUI() {
  mapInner.style.width = `${MAP_BASE_WIDTH}px`;
  mapInner.style.height = `${MAP_BASE_HEIGHT}px`;
  updateMapZoom();

  openMapBtn.addEventListener("click", toggleMapPanel);
  closeMapBtn.addEventListener("click", closeMapPanel);
  submitGuessBtn.addEventListener("click", submitGuess);

  zoomInBtn.addEventListener("click", () => zoomMapAtCenter(0.25));
  zoomOutBtn.addEventListener("click", () => zoomMapAtCenter(-0.25));

  mapViewport.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();

      const rect = mapViewport.getBoundingClientRect();
      const oldZoom = mapZoom;
      const delta = event.deltaY < 0 ? 0.2 : -0.2;
      const newZoom = clamp(mapZoom + delta, MIN_MAP_ZOOM, MAX_MAP_ZOOM);

      if (newZoom === oldZoom) return;

      const mouseViewportX = event.clientX - rect.left;
      const mouseViewportY = event.clientY - rect.top;

      const contentX = (mapViewport.scrollLeft + mouseViewportX) / oldZoom;
      const contentY = (mapViewport.scrollTop + mouseViewportY) / oldZoom;

      mapZoom = newZoom;
      updateMapZoom();

      mapViewport.scrollLeft = contentX * mapZoom - mouseViewportX;
      mapViewport.scrollTop = contentY * mapZoom - mouseViewportY;
    },
    { passive: false }
  );

  mapInner.addEventListener("click", (event) => {
    const rect = mapInner.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    currentGuess = { x, y };
    setMarkerPosition(guessMarker, currentGuess);
  });

  nextRoundBtn.addEventListener("click", () => {
    resultsUI.style.display = "none";
    startNewRound();
  });
}

function onWindowResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function loadWorld() {
  statusBox.style.display = "block";
  statusBox.textContent = "Loading materials...";

  const mtlLoader = new MTLLoader();
  mtlLoader.setPath("./");

  mtlLoader.load(
    "model.mtl",
    (materials) => {
      materials.preload();

      const objLoader = new OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.setPath("./");

      statusBox.textContent = "Loading model...";

      objLoader.load(
        "model.obj",
        (obj) => {
          worldRoot = obj;
          scene.add(obj);

          worldBounds = new THREE.Box3().setFromObject(obj);
          const center = worldBounds.getCenter(new THREE.Vector3());
          const size = worldBounds.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z) || 200;

          controls.target.copy(center);
          camera.position.set(
            center.x + maxDim * 0.8,
            center.y + maxDim * 0.5,
            center.z + maxDim * 0.8
          );

          camera.near = 0.1;
          camera.far = Math.max(1000000, maxDim * 20);
          camera.updateProjectionMatrix();
          controls.update();

          modelLoaded = true;
          statusBox.textContent = "World loaded";

          applyModeRules();
          startNewRound();
        },
        (xhr) => {
          if (xhr.total) {
            const percent = (xhr.loaded / xhr.total) * 100;
            statusBox.textContent = `Loading model... ${percent.toFixed(1)}%`;
          } else {
            statusBox.textContent = "Loading model...";
          }
        },
        (error) => {
          console.error("Error loading OBJ:", error);
          statusBox.textContent = "Failed to load OBJ. Check console.";
        }
      );
    },
    (xhr) => {
      if (xhr.total) {
        const percent = (xhr.loaded / xhr.total) * 100;
        statusBox.textContent = `Loading materials... ${percent.toFixed(1)}%`;
      } else {
        statusBox.textContent = "Loading materials...";
      }
    },
    (error) => {
      console.error("Error loading MTL:", error);
      statusBox.textContent = "Failed to load MTL. Check console.";
    }
  );
}

function applyModeRules() {
  if (!modelLoaded) return;

  if (selectedMode === "free") {
    statusBox.textContent = "Free Explore mode";
  } else if (selectedMode === "classic") {
    statusBox.textContent = "Classic mode";
  } else if (selectedMode === "timed") {
    statusBox.textContent = "Timed mode";
  } else if (selectedMode === "hardcore") {
    statusBox.textContent = "Hardcore mode";
  }
}

function updateHud() {
  roundNumberText.textContent = String(roundNumber);
  totalScoreText.textContent = String(totalScore);
}

function pickRandomRound() {
  if (usedRoundIndexes.length >= roundLocations.length) {
    usedRoundIndexes.length = 0;
  }

  let index;
  do {
    index = Math.floor(Math.random() * roundLocations.length);
  } while (
    usedRoundIndexes.includes(index) &&
    usedRoundIndexes.length < roundLocations.length
  );

  usedRoundIndexes.push(index);
  return roundLocations[index];
}

function getGroundY(x, z, fallbackY = 80) {
  if (!worldRoot || !worldBounds) return fallbackY;

  const originY = worldBounds.max.y + 1000;
  raycaster.set(
    new THREE.Vector3(x, originY, z),
    new THREE.Vector3(0, -1, 0)
  );

  const hits = raycaster.intersectObject(worldRoot, true);

  if (hits.length > 0) {
    return hits[0].point.y;
  }

  return fallbackY;
}

function moveCameraToRound(round) {
  if (!round || !camera || !controls) return;

  const x = round.world.x;
  const z = round.world.z;
  const groundY = getGroundY(x, z, round.world.fallbackY ?? 80);
  const eyeY = groundY + PLAYER_EYE_HEIGHT;

  camera.position.set(x, eyeY, z);

  const angle = Math.random() * Math.PI * 2;
  controls.target.set(
    x + Math.cos(angle) * LOOK_DISTANCE,
    eyeY,
    z + Math.sin(angle) * LOOK_DISTANCE
  );

  controls.update();
}

function startNewRound() {
  currentRound = pickRandomRound();
  currentGuess = null;
  roundNumber += 1;

  guessMarker.style.display = "none";
  resultGuessMarker.style.display = "none";
  actualMarker.style.display = "none";
  closeMapPanel();
  resultsUI.style.display = "none";

  moveCameraToRound(currentRound);
  updateHud();

  statusBox.style.display = "block";
  statusBox.textContent = `Round ${roundNumber}: ${selectedMode} mode`;
}

function toggleMapPanel() {
  if (!modelLoaded || !currentRound) return;

  if (mapPanel.style.display === "block") {
    closeMapPanel();
  } else {
    openMapPanel();
  }
}

function openMapPanel() {
  mapPanel.style.display = "block";
}

function closeMapPanel() {
  mapPanel.style.display = "none";
}

function updateMapZoom() {
  mapInner.style.width = `${MAP_BASE_WIDTH * mapZoom}px`;
  mapInner.style.height = `${MAP_BASE_HEIGHT * mapZoom}px`;
  zoomText.textContent = `Zoom: ${Math.round(mapZoom * 100)}%`;
}

function zoomMapAtCenter(amount) {
  const rect = mapViewport.getBoundingClientRect();
  const oldZoom = mapZoom;
  const newZoom = clamp(mapZoom + amount, MIN_MAP_ZOOM, MAX_MAP_ZOOM);

  if (newZoom === oldZoom) return;

  const centerViewportX = rect.width / 2;
  const centerViewportY = rect.height / 2;

  const contentX = (mapViewport.scrollLeft + centerViewportX) / oldZoom;
  const contentY = (mapViewport.scrollTop + centerViewportY) / oldZoom;

  mapZoom = newZoom;
  updateMapZoom();

  mapViewport.scrollLeft = contentX * mapZoom - centerViewportX;
  mapViewport.scrollTop = contentY * mapZoom - centerViewportY;
}

function setMarkerPosition(marker, guess) {
  marker.style.display = "block";
  marker.style.left = `${guess.x}%`;
  marker.style.top = `${guess.y}%`;
}

function calculateGuessDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function calculateScore(distance) {
  const maxDistance = 50;
  const clamped = Math.min(distance, maxDistance);
  return Math.round(5000 * (1 - clamped / maxDistance));
}

function showResults(distance, score) {
  resultText.textContent =
    `You were ${distance.toFixed(1)} map units away. ` +
    `You earned ${score} points. ` +
    `Actual location: ${currentRound.name}.`;

  setMarkerPosition(resultGuessMarker, currentGuess);
  setMarkerPosition(actualMarker, currentRound.map);

  resultsUI.style.display = "flex";
}

function submitGuess() {
  if (!currentGuess || !currentRound) {
    alert("Place a guess on the map first.");
    return;
  }

  const distance = calculateGuessDistance(currentGuess, currentRound.map);
  const score = calculateScore(distance);

  totalScore += score;
  updateHud();

  closeMapPanel();
  showResults(distance, score);
}

function animate() {
  requestAnimationFrame(animate);

  if (controls) {
    controls.update();
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

function startGame(mode) {
  selectedMode = mode;
  currentModeText.textContent = mode;
  menu.style.display = "none";
  hud.style.display = "block";
  openMapBtn.style.display = "block";

  if (!scene) {
    initScene();
  }

  if (!animationStarted) {
    animationStarted = true;
    animate();
  }

  if (!modelLoaded) {
    loadWorld();
  } else {
    statusBox.style.display = "block";
    applyModeRules();
    startNewRound();
  }
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const mode = button.dataset.mode;
    startGame(mode);
  });
});
