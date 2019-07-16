import * as THREE from "three";
import {
  BloomEffect,
  SSAOEffect,
  EffectComposer,
  EffectPass,
  RenderPass
} from "postprocessing";
import { updateLocalPlayerMovement, setCameraToLocalPlayer } from "./player";
import { initCanvasListeners } from "./input";
import { socket } from "./net";
var MTLLoader = require("three-mtl-loader");

var OBJLoader = require("three-obj-loader");
OBJLoader(THREE);

// CONFIG

const FOV = 70;

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
initCanvasListeners();

let sphere = new THREE.Mesh(
  new THREE.SphereGeometry(0.3, 30, 30),
  new THREE.MeshPhongMaterial({ color: 0xff0000 })
);
Math.PI / 2;
Math.PI / 2;
Math.PI / 2;
Math.PI / 2;
Math.PI / 2;
Math.PI / 2;
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
spotLight.shadow.camera.left = -50;
spotLight.shadow.camera.right = 50;
spotLight.shadow.camera.top = 50;
spotLight.shadow.camera.bottom = -50;
spotLight.shadow.mapSize.width = 5000;
spotLight.shadow.mapSize.height = 5000;
scene.add(spotLight);

scene.add(new THREE.AmbientLight(0xffffff, 0.3));

// floor.rotation.x = (Math.PI / 2) * -1;

let eye;

var mtlLoader = new MTLLoader();
var url = "../media/eye.mtl";
mtlLoader.load(url, function(materials) {
  materials.preload();

  var objLoader = new THREE.OBJLoader();
  objLoader.setMaterials(materials);
  objLoader.load("../media/dennis-high.obj", function(object) {
    object.position.set(0, 1, 1);
    object.castShadow = true;
    object.rotateX(Math.PI / 2);
    object.scale.set(0.01, 0.01, 0.01);
    eye = object;
    scene.add(object);
    object.traverse(function(child) {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
      }
    });
  });
});

socket.addEventListener("message", e => {
  let jsonData = JSON.parse(e.data);
  eye.position.x = jsonData.x;
  eye.position.y = jsonData.y;
  eye.position.z = jsonData.z;
  eye.rotation.z = 0;
  eye.rotation.x = Math.PI / 2;
  eye.rotation.y = 0;
  eye.rotateOnWorldAxis(zAxis, jsonData.yaw + Math.PI / 2);
});

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
