// src/server.js
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod";

import { GameState } from "./game-connector.js";
import { analyzeScene, getObjectDetails, getRenderStats } from "./game-analyzer.js";
import { generateTerrain, createNPC, designQuest } from "./content-generator.js";
import { 
  getGameHint, suggestStrategy, identifyObstacles, getQuestGuide 
} from "./player-assistant.js";

// Initialisation du connecteur au jeu
const gameState = new GameState();

// Création du serveur MCP
const server = new McpServer({
  name: "game-assistant-server",
  version: "1.0.0",
});

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

// ------------------------------------------------
// Définition des outils
// ------------------------------------------------

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
      
      return {
        content: [
          {
            type: "text",
            text: analysis,
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Erreur lors de l'analyse de la scène: ${error.message}`,
          },
        ],
      };
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
      
      return {
        content: [
          {
            type: "text",
            text: objectDetails,
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Erreur lors de la récupération des détails de l'objet: ${error.message}`,
          },
        ],
      };
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
      
      return {
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
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Erreur lors de la génération du terrain: ${error.message}`,
          },
        ],
      };
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
      
      return {
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
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Erreur lors de la création du PNJ: ${error.message}`,
          },
        ],
      };
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
      
      return {
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
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Erreur lors de la conception de la quête: ${error.message}`,
          },
        ],
      };
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
      
      return {
        content: [
          {
            type: "text",
            text: hint,
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Erreur lors de la génération d'indice: ${error.message}`,
          },
        ],
      };
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
      
      return {
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
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Erreur lors de l'analyse des performances: ${error.message}`,
          },
        ],
      };
    }
  }
);

// ------------------------------------------------
// Définition des prompts
// ------------------------------------------------

server.prompt(
  "game_difficulty_adjustment",
  "Ajuste la difficulté du jeu en fonction du niveau de compétence du joueur",
  [
    {
      name: "player_skill",
      description: "Niveau de compétence du joueur (beginner, intermediate, expert)",
      required: true,
    },
    {
      name: "play_style",
      description: "Style de jeu préféré (casual, balanced, challenging)",
      required: true,
    },
    {
      name: "game_aspect",
      description: "Aspect du jeu à ajuster (combat, puzzles, exploration, all)",
      required: false,
    },
  ],
  async (args) => {
    // Récupérer les données du joueur pour contextualiser la réponse
    const playerData = await gameState.getPlayerData();
    const playerSkill = args.player_skill || "intermediate";
    const playStyle = args.play_style || "balanced";
    const gameAspect = args.game_aspect || "all";
    
    // Créer un prompt personnalisé
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Je souhaite ajuster la difficulté du jeu pour un joueur de niveau ${playerSkill} qui préfère un style de jeu ${playStyle}. Concentre-toi sur l'aspect "${gameAspect}" du jeu.

Voici les données actuelles du joueur:
- Niveau: ${playerData.level}
- Temps de jeu: ${playerData.playtime_hours} heures
- Taux de réussite des combats: ${playerData.combat_success_rate}%
- Taux de réussite des énigmes: ${playerData.puzzle_success_rate}%
- Mort récente: ${playerData.last_death ? "Oui" : "Non"}
- Objectif bloquant: ${playerData.stuck_on_objective ? playerData.current_objective : "Aucun"}

Suggère des ajustements spécifiques pour équilibrer la difficulté en fonction de ces données, afin de maximiser le plaisir de jeu tout en maintenant un défi approprié. Inclus:
1. Quels paramètres modifier et à quelles valeurs
2. Quels types d'ennemis ou défis ajouter ou retirer
3. Comment ajuster la courbe de progression
4. Comment adapter l'expérience sans compromettre la conception du jeu
5. Des indicateurs à surveiller pour vérifier que les ajustements fonctionnent

Justifie chaque recommandation avec des principes de game design.`
          }
        }
      ]
    };
  }
);

server.prompt(
  "level_design_feedback",
  "Analyse un niveau et fournit des retours pour l'améliorer",
  [
    {
      name: "level_id",
      description: "Identifiant du niveau à analyser",
      required: true,
    },
    {
      name: "focus_areas",
      description: "Aspects à privilégier dans l'analyse (flow, difficulty, visual, all)",
      required: false,
    },
  ],
  async (args) => {
    // Récupérer les données du niveau pour contextualiser la réponse
    const levelData = await gameState.getLevelData(args.level_id);
    const focusAreas = args.focus_areas || "all";
    
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Analyse ce niveau de jeu et fournit des retours constructifs pour l'améliorer. Concentre-toi sur les aspects: ${focusAreas}.

Informations sur le niveau "${levelData.name}":
- Type: ${levelData.type}
- Surface: ${levelData.area_size} unités² 
- Densité d'objets: ${levelData.object_density}/10
- Nombre d'ennemis: ${levelData.enemy_count}
- Difficulté prévue: ${levelData.intended_difficulty}/10
- Points de choix: ${levelData.choice_points}
- Temps moyen de traversée: ${levelData.avg_completion_time} minutes
- Pourcentage d'achèvement moyen: ${levelData.completion_percentage}%

Points d'intérêt:
${levelData.points_of_interest.map(poi => `- ${poi.name}: ${poi.description}`).join('\n')}

Obstacles et challenges:
${levelData.challenges.map(c => `- ${c.type}: ${c.description} (difficulté: ${c.difficulty}/10)`).join('\n')}

Analyse ce niveau en termes de principles de game design comme le flow, la difficulté progressive, l'affordance, la lisibilité visuelle, les récompenses et la satisfaction de jeu. Identifie les forces et les faiblesses, puis propose des améliorations concrètes et justifiées.`
          }
        }
      ]
    };
  }
);

// ------------------------------------------------
// Démarrage du serveur
// ------------------------------------------------

async function main() {
  // Initialiser la connexion au jeu
  await gameState.initialize();
  
  // Démarrer le serveur MCP
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Game Assistant MCP Server is running");
}

main().catch(error => {
  console.error("Error starting server:", error);
  process.exit(1);
});
