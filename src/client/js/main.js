// client/js/main.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GameViewer } from './game-viewer.js';
import { McpBridge } from './mcp-bridge.js'; // Importer le pont de communication

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    // Initialiser le GameViewer et l'exposer globalement pour que le MCP puisse y accéder
    const gameViewer = new GameViewer();
    gameViewer.init();
    window.gameViewer = gameViewer;
    
    // Initialiser le pont de communication avec le MCP
    const mcpBridge = new McpBridge(gameViewer);
    window.mcpBridge = mcpBridge; // Exposer globalement pour faciliter l'accès
    
    // Démarrer la boucle d'animation
    gameViewer.animate();
    
    // Ajouter des contrôles à l'interface
    createUI(gameViewer, mcpBridge);
    
    // Écouter les messages de mise à jour de l'interface via window.postMessage
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'GAME_UPDATE') {
            handleGameUpdate(event.data, gameViewer);
        }
    });
    
    // Informations de débogage dans la console
    console.log("Taille de la scène:", gameViewer.scene.children.length, "objets");
    console.log("Position initiale du joueur:", gameViewer.scene.getObjectByName('player').position);
});

function createUI(gameViewer, mcpBridge) {
    // Interface principale
    const controlPanel = document.createElement('div');
    controlPanel.className = 'control-panel';
    controlPanel.style.position = 'absolute';
    controlPanel.style.top = '10px';
    controlPanel.style.right = '10px';
    controlPanel.style.padding = '10px';
    controlPanel.style.background = 'rgba(0,0,0,0.7)';
    controlPanel.style.color = 'white';
    controlPanel.style.borderRadius = '5px';
    controlPanel.style.zIndex = '1000';
    
    // Titre
    const title = document.createElement('h3');
    title.textContent = 'Contrôles du jeu';
    title.style.margin = '0 0 10px 0';
    controlPanel.appendChild(title);
    
    // Bouton pour centrer la caméra sur le joueur
    const centerButton = document.createElement('button');
    centerButton.textContent = 'Centrer sur le joueur';
    centerButton.style.display = 'block';
    centerButton.style.margin = '5px 0';
    centerButton.style.padding = '5px 10px';
    centerButton.addEventListener('click', () => {
        gameViewer.centerCameraOnPlayer(true);
    });
    controlPanel.appendChild(centerButton);
    
    // Bouton de test pour déplacer le joueur directement
    const testMoveButton = document.createElement('button');
    testMoveButton.textContent = 'Test: Déplacer vers (-5,0,-5)';
    testMoveButton.style.display = 'block';
    testMoveButton.style.margin = '5px 0';
    testMoveButton.style.padding = '5px 10px';
    testMoveButton.addEventListener('click', () => {
        mcpBridge.movePlayer(-5, 0, -5);
        console.log("Test: Joueur déplacé vers (-5,0,-5)");
    });
    controlPanel.appendChild(testMoveButton);
    
    // Bouton pour afficher le wireframe
    const wireframeButton = document.createElement('button');
    wireframeButton.textContent = 'Afficher wireframe';
    wireframeButton.style.display = 'block';
    wireframeButton.style.margin = '5px 0';
    wireframeButton.style.padding = '5px 10px';
    wireframeButton.addEventListener('click', () => {
        gameViewer.toggleWireframe();
    });
    controlPanel.appendChild(wireframeButton);
    
    // Boutons de focus sur différents objets
    const templeButton = document.createElement('button');
    templeButton.textContent = 'Focus temple';
    templeButton.style.display = 'block';
    templeButton.style.margin = '5px 0';
    templeButton.style.padding = '5px 10px';
    templeButton.addEventListener('click', () => {
        gameViewer.focusObject('ancientTemple');
    });
    controlPanel.appendChild(templeButton);
    
    document.body.appendChild(controlPanel);
    
    // Affichage des coordonnées
    const coordsDisplay = document.createElement('div');
    coordsDisplay.id = 'coords-display';
    coordsDisplay.style.position = 'absolute';
    coordsDisplay.style.bottom = '10px';
    coordsDisplay.style.left = '10px';
    coordsDisplay.style.padding = '5px';
    coordsDisplay.style.background = 'rgba(0,0,0,0.7)';
    coordsDisplay.style.color = 'white';
    coordsDisplay.style.borderRadius = '3px';
    coordsDisplay.style.zIndex = '1000';
    coordsDisplay.style.fontFamily = 'monospace';
    document.body.appendChild(coordsDisplay);
    
    // Mettre à jour les coordonnées en temps réel
    setInterval(() => {
        const player = gameViewer.scene.getObjectByName('player');
        if (player) {
            coordsDisplay.textContent = `Joueur: x=${player.position.x.toFixed(2)}, y=${player.position.y.toFixed(2)}, z=${player.position.z.toFixed(2)}`;
        }
    }, 100);
}

// Gestionnaire des mises à jour du jeu
function handleGameUpdate(update, gameViewer) {
    console.log("Mise à jour reçue:", update);
    
    if (update.action === 'PLAYER_MOVED') {
        // Mettre à jour manuellement la position du joueur dans la scène
        const player = gameViewer.scene.getObjectByName('player');
        if (player) {
            player.position.set(
                update.position.x,
                update.position.y,
                update.position.z
            );
            
            // Optionnellement, centrer la caméra sur le joueur
            gameViewer.centerCameraOnPlayer(true);
            
            // Forcer un rendu
            gameViewer.renderer.render(gameViewer.scene, gameViewer.camera);
            
            console.log(`Joueur déplacé visuellement vers (${update.position.x}, ${update.position.y}, ${update.position.z})`);
        }
    }
}

function setupKeyboardControls() {
    // Variables pour suivre les touches pressées
    const keysPressed = {};
    const moveSpeed = 0.2; // Vitesse de déplacement par frame
    
    // Suivi des touches pressées
    window.addEventListener('keydown', (event) => {
        keysPressed[event.key] = true;
    });
    
    window.addEventListener('keyup', (event) => {
        keysPressed[event.key] = false;
    });
    
    // Afficher un guide pour les contrôles
    const controlsGuide = document.createElement('div');
    controlsGuide.innerHTML = `
        <h3>Contrôles clavier</h3>
        <p>Z/↑: Avancer</p>
        <p>S/↓: Reculer</p>
        <p>Q/←: Gauche</p>
        <p>D/→: Droite</p>
        <p>Espace: Sauter</p>
        <p>Shift: Accélérer</p>
    `;
    controlsGuide.style.position = 'absolute';
    controlsGuide.style.left = '10px';
    controlsGuide.style.top = '50px';
    controlsGuide.style.background = 'rgba(0,0,0,0.7)';
    controlsGuide.style.color = 'white';
    controlsGuide.style.padding = '10px';
    controlsGuide.style.borderRadius = '5px';
    controlsGuide.style.zIndex = '1000';
    document.body.appendChild(controlsGuide);
    
    // Fonction à appeler dans votre boucle d'animation
    return function updatePlayerMovement() {
        if (!player) return;
        
        // Calculer la direction par rapport à la caméra
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        
        // Vecteurs de direction
        const forward = new THREE.Vector3(cameraDirection.x, 0, cameraDirection.z).normalize();
        const right = new THREE.Vector3(forward.z, 0, -forward.x);
        
        // Facteur de vitesse (shift pour courir)
        const speedFactor = keysPressed['Shift'] ? 2 : 1;
        
        // Déplacement actuel
        let moved = false;
        const movement = new THREE.Vector3(0, 0, 0);
        
        // Avancer (Z, w ou flèche haut)
        if (keysPressed['z'] || keysPressed['Z'] || keysPressed['w'] || keysPressed['W'] || keysPressed['ArrowUp']) {
            movement.add(forward.clone().multiplyScalar(moveSpeed * speedFactor));
            moved = true;
        }
        
        // Reculer (S ou flèche bas)
        if (keysPressed['s'] || keysPressed['S'] || keysPressed['ArrowDown']) {
            movement.add(forward.clone().multiplyScalar(-moveSpeed * speedFactor));
            moved = true;
        }
        
        // Gauche (Q, a ou flèche gauche)
        if (keysPressed['q'] || keysPressed['Q'] || keysPressed['a'] || keysPressed['A'] || keysPressed['ArrowLeft']) {
            movement.add(right.clone().multiplyScalar(-moveSpeed * speedFactor));
            moved = true;
        }
        
        // Droite (D ou flèche droite)
        if (keysPressed['d'] || keysPressed['D'] || keysPressed['ArrowRight']) {
            movement.add(right.clone().multiplyScalar(moveSpeed * speedFactor));
            moved = true;
        }
        
        // Sauter (Espace)
        if (keysPressed[' ']) {
            // Simulation simple de saut
            if (player.position.y <= 0.1) { // Si au sol ou presque
                movement.y = 0.3; // Impulsion de saut
            }
            moved = true;
        }
        
        // Appliquer la gravité
        if (player.position.y > 0) {
            movement.y -= 0.01; // Force de gravité
            moved = true;
        } else if (player.position.y < 0) {
            // Empêcher de descendre sous le sol
            player.position.y = 0;
            moved = true;
        }
        
        // Appliquer le mouvement s'il y en a un
        if (moved) {
            player.position.add(movement);
            updatePlayerCoords();
            
            // Optionnel: mettre à jour dans localStorage pour synchronisation
            localStorage.setItem('mcp_player_position', JSON.stringify({
                x: player.position.x,
                y: player.position.y,
                z: player.position.z
            }));
            
            // Suivre avec la caméra
            if (cameraFollowsPlayer) {
                centerCameraOnPlayer(true);
            }
        }
        
        return moved;
    };
}

// Variable pour suivre si la caméra doit suivre le joueur
let cameraFollowsPlayer = false;

// Ajouter un bouton pour activer/désactiver le suivi caméra
function addCameraFollowToggle() {
    const followButton = document.createElement('button');
    followButton.textContent = 'Activer suivi caméra';
    followButton.style.position = 'absolute';
    followButton.style.bottom = '10px';
    followButton.style.right = '10px';
    followButton.style.zIndex = '1000';
    
    followButton.addEventListener('click', () => {
        cameraFollowsPlayer = !cameraFollowsPlayer;
        followButton.textContent = cameraFollowsPlayer ? 'Désactiver suivi caméra' : 'Activer suivi caméra';
        
        if (cameraFollowsPlayer) {
            centerCameraOnPlayer(true);
        }
    });
    
    document.body.appendChild(followButton);
}

// Initialiser les contrôles et le suivi
const updatePlayerMovement = setupKeyboardControls();
addCameraFollowToggle();

// Modifier la fonction animate() pour intégrer le mouvement
function animate() {
    // Mettre à jour le mouvement du joueur basé sur les touches
    updatePlayerMovement();
    
    // Mettre à jour les contrôles
    controls.update();
    
    // Rendu
    renderer.render(scene, camera);
    
    // Continuer l'animation
    requestAnimationFrame(animate);
}