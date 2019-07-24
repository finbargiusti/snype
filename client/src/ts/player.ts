import * as THREE from "three";
import { xAxis, zAxis, camera, mainCanvas } from "./rendering";
import { GRAVITY } from "./misc";
import { inputState, inputEventDispatcher } from "./input";
import { socketSend, handlers } from "./net";
import { getNearestDistance } from "./collision";
import { gameState } from "./game_state";
import {
    Weapon,
    WeaponInstance,
    ASSAULT_RIFLE,
    SHOTGUN,
    SNIPER,
    SMG,
    LASER,
    weapons
} from "./weapon";
import { SnypeMap } from "./map";

export let players = new Map<string, Player>();

export function getNonLocalPlayerHitboxes() {
    let { localPlayer } = gameState;
    let arr: THREE.Object3D[] = [];

    players.forEach(a => {
        if (a !== localPlayer) arr.push(a.hitbox);
    });

    return arr;
}

function createPlayerObject3D() {
    let sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 32, 32),
        new THREE.MeshPhongMaterial({ color: 0x00ffff })
    );
    sphere.castShadow = true;
    sphere.receiveShadow = true;

    return sphere;
}

export class Player {
    public id: string;
    public position: THREE.Vector3;
    public velocity: THREE.Vector3;
    public yaw: number = 0;
    public pitch: number = 0;
    public object3D: THREE.Object3D;
    public hitbox: THREE.Object3D;
    public weapon = new WeaponInstance(SMG, this);
    public health: number = 100;
    public currentMap: SnypeMap;

    spawn() {
        if (this.currentMap.spawnPoints.length > 0) {
            let spawn = this.currentMap.spawnPoints[
                Math.floor(Math.random() * this.currentMap.spawnPoints.length)
            ];
            this.position.set(spawn.x, spawn.y, spawn.z);
        } else {
            this.position.set(1, 1, 0);
        }
    }

    setHealth(health: number) {
        this.health = health;
        document.getElementById("health").innerText = String(
            localPlayer.health
        );
    }

    die() {
        if (localPlayer === this) {
            mainCanvas.style.filter = "saturate(0) contrast(2)";
            setTimeout(() => {
                this.spawn();
                this.setHealth(100);
                mainCanvas.style.filter = "";
            }, 1000);
            socketSend("dead", {
                id: this.id
            });
        } else {
            this.object3D.visible = false;
            setTimeout(() => {
                this.object3D.visible = true;
            }, 1000);
        }
    }

    setWeapon(weapon: Weapon) {
        this.weapon.weapon = weapon;
        document.getElementById("weapon").innerText = weapon.spec.name;
    }

    cycleWeapon() {
        this.setWeapon(
            weapons[(weapons.indexOf(this.weapon.weapon) + 1) % weapons.length]
        );
    }

    constructor(obj: any) {
        let { currentMap } = gameState;
        this.currentMap = currentMap;

        this.id = obj.id;
        this.position = new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.setWeapon(SMG);

        this.object3D = createPlayerObject3D();
        currentMap.scene.add(this.object3D);

        let hitboxGeometry = new THREE.BoxBufferGeometry(0.8, 0.8, 0.8);
        hitboxGeometry.computeBoundingBox();
        hitboxGeometry.computeBoundingSphere();
        let hitboxMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            wireframe: true,
            alphaTest: 0,
            visible: false
        }); // Rendering only for debug
        this.hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);

        currentMap.scene.add(this.hitbox);
    }

    getHeadPosition() {
        let pos = this.position.clone();
        pos.z += 1.65;

        return pos;
    }

    getOrientationVector() {
        // Optimize this, it doesn't need to be recalculated every time, only when yaw and pitch are updated.
        let vec = new THREE.Vector3(0, 1, 0);
        vec.applyAxisAngle(xAxis, this.pitch);
        vec.applyAxisAngle(zAxis, this.yaw);

        return vec; // It's normalized!
    }

    update(obj: any) {
        if (this.health > 0) {
            if (obj.position) {
                this.position.set(
                    obj.position.x,
                    obj.position.y,
                    obj.position.z
                );
                this.object3D.position.copy(this.getHeadPosition());
                this.hitbox.position.copy(this.getHeadPosition());
            }
            if (obj.velocity) {
                this.velocity.set(
                    obj.velocity.x,
                    obj.velocity.y,
                    obj.velocity.z
                );
            }
            if (obj.yaw) this.yaw = obj.yaw;
            if (obj.pitch) this.pitch = obj.pitch;
        }
    }

    remove() {
        let { currentMap } = gameState;

        currentMap.scene.remove(this.object3D);
    }
}

let localPlayerId = Math.random().toString();
let localPlayer: Player = null;

export function createLocalPlayer() {
    localPlayer = new Player({
        id: localPlayerId
    });
    localPlayer.object3D.visible = false; // Don't render any of the local player, because that'd be stupid.

    gameState.localPlayer = localPlayer;

    players.set(localPlayerId, localPlayer);
}

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

inputEventDispatcher.addEventListener("keydown", e => {
    let event = e as KeyboardEvent;
    if (event.keyCode == 81) {
        localPlayer.cycleWeapon();
    }
});

export function isGrounded() {
    let yes = new THREE.Vector3(0, 0, -1);
    let point = localPlayer.position.clone();
    point.z += 0.05;
    let floorIntersection = getNearestDistance(point, yes);

    return floorIntersection && floorIntersection.distance <= 0.055;
}

handlers["addPlayer"] = function(data: any) {
    let player = players.get(data.id);
    if (player) updatePlayer(data);
    else addPlayer(data);
};

handlers["updatePlayer"] = function(data: any) {
    updatePlayer(data);
};

handlers["removePlayer"] = function(data: any) {
    removePlayer(data);
};

handlers["hit"] = (data: any) => {
    if (localPlayer.health > 0) {
        localPlayer.setHealth(localPlayer.health - data.damage);
        if (localPlayer.health <= 0) {
            localPlayer.die();
        }
    }
};

handlers["died"] = (data: any) => {
    let player = players.get(data.id);
    player.die();
};

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

export function useWeapon() {
    let { localPlayer } = gameState;

    if (inputState.primaryMb === true) {
        if (localPlayer.health > 0) {
            localPlayer.weapon.shoot();
        }
    }
}
