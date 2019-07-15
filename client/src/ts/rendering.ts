import * as THREE from "three";

// CONFIG

class Player {
  public position: THREE.Vector3;

  constructor(x: number, y: number, z: number) {
    this.position = new THREE.Vector3(x, y, z);
  }
}

let bob = new Player(0, 0, 0);

let localPlayer = bob;

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
  new THREE.PlaneGeometry(10, 10, 10, 10),

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

let animate = () => {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
};
animate();
