import * as THREE from "three";
import {
    BloomEffect,
    SSAOEffect,
    EffectComposer,
    EffectPass,
    RenderPass
} from "postprocessing";
import {
    updateLocalPlayerMovement,
    setCameraToLocalPlayer,
    createLocalPlayer,
    getLocalPlayer
} from "./player";
import { initCanvasListeners } from "./input";
import { socket } from "./net";
import { loadMap } from "./map-load";
var MTLLoader = require("three-mtl-loader");
import { parse } from "./smfparser";
import { gameState } from "./game_state";

var OBJLoader = require("three-obj-loader");
OBJLoader(THREE);

// CONFIG

const FOV = 70;

export let scene = new THREE.Scene();
export let camera = new THREE.PerspectiveCamera(
    FOV,
    window.innerWidth / window.innerHeight,
    0.01
);

let renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById("root") as HTMLCanvasElement
});

const composer = new EffectComposer(renderer);

renderer.setSize(window.innerWidth, window.innerHeight);
4;

renderer.setClearColor(0x7ec0ee);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);
export let mainCanvas = renderer.domElement;
initCanvasListeners();

camera.position.set(0, 0, 1);

const effectPass = new EffectPass(
    camera,
    new BloomEffect({ distinction: 10000 })
);
effectPass.renderToScreen = true;

// const ambientPass = new EffectPass(camera, new SSAOEffect(camera, new THREE.Texture(0x000000), ));
// ambientPass.renderToScreen = true;

let renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
// composer.addPass(ambientPass);
composer.addPass(effectPass);

composer.setSize(window.innerWidth, window.innerHeight);

export let xAxis = new THREE.Vector3(1, 0, 0);
export let yAxis = new THREE.Vector3(0, 1, 0);
export let zAxis = new THREE.Vector3(0, 0, 1);

let lastRenderTime: number = null;

let animate = () => {
    let currentMap = gameState.currentMap;
    if (currentMap) {
        renderPass.scene = currentMap.scene;
    }
    
    let now = performance.now();
    let dif = 16.6666666; // estimate
    if (lastRenderTime !== null) dif = now - lastRenderTime;

    if (getLocalPlayer()) {
        updateLocalPlayerMovement(dif);
        setCameraToLocalPlayer();
    }

    composer.render();

    requestAnimationFrame(animate);
    lastRenderTime = now;
};
animate();
