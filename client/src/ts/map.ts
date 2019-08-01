import * as THREE from "three";
import { Projectile } from "./weapon";
import { renderer } from "./rendering";
import { radToDeg } from "./misc";

const SUN_DIRECTION = new THREE.Vector3(-40, -40, -50);
SUN_DIRECTION.normalize();
const SUN_CAMERA_DISTANCE = 50;

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

export class SnypeMap {
    public rawData: any;
    public metadata: any;
    public spawnPoints: any[];
    public objects: any[];

    public scene: THREE.Scene;
    public drawableObjects: any[];
    public projectiles: Projectile[];
    public colliders: THREE.Mesh[];

    public objectDataConnection: WeakMap<THREE.Object3D, any>;

    constructor(data: any) {
        this.rawData = null;
        this.metadata = null;
        this.spawnPoints = [];
        this.objects = [];

        // THREE.js stuff
        this.scene = new THREE.Scene();
        this.drawableObjects = [];
        this.projectiles = [];
        this.colliders = [];

        this.objectDataConnection = new WeakMap();

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

    loadRawSMFData(data: any) {
        console.log("Loading map " + data.metadata.name);

        this.rawData = data;

        /*
        let spawn = data.spawnPoints[Math.floor(Math.random() * data.spawnPoints.length)];
        localPlayer.position = new THREE.Vector3(spawn.x, spawn.y, spawn.z);
        */

        this.spawnPoints.push(...data.spawnPoints);
        this.objects.push(...data.objects);

        // TODO: Pull this out to a const
        const wallMaterial = new THREE.MeshLambertMaterial({
            color: 0xffffff,
            opacity: 0.3,
            transparent: true
        });

        data.objects.forEach((object: any) => {
            switch (object.type) {
                case "box":
                    {
                        this.createBox(object);
                    }
                    break;
                case "wall":
                    {
                        let wallMesh = new THREE.Mesh(
                            new THREE.BoxGeometry(
                                object.size.x,
                                object.size.y,
                                data.metadata.wallHeight || 4
                            ),
                            wallMaterial
                        );
                        wallMesh.position.set(
                            object.position.x + object.size.x / 2,
                            object.position.y + object.size.y / 2,
                            (data.metadata.wallHeight || 4) / 2
                        );
                        wallMesh.geometry.computeBoundingBox();
                        wallMesh.geometry.computeBoundingSphere();
                        wallMesh.receiveShadow = true;

                        this.drawableObjects.push(wallMesh);
                        this.colliders.push(wallMesh);
                    }
                    break;
                case "ramp":
                    {
                        this.createRamp(object);
                    }
                    break;
            }
        });
    }

    buildScene() {
        // TODO: Add lights and floor

        this.drawableObjects.forEach(obj => {
            this.scene.add(obj);
        });

        // Add floor

        let minX = 0,
            maxX = 1,
            minY = 0,
            maxY = 1;

        let noWalls = true;
        this.objects.forEach(obj => {
            if (obj.type !== "wall") return;

            noWalls = false;

            minX = Math.min(minX, obj.position.x);
            maxX = Math.max(maxX, obj.position.x + obj.size.x);
            minY = Math.min(minY, obj.position.y);
            maxY = Math.max(maxY, obj.position.y + obj.size.y);
        });

        if (noWalls) {
            minX = -30,
            maxX = 30,
            minY = -30,
            maxY = 30
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

        // Add sky and lighting

        renderer.setClearColor(this.rawData.sky.color);

        let d = this.rawData.sun.direction;
        let normalizedSunDirection = new THREE.Vector3(d.x, d.y, d.z);
        normalizedSunDirection.normalize();

        var sunlight = new THREE.DirectionalLight(this.rawData.sun.color, this.rawData.sun.intensity);
        sunlight.target.position.set(floor.position.x, floor.position.y, 0);
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
    }

    stringify() {
        let version = "v1";
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

        return output;
    }
}
