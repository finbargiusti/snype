import * as THREE from "three";
import { xAxis, zAxis, camera } from "./rendering";
import { GRAVITY } from "./misc";
import { inputState } from "./input";
import { send } from "./net";

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

let bob = new Player(0, 0, 0);
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

  localPlayer.position.add(
    movementVec.multiplyScalar(playerSpeed * (dif / 1000))
  );

  localPlayer.position.add(
    localPlayer.velocity.clone().multiplyScalar(dif / 1000)
  );

  if (localPlayer.position.z >= 0)
    localPlayer.velocity.add(GRAVITY.clone().multiplyScalar(dif / 1000));

  if (localPlayer.position.z < 0) localPlayer.position.z = 0;

  send(
    JSON.stringify({
      x: localPlayer.position.x,
      y: localPlayer.position.y,
      z: localPlayer.position.z,
      yaw: localPlayer.yaw
    })
  );
}
