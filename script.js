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

const openGuessBtn = document.getElementById("openGuessBtn");
const guessUI = document.getElementById("guessUI");
const guessMapContainer = document.getElementById("guessMapContainer");
const guessMarker = document.getElementById("guessMarker");
const submitGuessBtn = document.getElementById("submitGuessBtn");
const closeGuessBtn = document.getElementById("closeGuessBtn");

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

let currentRound = null;
let currentGuess = null;
let totalScore = 0;
let roundNumber = 0;
const usedRoundIndexes = [];

const roundLocations = [
  {
    name: "Spawn Island",
    world: { x: 0, y: 80, z: 0 },
    map: { x: 50, y: 50 }
  },
  {
    name: "Shop Area",
    world: { x: 120, y: 82, z: -40 },
    map: { x: 68, y: 42 }
  },
  {
    name: "Farm",
    world: { x: -90, y: 78, z: 160 },
    map: { x: 28, y: 75 }
  },
  {
    name: "Bridge",
    world: { x: 210, y: 84, z: 120 },
    map: { x: 82, y: 62 }
  }
];

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
  scene.add(grid);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;

  camera.position.set(100, 100, 100);

  window.addEventListener("resize", onWindowResize);
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
    function (materials) {
      materials.preload();

      const objLoader = new OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.setPath("./");

      statusBox.textContent = "Loading model...";

      objLoader.load(
        "model.obj",
        function (obj) {
          scene.add(obj);

          const box = new THREE.Box3().setFromObject(obj);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());

          controls.target.copy(center);

          const maxDim = Math.max(size.x, size.y, size.z) || 200;
          camera.position.set(
            center.x + maxDim * 0.8,
            center.y + maxDim * 0.5,
            center.z + maxDim * 0.8
          );

          camera.near = 0.1;
          camera.far = Math.max(1000000, maxDim * 20);
          camera.updateProjectionMatrix();

          modelLoaded = true;
          statusBox.textContent = "World loaded";
          console.log("Model loaded with textures");
          console.log("Center:", center);
          console.log("Size:", size);

          applyModeRules();
          startNewRound();
        },
        function (xhr) {
          if (xhr.total) {
            const percent = (xhr.loaded / xhr.total) * 100;
            statusBox.textContent = `Loading model... ${percent.toFixed(1)}%`;
          } else {
            statusBox.textContent = "Loading model...";
          }
        },
        function (error) {
          console.error("Error loading OBJ:", error);
          statusBox.textContent = "Failed to load OBJ. Check console.";
        }
      );
    },
    function (xhr) {
      if (xhr.total) {
        const percent = (xhr.loaded / xhr.total) * 100;
        statusBox.textContent = `Loading materials... ${percent.toFixed(1)}%`;
      } else {
        statusBox.textContent = "Loading materials...";
      }
    },
    function (error) {
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

function moveCameraToRound(round) {
  if (!round || !camera || !controls) return;

  camera.position.set(
    round.world.x,
    round.world.y,
    round.world.z
  );

  controls.target.set(
    round.world.x + 20,
    round.world.y,
    round.world.z + 20
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
  guessUI.style.display = "none";
  resultsUI.style.display = "none";

  moveCameraToRound(currentRound);
  updateHud();

  statusBox.style.display = "block";
  statusBox.textContent = `Round ${roundNumber}: ${selectedMode} mode`;
}

function openGuessUI() {
  if (!modelLoaded || !currentRound) return;
  guessUI.style.display = "flex";
}

function closeGuessUI() {
  guessUI.style.display = "none";
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

  closeGuessUI();
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
  openGuessBtn.style.display = "block";

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

openGuessBtn.addEventListener("click", openGuessUI);
closeGuessBtn.addEventListener("click", closeGuessUI);
submitGuessBtn.addEventListener("click", submitGuess);

nextRoundBtn.addEventListener("click", () => {
  startNewRound();
});

guessMapContainer.addEventListener("click", (event) => {
  const rect = guessMapContainer.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;

  currentGuess = { x, y };
  setMarkerPosition(guessMarker, currentGuess);
});
