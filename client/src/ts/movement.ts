import { gameState } from "./game_state";
import { inputState, inputEventDispatcher } from "./input";
import * as THREE from "three";
import { zAxis, xAxis, camera } from "./rendering";
import { PLAYER_SPEED_SPRINTING, PLAYER_SPEED, GRAVITY, clamp } from "./misc";
import { socketSend } from "./net";
import { Vector3 } from "three";
import { Interpolator, EaseType } from "./animate";

const JUMP_INTENSITY = 8;

let jumpVelocity = new THREE.Vector3(0, 0, 0);

let movementSpeedFactor = 1;
export function setMovementSpeedFactor(num: number) {
    movementSpeedFactor = num;
}

let gravityFactor = 1;
export function setGravityFactor(num: number) {
    gravityFactor = num;
}

let jumpFactor = 1;
export function setJumpFactor(num: number) {
    jumpFactor = num;
}

inputEventDispatcher.addEventListener("canvasmousedown", e => {
    let localPlayer = gameState.localPlayer;
    if (!localPlayer) return;

    let mousevent = e as MouseEvent;

    if (mousevent.button == 2 && !gameState.isEditor) {
        localPlayer.setScopeState(!localPlayer.isScoped);

        socketSend("setScopeState", localPlayer.isScoped);
    }
});

// These values describe the player's collision model:
export let playerRadius = 0.225;
export let playerHeight = 1.8;
export let legHeight = 0.3;

export function updateLocalPlayerMovement(dif: number) {
    let { currentMap, localPlayer, isEditor } = gameState;

    dif = Math.min(1000 / 30, dif); // MINIMUM TIMESTEP: 1/30s

    if (isEditor) {
        updateEditorMovement(dif);
        return;
    }

    let posCopy = localPlayer.position.clone();
    let velCopy = localPlayer.velocity.clone();

    let actualSpeed: number;

    if (localPlayer.isScoped) {
        actualSpeed = PLAYER_SPEED / 2;
    } else {
        actualSpeed = inputState.shift ? PLAYER_SPEED_SPRINTING : PLAYER_SPEED; // Determine speed based on sprinting status
    }
    actualSpeed *= movementSpeedFactor;

    // Build a vector coplanar to the x-y axis based on current player movement input:

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

    // Apply that movement vector based on if the player is grounded or not:

    if (localPlayer.isGrounded) {
        jumpVelocity.set(0, 0, 0);

        velCopy.x = movementVec.x * actualSpeed;
        velCopy.y = movementVec.y * actualSpeed;

        if (inputState.spacebar) {
            velCopy.z = JUMP_INTENSITY * jumpFactor;
        }
    } else {
        velCopy.x = movementVec.x * actualSpeed;
        velCopy.y = movementVec.y * actualSpeed;

        // TEMP: Fix this:
        /*
        let scaledX = movementVec.x * actualSpeed,
            scaledY = movementVec.y * actualSpeed;

        if (jumpVelocity.x == 0 && jumpVelocity.y == 0) {
            jumpVelocity.set(scaledX, scaledY, 0);
        }

        let newJump = jumpVelocity.clone();
        newJump.set(0, Math.hypot(newJump.x, newJump.y), 0);
        newJump.applyAxisAngle(zAxis, localPlayer.yaw);

        if (scaledX) {
            velCopy.x = jumpVelocity.x * 0.3 + scaledX * 0.7;
        } else {
            velCopy.x = jumpVelocity.x * 0.6 + newJump.x * 0.4;
        }
        if (scaledY) {
            velCopy.y = jumpVelocity.y * 0.3 + scaledY * 0.7;
        } else {
            velCopy.y = jumpVelocity.y * 0.6 + newJump.y * 0.4;
        }*/
    }

    velCopy.add(GRAVITY.clone().multiplyScalar(gravityFactor * dif / 1000));
    posCopy.add(velCopy.clone().multiplyScalar(dif / 1000));

    if (velCopy.length() > 0.0001) {
        // If we're moving
        // Create two bounding boxes, one for the legs and one for the rest of the body:

        let legsBB = new THREE.Box3(
            new THREE.Vector3(
                posCopy.x - playerRadius,
                posCopy.y - playerRadius,
                posCopy.z - 0.005
            ),
            new THREE.Vector3(
                posCopy.x + playerRadius,
                posCopy.y + playerRadius,
                posCopy.z + legHeight
            )
        );
        let bodyBB = new THREE.Box3(
            new THREE.Vector3(
                posCopy.x - playerRadius,
                posCopy.y - playerRadius,
                posCopy.z + legHeight
            ),
            new THREE.Vector3(
                posCopy.x + playerRadius,
                posCopy.y + playerRadius,
                posCopy.z + playerHeight
            )
        );

        // Get all objects intersecting with those BBs

        let intersectingObjectsLegs: THREE.Mesh[] = [];
        let intersectingObjectsBody: THREE.Mesh[] = [];

        for (let i = 0; i < currentMap.colliders.length; i++) {
            let mesh = currentMap.colliders[i];

            let bb = mesh.geometry.boundingBox.clone();
            bb.applyMatrix4(mesh.matrixWorld);

            if (legsBB.intersectsBox(bb)) {
                intersectingObjectsLegs.push(currentMap.colliders[i]);
            }
            if (bodyBB.intersectsBox(bb)) {
                intersectingObjectsBody.push(currentMap.colliders[i]);
            }
        }

        let order: "horizontal-first" | "vertical-first" = "horizontal-first";
        // Commented out for now. Just don't make steep slopes.
        /*
        for (let i = 0; i < intersectingObjectsLegs.length; i++) {
            let mesh = intersectingObjectsLegs[i];
            if (intersectingObjectsBody.includes(mesh)) {
                order = "vertical-first";
                break;
            }
        }*/

        if (order === "horizontal-first") {
            doHorizontalCollision();
            doVerticalCollision();
        } else {
            doVerticalCollision();
            doHorizontalCollision();
        }

        /* Vertical collision */
        function doVerticalCollision() {
            legsBB = new THREE.Box3(
                new THREE.Vector3(
                    posCopy.x - playerRadius,
                    posCopy.y - playerRadius,
                    posCopy.z - 0.005
                ),
                new THREE.Vector3(
                    posCopy.x + playerRadius,
                    posCopy.y + playerRadius,
                    posCopy.z + legHeight
                )
            );
            intersectingObjectsLegs = [];

            for (let i = 0; i < currentMap.colliders.length; i++) {
                let mesh = currentMap.colliders[i];

                let bb = mesh.geometry.boundingBox.clone();
                bb.applyMatrix4(mesh.matrixWorld);

                if (legsBB.intersectsBox(bb)) {
                    intersectingObjectsLegs.push(currentMap.colliders[i]);
                }
            }

            let startX = posCopy.x - playerRadius,
                startY = posCopy.y - playerRadius,
                dx = playerRadius,
                dy = playerRadius;

            // The highest floor point below the player
            let highest: THREE.Intersection = null;

            // Cast rays from 9 points in the player square, spread out in a 3x3 pattern
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    let x = startX + dx * i,
                        y = startY + dy * j;

                    for (let k = 0; k < 2; k++) {
                        // k === 0 -> Scanning upwards, testing for a ceiling we hit.
                        // k !== 0 -> Scanning downwards, testing for ground below us.

                        let direction =
                                k === 0 ? zAxis : zAxis.clone().negate(),
                            far =
                                k === 0
                                    ? playerHeight - legHeight
                                    : legHeight + 0.05,
                            colliders =
                                k === 0
                                    ? intersectingObjectsBody
                                    : intersectingObjectsLegs;

                        let origin = new THREE.Vector3(
                            x,
                            y,
                            posCopy.z + legHeight
                        );
                        let ray = new THREE.Raycaster(
                            origin,
                            direction,
                            0,
                            far
                        );
                        let intersections = ray.intersectObjects(colliders);

                        if (intersections.length > 0) {
                            outer: if (k === 0 && velCopy.z > 0) {
                                posCopy.z -= far - intersections[0].distance;
                                velCopy.z = 0;
                            } else if (k === 1) {
                                if (highest === null) {
                                    highest = intersections[0];
                                } else {
                                    if (
                                        intersections[0].distance <
                                        highest.distance
                                    ) {
                                        highest = intersections[0];
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (highest) {
                // Do the nudging only when we're not moving up or down, or we're moving down.
                if (velCopy.z <= 0) {
                    // Nudge the player so they're on the floor.
                    let upwardNudgeAmount = legHeight - highest.distance;
                    posCopy.z += upwardNudgeAmount;

                    velCopy.z = 0;

                    localPlayer.isGrounded = true;
                }
            } else {
                localPlayer.isGrounded = false;
            }
        }

        /* Horizontal collision */
        function doHorizontalCollision() {
            // Get a vector coplanar to the x-y axis, describing horizontal movement:
            let horizontalMovement = velCopy.clone();
            horizontalMovement.z = 0;
            if (horizontalMovement.x === 0 && horizontalMovement.y === 0)
                return;
            horizontalMovement.normalize();

            // Recalculate colliding bounding boxes, because position might have been changed in the vertical collision section.

            bodyBB.min = new THREE.Vector3(
                posCopy.x - playerRadius,
                posCopy.y - playerRadius,
                posCopy.z + legHeight
            );
            bodyBB.max = new THREE.Vector3(
                posCopy.x + playerRadius,
                posCopy.y + playerRadius,
                posCopy.z + playerHeight
            );
            intersectingObjectsBody = [];

            for (let i = 0; i < currentMap.colliders.length; i++) {
                let mesh = currentMap.colliders[i];

                let bb = mesh.geometry.boundingBox.clone();
                bb.applyMatrix4(mesh.matrixWorld);

                if (bodyBB.intersectsBox(bb)) {
                    intersectingObjectsBody.push(currentMap.colliders[i]);
                }
            }

            // Get all triangles the bounding box intersects with:

            type triIntersect = {
                triangle: THREE.Triangle;
                normal: THREE.Vector3;
                plane: THREE.Plane;
            };
            let intersectedTriangles: triIntersect[] = [];
            for (let i = 0; i < intersectingObjectsBody.length; i++) {
                let mesh = intersectingObjectsBody[i];
                let faces = (mesh.geometry as any).faces;
                let vertices = (mesh.geometry as any).vertices;

                for (let j = 0; j < faces.length; j++) {
                    let face = faces[j];
                    let normal = face.normal as THREE.Vector3;

                    // This whole thing should deal with sideways collision, not up and down.
                    let isMostlyHorizontal =
                        Math.abs(normal.z) > Math.abs(normal.x) &&
                        Math.abs(normal.z) > Math.abs(normal.y);
                    if (isMostlyHorizontal) continue; // Skip.

                    let a = vertices[face.a].clone() as THREE.Vector3;
                    let b = vertices[face.b].clone() as THREE.Vector3;
                    let c = vertices[face.c].clone() as THREE.Vector3;

                    a.applyMatrix4(mesh.matrixWorld);
                    b.applyMatrix4(mesh.matrixWorld);
                    c.applyMatrix4(mesh.matrixWorld);

                    let triangle = new THREE.Triangle(a, b, c);
                    let plane = new THREE.Plane();
                    plane.setFromCoplanarPoints(a, b, c);

                    if ((bodyBB as any).intersectsTriangle(triangle)) {
                        intersectedTriangles.push({ triangle, normal, plane });
                    }
                }
            }

            // Used to check how much we're moving "into" a face.
            let invertedMovementVec = horizontalMovement.clone().negate();

            // Separate all intersecting triangles into buckets based on the plane they lie in. Later, we'll only need to do position adjustments once per plane.

            let planeBuckets: triIntersect[][] = [];
            for (let i = 0; i < intersectedTriangles.length; i++) {
                let tri = intersectedTriangles[i];

                let bucket: triIntersect[] = null;
                for (let j = 0; j < planeBuckets.length; j++) {
                    let comp = planeBuckets[j][0];

                    // These decimal numbers are just epsilons; we never know if floats may prank us
                    if (
                        tri.normal.dot(comp.normal) > 0.99 &&
                        Math.abs(tri.plane.constant - comp.plane.constant) <
                            0.01
                    ) {
                        // They lie in the same plane. Save the bucket.
                        bucket = planeBuckets[j];
                        break;
                    }
                }
                if (bucket === null) {
                    bucket = [];
                    planeBuckets.push(bucket);
                }

                bucket.push(tri);
            }

            // Sort the buckets by size, descending
            planeBuckets.sort((a, b) => b.length - a.length);

            resolveCollision();
            function resolveCollision() {
                // Find the largest bucket with triangles intersecting the bounding box. In the first call, this will always be the biggest overall bucket, but that won't always be the case in subsequent recursive calls.

                let wantedBucketLength: number;
                outer: for (let i = 0; i < planeBuckets.length; i++) {
                    let bucket = planeBuckets[i];

                    for (let j = 0; j < bucket.length; j++) {
                        let intersect = bucket[j];

                        if (
                            (bodyBB as any).intersectsTriangle(
                                intersect.triangle
                            )
                        ) {
                            wantedBucketLength = bucket.length;
                            break outer;
                        }
                    }
                }

                if (!wantedBucketLength) return; // If we return here, perfect! We're no longer intersecting with any triangles and have resolved the collision.

                // From all the buckets as large as wantedBucketLength, find the bucket where the dot product of its plane and invertedMovementVec is as large as possible, aka the plane we're moving the most "into".

                let max: triIntersect[] = null;
                let maxDotProduct = -Infinity;
                let maxIndex: number;
                for (let i = 0; i < planeBuckets.length; i++) {
                    let bucket = planeBuckets[i];
                    if (bucket.length !== wantedBucketLength) continue;

                    let dot = bucket[0].normal.dot(invertedMovementVec);
                    if (dot > maxDotProduct) {
                        maxDotProduct = dot;
                        max = bucket;
                        maxIndex = i;
                    }
                }

                // We assert: 'max' is not null

                // Here, we start resolving the collision. First, we project our current position onto the bucket's plane:
                let projected = new THREE.Vector3();
                max[0].plane.projectPoint(posCopy, projected);

                // Then we move a player radius away from that plane along its normal
                projected.add(
                    max[0].normal.clone().multiplyScalar(playerRadius * 1.01)
                );
                posCopy.copy(projected);

                // We've resolved the collision with this plane and we can remove the bucket:
                planeBuckets.splice(maxIndex, 1);

                // Rebuild the bounding box based on the new position
                bodyBB.min = new THREE.Vector3(
                    posCopy.x - playerRadius,
                    posCopy.y - playerRadius,
                    posCopy.z + legHeight
                );
                bodyBB.max = new THREE.Vector3(
                    posCopy.x + playerRadius,
                    posCopy.y + playerRadius,
                    posCopy.z + playerHeight
                );

                // Resursive call to check if we're still overlapping with triangles. If so, those will be resolved aswell.
                resolveCollision();
            }

            // Now we have resolved our collision. However, due to float inaccuracies and occasional very quick movement, we might have "glitched" through an object. The following code patches up that case:

            // Create a vector from the beginning of the player's legs last frame to the beginning of the player's legs this frame. That'll be the path we'll check via raycasting.
            let bodyStart = localPlayer.position.clone();
            bodyStart.z += legHeight / 3;
            let endPoint = posCopy.clone();
            endPoint.z += legHeight / 3;
            let direction = endPoint.sub(bodyStart);

            let rayDoubleCheck = new THREE.Raycaster(
                bodyStart,
                direction.clone().normalize(),
                0,
                direction.length()
            );
            let intersections = rayDoubleCheck.intersectObjects(
                currentMap.colliders
            );
            for (let i = 0; i < intersections.length; i++) {
                let intersection = intersections[0];

                // TOTAL BUNGUS! Ignoring not-really-horizontal surfaces means ignoring almost all slopes, and we don't wanna be glitching through those.
                /*
                // Again, ignore any not-really-horizontal surfaces.
                let isMostlyHorizontal =
                    Math.abs(intersection.face.normal.z) >
                        Math.abs(intersection.face.normal.x) &&
                    Math.abs(intersection.face.normal.z) >
                        Math.abs(intersection.face.normal.y);
                if (isMostlyHorizontal) continue;*/

                // If we arrive here, that's bad. We probably glitched through something. Fix the incorrect position:

                // Move the player straight to the intersection point
                posCopy.x = intersection.point.x;
                posCopy.y = intersection.point.y;

                // Push them away along the face's normal
                let horizontalNormal = intersection.face.normal
                    .clone()
                    .normalize();
                posCopy.add(horizontalNormal.multiplyScalar(playerRadius));

                break;
            }
        }
    }

    // Make sure the player can't glitch outta walls:
    while (posCopy.x < currentMap.rawData.wall.minX) {
        posCopy.x += 1;
    }
    while (posCopy.x > currentMap.rawData.wall.maxX) {
        posCopy.x -= 1;
    }
    while (posCopy.y < currentMap.rawData.wall.minY) {
        posCopy.y += 1;
    }
    while (posCopy.y > currentMap.rawData.wall.maxY) {
        posCopy.y -= 1;
    }

    // Last security check: Don't ever glitch through the ground:
    if (posCopy.z < -0.01) {
        posCopy.z = 0;
        velCopy.z = 0;

        localPlayer.isGrounded = true;
    }

    // If the player's position has changed almost not at all, we can avoid sending his position over the network.
    let epsilon = 1e-14;
    let isDifferent =
        Math.abs(posCopy.x - localPlayer.position.x) > epsilon ||
        Math.abs(posCopy.y - localPlayer.position.y) > epsilon ||
        Math.abs(posCopy.z - localPlayer.position.z) > epsilon;

    // Update the actual vectors.
    localPlayer.update({
        position: { x: posCopy.x, y: posCopy.y, z: posCopy.z },
        velocity: { x: velCopy.x, y: velCopy.y, z: velCopy.z }
    });

    // Send the changes to the server
    if (isDifferent)
        socketSend("updatePosition", {
            position: { x: posCopy.x, y: posCopy.y, z: posCopy.z }
        });
}

const FLYING_SPEED = 20;

function updateEditorMovement(dif: number) {
    let { localPlayer } = gameState;

    if (document.activeElement !== document.body) return;

    let posCopy = localPlayer.position.clone();

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
    movementVec.applyAxisAngle(xAxis, localPlayer.pitch);
    movementVec.applyAxisAngle(zAxis, localPlayer.yaw);

    posCopy.add(movementVec.multiplyScalar((FLYING_SPEED * dif) / 1000));

    localPlayer.update({
        position: { x: posCopy.x, y: posCopy.y, z: posCopy.z }
    });
}

inputEventDispatcher.addEventListener("mousemove", e => {
    let mouseEvent = e as MouseEvent;

    if (inputState.pointerLocked === false && !gameState.isEditor) return;
    if (gameState.isEditor) {
        if (!inputState.secondaryMb) return;
    }
    if (!gameState.localPlayer) return;

    let x = mouseEvent.movementX;
    let y = mouseEvent.movementY;

    let localPlayer = gameState.localPlayer;

    let denom = localPlayer.isScoped ? 3000 : 1000;

    let yaw = localPlayer.yaw + -x / denom;
    let pitch = localPlayer.pitch + -y / denom;
    pitch = clamp(pitch, -Math.PI / 2, Math.PI / 2);

    localPlayer.update({ yaw, pitch });

    if (!gameState.isEditor) {
        socketSend("updateOrientation", {
            yaw: localPlayer.yaw,
            pitch: localPlayer.pitch
        });
    }
});
