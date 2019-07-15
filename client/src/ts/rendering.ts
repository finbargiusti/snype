import * as THREE from "three";
import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass
} from "postprocessing";

// CONFIG

class Player {
  public position: THREE.Vector3;
  public yaw: number = 0;
  public pitch: number = 0;

  constructor(x: number, y: number, z: number) {
    this.position = new THREE.Vector3(x, y, z);
  }

  getHeadPosition() {
    let pos = this.position.clone();
    pos.z += 0.9;

    return pos;
  }
}

let bob = new Player(0, 0, 0);
let localPlayer = bob;

let playerSpeed = 2.5; // Units per second

function setCameraToLocalPlayer() {
  if (!localPlayer) return;

  let headPos = localPlayer.getHeadPosition();
  camera.position.x = headPos.x;
  camera.position.y = headPos.y;
  camera.position.z = headPos.z;
}

let inputState = {
  forwards: false,
  backwards: false,
  left: false,
  right: false
};

window.addEventListener("keydown", e => {
  let keyCode = e.keyCode;
  console.log(keyCode);

  switch (keyCode) {
    case 87:
      {
        inputState.forwards = true;
      }
      break;
    case 83:
      {
        inputState.backwards = true;
      }
      break;
    case 65:
      {
        inputState.left = true;
      }
      break;
    case 68:
      {
        inputState.right = true;
      }
      break;
    case 37:
      {
        camera.rotateY(0.03);
      }
      break;
  }
});

window.addEventListener("keyup", e => {
  let keyCode = e.keyCode;

  switch (keyCode) {
    case 87:
      {
        inputState.forwards = false;
      }
      break;
    case 83:
      {
        inputState.backwards = false;
      }
      break;
    case 65:
      {
        inputState.left = false;
      }
      break;
    case 68:
      {
        inputState.right = false;
      }
      break;
  }
});

const FOV = 75;

let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(
  FOV,
  window.innerWidth / window.innerHeight
);

let renderer = new THREE.WebGLRenderer();

const composer = new EffectComposer(renderer);

renderer.setSize(window.innerWidth, window.innerHeight);
4;

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

document.body.appendChild(renderer.domElement);

let sphere = new THREE.Mesh(
  new THREE.SphereGeometry(0.3, 30, 30),
  new THREE.MeshStandardMaterial({ color: 0xff0000 })
);

sphere.castShadow = true; //default is false
sphere.receiveShadow = true; //default

sphere.position.set(0, 0, 1.1);

let cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x00ff00 })
);

cube.castShadow = true; //default is false
cube.receiveShadow = true; //default

let floor = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100, 100, 100),

  new THREE.MeshLambertMaterial({ color: 0xffffff, wireframe: true })
);

floor.receiveShadow = true;

var spotLight = new THREE.SpotLight(0xffffff);
spotLight.position.set(0, 30, 20);
spotLight.castShadow = true;
scene.add(spotLight);

scene.add(new THREE.AmbientLight(0xffffff, 0.3));

// floor.rotation.x = (Math.PI / 2) * -1;

camera.position.set(0, 0, 1);
//camera.rotateX(Math.PI / 2);
// camera.lookAt(floor.position);

scene.add(floor);
scene.add(cube);
scene.add(sphere);

renderer.domElement.addEventListener("click", () => {
  renderer.domElement.requestPointerLock();
});

renderer.domElement.addEventListener("mousemove", e => {
  let x = e.movementX;
  let y = e.movementY;

  localPlayer.yaw += -x / 1000;
  localPlayer.pitch += -y / 1000;
  localPlayer.pitch = Math.max(
    -Math.PI / 2,
    Math.min(Math.PI / 2, localPlayer.pitch)
  );
});

document.addEventListener("pointerlockchange", lockChangeAlert, false);

let pointerLocked = false;
function lockChangeAlert() {
  if (document.pointerLockElement === renderer.domElement) {
    console.log("The pointer lock status is now locked");
    pointerLocked = true;
    //document.addEventListener("mousemove", updatePosition, false);
  } else {
    console.log("The pointer lock status is now unlocked");
    pointerLocked = false;
    //document.removeEventListener("mousemove", updatePosition, false);
  }
}

const effectPass = new EffectPass(
  camera,
  new BloomEffect({ distinction: 0.2 })
);
effectPass.renderToScreen = true;

composer.addPass(new RenderPass(scene, camera));
composer.addPass(effectPass);

composer.setSize(window.innerWidth, window.innerHeight);

let lastRenderTime = null;
let animate = () => {
  let now = performance.now();
  let dif = 16.6666666; // estimate
  if (lastRenderTime !== null) dif = now - lastRenderTime;

  /*
  var lookAtVector = new THREE.Vector3(0, 0, -1);
    lookAtVector.applyQuaternion(camera.quaternion);
    */

  let xAxis = new THREE.Vector3(1, 0, 0);
  let yAxis = new THREE.Vector3(0, 1, 0);
  let zAxis = new THREE.Vector3(0, 0, 1);

  let defaultJackshit = new THREE.Vector3(0, 1, 0);
  defaultJackshit.applyAxisAngle(zAxis, localPlayer.yaw);

  camera.rotation.x = 0;
  camera.rotation.y = 0;
  camera.rotation.z = 0;
  camera.rotateOnWorldAxis(xAxis, Math.PI / 2);
  camera.rotateOnWorldAxis(xAxis, localPlayer.pitch);
  camera.rotateOnWorldAxis(zAxis, localPlayer.yaw);

  var lookAtVector = new THREE.Vector3(0, 0, -1);
  lookAtVector.applyQuaternion(camera.quaternion);

  lookAtVector.setZ(0);
  lookAtVector.normalize();

  if (inputState.forwards) {
    localPlayer.position.add(
      lookAtVector.multiplyScalar(playerSpeed * (dif / 1000))
    );
  }
  if (inputState.backwards) {
    lookAtVector.applyAxisAngle(zAxis, Math.PI);

    localPlayer.position.add(
      lookAtVector.multiplyScalar(playerSpeed * (dif / 1000))
    );
  }
  if (inputState.left) {
    lookAtVector.applyAxisAngle(zAxis, Math.PI / 2);

    localPlayer.position.add(
      lookAtVector.multiplyScalar(playerSpeed * (dif / 1000))
    );
  }
  if (inputState.right) {
    lookAtVector.applyAxisAngle(zAxis, (Math.PI * 3) / 2);

    localPlayer.position.add(
      lookAtVector.multiplyScalar(playerSpeed * (dif / 1000))
    );
  }

  setCameraToLocalPlayer();

  composer.render();

  requestAnimationFrame(animate);
  lastRenderTime = now;
};
animate();
