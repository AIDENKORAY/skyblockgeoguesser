import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/MTLLoader.js";

const menu = document.getElementById("menu");
const statusBox = document.getElementById("status");
const hud = document.getElementById("hud");
const currentModeText = document.getElementById("currentMode");
const modeButtons = document.querySelectorAll(".modeButton");

let scene;
let camera;
let renderer;
let controls;
let animationStarted = false;
let modelLoaded = false;
let selectedMode = null;

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
  renderer.setPixelRatio(window.devicePixelRatio);
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
  }
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const mode = button.dataset.mode;
    startGame(mode);
  });
});
