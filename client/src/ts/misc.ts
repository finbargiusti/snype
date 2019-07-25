import * as THREE from "three";

export const GRAVITY = new THREE.Vector3(0, 0, -20);
export const PLAYER_SPEED = 3; // Units per seconta
export const PLAYER_SPEED_SPRINTING = 6;

export function clamp(val: number, min: number, max: number) {
    if (val > max) return max;
    if (val < min) return min;
    return val;
}
