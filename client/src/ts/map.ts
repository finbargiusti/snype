import * as THREE from "three";
import { Projectile } from "./weapon";
import { renderer } from "./rendering";
import { radToDeg, removeItemFromArray } from "./misc";
import "./power_up";
import { PowerUp } from "./power_up";
import { handlers } from "./net";
import { gameState } from "./game_state";

const SUN_DIRECTION = new THREE.Vector3(-40, -40, -50);
SUN_DIRECTION.normalize();
const SUN_CAMERA_DISTANCE = 50;
const WALL_THICKNESS = 0.1;

export function createBoxGeometry(object: any) {
    let geometry = new THREE.BoxGeometry(
        object.size.x,
        object.size.y,
        object.size.z
    );

    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    return geometry;
}

export function createRampGeometry(object: any) {
    let geometry = new THREE.Geometry();

    let v3 = THREE.Vector3;

    let centerX = object.position.x + object.size.x/2,
        centerY = object.position.y + object.size.y/2,
        centerZ = object.position.z + object.size.z/2;

    geometry.vertices.push(
        new v3(
            object.position.x - centerX,
            object.position.y - centerY,
            object.position.z - centerZ
        ),
        new v3(
            object.position.x + object.size.x - centerX,
            object.position.y - centerY,
            object.position.z - centerZ
        ),
        new v3(
            object.position.x - centerX,
            object.position.y + object.size.y - centerY,
            object.position.z - centerZ
        ),
        new v3(
            object.position.x + object.size.x - centerX,
            object.position.y + object.size.y - centerY,
            object.position.z - centerZ
        ),
        new v3(
            object.position.x - centerX,
            object.position.y - centerY,
            object.position.z + object.size.z - centerZ
        ),
        new v3(
            object.position.x + object.size.x - centerX,
            object.position.y - centerY,
            object.position.z + object.size.z - centerZ
        ),
        new v3(
            object.position.x - centerX,
            object.position.y + object.size.y - centerY,
            object.position.z + object.size.z - centerZ
        ),
        new v3(
            object.position.x + object.size.x - centerX,
            object.position.y + object.size.y - centerY,
            object.position.z + object.size.z - centerZ
        )
    );

    let f3 = THREE.Face3;

    geometry.faces.push(new f3(2, 1, 0), new f3(3, 1, 2));

    switch (object.orientation) {
        case "-x":
            {
                geometry.faces.push(
                    new f3(1, 6, 4),
                    new f3(3, 6, 1),
                    new f3(1, 4, 0),
                    new f3(2, 6, 3),
                    new f3(0, 4, 6),
                    new f3(2, 0, 6)
                );
            }
            break;
        case "+x":
            {
                geometry.faces.push(
                    new f3(0, 5, 2),
                    new f3(5, 7, 2),
                    new f3(1, 5, 0),
                    new f3(3, 2, 7),
                    new f3(1, 3, 7),
                    new f3(1, 7, 5)
                );
            }
            break;
        case "-y":
            {
                geometry.faces.push(
                    new f3(4, 5, 2),
                    new f3(5, 3, 2),
                    new f3(5, 1, 3),
                    new f3(2, 0, 4),
                    new f3(5, 4, 0),
                    new f3(0, 1, 5)
                );
            }
            break;
        case "+y":
            {
                geometry.faces.push(
                    new f3(1, 6, 0),
                    new f3(1, 7, 6),
                    new f3(1, 3, 7),
                    new f3(2, 0, 6),
                    new f3(3, 2, 6),
                    new f3(3, 6, 7)
                );
            }
            break;
    }

    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    geometry.computeFaceNormals();
    // Commented out based on: https://gamedev.stackexchange.com/questions/93031/three-js-lighting-not-calculating-correctly-on-three-geometry-objects
    // geometry.computeVertexNormals();

    return geometry;
}

// TODO: Pull this out to a const
const wallMaterial = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    opacity: 0.3,
    transparent: true
});

export class SnypeMap {
    public rawData: any;
    public metadata: any;
    public spawnPoints: any[];
    public objects: any[];

    public scene: THREE.Scene;
    public drawableObjects: any[];
    public projectiles: Projectile[];
    public powerUps: PowerUp[];
    public colliders: THREE.Mesh[];

    public objectDataConnection: Map<THREE.Object3D, any>;

    public wallDrawables: THREE.Mesh[] = [];
    public floorDrawable: THREE.Mesh = null;

    constructor(data: any) {
        this.rawData = null;
        this.metadata = null;
        this.spawnPoints = [];
        this.objects = [];

        // THREE.js stuff
        this.scene = new THREE.Scene();
        this.drawableObjects = [];
        this.projectiles = [];
        this.powerUps = [];
        this.colliders = [];

        this.objectDataConnection = new Map();

        this.loadRawSMFData(data);
        this.buildScene();
    }

    createBox(object: any) {
        let boxMesh = new THREE.Mesh(
            createBoxGeometry(object),
            new THREE.MeshPhongMaterial({
                color:
                    object.options.color ||
                    this.rawData.metadata.objectColor ||
                    0x2a2a2a
            })
        );
        boxMesh.position.set(
            object.position.x + object.size.x / 2,
            object.position.y + object.size.y / 2,
            object.position.z + object.size.z / 2
        );
        boxMesh.receiveShadow = true;
        boxMesh.castShadow = true;

        this.drawableObjects.push(boxMesh);
        this.colliders.push(boxMesh);
        this.objectDataConnection.set(boxMesh, object);

        return { drawable: boxMesh };
    }

    createRamp(object: any) {
        let rampMesh = new THREE.Mesh(
            createRampGeometry(object),
            new THREE.MeshPhongMaterial({
                color:
                    object.options.color ||
                    this.rawData.metadata.objectColor ||
                    0x2a2a2a
            })
        );

        let centerX = object.position.x + object.size.x/2,
        centerY = object.position.y + object.size.y/2,
        centerZ = object.position.z + object.size.z/2;

        rampMesh.position.set(centerX, centerY, centerZ);
        rampMesh.castShadow = true;
        rampMesh.receiveShadow = true;

        this.drawableObjects.push(rampMesh);
        this.colliders.push(rampMesh);
        this.objectDataConnection.set(rampMesh, object);

        return { drawable: rampMesh };
    }

    createWallsAndFloor(object: any) {
        for (let drawable of this.wallDrawables) {
            //this.scene.remove(drawable);
            //removeItemFromArray(this.colliders, drawable);
        }
        if (this.floorDrawable) {
            this.scene.remove(this.floorDrawable);
            removeItemFromArray(this.colliders, this.floorDrawable);
        }

        for (let i = 0; i < 4; i++) {
            // 0: minX
            // 1: maxX
            // 2: minY
            // 3: maxY

            let position, size;
            if (i === 0) {
                position = {
                    x: object.minX - WALL_THICKNESS,
                    y: object.minY
                };
                size = {
                    x: WALL_THICKNESS,
                    y: object.maxY - object.minY
                };
            } else if (i === 1) {
                position = {
                    x: object.maxX,
                    y: object.minY
                };
                size = {
                    x: WALL_THICKNESS,
                    y: object.maxY - object.minY
                };
            } else if (i === 2) {
                position = {
                    x: object.minX,
                    y: object.minY - WALL_THICKNESS
                };
                size = {
                    x: object.maxX - object.minX,
                    y: WALL_THICKNESS
                };
            } else if (i === 3) {
                position = {
                    x: object.minX,
                    y: object.maxY
                };
                size = {
                    x: object.maxX - object.minX,
                    y: WALL_THICKNESS
                };
            }

            let wallMesh = new THREE.Mesh(
                new THREE.BoxGeometry(
                    size.x,
                    size.y,
                    this.rawData.metadata.wallHeight || 4
                ),
                wallMaterial
            );
            wallMesh.position.set(
                position.x + size.x / 2,
                position.y + size.y / 2,
                (this.rawData.metadata.wallHeight || 4) / 2
            );
            wallMesh.geometry.computeBoundingBox();
            wallMesh.geometry.computeBoundingSphere();
            wallMesh.receiveShadow = true;

            if (this.wallDrawables[i]) {
                this.wallDrawables[i].geometry = wallMesh.geometry;
                this.wallDrawables[i].material = wallMesh.material;
                this.wallDrawables[i].position.copy(wallMesh.position);
            } else {
                this.wallDrawables[i] = wallMesh;

                this.drawableObjects.push(wallMesh);
                this.colliders.push(wallMesh);
                this.scene.add(wallMesh);
                this.objectDataConnection.set(wallMesh, object);
            }
        }

        let minX, maxX, minY, maxY;

        if (!this.rawData.wall) {
            minX = -30,
            maxX = 30,
            minY = -30,
            maxY = 30
        } else {
            minX = this.rawData.wall.minX;
            maxX = this.rawData.wall.maxX;
            minY = this.rawData.wall.minY;
            maxY = this.rawData.wall.maxY;
        }

        let floor = new THREE.Mesh(
            new THREE.PlaneGeometry(maxX - minX, maxY - minY, 1, 1),
            new THREE.MeshPhongMaterial({ color: 0xffffff, wireframe: false })
        );
        floor.position.x = (maxX + minX) / 2;
        floor.position.y = (maxY + minY) / 2;
        floor.geometry.computeBoundingBox();

        floor.receiveShadow = true;
        this.scene.add(floor);
        this.colliders.push(floor);
        this.floorDrawable = floor;
    }

    loadRawSMFData(data: any) {
        console.log("Loading map " + data.metadata.name);

        this.rawData = data;

        /*
        let spawn = data.spawnPoints[Math.floor(Math.random() * data.spawnPoints.length)];
        localPlayer.position = new THREE.Vector3(spawn.x, spawn.y, spawn.z);
        */

        this.spawnPoints.push(...data.spawnPoints);
        this.objects.push(...data.objects);

        data.objects.forEach((object: any) => {
            switch (object.type) {
                case "box":
                    {
                        this.createBox(object);
                    }
                    break;
                    /*
                case "wall":
                    {
                        this.createWall(object);   
                    }
                    break;*/
                case "ramp":
                    {
                        this.createRamp(object);
                    }
                    break;
            }
        });
    }

    buildScene() {
        this.drawableObjects.forEach(obj => {
            this.scene.add(obj);
        });

        // Add walls and floor
        this.createWallsAndFloor(this.rawData.wall);

        // Add sky and lighting

        renderer.setClearColor(this.rawData.sky.color);

        let d = this.rawData.sun.direction;
        let normalizedSunDirection = new THREE.Vector3(d.x, d.y, d.z);
        normalizedSunDirection.normalize();

        var sunlight = new THREE.DirectionalLight(this.rawData.sun.color, this.rawData.sun.intensity);
        sunlight.target.position.set(this.floorDrawable.position.x, this.floorDrawable.position.y, 0);
        sunlight.position.copy(sunlight.target.position);
        sunlight.position.add(normalizedSunDirection.clone().negate().multiplyScalar(SUN_CAMERA_DISTANCE));
        sunlight.castShadow = true;
        sunlight.shadow.camera.left = -20;
        sunlight.shadow.camera.right = 20;
        sunlight.shadow.camera.bottom = -20;
        sunlight.shadow.camera.top = 20;
        sunlight.shadow.mapSize.width = 1000;
        sunlight.shadow.mapSize.height = 1000;

        var sun = new THREE.Mesh(
            new THREE.IcosahedronBufferGeometry(75, 3),
            new THREE.MeshBasicMaterial({color: this.rawData.sun.color, transparent: true, opacity: this.rawData.sun.intensity})
        );
        sun.position.add(normalizedSunDirection.clone().negate().multiplyScalar(1000));
        sun.castShadow = sun.receiveShadow = false;
        this.scene.add(sun);

        this.scene.add(sunlight);
        this.scene.add(new THREE.AmbientLight(this.rawData.ambience.color, this.rawData.ambience.intensity));
    }

    addProjectile(proj: Projectile) {
        this.projectiles.push(proj);
        this.scene.add(proj.object3D);
    }

    addPowerUp(p: PowerUp) {
        this.powerUps.push(p);
        this.scene.add(p.mesh);
    }

    update(timeDif: number) {
        for (let projectile of this.projectiles) {
            if (projectile.shouldRemove) {
                this.scene.remove(projectile.object3D);
                this.projectiles.splice(
                    this.projectiles.indexOf(projectile),
                    1
                );
                projectile.object3D.geometry.dispose();
            }

            projectile.update(timeDif);
        }

        for (let powerUp of this.powerUps) {
            powerUp.update();
        }
    }

    stringify() {
        let version = "v2";
        let output = "";

        function addLine(str: string) {
            output += str + "\n";
        }
        function formatOptions(obj: any) {
            if (!obj.options) return "";

            let str = "";

            for (let key in obj.options) {
                str += " --" + key + " " + JSON.stringify(obj.options[key]);
            }

            return str;
        }

        addLine("#! " + version);
        addLine("---");
        for (let key in this.rawData.metadata) {
            addLine(key + ": " + JSON.stringify(this.rawData.metadata[key]));
        }
        addLine("---");

        {
            let sky = this.rawData.sky;
            let line = "";
            line += `Sky ${sky.color}`;
            line += formatOptions(sky);
            addLine(line);
        }
        {
            let sun = this.rawData.sun;
            let line = "";
            line += `Sun ${sun.direction.x} ${sun.direction.y} ${sun.direction.z} ${sun.color} ${sun.intensity}`;
            line += formatOptions(sun);
            addLine(line);
        }
        {
            let ambience = this.rawData.ambience;
            let line = "";
            line += `Ambience ${ambience.color} ${ambience.intensity}`;
            line += formatOptions(ambience);
            addLine(line);
        }
        {
            let wall = this.rawData.wall;
            let line = "";
            line += `Wall ${wall.minX} ${wall.maxX} ${wall.minY} ${wall.maxY}`;
            line += formatOptions(wall);
            addLine(line);
        }

        for (let spawn of this.rawData.spawnPoints) {
            let line = `Spawn ${spawn.x} ${spawn.y} ${spawn.z} ${radToDeg(spawn.yaw)}`;
            addLine(line);
        }
        for (let obj of this.rawData.objects) {
            switch (obj.type) {
                case "box": {
                    let line = `Box ${obj.position.x} ${obj.position.y} ${obj.position.z} ${obj.size.x} ${obj.size.y} ${obj.size.z}`;
                    line += formatOptions(obj);
                    addLine(line);
                }; break;
                case "ramp": {
                    let line = `Ramp ${obj.position.x} ${obj.position.y} ${obj.position.z} ${obj.size.x} ${obj.size.y} ${obj.size.z} ${JSON.stringify(obj.orientation)}`;
                    line += formatOptions(obj);
                    addLine(line);
                }; break;
                case "wall": {
                    let line = `Wall ${obj.position.x} ${obj.position.y} ${obj.size.x} ${obj.size.y}`;
                    line += formatOptions(obj);
                    addLine(line);
                }; break;
            }
        }
        for (let powerUp of this.rawData.powerUps) {
            let line = `PowerUp ${powerUp.position.x} ${powerUp.position.y} ${powerUp.position.z}`;
            line += formatOptions(powerUp);
            addLine(line);
        }

        return output;
    }
}