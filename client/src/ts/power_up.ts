import * as THREE from "three";
import { gameState } from "./game_state";
import { playerRadius, playerHeight } from "./movement";
import { socketSend } from "./net";

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