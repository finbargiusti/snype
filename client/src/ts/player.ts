import * as THREE from "three";
import { xAxis, zAxis, camera } from "./rendering";
import { GRAVITY } from "./misc";
import { inputState } from "./input";
import { socketSend } from "./net";
import { getNearestDistance } from "./collision";
import { gameState } from "./game_state";

export let players = new Map<string, Player>();

function createPlayerObject3D() {
    let sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 32, 32),
        new THREE.MeshPhongMaterial({ color: 0x00ffff })
    );
    sphere.castShadow = true;
    sphere.receiveShadow = true;

    return sphere;
}

class Player {
    public id: string;
    public position: THREE.Vector3;
    public velocity: THREE.Vector3;
    public yaw: number = 0;
    public pitch: number = 0;
    public object3D: THREE.Object3D;

    constructor(obj: any) {
        let { currentMap } = gameState;

        this.id = obj.id;
        this.position = new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);

        this.object3D = createPlayerObject3D();
        currentMap.scene.add(this.object3D);
    }

    getHeadPosition() {
        let pos = this.position.clone();
        pos.z += 1.65;

        return pos;
    }

    update(obj: any) {
        if (obj.position) {
            this.position.set(obj.position.x, obj.position.y, obj.position.z);
            this.object3D.position.copy(this.getHeadPosition());
        }
        if (obj.velocity) {
            this.velocity.set(obj.velocity.x, obj.velocity.y, obj.velocity.z);
        }
        if (obj.yaw) this.yaw = obj.yaw;
        if (obj.pitch) this.pitch = obj.pitch;
    }

    remove() {
        let { currentMap } = gameState;

        currentMap.scene.remove(this.object3D);
    }
}

export let localPlayerId = Math.random().toString();
export let localPlayer: Player = null;

export function createLocalPlayer() {
    localPlayer = new Player({
        id: localPlayerId
    });
    localPlayer.object3D.visible = false; // Don't render any of the local player, because that'd be stupid.

    players.set(localPlayerId, localPlayer);
}

export function getLocalPlayer() {
    return localPlayer;
}

let playerSpeed = 3; // Units per seconta
let playerSpeedSprinting = 6;

export function setCameraToLocalPlayer() {
    if (!localPlayer) return;

    let headPos = localPlayer.getHeadPosition();
    camera.position.x = headPos.x;
    camera.position.y = headPos.y;
    camera.position.z = headPos.z;

    camera.rotation.x = 0;
    camera.rotation.y = 0;
    camera.rotation.z = 0;
    camera.rotateOnWorldAxis(xAxis, Math.PI / 2);
    camera.rotateOnWorldAxis(xAxis, localPlayer.pitch);
    camera.rotateOnWorldAxis(zAxis, localPlayer.yaw);
}

export function updateLocalPlayerMovement(dif: number) {
    let { currentMap } = gameState;

    let movementVec = new THREE.Vector3(0, 0, 0);
    if (inputState.forwards) {
        movementVec.y += 1;
    }
    if (inputState.backwards) {
        movementVec.y -= 1;
    }
    if (inputState.left) {
        movementVec.x -= 1;
    }
    if (inputState.right) {
        movementVec.x += 1;
    }
    movementVec.normalize();
    movementVec.applyAxisAngle(zAxis, localPlayer.yaw);

    let velocCopy = localPlayer.velocity.clone();
    let posCopy = localPlayer.position.clone();
    let actualSpeed = (inputState.shift)? playerSpeedSprinting : playerSpeed; // Determine speed based on sprinting status
    posCopy.add(movementVec.clone().multiplyScalar(actualSpeed * (dif / 1000)));

    let allowedStepHeight = 0.3;

    let ting = getNearestDistance(posCopy);
    preventer: if (ting && ting.distance <= 0.2) {
        let point = ting.point;
        let dist = point.clone().sub(posCopy);

        dist.multiplyScalar(1.01);
        let inTheThing = posCopy.clone().add(dist);
        inTheThing.z += allowedStepHeight;
        let downRay = new THREE.Raycaster(
            inTheThing,
            new THREE.Vector3(0, 0, -1),
            0,
            allowedStepHeight
        );
        let intersections = downRay.intersectObject(ting.object);
        let closest = intersections[0];
        if (closest) {
            let dist = allowedStepHeight - closest.distance;
            if (dist <= allowedStepHeight) {
                break preventer;
            }
        }

        // Cheaky-ass workaround
        if (
            ting.face.normal.z > ting.face.normal.x &&
            ting.face.normal.z > ting.face.normal.y
        )
            break preventer;

        point.add(ting.face.normal.clone().multiplyScalar(0.2));

        posCopy.copy(point);
    }

    let yes = new THREE.Vector3(0, 0, -1);
    let anotherPoint = posCopy.clone();
    anotherPoint.z += 0.05;
    let floorIntersection = getNearestDistance(anotherPoint, yes);
    outer: if (floorIntersection) {
        let whereWouldIBeWithGravity = posCopy.z + (velocCopy.z * dif) / 1000;

        if (floorIntersection.point.z >= whereWouldIBeWithGravity) {
            posCopy.z = floorIntersection.point.z;
            velocCopy.z = 0;
        } else {
            posCopy.z += (velocCopy.z * dif) / 1000;
            velocCopy.add(GRAVITY.clone().multiplyScalar(dif / 1000));
        }
    } else {
        posCopy.z += (velocCopy.z * dif) / 1000;
        velocCopy.add(GRAVITY.clone().multiplyScalar(dif / 1000));
    }

    let thing = posCopy.clone();
    thing.z += allowedStepHeight;
    let downRay = new THREE.Raycaster(
        thing,
        new THREE.Vector3(0, 0, -1),
        0,
        allowedStepHeight
    );
    let intersections = downRay.intersectObjects(currentMap.colliders);
    let closest = intersections[0]; // Name differently?
    if (closest) {
        let dist = allowedStepHeight - closest.distance;
        if (dist <= allowedStepHeight) {
            posCopy.z = closest.point.z;
            velocCopy.z = 0;
        }
    }

    if (posCopy.z < 0) posCopy.z = 0; // Don't glitch through the ground, hack.

    localPlayer.update({
        position: { x: posCopy.x, y: posCopy.y, z: posCopy.z },
        velocity: { x: velocCopy.x, y: velocCopy.y, z: velocCopy.z }
    });

    socketSend("updatePosition", {
        position: { x: posCopy.x, y: posCopy.y, z: posCopy.z }
    });
}

export function isGrounded() {
    let yes = new THREE.Vector3(0, 0, -1);
    let point = localPlayer.position.clone();
    point.z += 0.05;
    let floorIntersection = getNearestDistance(point, yes);

    return floorIntersection && floorIntersection.distance <= 0.055;
}

export function updatePlayer(obj: any) {
    let player = players.get(obj.id);
    if (!player) return;

    player.update(obj);
}

export function addPlayer(obj: any) {
    let newPlayer = new Player({ id: obj.id });
    players.set(obj.id, newPlayer);
    updatePlayer(obj);
}

export function removePlayer(obj: any) {
    let player = players.get(obj.id);
    if (player) {
        player.remove();

        players.delete(player.id);
    }
}
