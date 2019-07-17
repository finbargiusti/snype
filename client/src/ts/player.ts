import * as THREE from "three";
import { xAxis, zAxis, camera, scene } from "./rendering";
import { GRAVITY } from "./misc";
import { inputState } from "./input";
import { send } from "./net";
import { getNearestDistance } from "./collision";

class Player {
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public yaw: number = 0;
  public pitch: number = 0;

  constructor(x: number, y: number, z: number) {
    this.position = new THREE.Vector3(x, y, z);
    this.velocity = new THREE.Vector3(0, 0, 0);
  }

  getHeadPosition() {
    let pos = this.position.clone();
    pos.z += 1.65;

    return pos;
  }
}

let bob = new Player(0, -5, 0);
export let localPlayer = bob;

let playerSpeed = 3.5; // Units per seconta

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

let lastDist = Infinity;
export function updateLocalPlayerMovement(dif: number) {
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

  let posCopy = localPlayer.position.clone();
  posCopy.add(
    movementVec.clone().multiplyScalar(playerSpeed * (dif / 1000))
  );

  let allowedStepHeight = 0.3;

  let ting = getNearestDistance(posCopy);
  preventer:
  if (ting && ting.distance <= 0.2) {
    let point = ting.point;
    let dist = point.clone().sub(posCopy);

    dist.multiplyScalar(1.01);
    let inTheThing = posCopy.clone().add(dist);
    inTheThing.z += allowedStepHeight;
    let downRay = new THREE.Raycaster(inTheThing, new THREE.Vector3(0, 0, -1), 0, allowedStepHeight);
    let intersections = downRay.intersectObject(ting.object);
    let closest = intersections[0];
    if (closest) {
      let dist = allowedStepHeight - closest.distance;
      if (dist <= allowedStepHeight) {
        break preventer;
      }
    }


    // Cheaky-ass workaround
    if (ting.face.normal.z > ting.face.normal.x && ting.face.normal.z > ting.face.normal.y) break preventer;

    point.add(ting.face.normal.clone().multiplyScalar(0.2));

    posCopy.copy(point);
  }

  localPlayer.position.copy(posCopy);
  
  /*
  localPlayer.position.add(
    localPlayer.velocity.clone().multiplyScalar(dif / 1000)
  );*/

 

  let yes = new THREE.Vector3(0, 0, -1);
  let anotherPoint = localPlayer.position.clone();
  anotherPoint.z += 0.05;
  let floorIntersection = getNearestDistance(anotherPoint, yes);
  outer:
  if (floorIntersection) {
    let whereWouldIBeWithGravity = localPlayer.position.z + localPlayer.velocity.z * dif / 1000;

    if (floorIntersection.point.z >= whereWouldIBeWithGravity) {
      localPlayer.position.z = floorIntersection.point.z;
      localPlayer.velocity.z = 0;
    } else {
      localPlayer.position.z += localPlayer.velocity.z * dif / 1000;
      localPlayer.velocity.add(GRAVITY.clone().multiplyScalar(dif / 1000));
    }
  } else {
    localPlayer.position.z += localPlayer.velocity.z * dif / 1000;
    localPlayer.velocity.add(GRAVITY.clone().multiplyScalar(dif / 1000));
  }

  let thing = localPlayer.position.clone();
  thing.z += allowedStepHeight;
  let downRay = new THREE.Raycaster(thing, new THREE.Vector3(0, 0, -1), 0, allowedStepHeight);
  let intersections = downRay.intersectObjects(scene.children);
  let closest = intersections[0]; // Name differently?
  if (closest) {
    let dist = allowedStepHeight - closest.distance;
    if (dist <= allowedStepHeight) {
      localPlayer.position.z = closest.point.z;
      localPlayer.velocity.z = 0;
    }
  }

 

  if (localPlayer.position.z < 0) localPlayer.position.z = 0; // Don't glitch through the ground, hack.


  send(
    JSON.stringify({
      x: localPlayer.position.x,
      y: localPlayer.position.y,
      z: localPlayer.position.z,
      yaw: localPlayer.yaw
    })
  );
}

export function isGrounded() {
  let yes = new THREE.Vector3(0, 0, -1);
  let point = localPlayer.position.clone();
  point.z += 0.05;
  let floorIntersection = getNearestDistance(point, yes);

  return floorIntersection && floorIntersection.distance <= 0.055;
}