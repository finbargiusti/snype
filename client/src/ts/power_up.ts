import * as THREE from "three";
import { gameState } from "./game_state";
import { playerRadius, playerHeight, setMovementSpeedFactor, setGravityFactor, setJumpFactor } from "./movement";
import { socketSend, handlers } from "./net";
import { setRofFactor } from "./weapon";

const powerUpContainer = document.querySelector("#powerUpContainer") as HTMLElement;
const powerUpSound = new Howl({ src: ["/static/powerup.mp3"], volume: 0.6, rate: 1 });

interface PowerUpOptions {
    position: THREE.Vector3,
    id: string,
    type: string
}

const POWER_UP_RADIUS = 0.4;

export class PowerUp {
    public position: THREE.Vector3;
    public id: string;
    public type: string;
    public creationTime: number;
    public mesh: THREE.Mesh;

    constructor(options: PowerUpOptions) {
        this.position = options.position;
        this.id = options.id;
        this.type = options.type;
        this.creationTime = performance.now();

        let emissiveColor = new THREE.Color(powerUpTypes[this.type].color);
        emissiveColor.multiplyScalar(0.333);
        let mesh = new THREE.Mesh(
            new THREE.IcosahedronBufferGeometry(POWER_UP_RADIUS, 0),
            new THREE.MeshLambertMaterial({color: powerUpTypes[this.type].color, wireframe: true, emissive: emissiveColor})
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
    color: number,
    onStart: Function,
    onEnd: Function
}

let powerUpTypes: { [index: string]: PowerUpTypeInfo } = {
    "speedBuff": {
        name: "Rush",
        duration: 15000,
        color: 0x0080ff,
        onStart() {
            setMovementSpeedFactor(2);
        },
        onEnd() {
            setMovementSpeedFactor(1);
        }
    },
    "rofBuff": {
        name: "Overheat",
        duration: 12000,
        color: 0xff3300,
        onStart() {
            setRofFactor(2.5);
        },
        onEnd() {
            setRofFactor(1);
        }
    },
    "lessGravity": {
        name: "Moonwalk",
        duration: 15000,
        color: 0xf8f8ff,
        onStart() {
            setGravityFactor(0.333)
        },
        onEnd() {
            setGravityFactor(1)
        }
    },
    "jumpBoost": {
        name: "Leap",
        duration: 10000,
        color: 0x66bb6a,
        onStart() {
            setJumpFactor(2.1);
        },
        onEnd() {
            setJumpFactor(3);
        }
    },
};

export let currentPowerUps: any[] = [];

function createPowerUpPopup(name: string) {
    let div = document.createElement("div");
    let p1 = document.createElement("p");
    let p2 = document.createElement("p");

    div.appendChild(p1);
    div.appendChild(p2);

    p1.textContent = name;

    return { div, p1, p2 };
}

function applyPowerUp(obj: any) {
    let existing = currentPowerUps.find((a) => a.key === obj.key);
    if (existing) {
        existing.start = performance.now(); // Extend its duration
    } else {
        let elements = createPowerUpPopup(obj.type.name);
        obj.elements = elements;
        obj.elements.p1.style.color = "#" + ("000000" + obj.type.color.toString(16)).slice(-6);

        currentPowerUps.push(obj);
        obj.type.onStart();

        powerUpContainer.appendChild(obj.elements.div);

        obj.elements.div.clientWidth;
        obj.elements.div.classList.add("shown");
    }
}

export function updateEquippedPowerUps() {
    let now = performance.now();

    for (let i = 0; i < currentPowerUps.length; i++) {
        let p = currentPowerUps[i];

        let elapsed = (now - p.start);
        p.elements.p2.textContent = Math.abs((p.type.duration - elapsed) / 1000).toFixed(1) + 's';

        if (elapsed >= p.type.duration) {
            p.type.onEnd();
            currentPowerUps.splice(i--, 1);

            p.elements.div.classList.remove("shown");
            setTimeout(() => {
                powerUpContainer.removeChild(p.elements.div);
            }, 1000);
        }
    }
}

handlers["spawnPowerUp"] = function(data: any) {
    let { currentMap } = gameState;
    if (!currentMap) return;

    let options = {
        position: new THREE.Vector3(data.position.x, data.position.y, data.position.z),
        id: data.id,
        type: data.type
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

    let key = data.type;

    let type = powerUpTypes[key];
    let obj = {
        start: performance.now(),
        key: key,
        type: type
    };

    applyPowerUp(obj);
};