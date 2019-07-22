import * as THREE from "three";
/*
import {
    BloomEffect,
    SSAOEffect,
    EffectComposer,
    EffectPass,
    RenderPass
} from "postprocessing";*/
import {
    setCameraToLocalPlayer,
} from "./player";
import { initCanvasListeners } from "./input";
import { gameState } from "./game_state";
import { updateLocalPlayerMovement } from "./movement";

var OBJLoader = require("three-obj-loader");
OBJLoader(THREE);

const FOV = 70;

export let xAxis = new THREE.Vector3(1, 0, 0);
export let yAxis = new THREE.Vector3(0, 1, 0);
export let zAxis = new THREE.Vector3(0, 0, 1);

export let mainCanvas = document.querySelector('#root') as HTMLCanvasElement;
initCanvasListeners();

export let camera = new THREE.PerspectiveCamera(
    FOV,
    window.innerWidth / window.innerHeight,
    0.01
);

let renderer = new THREE.WebGLRenderer({
    canvas: mainCanvas
});

renderer.setSize(window.innerWidth, window.innerHeight);
4;
renderer.setClearColor(0x7ec0ee); // Sky color

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
    //renderer.setSize(window.innerWidth, window.innerHeight);
});

let lastRenderTime: number = null;
let render = () => {    
    let now = performance.now();
    let dif = 1000 / 60; // estimate for first frame
    if (lastRenderTime !== null) dif = now - lastRenderTime;

    if (gameState.localPlayer) {
        updateLocalPlayerMovement(dif);
        setCameraToLocalPlayer();
    }

    let currentMap = gameState.currentMap;
    if (currentMap) {
        renderer.render(currentMap.scene, camera);
    }

    requestAnimationFrame(render);
    lastRenderTime = now;
};
render();
