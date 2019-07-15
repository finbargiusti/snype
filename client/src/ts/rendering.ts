import * as THREE from "three";
import {
  BloomEffect,
  SSAOEffect,
  EffectComposer,
  EffectPass,
  RenderPass
} from "postprocessing";
import { updateLocalPlayerMovement, setCameraToLocalPlayer } from "./player";

// CONFIG

const FOV = 75;

export let scene = new THREE.Scene();
export let camera = new THREE.PerspectiveCamera(
  FOV,
  window.innerWidth / window.innerHeight
);

let renderer = new THREE.WebGLRenderer();

const composer = new EffectComposer(renderer);

renderer.setSize(window.innerWidth, window.innerHeight);
4;

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);
export let mainCanvas = renderer.domElement;

let sphere = new THREE.Mesh(
  new THREE.SphereGeometry(0.3, 30, 30),
  new THREE.MeshPhongMaterial({ color: 0xff0000 })
);

sphere.castShadow = true; //default is false
sphere.receiveShadow = false; //default

sphere.position.set(0, 0, 1.1);

let cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshPhongMaterial({ color: 0x00ff00 })
);

cube.castShadow = true; //default is false
cube.receiveShadow = true; //default

let floor = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100, 100, 100),

  new THREE.MeshLambertMaterial({ color: 0xffffff, wireframe: false })
);

floor.receiveShadow = true;

var spotLight = new THREE.DirectionalLight(0xffffff, 0.6);
spotLight.position.set(40, 40, 50);
spotLight.castShadow = true;
spotLight.shadow.mapSize.width = 1000;
spotLight.shadow.mapSize.height = 1000;
scene.add(spotLight);

scene.add(new THREE.AmbientLight(0xffffff, 0.3));

// floor.rotation.x = (Math.PI / 2) * -1;

camera.position.set(0, 0, 1);
//camera.rotateX(Math.PI / 2);
// camera.lookAt(floor.position);

scene.add(floor);
scene.add(cube);
scene.add(sphere);

const effectPass = new EffectPass(camera, new BloomEffect({ distinction: 1 }));
effectPass.renderToScreen = true;

// const ambientPass = new EffectPass(camera, new SSAOEffect(camera, new THREE.Texture(0x000000), ));
// ambientPass.renderToScreen = true;

composer.addPass(new RenderPass(scene, camera));
// composer.addPass(ambientPass);
composer.addPass(effectPass);

composer.setSize(window.innerWidth, window.innerHeight);

export let xAxis = new THREE.Vector3(1, 0, 0);
export let yAxis = new THREE.Vector3(0, 1, 0);
export let zAxis = new THREE.Vector3(0, 0, 1);

let lastRenderTime = null;
let animate = () => {
  let now = performance.now();
  let dif = 16.6666666; // estimate
  if (lastRenderTime !== null) dif = now - lastRenderTime;

  updateLocalPlayerMovement(dif);
  setCameraToLocalPlayer();

  composer.render();

  requestAnimationFrame(animate);
  lastRenderTime = now;
};
animate();
