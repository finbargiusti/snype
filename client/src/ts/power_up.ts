import * as THREE from "three";
import { gameState } from "./game_state";
import { playerRadius, playerHeight, setMovementSpeedFactor } from "./movement";
import { socketSend, handlers } from "./net";
import { setRofFactor } from "./weapon";

const powerUpSound = new Howl({ src: ["/static/powerup.mp3"], volume: 0.6, rate: 1 });

interface PowerUpOptions {
    position: THREE.Vector3,
    id: string
}

const POWER_UP_RADIUS = 0.4;

export class PowerUp {
    public position: THREE.Vector3;
    public id: string;
    public creationTime: number;
    public mesh: THREE.Mesh;

    constructor(options: PowerUpOptions) {
        this.position = options.position;
        this.id = options.id;
        this.creationTime = performance.now();

        let mesh = new THREE.Mesh(
            new THREE.IcosahedronBufferGeometry(POWER_UP_RADIUS, 0),
            new THREE.MeshLambertMaterial({color: 0x00ff00, wireframe: true, emissive: 0x004400})
        );
        mesh.geometry.computeBoundingBox();
        this.mesh = mesh;
        this.mesh.receiveShadow = true;
        this.mesh.castShadow = true;

        this.update();
    }

    update() {
        let elapsed = performance.now() - this.creationTime;

        this.mesh.position.copy(this.position);
        this.mesh.position.z += Math.cos(elapsed / 1000 * 2) * 0.25;
        this.mesh.rotation.z = elapsed / 1000;

        this.collisionTest();
    }

    collisionTest() {
        let localPlayer = gameState.localPlayer;
        if (!localPlayer) return;

        let ownBB = new THREE.Box3(
            new THREE.Vector3(this.position.x - POWER_UP_RADIUS, this.position.y - POWER_UP_RADIUS, this.position.z - POWER_UP_RADIUS),
            new THREE.Vector3(this.position.x + POWER_UP_RADIUS, this.position.y + POWER_UP_RADIUS, this.position.z + POWER_UP_RADIUS),
        );

        let playerBB = new THREE.Box3(
            new THREE.Vector3(
                localPlayer.position.x - playerRadius,
                localPlayer.position.y - playerRadius,
                localPlayer.position.z + 0
            ),
            new THREE.Vector3(
                localPlayer.position.x + playerRadius,
                localPlayer.position.y + playerRadius,
                localPlayer.position.z + playerHeight
            )
        );

        if (ownBB.intersectsBox(playerBB)) {
            socketSend("collectPowerUp", {
                id: this.id
            });
        }
    }
}

interface PowerUpTypeInfo {
    name: string,
    duration: number,
    onStart: Function,
    onEnd: Function
}

let powerUpTypes: { [index: string]: PowerUpTypeInfo } = {
    "speedBuff": {
        name: "Speed",
        duration: 10000,
        onStart() {
            setMovementSpeedFactor(2);
        },
        onEnd() {
            setMovementSpeedFactor(1);
        }
    },
    "rofBuff": {
        name: "ROF Buff",
        duration: 10000,
        onStart() {
            setRofFactor(2);
        },
        onEnd() {
            setRofFactor(1);
        }
    },
};

let currentPowerUps: any[] = [];

function applyPowerUp(obj: any) {
    let existing = currentPowerUps.find((a) => a.key === obj.key);
    if (existing) {
        existing.start = performance.now(); // Extend its duration
    } else {
        currentPowerUps.push(obj);
        obj.type.onStart();
    }
}

export function updateEquippedPowerUps() {
    let now = performance.now();

    for (let i = 0; i < currentPowerUps.length; i++) {
        let p = currentPowerUps[i];

        if (now >= p.start + p.type.duration) {
            p.type.onEnd();
            currentPowerUps.splice(i--, 1);
        }
    }
}

handlers["spawnPowerUp"] = function(data: any) {
    let { currentMap } = gameState;
    if (!currentMap) return;

    let options = {
        position: new THREE.Vector3(data.position.x, data.position.y, data.position.z),
        id: data.id
    };

    currentMap.addPowerUp(new PowerUp(options));
};

handlers["removePowerUp"] = function(data: any) {
    let { currentMap } = gameState;
    if (!currentMap) return;

    let index = currentMap.powerUps.findIndex((a) => a.id === data.id);
    if (index === -1) return;

    let powerUp = currentMap.powerUps[index];

    currentMap.scene.remove(powerUp.mesh);
    currentMap.powerUps.splice(index, 1);
    powerUp.mesh.geometry.dispose();
};

handlers["pickupPowerUp"] = function(data: any) {
    powerUpSound.play();

    // Temp:
    let key = "rofBuff";

    let type = powerUpTypes[key];
    let obj = {
        start: performance.now(),
        key: key,
        type: type
    };

    applyPowerUp(obj);
};