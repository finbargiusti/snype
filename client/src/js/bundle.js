(function (THREE) {
  'use strict';

  // CONFIG
  const FOV = 75;
  let scene = new THREE.Scene();
  let camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight);
  let renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  var geometry = new THREE.BoxGeometry(1, 1, 1);
  var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  var cube = new THREE.Mesh(geometry, material);
  scene.add(cube);
  camera.position.z = 5;
  let animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
  };
  animate();

}(THREE));
