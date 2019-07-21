import * as THREE from "three";
import { localPlayer } from "./player";

export let loadMap = (data, scene) => {
  console.log("Loading map " + data.metadata.name);
  let spawn =
    data.spawnPoints[Math.floor(Math.random() * data.spawnPoints.length)];
  localPlayer.position = new THREE.Vector3(spawn.x, spawn.y, spawn.z);
  let wallMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
  data.objects.forEach(object => {
    switch (object.type) {
      case "box":
        {
          let box = new THREE.Mesh(
            new THREE.BoxGeometry(object.size.x, object.size.y, object.size.z),
            new THREE.MeshPhongMaterial({
              color:
                object.options.color || data.metadata.objectColor || 0x2a2a2a
            })
          );
          box.position.set(
            object.position.x + object.size.x / 2,
            object.position.y + object.size.y / 2,
            object.position.z + object.size.z / 2
          );
          box.receiveShadow = true;
          box.castShadow = true;
          scene.add(box);
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
          scene.add(wallMesh);
        }
        break;
    }
  });
};
