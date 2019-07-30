import { inputEventDispatcher, inputState } from "./input";
import { mainCanvas, camera, zAxis, yAxis, xAxis } from "./rendering";
import * as THREE from "three";
import { gameState } from "./game_state";
import { createBoxGeometry, createRampGeometry } from "./map";
import { copyTextToClipboard } from "./misc";

const DIRECTION_ARROW_LENGTH = 1;
const DIRECTION_ARROW_THICKNESS = 0.05;

export function initEditor() {
    (document.querySelector('#crosshair') as HTMLElement).style.display = 'none';
    (document.querySelector('#health') as HTMLElement).style.display = 'none';
    (document.querySelector('#weapon') as HTMLElement).style.display = 'none';

    gameState.currentMap.scene.add(directionArrows.group);
    gameState.localPlayer.object3D.visible = false;

    (document.querySelector('#editorOverlay') as HTMLElement).style.display = "block";

    initGridContainer();
    updateArrowAction(currentArrowAction);
}

const selectedMaterial = new THREE.MeshBasicMaterial({color: 0xffffff, wireframe: true, depthTest: false});

const arrowXBase = new THREE.MeshBasicMaterial({color: 0xff0000, depthTest: false});
const arrowXHovered = new THREE.MeshBasicMaterial({color: 0xff8888, depthTest: false});
const arrowYBase = new THREE.MeshBasicMaterial({color: 0x00ff00, depthTest: false});
const arrowYHovered = new THREE.MeshBasicMaterial({color: 0xaaffaa, depthTest: false});
const arrowZBase = new THREE.MeshBasicMaterial({color: 0x0000ff, depthTest: false});
const arrowZHovered = new THREE.MeshBasicMaterial({color: 0x8888ff, depthTest: false});

class DirectionArrows {
    public group: THREE.Group;
    public bodies: THREE.Mesh[];
    public heads: THREE.Mesh[];
    public hitboxes: THREE.Mesh[];
    public hovered: string = null;
    public coneGeom: THREE.ConeBufferGeometry;
    public ballGeom: THREE.SphereBufferGeometry;

    constructor() {
        this.coneGeom = new THREE.ConeBufferGeometry(DIRECTION_ARROW_THICKNESS * 4, DIRECTION_ARROW_LENGTH * 0.5, 10);
        this.ballGeom = new THREE.SphereBufferGeometry(DIRECTION_ARROW_THICKNESS * 4, 16, 16);

        let arrowBodyX = new THREE.Mesh(
            new THREE.CylinderBufferGeometry(DIRECTION_ARROW_THICKNESS, DIRECTION_ARROW_THICKNESS, DIRECTION_ARROW_LENGTH, 5, 1),
            arrowXBase
        );
        let arrowHeadX = new THREE.Mesh(
            this.coneGeom,
            arrowXBase
        );
        let xHitbox = new THREE.Mesh(
            new THREE.CylinderBufferGeometry(DIRECTION_ARROW_THICKNESS * 4, DIRECTION_ARROW_THICKNESS * 4, DIRECTION_ARROW_LENGTH * 1.5, 8, 1),
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                depthTest: false,
                wireframe: true,
                alphaTest: 0,
                visible: false
            })
        );
        arrowBodyX.position.x += DIRECTION_ARROW_LENGTH/2;
        arrowBodyX.rotateOnAxis(zAxis, -Math.PI/2);
        arrowHeadX.rotateOnAxis(zAxis, -Math.PI/2);
        arrowHeadX.position.x += DIRECTION_ARROW_LENGTH + DIRECTION_ARROW_LENGTH * 0.5 / 2;
        xHitbox.position.x += (DIRECTION_ARROW_LENGTH*1.5)/2;
        xHitbox.rotateOnAxis(zAxis, -Math.PI/2);
    
        let arrowBodyY = new THREE.Mesh(
            new THREE.CylinderBufferGeometry(DIRECTION_ARROW_THICKNESS, DIRECTION_ARROW_THICKNESS, DIRECTION_ARROW_LENGTH, 5, 1),
            arrowYBase
        );
        let arrowHeadY = new THREE.Mesh(
            this.coneGeom,
            arrowYBase
        );
        let yHitbox = new THREE.Mesh(
            new THREE.CylinderBufferGeometry(DIRECTION_ARROW_THICKNESS * 4, DIRECTION_ARROW_THICKNESS * 4, DIRECTION_ARROW_LENGTH * 1.5, 8, 1),
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                depthTest: false,
                wireframe: true,
                alphaTest: 0,
                visible: false
            })
        );
        arrowBodyY.position.y += DIRECTION_ARROW_LENGTH/2;
        arrowHeadY.position.y += DIRECTION_ARROW_LENGTH + DIRECTION_ARROW_LENGTH * 0.5 / 2;
        yHitbox.position.y += (DIRECTION_ARROW_LENGTH * 1.5)/2;
    
        let arrowBodyZ = new THREE.Mesh(
            new THREE.CylinderBufferGeometry(DIRECTION_ARROW_THICKNESS, DIRECTION_ARROW_THICKNESS, DIRECTION_ARROW_LENGTH, 5, 1),
            arrowZBase
        );
        let arrowHeadZ = new THREE.Mesh(
            this.coneGeom,
            arrowZBase
        );
        let zHitbox = new THREE.Mesh(
            new THREE.CylinderBufferGeometry(DIRECTION_ARROW_THICKNESS * 4, DIRECTION_ARROW_THICKNESS * 4, DIRECTION_ARROW_LENGTH * 1.5, 8, 1),
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                depthTest: false,
                wireframe: true,
                alphaTest: 0,
                visible: false
            })
        );
        arrowBodyZ.position.z += DIRECTION_ARROW_LENGTH/2;
        arrowBodyZ.rotateOnAxis(xAxis, Math.PI/2);
        arrowHeadZ.rotateOnAxis(xAxis, Math.PI/2);
        arrowHeadZ.position.z += DIRECTION_ARROW_LENGTH + DIRECTION_ARROW_LENGTH * 0.5 / 2;
        zHitbox.rotateOnAxis(xAxis, Math.PI/2);
        zHitbox.position.z += (DIRECTION_ARROW_LENGTH * 1.5)/2;
    
        let group = new THREE.Group();
    
        group.add(arrowBodyX);
        group.add(arrowHeadX);
        group.add(xHitbox);
    
        group.add(arrowBodyY);
        group.add(arrowHeadY);
        group.add(yHitbox);
    
        group.add(arrowBodyZ);
        group.add(arrowHeadZ);
        group.add(zHitbox);

        this.bodies = [arrowBodyX, arrowBodyY, arrowBodyZ];
        this.heads = [arrowHeadX, arrowHeadY, arrowHeadZ];
        this.hitboxes = [xHitbox, yHitbox, zHitbox];

        this.group = group;
        this.hide();
    }

    show(where?: THREE.Vector3) {
        this.group.visible = true;

        if (where) {
            this.group.position.copy(where);
        }
    }

    hide() {
        this.group.visible = false;
        this.hovered = null;
    }

    raytest(e: MouseEvent) {
        let mouse = new THREE.Vector2();
        let raycaster = new THREE.Raycaster();

        mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;
        raycaster.setFromCamera(mouse.clone(), camera);

        let objects = raycaster.intersectObjects(this.hitboxes);

        this.bodies[0].material = this.heads[0].material = arrowXBase;
        this.bodies[1].material = this.heads[1].material = arrowYBase;
        this.bodies[2].material = this.heads[2].material = arrowZBase;
        this.hovered = null;

        if (objects.length > 0) {
            if (objects[0].object === this.hitboxes[0]) this.hovered = "x";
            else if (objects[0].object === this.hitboxes[1]) this.hovered = "y";
            else if (objects[0].object === this.hitboxes[2]) this.hovered = "z";

            if (this.hovered === "x") {
                this.bodies[0].material = this.heads[0].material = arrowXHovered;
            }
            if (this.hovered === "y") {
                this.bodies[1].material = this.heads[1].material = arrowYHovered;
            }
            if (this.hovered === "z") {
                this.bodies[2].material = this.heads[2].material = arrowZHovered;
            }
        }
    }

    summonDemCones() {
        for (let yes of this.heads) {
            yes.geometry = this.coneGeom;
        }
    }

    summonDemBalls() {
        for (let yes of this.heads) {
            yes.geometry = this.ballGeom;
        }
    }
}

let directionArrows = new DirectionArrows();

let selectedDrawable: any = null;
let selectedDataObj: any = null;
let wireframeOverlay: any = null;

inputEventDispatcher.addEventListener('canvasmousedown', (e) => {
    if (!gameState.isEditor) return;

    let mouseEvent = e as MouseEvent;

    let { currentMap } = gameState;

    if (mouseEvent.button === 2) { // RMB
        mainCanvas.requestPointerLock();
    } else if (mouseEvent.button === 0) { // LMB
        outer:
        if (directionArrows.hovered) {
            // Shitty me not knpwing how to fix a bug 
            if (!selectedDrawable) {
                directionArrows.hide();
                break outer;
            }

            startDrag();
            return;
        }

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
            selectThing(objects[firstIndex].object as THREE.Mesh);
        } else {
            deselectCurrentlySelected();
        }
    }
});

function selectThing(drawable: THREE.Mesh) {
    if (selectedDrawable) {
        deselectCurrentlySelected();
    }

    let dataObject = gameState.currentMap.objectDataConnection.get(drawable);

    let wf = new THREE.Mesh(drawable.geometry, selectedMaterial);
    drawable.updateMatrixWorld();
    wf.applyMatrix(drawable.matrixWorld);

    selectedDrawable = drawable;
    selectedDataObj = dataObject;
    wireframeOverlay = wf;

    gameState.currentMap.scene.add(wf);
    directionArrows.show(drawable.position);
    showObjectProperties(selectedDataObj);
}

let snapToGrid = true;
let gridSize = 1.0;
let dragStart: THREE.Vector3 = null;
let objPosAtDragStart: THREE.Vector3 = null;
let objSizeAtDragStart: THREE.Vector3 = null;

function startDrag() {
    dragStart = getPositionOnDirectionArrow();
    objPosAtDragStart = new THREE.Vector3(selectedDataObj.position.x, selectedDataObj.position.y, selectedDataObj.position.z);
    objSizeAtDragStart = new THREE.Vector3(selectedDataObj.size.x, selectedDataObj.size.y, selectedDataObj.size.z);
    (document.querySelector('#editorOverlay') as HTMLElement).style.userSelect = "none";
}

function getPositionOnDirectionArrow() {
    let firstPlane: THREE.Plane;
    let horizontalLookVector = new THREE.Vector3(0, 1, 0);
    horizontalLookVector.applyAxisAngle(zAxis, gameState.localPlayer.yaw);

    let secondPlane: THREE.Plane;

    if (directionArrows.hovered === "z") {
        let helper = new THREE.Plane(horizontalLookVector, 0);
        let dist = helper.distanceToPoint(directionArrows.group.position);

        firstPlane = new THREE.Plane(horizontalLookVector, -dist); // The z axis arrow now lies within this plane
    } else {
        firstPlane = new THREE.Plane(zAxis, -directionArrows.group.position.z);
    }

    if (directionArrows.hovered === "x") {
        secondPlane = new THREE.Plane(yAxis, -directionArrows.group.position.y);
    } else if (directionArrows.hovered === "y") {
        secondPlane = new THREE.Plane(xAxis, -directionArrows.group.position.x);
    } else if (directionArrows.hovered === "z") {
        let newNormal = firstPlane.normal.clone().applyAxisAngle(zAxis, Math.PI/2);
        let helper = new THREE.Plane(newNormal, 0);
        let dist = helper.distanceToPoint(directionArrows.group.position);

        secondPlane = new THREE.Plane(newNormal, -dist);
    }

    let mouse = new THREE.Vector2();
    let raycaster = new THREE.Raycaster();

    mouse.x = ( inputState.mouseX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( inputState.mouseY / window.innerHeight ) * 2 + 1;
    raycaster.setFromCamera(mouse.clone(), camera);

    let intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(firstPlane, intersection);

    let projected = new THREE.Vector3();
    secondPlane.projectPoint(intersection, projected);

    return projected;
}

function deselectCurrentlySelected() {
    if (wireframeOverlay) gameState.currentMap.scene.remove(wireframeOverlay);

    selectedDrawable = selectedDataObj = wireframeOverlay = null;
    directionArrows.hide();
    dragStart = null;
    objPosAtDragStart = null;
    objectPropertiesContainer.style.display = "none";
}

inputEventDispatcher.addEventListener('mouseup', (e) => {
    if (!gameState.isEditor) return;

    let mouseEvent = e as MouseEvent;

    if (mouseEvent.button === 2) {
        document.exitPointerLock();
    } else if (mouseEvent.button === 0) {
        dragStart = null;
        (document.querySelector('#editorOverlay') as HTMLElement).style.userSelect = "";
    }
});

function changeSelectionPosition(v: THREE.Vector3) {
    if (!selectedDataObj) return;
    
    selectedDataObj.position = {x: v.x, y: v.y, z: v.z};

    let visualCenter = getVisualCenterForObj(selectedDataObj);
    selectedDrawable.position.copy(visualCenter);
    wireframeOverlay.position.copy(visualCenter);
    directionArrows.group.position.copy(visualCenter);
    showObjectProperties(selectedDataObj);
}

function changeSelectionSize(dx: number, dy: number, dz: number) {
    if (!selectedDataObj) return;

    selectedDataObj.size.x = dx;
    selectedDataObj.size.y = dy;
    selectedDataObj.size.z = dz;

    let newGeometry: THREE.Geometry;
    if (selectedDataObj.type === "box") {
        newGeometry = createBoxGeometry(selectedDataObj);
    } else if (selectedDataObj.type === "ramp") {
        newGeometry = createRampGeometry(selectedDataObj);
    }

    selectedDrawable.geometry = newGeometry;
    wireframeOverlay.geometry = newGeometry;

    let visualCenter = getVisualCenterForObj(selectedDataObj);
    selectedDrawable.position.copy(visualCenter);
    wireframeOverlay.position.copy(visualCenter);
    directionArrows.group.position.copy(visualCenter);
    showObjectProperties(selectedDataObj);
}

function getVisualCenterForObj(obj: any) {
    return new THREE.Vector3(
        obj.position.x + obj.size.x / 2,
        obj.position.y + obj.size.y / 2,
        obj.position.z + obj.size.z / 2
    );
}

inputEventDispatcher.addEventListener('mousemove', (e) => {
    if (!gameState.isEditor) return;

    let mouseEvent = e as MouseEvent;

    if (dragStart) {
        let posNow = getPositionOnDirectionArrow();

        let dist: number;
        if (directionArrows.hovered === "x") dist = posNow.x - dragStart.x;
        if (directionArrows.hovered === "y") dist = posNow.y - dragStart.y;
        if (directionArrows.hovered === "z") dist = posNow.z - dragStart.z;

        if (currentArrowAction === "translate") {
            let vec: THREE.Vector3;
            if (directionArrows.hovered === "x") {
                vec = new THREE.Vector3(dist, 0, 0);
            } else if (directionArrows.hovered === "y") {
                vec = new THREE.Vector3(0, dist, 0);
            } else if (directionArrows.hovered === "z") {
                vec = new THREE.Vector3(0, 0, dist);
            }

            let newPos = objPosAtDragStart.clone().add(vec);
            if (snapToGrid) {
                // Bitchass code ahead:
                if (directionArrows.hovered === "x") {
                    newPos.x = newPos.x - (newPos.x % gridSize);
                } else if (directionArrows.hovered === "y") {
                    newPos.y = newPos.y - (newPos.y % gridSize);
                } else if (directionArrows.hovered === "z") {
                    newPos.z = newPos.z - (newPos.z % gridSize);
                }
            }

            changeSelectionPosition(newPos);
        } else {
            // Scaling

            let newScale: number;
            if (directionArrows.hovered === "x") {
                newScale = objSizeAtDragStart.x + dist;
            } else if (directionArrows.hovered === "y") {
                newScale = objSizeAtDragStart.y + dist;
            } else if (directionArrows.hovered === "z") {
                newScale = objSizeAtDragStart.z + dist;
            }

            if (snapToGrid) newScale = newScale - (newScale % gridSize);
            if (newScale < 0.01) newScale = 0.01;

            if (directionArrows.hovered === "x") {
                selectedDataObj.size.x = newScale;
            } else if (directionArrows.hovered === "y") {
                selectedDataObj.size.y = newScale;
            } else if (directionArrows.hovered === "z") {
                selectedDataObj.size.z = newScale;
            }

            changeSelectionSize(selectedDataObj.size.x, selectedDataObj.size.y, selectedDataObj.size.z);
        }
    } else {
        directionArrows.raytest(mouseEvent);
    } 
});

let snapToGridButton = document.querySelector('#snapToGrid') as HTMLInputElement;
let gridSizeInput = document.querySelector('#gridSize') as HTMLInputElement;

function initGridContainer() {
    updateGridContainer();
    
    snapToGridButton.addEventListener('change', () => {
        snapToGrid = snapToGridButton.checked;
        updateGridContainer();
    });
    gridSizeInput.addEventListener('change', () => {
        gridSize = Number(gridSizeInput.value);
        updateGridContainer();
    });
}

function updateGridContainer() {
    snapToGridButton.checked = snapToGrid;
    gridSizeInput.value = gridSize.toFixed(3);
}

let objectPropertiesContainer = document.querySelector('#objectProperties') as HTMLElement;
objectPropertiesContainer.style.display = "none";

function showObjectProperties(obj: any) {
    objectPropertiesContainer.style.display = "block";

    let innerDiv = objectPropertiesContainer.querySelector(':scope > div') as HTMLElement;
    innerDiv.innerHTML = "";

    if (obj.type === "box" || obj.type === "ramp") {
        let x = createInputElement("Position x", (val: any) => {
            if (!selectedDataObj) return;
            obj.position.x = Number(val);
            changeSelectionPosition(new THREE.Vector3(obj.position.x, obj.position.y, obj.position.z));
        }, obj.position.x);
        let y = createInputElement("Position y", (val: any) => {
            if (!selectedDataObj) return;
            obj.position.y = Number(val);
            changeSelectionPosition(new THREE.Vector3(obj.position.x, obj.position.y, obj.position.z));
        }, obj.position.y);
        let z = createInputElement("Position z", (val: any) => {
            if (!selectedDataObj) return;
            obj.position.z = Number(val);
            changeSelectionPosition(new THREE.Vector3(obj.position.x, obj.position.y, obj.position.z));
        }, obj.position.z);

        let dx = createInputElement("Size x", (val: any) => {
            if (!selectedDataObj) return;
            obj.size.x = Number(val);
            changeSelectionSize(obj.size.x, obj.size.y, obj.size.z);
        }, obj.size.x);
        let dy = createInputElement("Size y", (val: any) => {
            if (!selectedDataObj) return;
            obj.size.y = Number(val);
            changeSelectionSize(obj.size.x, obj.size.y, obj.size.z);
        }, obj.size.y);
        let dz = createInputElement("Size z", (val: any) => {
            if (!selectedDataObj) return;
            obj.size.z = Number(val);
            changeSelectionSize(obj.size.x, obj.size.y, obj.size.z);
        }, obj.size.z);

        innerDiv.appendChild(x);
        innerDiv.appendChild(y);
        innerDiv.appendChild(z);
        innerDiv.appendChild(dx);
        innerDiv.appendChild(dy);
        innerDiv.appendChild(dz);

        let color = createInputElement("Color", (val: any) => {
            if (!selectedDataObj) return;
            obj.options.color = Number(val);
            selectedDrawable.material.color = new THREE.Color(obj.options.color);
        }, obj.options.color && "0x" + obj.options.color.toString(16));

        innerDiv.appendChild(color);

        if (obj.type === "ramp") {
            let rotateBtn = createButtonElement("Reorient", () => {
                switch (obj.orientation) {
                    case "+x": { obj.orientation = "-y"; }; break;
                    case "-y": { obj.orientation = "-x"; }; break;
                    case "-x": { obj.orientation = "+y"; }; break;
                    case "+y": { obj.orientation = "+x"; }; break;
                }

                selectedDrawable.geometry = createRampGeometry(obj);
            });

            innerDiv.appendChild(rotateBtn);
        }
    }
}

function createInputElement(name: string, onchange: Function, value: any = "") {
    let outer = document.createElement("div");
    outer.classList.add("editorProperty");
    let title = document.createElement("h4");
    title.textContent = name;
    let input = document.createElement("input");
    input.value = value;

    input.addEventListener('change', () => {
        onchange(input.value);
    });

    outer.appendChild(title);
    outer.appendChild(input);

    return outer;
}

function createButtonElement(name: string, onclick: Function) {
    let outer = document.createElement("div");
    outer.classList.add("editorProperty");
    let title = document.createElement("h4");
    title.textContent = name;
    let input = document.createElement("button");
    input.innerHTML = name;

    input.addEventListener('click', () => {
        onclick();
    });

    outer.appendChild(title);
    outer.appendChild(input);

    return outer;
}

let currentArrowAction: "translate" | "scale" = "translate";

let arrowActionDisplay = document.querySelector('#arrowActionDisplay') as HTMLElement;
let arrowActionTranslateBtn = document.querySelector('#arrowActionTranslate') as HTMLElement;
let arrowActionScaleBtn = document.querySelector('#arrowActionScale') as HTMLElement;

function updateArrowAction(newAction: "translate" | "scale") {
    currentArrowAction = newAction;

    arrowActionDisplay.textContent = currentArrowAction.toUpperCase();

    if (currentArrowAction === "translate") {
        directionArrows.summonDemCones();
    } else {
        directionArrows.summonDemBalls();
    }
}

arrowActionTranslateBtn.addEventListener('click', () => updateArrowAction("translate"));
arrowActionScaleBtn.addEventListener('click', () => updateArrowAction("scale"));

inputEventDispatcher.addEventListener('keypress', (e) => {
    let keyEvent = e as KeyboardEvent;

    if (document.activeElement !== document.body) return;

    if (keyEvent.keyCode === 8) {
        if (selectedDataObj) {
            let allowed = confirm("Are you sure that you want to delete this object?");

            if (allowed) {
                let index = gameState.currentMap.rawData.objects.indexOf(selectedDataObj);

                if (index !== -1) {
                    gameState.currentMap.rawData.objects.splice(index, 1);
                    gameState.currentMap.scene.remove(selectedDrawable);
                    gameState.currentMap.drawableObjects.splice(gameState.currentMap.drawableObjects.indexOf(selectedDrawable), 1);

                    deselectCurrentlySelected();
                }
            }
        }
    }
});

let addBoxButton = document.querySelector('#addBox') as HTMLElement;
let addRampButton = document.querySelector('#addRamp') as HTMLElement;
addBoxButton.addEventListener('click', () => {
    let lookyLookyVector = gameState.localPlayer.getOrientationVector();
    let newPos = gameState.localPlayer.getHeadPosition().clone();
    newPos.add(lookyLookyVector.multiplyScalar(2));

    if (snapToGrid) {
        newPos.x = newPos.x - newPos.x % gridSize;
        newPos.y = newPos.y - newPos.y % gridSize;
        newPos.z = newPos.z - newPos.z % gridSize;
    }

    let obj = {
        type: "box",
        position: {x: newPos.x, y: newPos.y, z: newPos.z},
        size: {x: 1, y: 1, z: 1},
        options: {color: 0xffffff}
    };

    gameState.currentMap.rawData.objects.push(obj);
    let { drawable } = gameState.currentMap.createBox(obj);
    gameState.currentMap.scene.add(drawable);

    selectThing(drawable);
});
addRampButton.addEventListener('click', () => {
    let lookyLookyVector = gameState.localPlayer.getOrientationVector();
    let newPos = gameState.localPlayer.getHeadPosition().clone();
    newPos.add(lookyLookyVector.multiplyScalar(2));

    if (snapToGrid) {
        newPos.x = newPos.x - newPos.x % gridSize;
        newPos.y = newPos.y - newPos.y % gridSize;
        newPos.z = newPos.z - newPos.z % gridSize;
    }

    let obj = {
        type: "ramp",
        position: {x: newPos.x, y: newPos.y, z: newPos.z},
        size: {x: 1, y: 1, z: 1},
        options: {color: 0xffffff},
        orientation: "+y"
    };

    gameState.currentMap.rawData.objects.push(obj);
    let { drawable } = gameState.currentMap.createRamp(obj);
    gameState.currentMap.scene.add(drawable);

    selectThing(drawable);
});

let generateSmfButton = document.querySelector('#generateSmf') as HTMLElement;
generateSmfButton.addEventListener('click', () => {
    console.log(gameState.currentMap.stringify());
});

let copySmfButton = document.querySelector('#copySmf') as HTMLElement;
copySmfButton.addEventListener('click', () => {
    copyTextToClipboard(gameState.currentMap.stringify());
});