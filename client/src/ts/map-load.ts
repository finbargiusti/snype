import * as THREE from "three";
import { localPlayer } from "./player";

export let loadMap = (data, scene) => {
  console.log("Loading map " + data.name);
  let spawn =
    data.spawnPoints[Math.floor(Math.random() * data.spawnPoints.length)];
  localPlayer.position = new THREE.Vector3(...spawn);
  let objectMaterial = new THREE.MeshLambertMaterial({
    color: data.objectColor || 0x2a2a2a
  });
  data.objects.forEach(object => {
    switch (object.type) {
      case "box":
        let box = new THREE.Mesh(
          new THREE.BoxGeometry(...object.size),
          objectMaterial
        );
        box.position.set(
          object.position[0] + object.size[0] / 2,
          object.position[1] + object.size[1] / 2,
          object.position[2] + object.size[2] / 2
        );
        box.receiveShadow = true;
        box.castShadow = true;
        scene.add(box);
    }
  });
  let wallMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
  data.walls.forEach(wall => {
    let wallMesh = new THREE.Mesh(
      new THREE.BoxGeometry(...wall.size, data.wallHeight),
      wallMaterial
    );
    wallMesh.position.set(
      wall.position[0] + wall.size[0] / 2,
      wall.position[1] + wall.size[1] / 2,
      data.wallHeight / 2
    );
    wallMesh.receiveShadow = true;
    wallMesh.castShadow = true;
    scene.add(wallMesh);
  });
};
