import * as THREE from "three";
import { scene, zAxis } from "./rendering";

export function getNearestDistance(
    point: THREE.Vector3,
    direcOverride?: THREE.Vector3
) {
    let closest: THREE.Intersection = null;

    for (let i = 0; i < 8; i++) {
        if (i % 2) continue; // AYEEEE

        let direc = new THREE.Vector3(0, 1, 0);
        direc.applyAxisAngle(zAxis, (i * Math.PI) / 4); // one vector every 45°
        if (direcOverride) direc = direcOverride;

        let ray = new THREE.Raycaster(point, direc, 0, 20);

        let intersections = ray.intersectObjects(scene.children);
        for (let j = 0; j < intersections.length; j++) {
            let intersection = intersections[j];

            if (closest === null) {
                closest = intersection;
            } else {
                if (intersection.distance < closest.distance) {
                    closest = intersection;
                }
            }
        }
    }

    return closest;
}
