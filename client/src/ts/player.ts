import * as THREE from "three";
import {
    xAxis,
    zAxis,
    camera,
    mainCanvas,
    killMessage,
    overlayAdd
} from "./rendering";
import { GRAVITY, stringToRandomNumber, hsvToRgb } from "./misc";
import { inputState, inputEventDispatcher } from "./input";
import { socketSend, handlers } from "./net";
import { gameState } from "./game_state";
import {
    Weapon,
    WeaponInstance,
    ASSAULT_RIFLE,
    SHOTGUN,
    SNIPER,
    SMG,
    weapons
} from "./weapon";
import { SnypeMap } from "./map";
import { Interpolator, EaseType } from "./animate";
import { createKillfeedPopup, createJoinedPopup } from "./announce";

export let players = new Map<string, Player>();

export function getNonLocalPlayerHitboxes() {
    let { localPlayer } = gameState;
    let arr: THREE.Object3D[] = [];

    players.forEach(a => {
        if (a !== localPlayer && a.object3D.visible !== false)
            arr.push(a.hitbox);
    });

    return arr;
}

export let gunLength = 0.75;

export let gunRightOffset = 0.3;
export let gunDownOffset = 0.18;
export let scopedGunRightOffset = 0;
export let scopedGunDownOffset = 0.15;

function createPlayerObject3D(player: Player) {
    let group = new THREE.Group();

    let hue = stringToRandomNumber(player.name);
    let rgb = hsvToRgb(hue, 0.8, 1.0);
    let number = ((rgb[0] | 0) << 16) + ((rgb[1] | 0) << 8) + (rgb[2] | 0);

    let sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 32, 32),
        new THREE.MeshPhongMaterial({ color: number /*0xed2939*/, shininess: 100 })
    );
    sphere.castShadow = true;
    sphere.receiveShadow = true;

    let pupil = new THREE.Mesh(
        new THREE.IcosahedronBufferGeometry(0.2, 2),
        new THREE.MeshPhongMaterial({ color: 0x000000 })
    );
    pupil.castShadow = true;
    pupil.receiveShadow = true;
    pupil.position.y += 0.25;

    let gun = new THREE.Mesh(
        new THREE.CylinderBufferGeometry(0.05, 0.05, gunLength, 32),
        new THREE.MeshPhongMaterial({ color: 0x444444, shininess: 95 })
    );
    gun.castShadow = true;
    gun.receiveShadow = true;
    gun.position.x += gunRightOffset;
    gun.position.y += gunLength / 2;
    gun.position.z -= gunDownOffset;

    group.add(sphere);
    group.add(pupil);
    group.add(gun);

    return { group, pupil, gun };
}

const goSound = new Howl({ src: ["/static/go.ogg"] });

export class Player {
    public id: string;
    public name: string;
    public position: THREE.Vector3;
    public velocity: THREE.Vector3;
    public yaw: number = 0;
    public pitch: number = 0;
    public object3D: THREE.Object3D;
    public pupil: THREE.Mesh;
    public gun: THREE.Mesh;
    public hitbox: THREE.Object3D;
    public weapon = new WeaponInstance(SMG, this);
    public health: number = 100;
    public currentMap: SnypeMap;
    public isGrounded: boolean = false;
    public isScoped: boolean = false;
    public scopeInterpolator: Interpolator;
    public scopeCompletion: number = 0;
    public gunRight: number = 0;
    public gunDown: number = 0;

    constructor(obj: any) {
        let { currentMap } = gameState;
        this.currentMap = currentMap;

        this.id = obj.id;
        this.name = obj.name;
        this.position = new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.setWeapon(SMG);

        let stuff = createPlayerObject3D(this);

        this.object3D = stuff.group;
        this.pupil = stuff.pupil;
        this.gun = stuff.gun;
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

        this.scopeInterpolator = new Interpolator({
            ease: EaseType.EaseInOutExpo,
            duration: 200,
            from: 0,
            to: 1
        });

        createJoinedPopup(this);
    }

    getRgbString() {
        let hue = stringToRandomNumber(this.name);
        let rgb = hsvToRgb(hue, 0.8, 1.0);
        return `rgb(${rgb[0] | 0}, ${rgb[1] | 0}, ${rgb[2] | 0})`;
    }

    setScopeState(state: boolean) {
        if (state !== this.isScoped) {
            if (this.scopeInterpolator.isVirgin) {
                this.scopeInterpolator.start();
            } else {
                this.scopeInterpolator.reverse();
            }

            this.isScoped = state;
        }
    }

    tick() {
        let scopeVal = this.scopeInterpolator.getCurrentValue();

        this.scopeCompletion = scopeVal;

        this.gunRight =
            (1 - scopeVal) * gunRightOffset + scopeVal * scopedGunRightOffset;
        this.gunDown =
            (1 - scopeVal) * gunDownOffset + scopeVal * scopedGunDownOffset;

        this.gun.position.x = this.gunRight;
        //this.gun.position.y += gunLength/2;
        this.gun.position.z = -this.gunDown;
    }

    private bestSpawn() {
        let fav = this.currentMap.spawnPoints[
            Math.floor(Math.random() * this.currentMap.spawnPoints.length)
        ];
        let dist = 0;

        this.currentMap.spawnPoints.forEach(spawn => {
            let spawnVec = new THREE.Vector3(spawn.x, spawn.y, spawn.z);
            let totDist = 0;
            players.forEach(player => {
                if (player === localPlayer) return;
                totDist += spawnVec.distanceTo(player.position);
            });

            if (totDist > dist) {
                dist = totDist;
                fav = spawn;
            }
        });

        return fav;
    }

    spawn() {
        goSound.play();
        if (this.currentMap.spawnPoints.length > 0) {
            let spawn = this.bestSpawn();
            this.position.set(spawn.x, spawn.y, spawn.z);
            this.yaw = spawn.yaw;
        } else {
            this.position.set(1, 1, 0);
            this.yaw = 0;
        }

        socketSend("updatePosition", {
            position: {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            }
        });
    }

    setHealth(health: number) {
        let healthDiff = this.health - health;
        this.health = health;
        overlayAdd(healthDiff / 40);
        let healthEl = document.getElementById("health");
        healthEl.innerText = String(Math.floor(localPlayer.health));
        healthEl.classList.remove("hit");
        healthEl.clientWidth;
        healthEl.classList.add("hit");
    }

    die() {
        if (localPlayer === this) {
            mainCanvas.style.filter = "saturate(0) contrast(2)";
        } else {
            this.object3D.visible = false;
        }
    }

    respawn() {
        if (localPlayer === this) {
            this.spawn();
            this.setHealth(100);
            mainCanvas.style.filter = "";
        } else {
            this.object3D.visible = true;
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
            if (obj.yaw !== undefined && obj.pitch !== undefined) {
                this.yaw = obj.yaw;
                this.pitch = obj.pitch;

                this.object3D.rotation.x = 0;
                this.object3D.rotation.y = 0;
                this.object3D.rotation.z = 0;
                this.object3D.rotateOnWorldAxis(xAxis, this.pitch);
                this.object3D.rotateOnWorldAxis(zAxis, this.yaw);
            }
            if (obj.scoped !== undefined) {
                this.setScopeState(obj.scoped);
            }
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
        id: localPlayerId,
        name: localStorage.getItem('displayName') || ''
    });

    let mat = new THREE.ShadowMaterial();
    for (let child of localPlayer.object3D.children) {
        let mesh = child as THREE.Mesh;
        if (mesh === localPlayer.gun) continue;

        mesh.receiveShadow = false;
        mesh.material = mat;
    }

    localPlayer.pupil.visible = false;

    //(localPlayer.object3D as THREE.Mesh).material = new THREE.ShadowMaterial();

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
    localPlayer.object3D.rotation.x = 0;
    localPlayer.object3D.rotation.y = 0;
    localPlayer.object3D.rotation.z = 0;
    localPlayer.object3D.rotateOnWorldAxis(xAxis, localPlayer.pitch);
    localPlayer.object3D.rotateOnWorldAxis(zAxis, localPlayer.yaw);

    Howler.pos(headPos.x, headPos.y, headPos.z);
    let oriental = localPlayer.getOrientationVector();
    Howler.orientation(oriental.x, oriental.y, 0, 0, 0, 1);
}

let switchSound = new Howl({ src: ["/static/switch.wav"], rate: 0.8 });

inputEventDispatcher.addEventListener("keydown", e => {
    let event = e as KeyboardEvent;
    if (event.keyCode == 81) {
        switchSound.stop();
        localPlayer.cycleWeapon();
        switchSound.play();
    }
});

export function isGrounded() {
    return localPlayer.isGrounded;
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

// Upon getting hit.
handlers["hit"] = (data: any) => {
    // TODO?
};

handlers["updateHealth"] = (data: any) => {
    localPlayer.setHealth(data.health);
};

handlers["death"] = (data: any) => {
    let player = players.get(data.playerId);
    if (player) player.die();

    let source = players.get(data.source.id);

    if (localPlayer === source) {
        killMessage();
    }

    if (source && player) {
        createKillfeedPopup(source, player);
    }
};

handlers["respawn"] = (data: any) => {
    let player = players.get(data.playerId);
    if (player) player.respawn();
};

export function updatePlayer(obj: any) {
    let player = players.get(obj.id);
    if (!player) return;

    player.update(obj);
}

export function addPlayer(obj: any) {
    let newPlayer = new Player({ id: obj.id, name: obj.name });
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

inputEventDispatcher.addEventListener("canvasmousedown", e => {
    let mouseEvent = e as MouseEvent;

    if (mouseEvent.button === 0) {
        useWeapon();
    }
});

export function useWeapon() {
    let { localPlayer } = gameState;
    if (!inputState.pointerLocked) return;

    if (gameState.isEditor) return;

    if (inputState.primaryMb === true && localPlayer.health > 0) {
        localPlayer.weapon.shoot();
    }
}
