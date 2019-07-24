import { Player, getNonLocalPlayerHitboxes, players } from "./player";
import * as THREE from "three";
import { gameState } from "./game_state";
import { socketSend, handlers } from "./net";
import { zAxis, xAxis } from "./rendering";

interface WeaponSpecifications {
    name: string;
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
        if (now - this.lastShotTime >= this.weapon.timeBetweenShots) {
            let origin = this.wielder.getHeadPosition();
            origin.z -= 0.2;

            for (let i = 0; i < this.weapon.spec.projectilesPerShot; i++) {
                let direction = new THREE.Vector3(0, 1, 0);
                let yawInaccuracy =
                    (Math.random() * 2 - 1) * this.weapon.spec.inaccuracy;
                let pitchInaccuracy =
                    (Math.random() * 2 - 1) * this.weapon.spec.inaccuracy;
                direction.applyAxisAngle(
                    xAxis,
                    pitchInaccuracy + this.wielder.pitch
                );
                direction.applyAxisAngle(
                    zAxis,
                    yawInaccuracy + this.wielder.yaw
                );

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
                    projectileOptions: this.weapon.spec.projectileOptions
                });
            }

            this.lastShotTime = now;
        } else {
            // Nada!
        }
    }
}

export const ASSAULT_RIFLE = new Weapon({
    name: "ASSAULT RIFLE",
    rateOfFire: 5,
    inaccuracy: 0.015,
    projectilesPerShot: 1,
    projectileOptions: {
        speed: 100,
        damage: 10
    }
});

export const SHOTGUN = new Weapon({
    name: "SHOTGUN",
    rateOfFire: 1,
    inaccuracy: 0.15,
    projectilesPerShot: 6,
    projectileOptions: {
        speed: 75,
        damage: 10
    }
});

export const SNIPER = new Weapon({
    name: "SNIPER",
    rateOfFire: 0.75,
    inaccuracy: 0.002,
    projectilesPerShot: 1,
    projectileOptions: {
        speed: 200,
        damage: 80
    }
});

export const SMG = new Weapon({
    name: "SMG",
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

interface ProjectileOptions {
    speed: number; // units per second
    damage: number;
}

export class Projectile {
    public options: ProjectileOptions;
    public origin: THREE.Vector3;
    public direction: THREE.Vector3; // This better be normalized!
    public object3D: THREE.Mesh;
    public lastEndPoint: THREE.Vector3;
    public shouldRemove: boolean = false;
    public spawnTime: number;
    public lifetime: number;
    public shouldCheckCollision: boolean;
    public id: string;

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

        let shittyCurve = new THREE.LineCurve3(this.origin, this.origin);
        let shittyTube = new THREE.TubeBufferGeometry(
            shittyCurve,
            0,
            0,
            0,
            true
        );
        this.object3D = new THREE.Mesh(
            shittyTube,
            PROJECTILE_TRAJECTORY_MATERIAL
        );
        this.object3D.castShadow = true;
    }

    update(timeDif: number) {
        let { currentMap } = gameState;

        // GC shit
        this.object3D.geometry.dispose();

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
            if (player) {
                // We shot a player!

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

        let lineStart = this.lastEndPoint.clone();
        let timeFrag = 1 / 50; // How "long" the projectile is, relative to its speed. If it moves 5 units per second, and timeFrag is 1/2, then the projectile is 2.5 units long.
        if (this.lifetime < timeFrag * 1000) {
            lineStart = this.origin;
        } else {
            let back = this.direction
                .clone()
                .multiplyScalar(this.options.speed * timeFrag);
            lineStart.sub(back);
        }

        let curve = new THREE.LineCurve3(lineStart, this.lastEndPoint);
        let tubeGeom = new THREE.TubeBufferGeometry(curve, 16, 0.035, 6, true);
        this.object3D.geometry = tubeGeom;
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
