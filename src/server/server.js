// src/server.js
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod";
import EventEmitter from 'events';

import { GameState } from "./game-connector.js";
import { analyzeScene, getObjectDetails, getRenderStats } from "./game-analyzer.js";
import { generateTerrain, createNPC, designQuest } from "./content-generator.js";
import { 
  getGameHint, suggestStrategy, identifyObstacles, getQuestGuide 
} from "./player-assistant.js";

// Bus d'événements global pour la communication bidirectionnelle
export const eventBus = new EventEmitter();

// Initialisation du connecteur au jeu
const gameState = new GameState(eventBus);

// Création du serveur MCP
const server = new McpServer({
  name: "game-assistant-server",
  version: "1.0.0",
});

// ID unique pour les messages JSON-RPC
let messageId = 1;
const getNextMessageId = () => messageId++;

// Fonction pour créer des messages JSON-RPC 2.0
function createJsonRpcMessage(method, params = null, id = null) {
  return {
    jsonrpc: "2.0",
    method: method,
    params: params,
    id: id !== null ? id : getNextMessageId()
  };
}

// Fonction pour créer des réponses JSON-RPC 2.0
function createJsonRpcResponse(id, result = null, error = null) {
  const response = {
    jsonrpc: "2.0",
    id: id
  };
  
  if (error !== null) {
    response.error = error;
  } else {
    response.result = result;
  }
  
  return response;
}

// Mise à jour de la position du joueur depuis le serveur ou l'UI
function updatePlayerPosition(position) {
  // Debug log pour la position
  console.log(JSON.stringify(createJsonRpcMessage(
    "debug",
    {
      type: "position_update",
      position: position
    }
  )));
  
  // S'assurer que la position a les propriétés nécessaires
  if (!position || (position.x === undefined && position.y === undefined && position.z === undefined)) {
    console.log(JSON.stringify(createJsonRpcMessage(
      "debug",
      {
        type: "position_error",
        message: "Format de position invalide",
        position: position
      }
    )));
    return false;
  }
  
  // Créer un objet position complet
  const fullPosition = {
    x: position.x !== undefined ? position.x : (gameState.player?.position?.x || 0),
    y: position.y !== undefined ? position.y : (gameState.player?.position?.y || 0),
    z: position.z !== undefined ? position.z : (gameState.player?.position?.z || 0)
  };
  
  // Mettre à jour le GameState
  if (gameState.player) {
    // Mettre à jour directement avec les nouvelles coordonnées
    gameState.player.position = fullPosition;
    
    // Debug log après mise à jour
    console.log(JSON.stringify(createJsonRpcMessage(
      "debug",
      {
        type: "gamestate_position_updated",
        new_position: gameState.player.position
      }
    )));
  }
  
  // Si un objet joueur existe dans la scène, mettre à jour sa position aussi
  if (gameState.scene) {
    const playerObject = gameState.scene.getObjectByName("player");
    if (playerObject) {
      playerObject.position.set(fullPosition.x, fullPosition.y, fullPosition.z);
      
      // Debug log après mise à jour de l'objet scène
      console.log(JSON.stringify(createJsonRpcMessage(
        "debug",
        {
          type: "scene_object_position_updated",
          object: "player"
        }
      )));
      
      return true;
    } else {
      // L'objet joueur n'a pas été trouvé dans la scène
      console.log(JSON.stringify(createJsonRpcMessage(
        "debug",
        {
          type: "scene_error",
          message: "Objet joueur non trouvé dans la scène"
        }
      )));
    }
  } else {
    // La scène n'est pas initialisée
    console.log(JSON.stringify(createJsonRpcMessage(
      "debug",
      {
        type: "scene_error",
        message: "Scène non initialisée"
      }
    )));
  }
  
  return !!gameState.player;
}

// Configuration des écouteurs d'événements pour recevoir les mises à jour de l'UI
setupEventListeners();

function setupEventListeners() {
  // Écouter les mises à jour de position du joueur venant de l'UI
  eventBus.on('ui:player_position_changed', (position) => {
    console.log(JSON.stringify(createJsonRpcMessage(
      "notify",
      {
        event: "ui:player_position_changed",
        position: position
      },
      null // Notification = pas d'ID
    )));
    
    // Utiliser la fonction centralisée pour mettre à jour la position
    updatePlayerPosition(position);
  });
  
  // Écouter les mises à jour de statistiques du joueur
  eventBus.on('ui:player_stats_changed', (stats) => {
    console.log(JSON.stringify(createJsonRpcMessage(
      "notify",
      {
        event: "ui:player_stats_changed",
        stats: stats
      },
      null
    )));
    
    // Mettre à jour le GameState
    if (gameState.player) {
      Object.assign(gameState.player, stats);
    }
  });
  
  // Écouter les événements d'interaction avec les objets
  eventBus.on('ui:object_interaction', (data) => {
    console.log(JSON.stringify(createJsonRpcMessage(
      "notify",
      {
        event: "ui:object_interaction",
        data: data
      },
      null
    )));
    
    // Traiter l'interaction selon le type d'objet
    if (data.objectType === 'npc') {
      // Logique pour interaction avec PNJ
    } else if (data.objectType === 'container') {
      // Logique pour interaction avec conteneur
    }
  });
  
  // Écouter les événements de progression de quête
  eventBus.on('ui:quest_progress', (data) => {
    console.log(JSON.stringify(createJsonRpcMessage(
      "notify",
      {
        event: "ui:quest_progress",
        data: data
      },
      null
    )));
    
    // Mettre à jour l'état des quêtes
    if (gameState.quests) {
      const quest = gameState.quests.find(q => q.id === data.questId);
      if (quest) {
        const objective = quest.objectives.find(o => o.id === data.objectiveId);
        if (objective) {
          objective.status = data.status;
        }
      }
    }
  });
  
  // Écouter les événements de changement d'environnement
  eventBus.on('ui:environment_changed', (environmentData) => {
    console.log(JSON.stringify(createJsonRpcMessage(
      "notify",
      {
        event: "ui:environment_changed",
        data: environmentData
      },
      null
    )));
    
    // Mettre à jour l'environnement de jeu
    if (gameState.environment) {
      Object.assign(gameState.environment, environmentData);
    }
  });
  
  // Écouter les événements de position directement envoyés par l'UI (nouveau)
  eventBus.on('ui:position', (position) => {
    console.log(JSON.stringify(createJsonRpcMessage(
      "notify",
      {
        event: "ui:position",
        position: position
      },
      null
    )));
    
    // Utiliser la fonction centralisée pour mettre à jour la position
    updatePlayerPosition(position);
  });
}

// Communication bidirectionnelle avec l'UI via message channel
setupMessageChannel();

function setupMessageChannel() {
  // En environnement Node.js, nous pouvons utiliser process.stdin/stdout
  // pour communiquer avec l'UI
  
  // Lire les messages de l'UI
  process.stdin.on('data', (data) => {
    try {
      // Log de toutes les données brutes reçues
      console.log(JSON.stringify(createJsonRpcMessage(
        "raw_input",
        {
          data: data.toString()
        }
      )));
      
      const message = JSON.parse(data.toString());
      
      // Log du message reçu pour debug
      console.log(JSON.stringify(createJsonRpcMessage(
        "debug",
        {
          type: "received_message",
          message: message
        }
      )));
      
      // Détection et traitement de tout type de message contenant des informations de position
      if (message.x !== undefined || message.position || message.playerPosition || 
          (message.params && (message.params.position || message.params.x !== undefined))) {
            
        // Extraire la position de n'importe quel format
        let position;
        if (message.x !== undefined) {
          position = {
            x: message.x,
            y: message.y !== undefined ? message.y : 0,
            z: message.z !== undefined ? message.z : 0
          };
        } else if (message.position) {
          position = message.position;
        } else if (message.playerPosition) {
          position = message.playerPosition;
        } else if (message.params) {
          if (message.params.position) {
            position = message.params.position;
          } else if (message.params.x !== undefined) {
            position = {
              x: message.params.x,
              y: message.params.y !== undefined ? message.params.y : 0,
              z: message.params.z !== undefined ? message.params.z : 0
            };
          }
        }
        
        if (position) {
          console.log(JSON.stringify(createJsonRpcMessage(
            "position_detected",
            {
              source: "message_parser",
              original_message: message,
              extracted_position: position
            }
          )));
          
          // Utiliser la fonction centralisée pour mettre à jour la position
          updatePlayerPosition(position);
          
          // Émission d'un événement artificiel ui:player_position_changed
          eventBus.emit('ui:player_position_changed', position);
          
          // Envoyer une réponse de succès si un ID est présent
          if (message.id !== null && message.id !== undefined) {
            process.stdout.write(JSON.stringify(createJsonRpcResponse(
              message.id,
              { success: true }
            )) + '\n');
          }
          return;
        }
      }
      
      // Cas spécial pour les mises à jour de position - traitement prioritaire
      if (message.method === "update_position" && message.params && message.params.position) {
        updatePlayerPosition(message.params.position);
        
        // Envoyer une réponse de succès si un ID est présent
        if (message.id !== null && message.id !== undefined) {
          process.stdout.write(JSON.stringify(createJsonRpcResponse(
            message.id,
            { success: true }
          )) + '\n');
        }
        return;
      }
      
      // Vérifier si le message suit le format JSON-RPC 2.0
      if (message.jsonrpc === "2.0" && message.method) {
        // Traiter les requêtes JSON-RPC
        if (message.method === "event" && message.params) {
          // Rediriger l'événement vers le bus d'événements
          if (message.params.event && message.params.data) {
            eventBus.emit(message.params.event, message.params.data);
            
            // Cas spécial pour les événements de position
            if (message.params.event === "ui:player_position_changed" || 
                message.params.event === "player_moved") {
              updatePlayerPosition(message.params.data);
            }
            
            // Envoyer une réponse de succès si un ID est présent
            if (message.id !== null && message.id !== undefined) {
              process.stdout.write(JSON.stringify(createJsonRpcResponse(
                message.id,
                { success: true }
              )) + '\n');
            }
          }
        } else {
          // Autres méthodes RPC peuvent être implémentées ici
          console.log(JSON.stringify(createJsonRpcResponse(
            message.id || null,
            null,
            { code: -32601, message: "Méthode non trouvée" }
          )));
        }
      } else {
        // Essayer de détecter les formats non-standard mais contenant des informations de position
        if (message.position || message.playerPosition || 
            (message.data && (message.data.position || message.data.playerPosition))) {
          
          const position = message.position || message.playerPosition || 
                          message.data?.position || message.data?.playerPosition;
          
          if (position) {
            updatePlayerPosition(position);
          }
          return;
        }
        
        // Format erroné - renvoyer une erreur JSON-RPC
        console.log(JSON.stringify(createJsonRpcResponse(
          message.id || null,
          null,
          { code: -32600, message: "Format de requête JSON-RPC invalide" }
        )));
      }
    } catch (error) {
      console.log(JSON.stringify(createJsonRpcResponse(
        null,
        null,
        { code: -32700, message: `Erreur de parsing JSON: ${error.message}` }
      )));
    }
  });
  
  // Envoyer des messages à l'UI
  eventBus.on('server:send_to_ui', (data) => {
    try {
      process.stdout.write(JSON.stringify(createJsonRpcMessage(
        "notify",
        {
          event: 'server:message',
          data: data
        }
      )) + '\n');
    } catch (error) {
      console.log(JSON.stringify(createJsonRpcResponse(
        null,
        null,
        { code: -32603, message: `Erreur d'envoi à l'UI: ${error.message}` }
      )));
    }
  });
}

// ------------------------------------------------
// Définition des ressources
// ------------------------------------------------

server.resource(
  "scene_graph",
  "Structure hiérarchique de la scène 3D actuelle",
  async () => {
    const sceneGraph = await gameState.getSceneGraph();
    return JSON.stringify(sceneGraph, null, 2);
  }
);

server.resource(
  "player_stats",
  "Statistiques et inventaire du joueur",
  async () => {
    const playerData = await gameState.getPlayerData();
    return JSON.stringify(playerData, null, 2);
  }
);

server.resource(
  "game_environment",
  "Informations sur l'environnement de jeu actuel",
  async () => {
    const environment = await gameState.getEnvironmentData();
    return JSON.stringify(environment, null, 2);
  }
);

server.resource(
  "quest_log",
  "Journal des quêtes actives et terminées",
  async () => {
    const quests = await gameState.getQuestLog();
    return JSON.stringify(quests, null, 2);
  }
);

// Ajouter une nouvelle ressource pour obtenir la position actuelle du joueur
server.resource(
  "player_position",
  "Position actuelle du joueur dans le monde",
  async () => {
    if (gameState.player && gameState.player.position) {
      return JSON.stringify(gameState.player.position, null, 2);
    }
    return JSON.stringify({ x: 0, y: 0, z: 0 }, null, 2);
  }
);

// Ajout d'une ressource modifiable pour la position du joueur
server.resource(
  "set_player_position",
  "Modifier la position du joueur",
  async (params) => {
    try {
      const position = JSON.parse(params);
      if (position && (position.x !== undefined || position.y !== undefined || position.z !== undefined)) {
        // Mise à jour de la position du joueur
        const result = updatePlayerPosition(position);
        
        // Notifier l'UI du déplacement
        eventBus.emit('server:send_to_ui', {
          action: 'player_position_updated',
          position: gameState.player?.position || position,
          source: 'set_player_position_resource'
        });
        
        return JSON.stringify({ success: true, position: gameState.player?.position }, null, 2);
      }
      return JSON.stringify({ error: "Format de position invalide" }, null, 2);
    } catch (error) {
      return JSON.stringify({ error: error.message }, null, 2);
    }
  }
);

// ------------------------------------------------
// Définition des outils
// ------------------------------------------------

// Wrapper pour standardiser les réponses des outils au format JSON-RPC
function toolResponseWrapper(response, hasError = false) {
  if (hasError) {
    return {
      isError: true,
      content: response.content
    };
  }
  return {
    content: response.content
  };
}

// 1. Analyse de la scène 3D
server.tool(
  "analyze_scene",
  "Analyse la scène 3D actuelle et fournit des informations détaillées",
  {
    detail_level: z.enum(["basic", "detailed", "comprehensive"]).default("detailed"),
    focus_area: z.enum(["all", "character", "environment", "interactive_objects"]).default("all"),
  },
  async ({ detail_level, focus_area }) => {
    try {
      const analysis = await analyzeScene(gameState, detail_level, focus_area);
      
      return toolResponseWrapper({
        content: [
          {
            type: "text",
            text: analysis,
          },
        ]
      });
    } catch (error) {
      return toolResponseWrapper({
        content: [
          {
            type: "text",
            text: `Erreur lors de l'analyse de la scène: ${error.message}`,
          },
        ]
      }, true);
    }
  }
);

// 2. Obtenir des détails sur un objet spécifique
server.tool(
  "get_object_details",
  "Obtient des informations détaillées sur un objet spécifique dans la scène",
  {
    object_id: z.string().describe("ID de l'objet dans la scène"),
    include_mesh_data: z.boolean().default(false).describe("Inclure les détails du maillage"),
  },
  async ({ object_id, include_mesh_data }) => {
    try {
      const objectDetails = await getObjectDetails(gameState, object_id, include_mesh_data);
      
      return toolResponseWrapper({
        content: [
          {
            type: "text",
            text: objectDetails,
          },
        ]
      });
    } catch (error) {
      return toolResponseWrapper({
        content: [
          {
            type: "text",
            text: `Erreur lors de la récupération des détails de l'objet: ${error.message}`,
          },
        ]
      }, true);
    }
  }
);

// 3. Générer du terrain procédural
server.tool(
  "generate_terrain",
  "Génère un terrain 3D procédural pour le jeu",
  {
    terrain_type: z.enum(["mountains", "desert", "forest", "ocean", "cave"]),
    size: z.number().min(1).max(10).default(5),
    complexity: z.number().min(1).max(10).default(5),
    seed: z.number().optional(),
  },
  async ({ terrain_type, size, complexity, seed }) => {
    try {
      const result = await generateTerrain(terrain_type, size, complexity, seed);
      
      // Générer une visualisation du terrain
      const terrain_preview = await gameState.generateTerrainPreview(result.terrain_id);
      
      // Notifier l'UI de la nouvelle génération
      eventBus.emit('server:send_to_ui', {
        action: 'terrain_generated',
        terrain_id: result.terrain_id,
        terrain_type: terrain_type
      });
      
      return toolResponseWrapper({
        content: [
          {
            type: "text",
            text: `Terrain généré avec succès: ${result.terrain_id}\n\n` +
                  `Type: ${terrain_type}\n` +
                  `Dimensions: ${result.width}x${result.height}x${result.depth}\n` +
                  `Points de contrôle: ${result.control_points}\n` +
                  `Triangles: ${result.triangles}\n\n` +
                  `Le terrain a été ajouté à la bibliothèque. Utilisez 'place_terrain' pour le placer dans le jeu.`,
          },
          {
            type: "image",
            data: terrain_preview.base64_image,
            mimeType: "image/png",
          },
        ]
      });
    } catch (error) {
      return toolResponseWrapper({
        content: [
          {
            type: "text",
            text: `Erreur lors de la génération du terrain: ${error.message}`,
          },
        ]
      }, true);
    }
  }
);

// 4. Créer un PNJ (Personnage Non-Joueur)
server.tool(
  "create_npc",
  "Crée un personnage non-joueur (PNJ) avec des attributs spécifiques",
  {
    character_type: z.enum(["villager", "merchant", "guard", "quest_giver", "enemy"]),
    difficulty: z.number().min(1).max(10).optional(),
    personality: z.string().optional(),
    appearance: z.string().optional(),
    dialog: z.string().optional(),
  },
  async ({ character_type, difficulty, personality, appearance, dialog }) => {
    try {
      const npc = await createNPC(character_type, {
        difficulty,
        personality,
        appearance,
        dialog
      });
      
      // Générer un aperçu du PNJ
      const npc_preview = await gameState.generateNPCPreview(npc.id);
      
      // Notifier l'UI de la création du PNJ
      eventBus.emit('server:send_to_ui', {
        action: 'npc_created',
        npc_id: npc.id,
        npc_type: character_type,
        npc_data: npc
      });
      
      return toolResponseWrapper({
        content: [
          {
            type: "text",
            text: `PNJ créé avec succès: ${npc.name} (ID: ${npc.id})\n\n` +
                  `Type: ${character_type}\n` +
                  `Niveau: ${npc.level}\n` +
                  `Points de vie: ${npc.hitpoints}\n` +
                  `Comportement: ${npc.behavior_type}\n\n` +
                  `Le PNJ a été ajouté à la bibliothèque. Utilisez 'place_npc' pour le placer dans le jeu.`,
          },
          {
            type: "image",
            data: npc_preview.base64_image,
            mimeType: "image/png",
          },
        ]
      });
    } catch (error) {
      return toolResponseWrapper({
        content: [
          {
            type: "text",
            text: `Erreur lors de la création du PNJ: ${error.message}`,
          },
        ]
      }, true);
    }
  }
);

// 5. Concevoir une quête
server.tool(
  "design_quest",
  "Crée une quête personnalisée pour le jeu",
  {
    quest_title: z.string(),
    quest_type: z.enum(["fetch", "kill", "escort", "puzzle", "boss", "story"]),
    difficulty: z.number().min(1).max(10).default(5),
    rewards: z.string().optional(),
    description: z.string(),
  },
  async ({ quest_title, quest_type, difficulty, rewards, description }) => {
    try {
      const quest = await designQuest(quest_title, quest_type, difficulty, rewards, description);
      
      // Notifier l'UI de la création de quête
      eventBus.emit('server:send_to_ui', {
        action: 'quest_designed',
        quest_id: quest.id,
        quest_data: quest
      });
      
      return toolResponseWrapper({
        content: [
          {
            type: "text",
            text: `Quête conçue avec succès: "${quest_title}" (ID: ${quest.id})\n\n` +
                  `Type: ${quest_type}\n` +
                  `Difficulté: ${difficulty}/10\n` +
                  `Récompenses: ${quest.rewards.join(", ")}\n\n` +
                  `Étapes:\n${quest.steps.map(step => `- ${step}`).join("\n")}\n\n` +
                  `La quête a été ajoutée au système. Utilisez 'activate_quest' pour l'activer dans le jeu.`,
          },
        ]
      });
    } catch (error) {
      return toolResponseWrapper({
        content: [
          {
            type: "text",
            text: `Erreur lors de la conception de la quête: ${error.message}`,
          },
        ]
      }, true);
    }
  }
);

// 6. Fournir des astuces et suggestions
server.tool(
  "get_game_hint",
  "Fournit des astuces et des conseils basés sur la situation actuelle du joueur",
  {
    hint_type: z.enum(["general", "quest", "combat", "puzzle", "exploration"]),
    specificity: z.enum(["subtle", "clear", "detailed"]).default("clear"),
  },
  async ({ hint_type, specificity }) => {
    try {
      const hint = await getGameHint(gameState, hint_type, specificity);
      
      return toolResponseWrapper({
        content: [
          {
            type: "text",
            text: hint,
          },
        ]
      });
    } catch (error) {
      return toolResponseWrapper({
        content: [
          {
            type: "text",
            text: `Erreur lors de la génération d'indice: ${error.message}`,
          },
        ]
      }, true);
    }
  }
);

// 7. Analyser les performances du jeu
server.tool(
  "analyze_performance",
  "Analyse les performances du rendu et suggère des optimisations",
  {
    detailed: z.boolean().default(false),
  },
  async ({ detailed }) => {
    try {
      const stats = await getRenderStats(gameState, detailed);
      
      return toolResponseWrapper({
        content: [
          {
            type: "text",
            text: `# Analyse des Performances\n\n` +
                  `FPS: ${stats.fps}\n` +
                  `Temps de rendu moyen: ${stats.render_time_ms} ms\n` +
                  `Objets visibles: ${stats.visible_objects}\n` +
                  `Appels de dessin: ${stats.draw_calls}\n` +
                  `Triangles: ${stats.triangles}\n` +
                  `Mémoire utilisée: ${Math.round(stats.memory_mb)} MB\n\n` +
                  `## Recommandations\n\n` +
                  stats.recommendations.map(rec => `- ${rec}`).join("\n"),
          },
        ]
      });
    } catch (error) {
      return toolResponseWrapper({
        content: [
          {
            type: "text",
            text: `Erreur lors de l'analyse des performances: ${error.message}`,
          },
        ]
      }, true);
    }
  }
);

server.tool(
  "move_player",
  "Déplace le joueur vers une position spécifique dans le monde",
  {
    x: z.number().describe("Coordonnée X"),
    y: z.number().describe("Coordonnée Y"),
    z: z.number().describe("Coordonnée Z"),
    reason: z.string().optional().describe("Raison du déplacement"),
  },
  async ({ x, y, z, reason }) => {
    try {
      // Mettre à jour la position via la fonction centralisée
      const position = { x, y, z };
      const result = updatePlayerPosition(position);
      
      // Notifier l'UI du déplacement via le bus d'événements
      eventBus.emit('server:send_to_ui', {
        action: 'move_player',
        position: position,
        reason: reason || 'Commande émise par le serveur MCP'
      });
      
      let message = result 
        ? `Joueur déplacé avec succès vers (${x}, ${y}, ${z}).` 
        : "Impossible de déplacer le joueur.";
        
      if (reason) {
        message += ` Raison: ${reason}`;
      }
      
      return toolResponseWrapper({
        content: [
          {
            type: "text",
            text: message,
          },
        ]
      });
    } catch (error) {
      return toolResponseWrapper({
        content: [
          {
            type: "text",
            text: `Erreur lors du déplacement du joueur: ${error.message}`,
          },
        ]
      }, true);
    }
  }
);

// Outil pour interagir avec un objet
server.tool(
  "interact_with_object",
  "Fait interagir le joueur avec un objet dans la scène",
  {
    object_id: z.string().describe("ID ou nom de l'objet à interagir"),
  },
  async ({ object_id }) => {
    try {
      const result = await gameState.interactWithObject(object_id);
      
      // Notifier l'UI de l'interaction
      if (result.success) {
        eventBus.emit('server:send_to_ui', {
          action: 'object_interaction',
          object_id: object_id,
          result: result
        });
      }
      
      return toolResponseWrapper({
        content: [
          {
            type: "text",
            text: result.message,
          },
        ]
      });
    } catch (error) {
      return toolResponseWrapper({
        content: [
          {
            type: "text",
            text: `Erreur lors de l'interaction: ${error.message}`,
          },
        ]
      }, true);
    }
  }
);

// Outil pour exécuter une action du joueur
server.tool(
  "perform_action",
  "Fait exécuter une action spécifique au joueur",
  {
    action_type: z.enum(["jump", "attack", "use_item"]).describe("Type d'action à effectuer"),
    target_id: z.string().optional().describe("ID de la cible (pour les actions qui le requièrent)"),
    item_id: z.string().optional().describe("ID de l'objet à utiliser (pour l'action use_item)"),
  },
  async ({ action_type, target_id, item_id }) => {
    try {
      const params = {};
      if (target_id) params.targetId = target_id;
      if (item_id) params.itemId = item_id;
      
      const result = await gameState.performAction(action_type, params);
      
      // Notifier l'UI de l'action
      if (result.success) {
        eventBus.emit('server:send_to_ui', {
          action: 'player_action',
          action_type: action_type,
          params: params,
          result: result
        });
      }
      
      return toolResponseWrapper({
        content: [
          {
            type: "text",
            text: result.message,
          },
        ]
      });
    } catch (error) {
      return toolResponseWrapper({
        content: [
          {
            type: "text",
            text: `Erreur lors de l'exécution de l'action: ${error.message}`,
          },
        ]
      }, true);
    }
  }
);

// Nouvel outil pour synchroniser l'état du jeu avec l'UI
server.tool(
  "sync_game_state",
  "Synchronise l'état du jeu entre le serveur et l'interface utilisateur",
  {
    sync_type: z.enum(["full", "player", "environment", "quests"]).describe("Type de synchronisation à effectuer"),
  },
  async ({ sync_type }) => {
    try {
      let message = "";
      
      switch (sync_type) {
        case "full":
          try {
            // Envoyer toutes les données à l'UI
            const sceneSummary = await gameState.getSceneObjectsSummary();
            eventBus.emit('server:send_to_ui', {
              action: 'sync_full',
              player: gameState.player,
              environment: gameState.environment,
              quests: gameState.quests,
              scene_objects: sceneSummary || []
            });
            message = "Synchronisation complète effectuée avec succès.";
          } catch (error) {
            // Fallback pour les méthodes manquantes
            eventBus.emit('server:send_to_ui', {
              action: 'sync_full',
              player: gameState.player,
              environment: gameState.environment,
              quests: gameState.quests
            });
            message = "Synchronisation partielle effectuée avec succès.";
          }
          break;
          
        case "player":
          eventBus.emit('server:send_to_ui', {
            action: 'sync_player',
            player: gameState.player
          });
          message = "Synchronisation des données du joueur effectuée avec succès.";
          break;
          
        case "environment":
          eventBus.emit('server:send_to_ui', {
            action: 'sync_environment',
            environment: gameState.environment
          });
          message = "Synchronisation des données d'environnement effectuée avec succès.";
          break;
          
        case "quests":
          eventBus.emit('server:send_to_ui', {
            action: 'sync_quests',
            quests: gameState.quests
          });
          message = "Synchronisation des quêtes effectuée avec succès.";
          break;
      }
      
      return toolResponseWrapper({
        content: [
          {
            type: "text",
            text: message
          },
        ]
      });
    } catch (error) {
      return toolResponseWrapper({
        content: [
          {
            type: "text",
            text: `Erreur lors de la synchronisation: ${error.message}`,
          },
        ]
      }, true);
    }
  }
);

// Nouvel outil pour demander les informations de position actuelles du joueur
server.tool(
  "get_player_position",
  "Récupère la position actuelle du joueur dans le monde",
  {
    // Pas de paramètres nécessaires
  },
  async () => {
    try {
      const position = gameState.player?.position || { x: 0, y: 0, z: 0 };
      
      return toolResponseWrapper({
        content: [
          {
            type: "text",
            text: `Position actuelle du joueur: (${position.x}, ${position.y}, ${position.z})`,
          },
        ]
      });
    } catch (error) {
      return toolResponseWrapper({
        content: [
          {
            type: "text",
            text: `Erreur lors de la récupération de la position du joueur: ${error.message}`,
          },
        ]
      }, true);
    }
  }
);

// Outil pour forcer la synchronisation de la position UI/MCP
server.tool(
  "force_position_sync",
  "Force la synchronisation de la position entre l'UI et le serveur MCP",
  {
    x: z.number().describe("Coordonnée X"),
    y: z.number().optional().describe("Coordonnée Y"),
    z: z.number().optional().describe("Coordonnée Z"),
  },
  async ({ x, y, z }) => {
    try {
      // Construire la position avec les paramètres fournis
      const position = {
        x: x,
        y: y !== undefined ? y : 0,
        z: z !== undefined ? z : 0
      };
      
      // Mise à jour de la position
      const result = updatePlayerPosition(position);
      
      // Émission d'un événement artificiel ui:player_position_changed
      eventBus.emit('ui:player_position_changed', position);
      
      // Notifier l'UI pour synchronisation
      eventBus.emit('server:send_to_ui', {
        action: 'force_position_sync',
        position: position
      });
      
      return toolResponseWrapper({
        content: [
          {
            type: "text",
            text: `Synchronisation forcée de la position : (${x}, ${y || 0}, ${z || 0}). Résultat: ${result ? 'Succès' : 'Échec'}`,
          },
        ]
      });
    } catch (error) {
      return toolResponseWrapper({
        content: [
          {
            type: "text",
            text: `Erreur lors de la synchronisation forcée: ${error.message}`,
          },
        ]
      }, true);
    }
  }
);

// ------------------------------------------------
// Démarrage du serveur
// ------------------------------------------------

// Configuration de la vérification périodique de la position
function setupPositionPolling() {
  // Intervalle en millisecondes (500ms = 0.5 seconde)
  const POLLING_INTERVAL = 500;
  
  // Variable pour stocker la dernière position connue
  let lastKnownPosition = null;
  
  // Démarrer le polling
  const intervalId = setInterval(() => {
    try {
      // Obtenir la position actuelle
      const currentPosition = gameState.player?.position;
      
      // Si la position est définie et différente de la dernière position connue
      if (currentPosition && 
          (!lastKnownPosition || 
           currentPosition.x !== lastKnownPosition.x || 
           currentPosition.y !== lastKnownPosition.y || 
           currentPosition.z !== lastKnownPosition.z)) {
        
        // Mettre à jour la dernière position connue
        lastKnownPosition = { ...currentPosition };
        
        // Envoyer une notification de changement de position
        console.log(JSON.stringify(createJsonRpcMessage(
          "notify",
          {
            event: "position_polling",
            position: currentPosition,
            timestamp: new Date().toISOString()
          }
        )));
        
        // Notifier l'UI du changement de position
        eventBus.emit('server:send_to_ui', {
          action: 'position_polling_update',
          position: currentPosition
        });
      }
    } catch (error) {
      console.log(JSON.stringify(createJsonRpcMessage(
        "error",
        {
          source: "position_polling",
          message: error.message
        }
      )));
    }
  }, POLLING_INTERVAL);
  
  // Retourner une fonction pour arrêter le polling si nécessaire
  return () => clearInterval(intervalId);
}

// Démarrer le polling à l'initialisation du serveur
const stopPositionPolling = setupPositionPolling();

async function main() {
  // Méthode de log modifiée pour utiliser le format JSON-RPC 2.0
  const logInitialization = () => {
    console.log(JSON.stringify(createJsonRpcMessage(
      "notify",
      {
        status: "initializing",
        message: "Initialisation du serveur Game Assistant MCP"
      }
    )));
  };

  logInitialization();
  
  // Initialiser la connexion au jeu
  try {
    await gameState.initialize();
    console.log(JSON.stringify(createJsonRpcMessage(
      "notify",
      {
        status: "connected",
        message: "Connexion au jeu établie avec succès"
      }
    )));
  } catch (error) {
    console.log(JSON.stringify(createJsonRpcMessage(
      "notify",
      {
        status: "error",
        message: `Erreur de connexion: ${error.message}`
      }
    )));
    process.exit(1);
  }
  
  // Démarrer le serveur MCP
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log(JSON.stringify(createJsonRpcMessage(
      "notify",
      {
        status: "running",
        message: "Game Assistant MCP Server is running"
      }
    )));
  } catch (error) {
    console.log(JSON.stringify(createJsonRpcMessage(
      "notify",
      {
        status: "error",
        message: `Erreur de démarrage du serveur: ${error.message}`
      }
    )));
    process.exit(1);
  }
}

main().catch(error => {
  console.log(JSON.stringify(createJsonRpcMessage(
    "notify",
    {
      status: "fatal_error",
      message: `Error starting server: ${error.message}`
    }
  )));
  
  // Arrêter le polling avant de quitter
  if (typeof stopPositionPolling === 'function') {
    stopPositionPolling();
  }
  
  process.exit(1);
});
