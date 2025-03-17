// test-game.js
import * as THREE from 'three';
import { GameState } from './src/game-connector.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Mise en place de la scène de test
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(10, 10, 10);

// Contrôles pour naviguer dans la scène
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.update();

// Initialiser l'état du jeu
const gameState = new GameState();
await gameState.initialize();

// Ajouter la scène mockée au renderer
const scene = gameState.scene;

// Ajouter un éclairage de base
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// Fonction d'animation
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// Démarrer l'animation
animate();

// Afficher un message indiquant que les tests peuvent commencer
console.log("Environnement de test chargé. Le serveur MCP peut maintenant être connecté.");
