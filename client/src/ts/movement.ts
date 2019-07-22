import { gameState } from "./game_state";
import { inputState, inputEventDispatcher } from "./input";
import * as THREE from "three";
import { zAxis } from "./rendering";
import { PLAYER_SPEED_SPRINTING, PLAYER_SPEED, GRAVITY } from "./misc";
import { getNearestDistance } from "./collision";
import { socketSend } from "./net";

export function updateLocalPlayerMovement(dif: number) {
    let { currentMap, localPlayer } = gameState;

    // Create the vector in which the player is wanting move, based on their input.

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

    // Apply the movement vector the position

    let velocCopy = localPlayer.velocity.clone();
    let posCopy = localPlayer.position.clone();
    let actualSpeed = (inputState.shift)? PLAYER_SPEED_SPRINTING : PLAYER_SPEED; // Determine speed based on sprinting status
    posCopy.add(movementVec.clone().multiplyScalar(actualSpeed * (dif / 1000)));

    // The vertical distance the player can just walk over
    let allowedStepHeight = 0.3;

    // Search for any obstructing objects around the player

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
            allowedStepHeight * 1.1
        );
        let intersections = downRay.intersectObject(ting.object);
        let closest = intersections[0];
        if (closest) {
            // If the thing we're walking into isn't very tall, just allow walking into it. Example: Slope.
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

        // Push the player back, based on the face's normal
        point.add(ting.face.normal.clone().multiplyScalar(0.2));

        posCopy.copy(point);
    }

    // Apply gravity. If the player would clip through the floor after gravity application, put them on the floor exactly and reset vertical momentum.
    let yes = new THREE.Vector3(0, 0, -1);
    let anotherPoint = posCopy.clone();
    anotherPoint.z += 0.05;
    let floorIntersection = getNearestDistance(anotherPoint, yes);
    if (floorIntersection) {
        let whereWouldIBeWithGravity = posCopy.z + (velocCopy.z * dif) / 1000;

        if (floorIntersection.point.z >= whereWouldIBeWithGravity) {
            posCopy.z = floorIntersection.point.z;
            velocCopy.z = 0;

            if (inputState.spacebar === true) {
                // Jump.
                velocCopy.z = 8;
            }
        } else {
            posCopy.z += (velocCopy.z * dif) / 1000;
            velocCopy.add(GRAVITY.clone().multiplyScalar(dif / 1000));
        }
    } else {
        posCopy.z += (velocCopy.z * dif) / 1000;
        velocCopy.add(GRAVITY.clone().multiplyScalar(dif / 1000));
    }

    // Nudge up the player if there in something
    let thing = posCopy.clone();
    thing.z += allowedStepHeight;
    let downRay = new THREE.Raycaster(
        thing,
        new THREE.Vector3(0, 0, -1),
        0,
        allowedStepHeight * 1.5
    );
    let intersections = downRay.intersectObjects(currentMap.colliders);
    let closest = intersections[0]; // Name differently?

    if (closest) {
        let dist = allowedStepHeight - closest.distance;
        if (dist <= allowedStepHeight && velocCopy.z <= 0) {
            posCopy.z = closest.point.z;
            velocCopy.z = 0;
        }
    }

    // Don't glitch through the ground, hack.
    if (posCopy.z < 0) posCopy.z = 0;

    // Update the actual vectors.
    localPlayer.update({
        position: { x: posCopy.x, y: posCopy.y, z: posCopy.z },
        velocity: { x: velocCopy.x, y: velocCopy.y, z: velocCopy.z }
    });

    // Yes.
    socketSend("updatePosition", {
        position: { x: posCopy.x, y: posCopy.y, z: posCopy.z }
    });
}

inputEventDispatcher.addEventListener('mousemove', (e) => {
    let mouseEvent = e as MouseEvent;

    if (inputState.pointerLocked === false) return;
    if (!gameState.localPlayer) return;

    let x = mouseEvent.movementX;
    let y = mouseEvent.movementY;

    let localPlayer = gameState.localPlayer;

    localPlayer.yaw += -x / 1000;
    localPlayer.pitch += -y / 1000;
    localPlayer.pitch = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, localPlayer.pitch)
    );
});