// client/js/game-viewer.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class GameViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.clock = new THREE.Clock();
    }
    
    init() {
        // Initialiser le renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('game-canvas'),
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        
        // Initialiser la scène
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb); // Bleu ciel
        
        // Initialiser la caméra
        this.camera = new THREE.PerspectiveCamera(
            75, window.innerWidth / window.innerHeight, 0.1, 1000
        );
        this.camera.position.set(10, 10, 10);
        this.camera.lookAt(0, 0, 0);
        
        // Initialiser les contrôles
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        // Gestion du redimensionnement
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Gestion des clics
        window.addEventListener('click', (event) => this.onMouseClick(event));
        
        // Créer la scène 3D
        this.createScene();
    }
    
    createScene() {
        // Lumières
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        // Sol
        const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x228833 });
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100),
            groundMaterial
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.5;
        ground.receiveShadow = true;
        ground.name = "ground";
        ground.userData = { type: "terrain", interactive: false };
        this.scene.add(ground);
        
        // Joueur
        const player = new THREE.Object3D();
        player.name = "player";
        // S'assurer que la position est modifiable
        Object.defineProperty(player, 'position', {
            configurable: true,
            writable: true,
            value: new THREE.Vector3(0, 0, 0)
        });
        
        const playerBody = new THREE.Mesh(
            new THREE.BoxGeometry(1, 2, 1),
            new THREE.MeshStandardMaterial({ color: 0x1155ff })
        );
        playerBody.name = "playerBody";
        playerBody.castShadow = true;
        player.add(playerBody);
        this.scene.add(player);
        
        // Définir une fonction spécifique pour faciliter le déplacement
        player.moveTo = function(x, y, z) {
            this.position.set(x, y, z);
            return this;
        };
        
        // PNJ
        for (let i = 0; i < 3; i++) {
            const npc = new THREE.Group();
            npc.name = `npc_${i}`;
            npc.position.set(5 * (i - 1), 0, 5);
            npc.userData = { 
                type: "npc", 
                interactive: true,
                npcType: ["villager", "merchant", "guard"][i],
                dialogue: ["Bienvenue aventurier!", "Vous désirez acheter quelque chose?", "Halte! Qui va là?"][i]
            };
            
            const npcBody = new THREE.Mesh(
                new THREE.BoxGeometry(1, 2, 1),
                new THREE.MeshStandardMaterial({ color: 0xCC5500 })
            );
            npcBody.name = `npcBody_${i}`;
            npcBody.castShadow = true;
            npc.add(npcBody);
            this.scene.add(npc);
        }
        
        // Coffre
        const chest = new THREE.Mesh(
            new THREE.BoxGeometry(1, 0.8, 1.5),
            new THREE.MeshStandardMaterial({ color: 0x885511 })
        );
        chest.name = "treasureChest";
        chest.position.set(3, 0, -2);
        chest.castShadow = true;
        chest.userData = { type: "container", interactive: true, locked: true, loot: ["gold", "potion"] };
        this.scene.add(chest);
        
        // Temple
        const temple = new THREE.Group();
        temple.name = "ancientTemple";
        temple.position.set(-10, 0, -10);
        
        const templeBase = new THREE.Mesh(
            new THREE.BoxGeometry(8, 1, 8),
            new THREE.MeshStandardMaterial({ color: 0x999999 })
        );
        templeBase.name = "templeBase";
        templeBase.position.y = -0.25;
        templeBase.castShadow = true;
        templeBase.receiveShadow = true;
        temple.add(templeBase);
        
        const templeRoof = new THREE.Mesh(
            new THREE.ConeGeometry(6, 5, 4),
            new THREE.MeshStandardMaterial({ color: 0x777777 })
        );
        templeRoof.name = "templeRoof";
        templeRoof.position.y = 3;
        templeRoof.castShadow = true;
        temple.add(templeRoof);
        
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const column = new THREE.Mesh(
                new THREE.CylinderGeometry(0.5, 0.5, 4),
                new THREE.MeshStandardMaterial({ color: 0xAAAAAA })
            );
            column.name = `templeColumn_${i}`;
            column.position.set(
                Math.sin(angle) * 3,
                2,
                Math.cos(angle) * 3
            );
            column.castShadow = true;
            temple.add(column);
        }
        
        temple.userData = { type: "building", interactive: true, contains: "puzzle" };
        this.scene.add(temple);
    }
    
    // Nouvelle méthode pour suivre le joueur
    centerCameraOnPlayer(smooth = true) {
        const player = this.scene.getObjectByName("player");
        if (player) {
            // Obtenir la position du joueur
            const playerPos = player.position.clone();
            
            if (smooth) {
                // Animation douce de la caméra
                const currentTarget = this.controls.target.clone();
                const currentPos = this.camera.position.clone();
                
                // Calculer la direction et la distance actuelles
                const offset = new THREE.Vector3().subVectors(currentPos, currentTarget);
                const distance = offset.length();
                
                // Définir la nouvelle cible sur le joueur
                this.controls.target.copy(playerPos);
                
                // Maintenir la même distance et orientation
                const newPos = playerPos.clone().add(offset.normalize().multiplyScalar(distance));
                this.camera.position.copy(newPos);
            } else {
                // Changement immédiat
                this.controls.target.copy(playerPos);
                
                // Positionner la caméra au-dessus et en arrière du joueur
                const offset = new THREE.Vector3(5, 5, 5);
                this.camera.position.copy(playerPos).add(offset);
            }
            
            this.controls.update();
        }
    }

    // Méthode pour synchroniser l'affichage avec l'état du jeu
    syncWithGameState(gameState) {
        if (!gameState) return;
        
        // Synchroniser la position du joueur
        const player = this.scene.getObjectByName("player");
        const playerState = gameState.player;
        
        if (player && playerState && playerState.position) {
            player.position.set(
                playerState.position.x,
                playerState.position.y,
                playerState.position.z
            );
            
            // Centre la caméra sur le joueur après déplacement
            this.centerCameraOnPlayer();
        }
        
        // On pourrait synchroniser d'autres éléments ici
        
        // Forcer un rendu pour appliquer les changements immédiatement
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    onMouseClick(event) {
        // Calculer la position de la souris en coordonnées normalisées (-1 à +1)
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Lancer un rayon depuis la caméra
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Vérifier les intersections avec les objets
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        if (intersects.length > 0) {
            // Remonter jusqu'à l'objet parent si nécessaire (pour les groupes)
            let selectedObject = intersects[0].object;
            while(selectedObject.parent && selectedObject.parent !== this.scene) {
                selectedObject = selectedObject.parent;
            }
            
            // Afficher les informations sur l'objet
            this.showObjectInfo(selectedObject);
        }
    }
    
    showObjectInfo(object) {
        const infoDiv = document.getElementById('object-info');
        let info = `<h3>${object.name}</h3>`;
        
        info += `<p>Type: ${object.type}</p>`;
        info += `<p>Position: x=${object.position.x.toFixed(2)}, y=${object.position.y.toFixed(2)}, z=${object.position.z.toFixed(2)}</p>`;
        
        if (object.userData && Object.keys(object.userData).length > 0) {
            info += `<h4>Propriétés:</h4><ul>`;
            for (const [key, value] of Object.entries(object.userData)) {
                if (typeof value === 'object') {
                    info += `<li>${key}: ${JSON.stringify(value)}</li>`;
                } else {
                    info += `<li>${key}: ${value}</li>`;
                }
            }
            info += `</ul>`;
        }
        
        infoDiv.innerHTML = info;
    }
    
    toggleWireframe() {
        this.scene.traverse((object) => {
            if (object.isMesh) {
                object.material.wireframe = !object.material.wireframe;
            }
        });
    }
    
    focusObject(objectName) {
        const object = this.scene.getObjectByName(objectName);
        if (object) {
            // Calculer les limites de l'objet
            const box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            // Ajuster la position de la caméra
            const distance = Math.max(size.x, size.y, size.z) * 2.5;
            const direction = new THREE.Vector3(1, 1, 1).normalize();
            
            this.controls.target.copy(center);
            this.camera.position.copy(center).add(direction.multiplyScalar(distance));
            this.controls.update();
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const delta = this.clock.getDelta();
        
        // Mise à jour des contrôles
        this.controls.update();
        
        // Ajouter des animations ici si nécessaire
        
        // Rendu
        this.renderer.render(this.scene, this.camera);
    }
}