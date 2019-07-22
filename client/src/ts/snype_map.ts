import * as THREE from "three";

export class SnypeMap {
    public rawData: any;
    public metadata: any;
    public spawnPoints: any[];
    public objects: any[];

    public scene: THREE.Scene;
    public drawableObjects: any[];
    public colliders: any[];

    constructor(data: any) {
        this.rawData = null;
        this.metadata = null;
        this.spawnPoints = [];
        this.objects = [];

        // THREE.js stuff
        this.scene = new THREE.Scene();
        this.drawableObjects = [];
        this.colliders = [];

        this.loadRawSMFData(data);
        this.buildScene();
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
        let wallMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });

        data.objects.forEach((object: any) => {
            switch (object.type) {
                case "box":
                    {
                        let boxMesh = new THREE.Mesh(
                            new THREE.BoxGeometry(
                                object.size.x,
                                object.size.y,
                                object.size.z
                            ),
                            new THREE.MeshPhongMaterial({
                                color:
                                    object.options.color ||
                                    data.metadata.objectColor ||
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
                        wallMesh.receiveShadow = true;
                        wallMesh.castShadow = true;

                        this.drawableObjects.push(wallMesh);
                        this.colliders.push(wallMesh);
                    }
                    break;
                case "ramp":
                    {
                        let geometry = new THREE.Geometry();

                        let v3 = THREE.Vector3;

                        geometry.vertices.push(
                            new v3(
                                object.position.x,
                                object.position.y,
                                object.position.z
                            ),
                            new v3(
                                object.position.x + object.size.x,
                                object.position.y,
                                object.position.z
                            ),
                            new v3(
                                object.position.x,
                                object.position.y + object.size.y,
                                object.position.z
                            ),
                            new v3(
                                object.position.x + object.size.x,
                                object.position.y + object.size.y,
                                object.position.z
                            ),
                            new v3(
                                object.position.x,
                                object.position.y,
                                object.position.z + object.size.z
                            ),
                            new v3(
                                object.position.x + object.size.x,
                                object.position.y,
                                object.position.z + object.size.z
                            ),
                            new v3(
                                object.position.x,
                                object.position.y + object.size.y,
                                object.position.z + object.size.z
                            ),
                            new v3(
                                object.position.x + object.size.x,
                                object.position.y + object.size.y,
                                object.position.z + object.size.z
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

                        let rampMesh = new THREE.Mesh(
                            geometry,
                            new THREE.MeshPhongMaterial({
                                color:
                                    object.options.color ||
                                    data.metadata.objectColor ||
                                    0x2a2a2a
                            })
                        );

                        rampMesh.castShadow = true;
                        rampMesh.receiveShadow = true;

                        this.drawableObjects.push(rampMesh);
                        this.colliders.push(rampMesh);
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

        let minX = -1,
            maxX = 1,
            minY = -1,
            maxY = 1;

        this.objects.forEach(obj => {
            if (obj.type !== "wall") return;

            minX = Math.min(minX, obj.position.x);
            maxX = Math.max(maxX, obj.position.x + obj.size.x);
            minY = Math.min(minY, obj.position.y);
            maxY = Math.max(maxY, obj.position.y + obj.size.y);
        });

        let floor = new THREE.Mesh(
            new THREE.PlaneGeometry(maxX - minX, maxY - minY, 1, 1),
            new THREE.MeshPhongMaterial({ color: 0xffffff, wireframe: false })
        );
        floor.position.x = (maxX - minX) / 2;
        floor.position.y = (maxY - minY) / 2;

        floor.receiveShadow = true;
        this.scene.add(floor);
        this.colliders.push(floor);

        // Add lighting

        var sunlight = new THREE.DirectionalLight(0xffffff, 1);
        sunlight.position.set(40, 40, 50);
        sunlight.castShadow = true;
        sunlight.shadow.camera.left = -20;
        sunlight.shadow.camera.right = 20;
        sunlight.shadow.camera.bottom = -20;
        sunlight.shadow.camera.top = 20;
        sunlight.shadow.mapSize.width = 1000;
        sunlight.shadow.mapSize.height = 1000;

        this.scene.add(sunlight);
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    }
}
