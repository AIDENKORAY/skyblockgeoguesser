import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/MTLLoader.js";

const statusBox = document.getElementById("status");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const light1 = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
scene.add(light1);

const light2 = new THREE.DirectionalLight(0xffffff, 1);
light2.position.set(100, 200, 100);
scene.add(light2);

const grid = new THREE.GridHelper(500, 50);
scene.add(grid);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
camera.position.set(100, 100, 100);

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

        statusBox.textContent = "Model loaded with textures";
      },
      function (xhr) {
        if (xhr.total) {
          const percent = (xhr.loaded / xhr.total) * 100;
          statusBox.textContent = `Loading model... ${percent.toFixed(1)}%`;
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
    }
  },
  function (error) {
    console.error("Error loading MTL:", error);
    statusBox.textContent = "Failed to load MTL. Check console.";
  }
);

window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();
