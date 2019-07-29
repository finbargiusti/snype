import * as THREE from "three";

export const GRAVITY = new THREE.Vector3(0, 0, -25);
export const PLAYER_SPEED = 4; // Units per seconta
export const PLAYER_SPEED_SPRINTING = 6;

export function clamp(val: number, min: number, max: number) {
    if (val > max) return max;
    if (val < min) return min;
    return val;
}

export function degToRad(deg: number) {
    return deg / 180 * Math.PI;
}

export function radToDeg(rad: number) {
    return rad / Math.PI * 180;
}