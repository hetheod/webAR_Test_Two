import './style.css';
import javascriptLogo from './javascript.svg';
import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

let camera, scene, renderer;
let model;
let trackedImage;

init();

async function init() {
  // Setup the scene
  scene = new THREE.Scene();

  // Setup the camera
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  // Setup the renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setAnimationLoop(render);
  renderer.xr.enabled = true;

  const container = document.querySelector("#scene-container");
  container.appendChild(renderer.domElement);

  // Setup lighting
  const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  ambient.position.set(0.5, 1, 0.25);
  scene.add(ambient);

  // Setup the image target
  const imgTarget = document.getElementById("targetImage");
  const imgTargetBitMap = await createImageBitmap(imgTarget);
  
  // Debugging
  console.log(imgTargetBitMap);

  // AR Button
  const button = ARButton.createButton(renderer, {
    requiredFeatures: ["image-tracking"],
    trackedImages: [
      {
        image: imgTargetBitMap,
        widthInMeters: 0.2,
      }
    ],
    optionalFeatures: ["dom-overlay"],
    domOverlay: {
      root: document.body,
    },
  });
  document.body.appendChild(button);

  // Load the 3D model using GLTFLoader
  const loader = new GLTFLoader();
  loader.load(
    'city.glb', // Replace with the actual path to your 3D model
    function (gltf) {
      model = gltf.scene;
      model.visible = false;  // Initially hidden until image is tracked
      scene.add(model);
    },
    undefined,
    function (error) {
      console.error('An error occurred while loading the model', error);
    }
  );

  // Handle window resizing
  window.addEventListener("resize", onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function render(timestamp, frame) {
  if (frame) {
    const results = frame.getImageTrackingResults();

    // If any image is tracked
    for (const result of results) {
      const imageIndex = result.index;  // The index of the tracked image

      if (imageIndex === 0) {  // Assuming the first image is the target
        const referenceSpace = renderer.xr.getReferenceSpace();
        const pose = frame.getPose(result.imageSpace, referenceSpace);

        if (pose) {
          const matrix = new THREE.Matrix4();
          matrix.fromArray(pose.transform.matrix);

          // Apply the matrix to the model
          model.matrix.fromArray(pose.transform.matrix);
          model.matrixAutoUpdate = false;  // Ensure the model matrix is not overridden
          model.visible = true;  // Show the model once the image is tracked
        }
      } else {
        model.visible = false;  // Hide the model if the image is not tracked
      }
    }
  }

  renderer.render(scene, camera);
}
