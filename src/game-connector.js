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
      scene: this._createMockScene(),
      player: this._createMockPlayer(),
      environment: this._createMockEnvironment(),
      quests: this._createMockQuests(),
    };
  }
  
  async initialize() {
    // Dans un cas réel, ici nous établirions une connexion avec le jeu
    // Pour cet exemple, nous utilisons des données simulées
    this.scene = this.simulatedState.scene;
    this.player = this.simulatedState.player;
    this.environment = this.simulatedState.environment;
    this.quests = this.simulatedState.quests;
    this.isInitialized = true;
    
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
  
  _checkInitialized() {
    if (!this.isInitialized) {
      throw new Error("GameState not initialized. Call initialize() first.");
    }
  }
  
  _createMockScene() {
    // Créer une scène Three.js simulée
    const scene = new THREE.Scene();
    
    // Ajouter quelques objets à la scène
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshBasicMaterial({ color: 0x228833 })
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
      new THREE.MeshBasicMaterial({ color: 0x1155ff })
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
        new THREE.MeshBasicMaterial({ color: 0xCC5500 })
      );
      npcBody.name = `npcBody_${i}`;
      npc.add(npcBody);
      
      npc.position.set(5 * (i - 1), 0, 5);
      scene.add(npc);
    }
    
    // Ajouter des objets interactifs
    const chest = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.8, 1.5),
      new THREE.MeshBasicMaterial({ color: 0x885511 })
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
      new THREE.MeshBasicMaterial({ color: 0x999999 })
    );
    templeBase.name = "templeBase";
    templeBase.position.y = -0.25;
    temple.add(templeBase);
    
    const templeRoof = new THREE.Mesh(
      new THREE.ConeGeometry(6, 5, 4),
      new THREE.MeshBasicMaterial({ color: 0x777777 })
    );
    templeRoof.name = "templeRoof";
    templeRoof.position.y = 3;
    temple.add(templeRoof);
    
    const tempColumns = [];
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 4),
        new THREE.MeshBasicMaterial({ color: 0xAAAAAA })
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
}
