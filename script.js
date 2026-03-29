let scene = new THREE.Scene();

let camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    10000
);

let renderer = new THREE.WebGLRenderer();

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

document.body.appendChild(renderer.domElement);

// lighting
let light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
scene.add(light);

// controls (mouse look)
let controls = new THREE.PointerLockControls(camera, document.body);

document.body.addEventListener("click", () => controls.lock());

scene.add(controls.getObject());

// starting position
camera.position.set(0, 80, 0);

// load model
let loader = new THREE.GLTFLoader();

loader.load(
    "model.gltf", // change this if your file name is different

    function (gltf) {
        gltf.scene.scale.set(1, 1, 1); // adjust if needed
        scene.add(gltf.scene);
        console.log("Model loaded");
    },

    undefined,

    function (error) {
        console.error("Error loading model:", error);
    }
);

// simple gravity
let velocityY = 0;

function animate() {
    requestAnimationFrame(animate);

    velocityY -= 0.01;
    camera.position.y += velocityY;

    if (camera.position.y < 70) {
        camera.position.y = 70;
        velocityY = 0;
    }

    renderer.render(scene, camera);
}

animate();