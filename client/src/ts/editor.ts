import { inputEventDispatcher } from "./input";
import { mainCanvas, camera, zAxis, yAxis, xAxis } from "./rendering";
import * as THREE from "three";
import { gameState } from "./game_state";

const DIRECTION_ARROW_LENGTH = 1;
const DIRECTION_ARROW_THICKNESS = 0.05;

export function initEditor() {
    (document.querySelector('#crosshair') as HTMLElement).style.display = 'none';
    (document.querySelector('#health') as HTMLElement).style.display = 'none';
    (document.querySelector('#weapon') as HTMLElement).style.display = 'none';

    gameState.currentMap.scene.add(directionArrows);
}

const selectedMaterial = new THREE.MeshBasicMaterial({color: 0xffffff, wireframe: true, depthTest: false});
let directionArrows = createDirectionArrows();
directionArrows.visible = false;

let selectedDrawable: any = null;
let selectedDataObj: any = null;
let wireframeOverlay: any = null;

function createDirectionArrows() {
    let arrowBodyX = new THREE.Mesh(
        new THREE.CylinderBufferGeometry(DIRECTION_ARROW_THICKNESS, DIRECTION_ARROW_THICKNESS, DIRECTION_ARROW_LENGTH, 5, 1),
        new THREE.MeshBasicMaterial({color: 0xff0000, depthTest: false})
    );
    let arrowHeadX = new THREE.Mesh(
        new THREE.ConeBufferGeometry(DIRECTION_ARROW_THICKNESS * 4, DIRECTION_ARROW_LENGTH * 0.5, 10),
        new THREE.MeshBasicMaterial({color: 0xff0000, depthTest: false})
    );
    arrowBodyX.position.x += DIRECTION_ARROW_LENGTH/2;
    arrowBodyX.rotateOnAxis(zAxis, -Math.PI/2);
    arrowHeadX.rotateOnAxis(zAxis, -Math.PI/2);
    arrowHeadX.position.x += DIRECTION_ARROW_LENGTH + DIRECTION_ARROW_LENGTH * 0.5 / 2;

    let arrowBodyY = new THREE.Mesh(
        new THREE.CylinderBufferGeometry(DIRECTION_ARROW_THICKNESS, DIRECTION_ARROW_THICKNESS, DIRECTION_ARROW_LENGTH, 5, 1),
        new THREE.MeshBasicMaterial({color: 0x00ff00, depthTest: false})
    );
    let arrowHeadY = new THREE.Mesh(
        new THREE.ConeBufferGeometry(DIRECTION_ARROW_THICKNESS * 4, DIRECTION_ARROW_LENGTH * 0.5, 10),
        new THREE.MeshBasicMaterial({color: 0x00ff00, depthTest: false})
    );
    arrowBodyY.position.y += DIRECTION_ARROW_LENGTH/2;
    arrowHeadY.position.y += DIRECTION_ARROW_LENGTH + DIRECTION_ARROW_LENGTH * 0.5 / 2;

    let arrowBodyZ = new THREE.Mesh(
        new THREE.CylinderBufferGeometry(DIRECTION_ARROW_THICKNESS, DIRECTION_ARROW_THICKNESS, DIRECTION_ARROW_LENGTH, 5, 1),
        new THREE.MeshBasicMaterial({color: 0x0000ff, depthTest: false})
    );
    let arrowHeadZ = new THREE.Mesh(
        new THREE.ConeBufferGeometry(DIRECTION_ARROW_THICKNESS * 4, DIRECTION_ARROW_LENGTH * 0.5, 10),
        new THREE.MeshBasicMaterial({color: 0x0000ff, depthTest: false})
    );
    arrowBodyZ.position.z += DIRECTION_ARROW_LENGTH/2;
    arrowBodyZ.rotateOnAxis(xAxis, Math.PI/2);
    arrowHeadZ.rotateOnAxis(xAxis, Math.PI/2);
    arrowHeadZ.position.z += DIRECTION_ARROW_LENGTH + DIRECTION_ARROW_LENGTH * 0.5 / 2;

    let group = new THREE.Group();
    group.add(arrowBodyX);
    group.add(arrowHeadX);
    group.add(arrowBodyY);
    group.add(arrowHeadY);
    group.add(arrowBodyZ);
    group.add(arrowHeadZ);

    return group;
}

inputEventDispatcher.addEventListener('mousedown', (e) => {
    let mouseEvent = e as MouseEvent;

    let { currentMap } = gameState;

    if (mouseEvent.button === 2) { // RMB
        mainCanvas.requestPointerLock();
    } else if (mouseEvent.button === 0) { // LMB
        let mouse = new THREE.Vector2();
        let raycaster = new THREE.Raycaster();

        mouse.x = ( mouseEvent.clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( mouseEvent.clientY / window.innerHeight ) * 2 + 1;
        raycaster.setFromCamera(mouse.clone(), camera);

        let objects = raycaster.intersectObjects(currentMap.drawableObjects);

        let firstIndex = objects.findIndex((a) => {
            return a.object !== selectedDrawable && currentMap.objectDataConnection.has(a.object);
        });
        if (firstIndex !== -1) {
            if (selectedDrawable) {
                deselectCurrentlySelected();
            }

            let drawable = objects[firstIndex].object as THREE.Mesh;
            let dataObject = currentMap.objectDataConnection.get(drawable);

            let wf = new THREE.Mesh(drawable.geometry, selectedMaterial);
            wf.applyMatrix(drawable.matrixWorld);

            selectedDrawable = drawable;
            selectedDataObj = dataObject;
            wireframeOverlay = wf;

            currentMap.scene.add(wf);
            directionArrows.visible = true;
            directionArrows.position.copy(drawable.position);
        } else {
            deselectCurrentlySelected();
        }
    }
});

function deselectCurrentlySelected() {
    if (wireframeOverlay) gameState.currentMap.scene.remove(wireframeOverlay);

    selectedDrawable = selectedDataObj = wireframeOverlay = null;
    directionArrows.visible = false;
}

inputEventDispatcher.addEventListener('mouseup', (e) => {
    let mouseEvent = e as MouseEvent;

    if (mouseEvent.button === 2) {
        document.exitPointerLock();
    }
});