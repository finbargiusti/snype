import * as THREE from "three";

// CONFIG

class Player {
  public position: THREE.Vector3;

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

window.addEventListener('keydown', (e) => {
  let keyCode = e.keyCode;
  console.log(keyCode);

  switch (keyCode) {
    case 87: {
      inputState.forwards = true;
    }; break;
    case 83: {
      inputState.backwards = true;
    }; break;
    case 65: {
      inputState.left = true;
    }; break;
    case 68: {
      inputState.right = true;
    }; break;
    case 37: {
      camera.rotateY(0.03)
    }; break;
  }
});

window.addEventListener('keyup', (e) => {
  let keyCode = e.keyCode;

  switch (keyCode) {
    case 87: {
      inputState.forwards = false;
    }; break;
    case 83: {
      inputState.backwards = false;
    }; break;
    case 65: {
      inputState.left = false;
    }; break;
    case 68: {
      inputState.right = false;
    }; break;
  }
});





const FOV = 75;

let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(
  FOV,
  window.innerWidth / window.innerHeight
);

let renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.domElement);

let floor = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100, 100, 100),

  new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true })
);

let light = new THREE.PointLight(0xffffff, 100, 100000, 1);

light.position.z = 1;

// floor.rotation.x = (Math.PI / 2) * -1;

camera.position.set(0, 0, 1);
camera.rotateX(Math.PI / 2);
// camera.lookAt(floor.position);

scene.add(floor);
scene.add(light);

renderer.domElement.addEventListener('click', () => {
  renderer.domElement.requestPointerLock(); 
});

renderer.domElement.addEventListener('mousemove', (e) => {
  let x = e.movementX;

  camera.rotateY(-x / 1000);
});

document.addEventListener('pointerlockchange', lockChangeAlert, false);

let pointerLocked = false;
function lockChangeAlert() {
  if (document.pointerLockElement === renderer.domElement) {
    console.log('The pointer lock status is now locked');
    pointerLocked = true;
    //document.addEventListener("mousemove", updatePosition, false);
  } else {
    console.log('The pointer lock status is now unlocked');
    pointerLocked = false;
    //document.removeEventListener("mousemove", updatePosition, false);
  }
}

let lastRenderTime = null;
let animate = () => {
  let now = performance.now();
  let dif = 16.6666666; // estimate
  if (lastRenderTime !== null) dif = now - lastRenderTime;

  var lookAtVector = new THREE.Vector3(0, 0, -1);
    lookAtVector.applyQuaternion(camera.quaternion);

  if (inputState.forwards) {
    
    //console.log(lookAtVector);

    
  }

  

  let zAxis = new THREE.Vector3(0, 0, 1);

  if (inputState.forwards) {
    localPlayer.position.add(lookAtVector.multiplyScalar(playerSpeed * (dif / 1000)));
  }
  if (inputState.backwards) {
    lookAtVector.applyAxisAngle(zAxis, Math.PI);

    localPlayer.position.add(lookAtVector.multiplyScalar(playerSpeed * (dif / 1000)));
  }
  if (inputState.left) {
    lookAtVector.applyAxisAngle(zAxis, Math.PI / 2);

    localPlayer.position.add(lookAtVector.multiplyScalar(playerSpeed * (dif / 1000)));
  }
  if (inputState.right) {
    lookAtVector.applyAxisAngle(zAxis, Math.PI * 3/2);

    localPlayer.position.add(lookAtVector.multiplyScalar(playerSpeed * (dif / 1000)));
  }

  setCameraToLocalPlayer();

  renderer.render(scene, camera);

  requestAnimationFrame(animate);
  lastRenderTime = now;
};
animate();
