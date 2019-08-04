import { Player, getNonLocalPlayerHitboxes, players } from "./player";
import * as THREE from "three";
import { gameState } from "./game_state";
import { socketSend, handlers } from "./net";
import { zAxis, xAxis } from "./rendering";
import { Howl } from "howler";
import { playPop } from "./sound";
import { isZoom } from "./movement";

let rofFactor = 1;
export function setRofFactor(num: number) {
    rofFactor = num;
}

interface WeaponSpecifications {
    id: number;
    name: string;
    pitch: number;
    rateOfFire: number; // Shots per second
    inaccuracy: number; // In max radians
    projectilesPerShot: number;
    projectileOptions: ProjectileOptions;
}

export class Weapon {
    public spec: WeaponSpecifications;
    public timeBetweenShots: number;

    constructor(spec: WeaponSpecifications) {
        this.spec = spec;
        this.timeBetweenShots = 1000 / this.spec.rateOfFire;
    }
}

export class WeaponInstance {
    public weapon: Weapon;
    public lastShotTime: number;
    public wielder: Player;

    constructor(weapon: Weapon, wielder: Player) {
        this.weapon = weapon;
        this.lastShotTime = -Infinity;
        this.wielder = wielder;
    }

    shoot() {
        if (!this.wielder) return;

        let now = performance.now();
        if (now - this.lastShotTime >= (this.weapon.timeBetweenShots / rofFactor)) {
            playPop(undefined, this.weapon.spec.pitch);

            let origin = this.wielder.getHeadPosition();
            origin.z -= 0.2;
            for (let i = 0; i < this.weapon.spec.projectilesPerShot; i++) {
                let direction = new THREE.Vector3(0, 1, 0);
                let perp = new THREE.Vector3(1, 0, 0);
                let raw = new THREE.Vector3(0, 1, 0);

                // Left and right inaccuracy
                let inacc = isZoom
                    ? this.weapon.spec.inaccuracy / 2
                    : this.weapon.spec.inaccuracy;

                let yawInaccuracy = (Math.random() * 2 - 1) * inacc;

                direction.applyAxisAngle(
                    zAxis,
                    this.wielder.yaw + yawInaccuracy
                );
                perp.applyAxisAngle(zAxis, this.wielder.yaw);
                raw.applyAxisAngle(zAxis, this.wielder.yaw);

                direction.applyAxisAngle(perp, this.wielder.pitch);
                raw.applyAxisAngle(perp, this.wielder.pitch);

                // Rotate around in a circle
                let theta = Math.random() * Math.PI * 2;
                direction.applyAxisAngle(raw, theta);

                let proj = new Projectile(
                    this.weapon.spec.projectileOptions,
                    origin,
                    direction
                );
                proj.shouldCheckCollision = true; // Since it's local.
                this.wielder.currentMap.addProjectile(proj);

                socketSend("createProjectile", {
                    id: proj.id,
                    origin: { x: origin.x, y: origin.y, z: origin.z },
                    direction: {
                        x: proj.direction.x,
                        y: proj.direction.y,
                        z: proj.direction.z
                    },
                    projectileOptions: this.weapon.spec.projectileOptions,
                    weaponId: this.weapon.spec.id
                });
            }

            this.lastShotTime = now;
        } else {
            // Nada!
        }
    }
}

export const ASSAULT_RIFLE = new Weapon({
    id: 0,
    name: "ASSAULT RIFLE",
    pitch: 1,
    rateOfFire: 5,
    inaccuracy: 0.015,
    projectilesPerShot: 1,
    projectileOptions: {
        speed: 100,
        damage: 10
    }
});

export const SHOTGUN = new Weapon({
    id: 1,
    name: "SHOTGUN",
    pitch: 0.5,
    rateOfFire: 1,
    inaccuracy: 0.15,
    projectilesPerShot: 7,
    projectileOptions: {
        speed: 75,
        damage: 10
    }
});

export const SNIPER = new Weapon({
    id: 2,
    name: "SNIPER",
    pitch: 3,
    rateOfFire: 1,
    inaccuracy: 0.002,
    projectilesPerShot: 1,
    projectileOptions: {
        speed: 200,
        damage: 80
    }
});

export const SMG = new Weapon({
    id: 3,
    name: "SMG",
    pitch: 1.4,
    rateOfFire: 10,
    inaccuracy: 0.12,
    projectilesPerShot: 1,
    projectileOptions: {
        speed: 75,
        damage: 8
    }
});

export const weapons: Weapon[] = [ASSAULT_RIFLE, SHOTGUN, SNIPER, SMG];

const PROJECTILE_TRAJECTORY_MATERIAL = new THREE.MeshBasicMaterial({
    color: 0xff004c
});
const MAX_PROJECTILE_LIFETIME = 1000; // Kill it after this many milliseconds. Always.
const TIME_FRAG = 1 / 50; // How "long" the projectile is, relative to its speed. If it moves 5 units per second, and TIME_FRAG is 1/2, then the projectile is 2.5 units long.

interface ProjectileOptions {
    speed: number; // units per second
    damage: number;
}

let ping = new Howl({ src: ["/static/ping.wav"], volume: 0.4, rate: 0.5 });

export class Projectile {
    public options: ProjectileOptions;
    public origin: THREE.Vector3;
    public direction: THREE.Vector3; // This better be normalized!
    public object3D: THREE.Mesh;
    public lastEndPoint: THREE.Vector3;
    public shouldRemove: boolean;
    public spawnTime: number;
    public lifetime: number;
    public shouldCheckCollision: boolean;
    public id: string;
    public hitPlayers: Set<Player>;

    constructor(
        options: ProjectileOptions,
        origin: THREE.Vector3,
        direction: THREE.Vector3
    ) {
        this.id = Math.random().toString();
        this.options = options;
        this.origin = origin;
        this.lastEndPoint = this.origin;
        this.direction = direction;
        this.spawnTime = performance.now();
        this.lifetime = 0;
        this.shouldCheckCollision = false;
        this.shouldRemove = false;
        this.hitPlayers = new Set();

        let lineStart = new THREE.Vector3(0, 0, 0);
        let back = this.direction
            .clone()
            .multiplyScalar(this.options.speed * TIME_FRAG);
        lineStart.sub(back);
        let curve = new THREE.LineCurve3(lineStart, new THREE.Vector3(0, 0, 0));
        let tubeGeometry = new THREE.TubeBufferGeometry(
            curve,
            16,
            0.035,
            6,
            true
        );
        this.object3D = new THREE.Mesh(
            tubeGeometry,
            PROJECTILE_TRAJECTORY_MATERIAL
        );
        this.object3D.castShadow = true;

        this.object3D.position.copy(this.lastEndPoint);
        this.object3D.visible = false;
    }

    update(timeDif: number) {
        let { currentMap } = gameState;

        this.lifetime += timeDif;
        if (this.lifetime >= MAX_PROJECTILE_LIFETIME) {
            this.shouldRemove = true;
        }

        let newEndPoint = this.lastEndPoint.clone();
        let travelled = this.direction
            .clone()
            .multiplyScalar((this.options.speed * timeDif) / 1000);

        let first: THREE.Intersection = null;
        let hitboxes: THREE.Object3D[];
        if (this.shouldCheckCollision) {
            hitboxes = getNonLocalPlayerHitboxes();
            // Ah. Super dirty. Creating an array every time, seriously? Disgustang!!
            let allColliders = [...currentMap.colliders, ...hitboxes];
            let ray = new THREE.Raycaster(
                this.lastEndPoint,
                this.direction,
                0.01,
                travelled.length() * 1.01
            );
            let intersections = ray.intersectObjects(allColliders);
            first = intersections[0];
        }

        if (first) {
            newEndPoint.copy(first.point);
            this.lastEndPoint = newEndPoint;

            this.shouldRemove = true; // It's gonna remove it next frame.

            let player: Player = null;
            players.forEach(a => {
                if (a.hitbox === first.object) {
                    player = a;
                }
            });
            if (player && !this.hitPlayers.has(player)) {
                this.hitPlayers.add(player);

                // We shot a player!
                ping.play();

                socketSend("playerHit", {
                    id: player.id,
                    damage: this.options.damage
                });
            }

            socketSend("removeProjectile", {
                id: this.id
            });
        } else {
            newEndPoint.add(travelled);
            this.lastEndPoint = newEndPoint;
        }

        this.object3D.position.copy(this.lastEndPoint);
        this.object3D.visible = true;
    }
}

handlers["createProjectile"] = function(data: any) {
    let { currentMap } = gameState;
    if (!currentMap) return;

    let projectileOptions = data.projectileOptions as ProjectileOptions;
    let origin = new THREE.Vector3(data.origin.x, data.origin.y, data.origin.z);
    let direction = new THREE.Vector3(
        data.direction.x,
        data.direction.y,
        data.direction.z
    );

    let weapon = weapons.find(weapon => {
        return weapon.spec.id === data.weaponId;
    });

    playPop(origin, weapon.spec.pitch);

    let proj = new Projectile(projectileOptions, origin, direction);
    proj.id = data.id;
    currentMap.addProjectile(proj);
};

handlers["removeProjectile"] = function(data: any) {
    let { currentMap } = gameState;
    if (!currentMap) return;

    let index = currentMap.projectiles.findIndex(a => a.id === data.id);
    if (index !== -1) {
        let proj = currentMap.projectiles[index];
        currentMap.scene.remove(proj.object3D);
        currentMap.projectiles.splice(index, 1);
        proj.object3D.geometry.dispose();
    }
};
