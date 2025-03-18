// src/game-connector.js
import * as THREE from 'three';

export class GameState {
  constructor() {
    this.scene = null;
    this.player = null;
    this.environment = null;
    this.quests = [];
    this.npcs = [];
    this.terrains = [];
    this.isInitialized = false;
    
    // État du jeu simulé pour l'exemple
    this.simulatedState = {
      scene: null, // Sera initialisé dans initialize()
      player: this._createMockPlayer(),
      environment: this._createMockEnvironment(),
      quests: this._createMockQuests(),
    };
    
    // Cache pour les assets et ressources générées
    this.assetCache = {
      models: {},
      textures: {},
      materials: {}
    };
    
    // Textures et matériaux par défaut
    this.defaultTexture = null;
    this.basicAssets = null;
  }
  
  async initialize() {
    console.log(JSON.stringify({
      status: "initializing",
      message: "Initialisation de GameState..."
    }));
    
    // Assurer que les assets minimaux sont disponibles
    this._ensureAssets();
    
    // Créer la scène mock une fois les assets disponibles
    this.simulatedState.scene = this._createMockScene();
    
    // Dans un cas réel, ici nous établirions une connexion avec le jeu
    // Pour cet exemple, nous utilisons des données simulées
    this.scene = this.simulatedState.scene;
    this.player = this.simulatedState.player;
    this.environment = this.simulatedState.environment;
    this.quests = this.simulatedState.quests;
    this.isInitialized = true;
    
    console.log(JSON.stringify({
      status: "initialized",
      message: "GameState initialisé avec succès"
    }));
    return true;
  }
  
  /**
   * Assure que les assets basiques sont disponibles même sans fichiers externes
   */
  _ensureAssets() {
    // Créer une texture par défaut si nécessaire
    if (!this.defaultTexture) {
      const data = new Uint8Array([200, 200, 200, 255]); // RGBA (gris clair)
      this.defaultTexture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
      this.defaultTexture.needsUpdate = true;
    }
    
    // Générer des assets de base si nécessaire
    if (!this.basicAssets) {
      this.basicAssets = {
        // Matériaux de base
        materials: {
          ground: new THREE.MeshStandardMaterial({ color: 0x228833 }),
          player: new THREE.MeshStandardMaterial({ color: 0x1155ff }),
          npc: new THREE.MeshStandardMaterial({ color: 0xCC5500 }),
          container: new THREE.MeshStandardMaterial({ color: 0x885511 }),
          building: new THREE.MeshStandardMaterial({ color: 0x999999 }),
          temple: {
            base: new THREE.MeshStandardMaterial({ color: 0x999999 }),
            roof: new THREE.MeshStandardMaterial({ color: 0x777777 }),
            column: new THREE.MeshStandardMaterial({ color: 0xAAAAAA })
          }
        }
      };
    }
    
    return true;
  }
  
  async getSceneGraph() {
    this._checkInitialized();
    
    // Transformer la scène Three.js en structure JSON navigable
    return this._convertSceneToGraph(this.scene);
  }
  
  async getPlayerData() {
    this._checkInitialized();
    return this.player;
  }
  
  async getEnvironmentData() {
    this._checkInitialized();
    return this.environment;
  }
  
  async getQuestLog() {
    this._checkInitialized();
    return this.quests;
  }
  
  async getLevelData(levelId) {
    // Simuler des données de niveau pour l'exemple
    return {
      id: levelId,
      name: "La Forêt des Secrets",
      type: "outdoor",
      area_size: 2500,
      object_density: 7,
      enemy_count: 12,
      intended_difficulty: 6,
      choice_points: 3,
      avg_completion_time: 25,
      completion_percentage: 68,
      points_of_interest: [
        { name: "Temple Ancien", description: "Un temple abandonné au centre de la forêt" },
        { name: "Cascade Mystique", description: "Une cascade avec des propriétés magiques" },
        { name: "Caverne du Troll", description: "Tanière d'un troll gardant un trésor" }
      ],
      challenges: [
        { type: "combat", description: "Embuscade de gobelins", difficulty: 4 },
        { type: "puzzle", description: "Mécanisme d'ouverture du temple", difficulty: 7 },
        { type: "platforming", description: "Franchir le gouffre près de la cascade", difficulty: 5 }
      ]
    };
  }
  
  async generateTerrainPreview(terrainId) {
    // Simuler la génération d'un aperçu pour un terrain
    // En réalité, on rendrait une image du terrain généré
    return {
      terrain_id: terrainId,
      base64_image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAAAA1BMVEVlZW6KLy2rAAAAH0lEQVRo3u3BMQEAAADCIPuntsUKYAAAAAAAAAAAABwNPgABZfDcCwAAAABJRU5ErkJggg=="
    };
  }
  
  async generateNPCPreview(npcId) {
    // Simuler la génération d'un aperçu pour un PNJ
    return {
      npc_id: npcId,
      base64_image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAAAA1BMVEVlZW6KLy2rAAAAH0lEQVRo3u3BMQEAAADCIPuntsUKYAAAAAAAAAAAABwNPgABZfDcCwAAAABJRU5ErkJggg=="
    };
  }
  
  /**
   * Charge les assets pour le jeu (version simulée)
   */
  async loadAssets() {
    console.log(JSON.stringify({
      status: "loading_assets",
      message: "Chargement des assets..."
    }));
    
    // Simuler un délai de chargement
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // S'assurer que les assets de base sont initialisés
    this._ensureAssets();
    
    // Simuler des textures chargées
    const placeholderTextureData = {
      grass: new Uint8Array([0, 150, 0, 255]), // Vert
      dirt: new Uint8Array([120, 80, 0, 255]), // Marron
      stone: new Uint8Array([120, 120, 120, 255]), // Gris
      water: new Uint8Array([0, 0, 150, 255]), // Bleu
    };
    
    // Créer des textures de substitution
    for (const [name, data] of Object.entries(placeholderTextureData)) {
      const texture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
      texture.needsUpdate = true;
      this.assetCache.textures[name] = texture;
    }
    
    console.log(JSON.stringify({
      status: "assets_loaded",
      message: "Assets chargés avec succès"
    }));
    return true;
  }
  
  _checkInitialized() {
    if (!this.isInitialized) {
      throw new Error("GameState not initialized. Call initialize() first.");
    }
  }
  
  _createMockScene() {
    console.log(JSON.stringify({
      status: "creating_scene",
      message: "Création de la scène simulée..."
    }));
    
    // Créer une scène Three.js simulée
    const scene = new THREE.Scene();
    
    // Ajouter quelques objets à la scène
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      this.basicAssets.materials.ground
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.name = "ground";
    ground.userData = { type: "terrain", interactive: false };
    scene.add(ground);
    
    // Ajouter un personnage joueur
    const player = new THREE.Group();
    player.name = "player";
    player.position.set(0, 0, 0);
    
    const playerBody = new THREE.Mesh(
      new THREE.BoxGeometry(1, 2, 1),
      this.basicAssets.materials.player
    );
    playerBody.name = "playerBody";
    player.add(playerBody);
    scene.add(player);
    
    // Ajouter quelques PNJ
    for (let i = 0; i < 3; i++) {
      const npc = new THREE.Group();
      npc.name = `npc_${i}`;
      npc.userData = { 
        type: "npc", 
        interactive: true,
        npcType: ["villager", "merchant", "guard"][i],
        dialogue: ["Bienvenue aventurier!", "Vous désirez acheter quelque chose?", "Halte! Qui va là?"][i]
      };
      
      const npcBody = new THREE.Mesh(
        new THREE.BoxGeometry(1, 2, 1),
        this.basicAssets.materials.npc
      );
      npcBody.name = `npcBody_${i}`;
      npc.add(npcBody);
      
      npc.position.set(5 * (i - 1), 0, 5);
      scene.add(npc);
    }
    
    // Ajouter des objets interactifs
    const chest = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.8, 1.5),
      this.basicAssets.materials.container
    );
    chest.name = "treasureChest";
    chest.position.set(3, 0, -2);
    chest.userData = { type: "container", interactive: true, locked: true, loot: ["gold", "potion"] };
    scene.add(chest);
    
    // Ajouter un temple/bâtiment
    const temple = new THREE.Group();
    temple.name = "ancientTemple";
    temple.position.set(-10, 0, -10);
    
    const templeBase = new THREE.Mesh(
      new THREE.BoxGeometry(8, 1, 8),
      this.basicAssets.materials.temple.base
    );
    templeBase.name = "templeBase";
    templeBase.position.y = -0.25;
    temple.add(templeBase);
    
    const templeRoof = new THREE.Mesh(
      new THREE.ConeGeometry(6, 5, 4),
      this.basicAssets.materials.temple.roof
    );
    templeRoof.name = "templeRoof";
    templeRoof.position.y = 3;
    temple.add(templeRoof);
    
    const tempColumns = [];
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 4),
        this.basicAssets.materials.temple.column
      );
      column.name = `templeColumn_${i}`;
      column.position.set(
        Math.sin(angle) * 3,
        2,
        Math.cos(angle) * 3
      );
      temple.add(column);
      tempColumns.push(column);
    }
    
    temple.userData = { type: "building", interactive: true, contains: "puzzle" };
    scene.add(temple);
    
    // Ajouter un éclairage de base
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    ambientLight.name = "ambientLight";
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    directionalLight.name = "directionalLight";
    scene.add(directionalLight);
    
    console.log(JSON.stringify({
      status: "scene_created",
      message: "Scène simulée créée avec succès"
    }));
    return scene;
  }
  
  _createMockPlayer() {
    return {
      name: "Héros",
      level: 5,
      health: 75,
      max_health: 100,
      mana: 50,
      max_mana: 80,
      experience: 450,
      next_level: 600,
      position: { x: 0, y: 0, z: 0 },
      inventory: [
        { id: "health_potion", name: "Potion de Vie", quantity: 3 },
        { id: "rusty_sword", name: "Épée Rouillée", equipped: true },
        { id: "leather_armor", name: "Armure en Cuir", equipped: true },
        { id: "gold", name: "Or", quantity: 75 }
      ],
      abilities: [
        { id: "slash", name: "Frappe", damage: 10, cooldown: 0 },
        { id: "fireball", name: "Boule de Feu", damage: 25, mana_cost: 15, cooldown: 8 }
      ],
      playtime_hours: 12,
      combat_success_rate: 65,
      puzzle_success_rate: 70,
      last_death: false,
      stuck_on_objective: true,
      current_objective: "Trouver la clé du temple"
    };
  }
  
  _createMockEnvironment() {
    return {
      name: "Forêt des Secrets",
      time_of_day: "day",
      weather: "clear",
      ambient_lighting: 0.8,
      background_music: "forest_ambience",
      terrain_type: "forest",
      hazards: [
        { type: "poison_plants", location: { x: -5, y: 0, z: 3 }, damage: 5 }
      ],
      interactive_objects: [
        { id: "well", type: "water_source", location: { x: 8, y: 0, z: 8 } },
        { id: "shrine", type: "save_point", location: { x: 0, y: 0, z: 8 } }
      ]
    };
  }
  
  _createMockQuests() {
    return [
      {
        id: "main_quest_1",
        title: "Le Secret du Temple",
        type: "main",
        status: "active",
        description: "Découvrez ce qui se cache dans le temple ancien au cœur de la forêt.",
        objectives: [
          { id: "find_key", description: "Trouver la clé du temple", status: "active" },
          { id: "open_temple", description: "Ouvrir la porte du temple", status: "pending" },
          { id: "solve_puzzle", description: "Résoudre l'énigme centrale", status: "pending" }
        ],
        rewards: [
          { type: "xp", amount: 200 },
          { type: "item", id: "ancient_amulet" }
        ]
      },
      {
        id: "side_quest_1",
        title: "Herbes Médicinales",
        type: "side",
        status: "completed",
        description: "Collectez des herbes médicinales pour le guérisseur du village.",
        objectives: [
          { id: "collect_herbs", description: "Récolter 5 herbes rouges", status: "completed" },
          { id: "return_to_healer", description: "Rapporter les herbes au guérisseur", status: "completed" }
        ],
        rewards: [
          { type: "xp", amount: 50 },
          { type: "gold", amount: 25 }
        ]
      }
    ];
  }
  
  /**
   * Équipe un objet sur le personnage joueur
   * @param {string} itemId - ID de l'objet dans l'inventaire
   * @returns {boolean} - Succès de l'opération
   */
  equipItem(itemId) {
    const item = this.player.inventory.find(i => i.id === itemId);
    if (!item) return false;
    
    item.equipped = true;
    console.log(JSON.stringify({
      action: "equip_item",
      item: item.name,
      success: true
    }));
    return true;
  }
  
  /**
   * Déplace le joueur vers une position
   * @param {object} position - {x, y, z}
   */
  async movePlayerTo(x, y, z) {
    console.log(JSON.stringify({
      action: "move_player",
      position: {x, y, z}
    }));
    
    if (this.scene) {
      const playerObject = this.scene.getObjectByName("player");
      if (playerObject) {
        try {
          // Créer une copie temporaire du vecteur position actuel
          const newPosition = new THREE.Vector3(x, y, z);
          
          // Méthode 1: Utiliser copy au lieu de set
          playerObject.position.copy(newPosition);
          
          // Mettre à jour les données du joueur
          this.player.position = { x, y, z };
          
          console.log(JSON.stringify({
            action: "move_player",
            result: "success",
            position: {x, y, z}
          }));
          return true;
        } catch (error) {
          console.log(JSON.stringify({
            action: "move_player",
            result: "error",
            message: error.message
          }));
          
          // Tentative de solution alternative
          try {
            // Créer un nouveau groupe et y transférer le contenu
            const newPlayerGroup = new THREE.Group();
            newPlayerGroup.position.set(x, y, z);
            newPlayerGroup.name = playerObject.name;
            newPlayerGroup.userData = playerObject.userData;
            
            // Transférer les enfants
            while(playerObject.children.length > 0) {
              const child = playerObject.children[0];
              newPlayerGroup.add(child);
            }
            
            // Remplacer l'ancien groupe dans la scène
            this.scene.remove(playerObject);
            this.scene.add(newPlayerGroup);
            
            // Mettre à jour les données du joueur
            this.player.position = { x, y, z };
            
            console.log(JSON.stringify({
              action: "move_player",
              result: "success_alternative",
              position: {x, y, z}
            }));
            return true;
          } catch (err) {
            console.log(JSON.stringify({
              action: "move_player",
              result: "error_alternative",
              message: err.message
            }));
            return false;
          }
        }
      }
    }
    
    console.log(JSON.stringify({
      action: "move_player",
      result: "fail",
      reason: "player_not_found"
    }));
    return false;
  }
  
  _convertSceneToGraph(scene) {
    const graph = {
      name: scene.name || "Scene",
      type: "Scene",
      uuid: scene.uuid,
      children: []
    };
    
    // Fonction récursive pour traiter les objets de la scène
    function processObject(obj, parentNode) {
      const node = {
        name: obj.name || obj.uuid.substring(0, 8),
        type: obj.type,
        uuid: obj.uuid,
        position: obj.position ? { x: obj.position.x, y: obj.position.y, z: obj.position.z } : null,
        children: []
      };
      
      // Ajouter les métadonnées
      if (obj.userData && Object.keys(obj.userData).length > 0) {
        node.userData = obj.userData;
      }
      
      // Ajouter les propriétés spécifiques selon le type d'objet
      if (obj.isMesh) {
        node.geometry = {
          type: obj.geometry.type,
          parameters: {
            width: obj.geometry.parameters?.width,
            height: obj.geometry.parameters?.height,
            depth: obj.geometry.parameters?.depth,
            radius: obj.geometry.parameters?.radius
          }
        };
        node.material = {
          type: obj.material.type,
          color: obj.material.color ? `#${obj.material.color.getHexString()}` : null
        };
      } else if (obj.isLight) {
        node.light = {
          type: obj.type,
          color: obj.color ? `#${obj.color.getHexString()}` : null,
          intensity: obj.intensity
        };
      }
      
      // Traiter les enfants récursivement
      if (obj.children && obj.children.length > 0) {
        obj.children.forEach(child => {
          processObject(child, node.children);
        });
      }
      
      parentNode.push(node);
    }
    
    // Traiter tous les objets de premier niveau
    scene.children.forEach(child => {
      processObject(child, graph.children);
    });
    
    return graph;
  }
  
  /**
   * Crée un marqueur visuel pour indiquer un emplacement important
   * @param {THREE.Vector3} position - Position du marqueur
   * @param {string} type - Type de marqueur ('quest', 'item', 'danger', etc.)
   * @returns {THREE.Object3D} - L'objet marqueur créé
   */
  createMarker(position, type = 'general') {
    if (!this.scene) return null;
    
    // Déterminer la couleur selon le type
    let color;
    switch (type) {
      case 'quest': color = 0xffff00; break;    // Jaune
      case 'item': color = 0x00ff00; break;     // Vert
      case 'danger': color = 0xff0000; break;   // Rouge
      case 'npc': color = 0x00ffff; break;      // Cyan
      default: color = 0xffffff; break;         // Blanc
    }
    
    // Créer un sprite avec une texture de cercle
    const markerMaterial = new THREE.SpriteMaterial({ 
      color: color,
      sizeAttenuation: false
    });
    
    const marker = new THREE.Sprite(markerMaterial);
    marker.position.copy(position);
    marker.position.y += 2; // Positionner au-dessus des objets
    marker.scale.set(0.5, 0.5, 1);
    marker.name = `marker_${type}_${Date.now()}`;
    
    this.scene.add(marker);
    
    console.log(JSON.stringify({
      action: "create_marker",
      type: type,
      position: {
        x: position.x,
        y: position.y,
        z: position.z
      }
    }));
    
    return marker;
  }

  // Faire interagir le joueur avec un objet
  async interactWithObject(objectId) {
    console.log(JSON.stringify({
      action: "interact",
      object_id: objectId
    }));
    
    if (this.scene) {
      const object = this._findObjectById(this.scene, objectId);
      if (object && object.userData && object.userData.interactive) {
        // Vérifier la distance entre le joueur et l'objet
        const playerObj = this.scene.getObjectByName("player");
        if (playerObj) {
          const distance = this._calculateDistance(playerObj.position, object.position);
          
          if (distance > 5) {
            return {
              success: false,
              message: "Trop loin pour interagir. Rapprochez-vous d'abord."
            };
          }
          
          // Effectuer l'action selon le type d'objet
          switch (object.userData.type) {
            case "container":
              if (object.userData.locked) {
                return {
                  success: false,
                  message: "Ce conteneur est verrouillé. Vous avez besoin d'une clé."
                };
              }
              return {
                success: true,
                message: `Vous avez ouvert ${object.name} et trouvé: ${object.userData.loot.join(", ")}`
              };
              
            case "npc":
              return {
                success: true,
                message: `${object.name} dit: "${object.userData.dialogue}"`
              };
              
            case "building":
              return {
                success: true,
                message: `Vous entrez dans ${object.name}.`
              };
              
            default:
              return {
                success: true,
                message: `Vous interagissez avec ${object.name}.`
              };
          }
        }
      }
    }
    
    return {
      success: false,
      message: `Objet ${objectId} non trouvé ou non interactif.`
    };
  }

  // Exécuter une action du joueur
  async performAction(actionType, params = {}) {
    console.log(JSON.stringify({
      action: "perform_action",
      action_type: actionType,
      params: params
    }));
    
    const actions = {
      "jump": () => {
        return {
          success: true,
          message: "Le joueur saute en l'air."
        };
      },
      "attack": () => {
        const targetId = params.targetId;
        if (!targetId) {
          return {
            success: false,
            message: "Aucune cible spécifiée pour l'attaque."
          };
        }
        
        const target = this._findObjectById(this.scene, targetId);
        if (!target) {
          return {
            success: false,
            message: `Cible ${targetId} non trouvée.`
          };
        }
        
        // Logique d'attaque
        return {
          success: true,
          message: `Le joueur attaque ${target.name}.`
        };
      },
      "use_item": () => {
        const itemId = params.itemId;
        if (!itemId) {
          return {
            success: false,
            message: "Aucun objet spécifié."
          };
        }
        
        const item = this.player.inventory.find(i => i.id === itemId);
        if (!item) {
          return {
            success: false,
            message: `Objet ${itemId} non trouvé dans l'inventaire.`
          };
        }
        
        return {
          success: true,
          message: `Le joueur utilise ${item.name}.`
        };
      }
    };
    
    if (actionType in actions) {
      return actions[actionType]();
    }
    
    return {
      success: false,
      message: `Action ${actionType} non reconnue.`
    };
  }

  // Méthodes auxiliaires
  _findObjectById(node, id) {
    if (node.uuid === id || node.name === id) {
      return node;
    }
    
    if (node.children) {
      for (const child of node.children) {
        const found = this._findObjectById(child, id);
        if (found) return found;
      }
    }
    
    return null;
  }

  _calculateDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
  }
}