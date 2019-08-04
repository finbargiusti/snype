import * as THREE from "three";
/*
import {
    BloomEffect,
    SSAOEffect,
    EffectComposer,
    EffectPass,
    RenderPass
} from "postprocessing";*/
import { setCameraToLocalPlayer, useWeapon } from "./player";
import { initCanvasListeners } from "./input";
import { gameState } from "./game_state";
import { updateLocalPlayerMovement, zoomInterpolator } from "./movement";
import { Howl, Howler } from "howler";
import { playPop } from "./sound";
import { updateEquippedPowerUps } from "./power_up";

var OBJLoader = require("three-obj-loader");
OBJLoader(THREE);

export const FOV = 70;
export const ZOOM_FOV = 30;

export let xAxis = new THREE.Vector3(1, 0, 0);
export let yAxis = new THREE.Vector3(0, 1, 0);
export let zAxis = new THREE.Vector3(0, 0, 1);

export let mainCanvas = document.querySelector("#root") as HTMLCanvasElement;
initCanvasListeners();

export let camera = new THREE.PerspectiveCamera(
    FOV,
    window.innerWidth / window.innerHeight,
    0.01
);

export let renderer = new THREE.WebGLRenderer({
    canvas: mainCanvas,
    antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
4;
renderer.setClearColor(0x7ec0ee); // Sky color

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

let target_destroyed = new Howl({
    src: ["/static/target-destroyed.ogg"],
    rate: 0.7
});

export let killMessage = () => {
    target_destroyed.play();
};

window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

const crosshair = document.getElementById("crosshair");

let lastRenderTime: number = null;
let render = () => {
    let now = performance.now();
    let timeDif = 1000 / 60; // estimate for first frame
    if (lastRenderTime !== null) timeDif = now - lastRenderTime;

    if (gameState.localPlayer) {
        updateLocalPlayerMovement(timeDif);
        setCameraToLocalPlayer();
        useWeapon();
        updateEquippedPowerUps();
    }

    let zoomVal = zoomInterpolator.getCurrentValue();

    camera.fov = FOV - zoomVal * (FOV - ZOOM_FOV);
    camera.updateProjectionMatrix();
    crosshair.style.transform = `translateX(-50%) translateY(-50%) scale(${zoomVal +
        1})`;

    let currentMap = gameState.currentMap;
    if (currentMap) {
        currentMap.update(timeDif);
        renderer.render(currentMap.scene, camera);
    }

    requestAnimationFrame(render);
    lastRenderTime = now;
};
render();
