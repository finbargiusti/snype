import * as THREE from "three";
import { xAxis, zAxis, camera } from "./rendering";
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

let playerSpeed = 2.5; // Units per seconta

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

  let ting = getNearestDistance(posCopy);
  if (ting && ting.distance <= 0.2) {
    console.log(ting, ting.face.normal);

    let point = ting.point;
    //point.sub(new THREE.Vector3(0, 0, 0.3));
    point.add(ting.face.normal.clone().multiplyScalar(0.2));

    posCopy.copy(point);
  }

  localPlayer.position.copy(posCopy);
  
  /*
  localPlayer.position.add(
    localPlayer.velocity.clone().multiplyScalar(dif / 1000)
  );*/

  let yes = new THREE.Vector3(0, 0, -1);
  let floorIntersection = getNearestDistance(posCopy, yes);
  if (floorIntersection) {
    let downward = -floorIntersection.distance;
    if (downward >= localPlayer.velocity.z * dif / 1000) {
      localPlayer.position.z += downward; // Put him on the floor
    } else {
      localPlayer.position.z += localPlayer.velocity.z * dif / 1000;
      localPlayer.velocity.add(GRAVITY.clone().multiplyScalar(dif / 1000));
    }
  } else {
    localPlayer.position.z += localPlayer.velocity.z * dif / 1000;
      localPlayer.velocity.add(GRAVITY.clone().multiplyScalar(dif / 1000));
  }

  if (localPlayer.position.z < 0) localPlayer.position.z = 0;

  send(
    JSON.stringify({
      x: localPlayer.position.x,
      y: localPlayer.position.y,
      z: localPlayer.position.z,
      yaw: localPlayer.yaw
    })
  );
  if (localPlayer.position.z < 0) localPlayer.position.z = 0; // Don't glitch through the ground, hack.
}

export function isGrounded() {
  let yes = new THREE.Vector3(0, 0, -1);
  let floorIntersection = getNearestDistance(localPlayer.position, yes);
  return floorIntersection && floorIntersection.distance === 0;
}