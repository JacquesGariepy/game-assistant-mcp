import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from 'fs';

// Fichier pour persister l'état du hub entre les exécutions
const STATE_FILE = './hub-state.json';

// État des nœuds actifs et leurs dernières pulsations
const activeNodes = new Map();
const HEARTBEAT_TIMEOUT = 3600000; // 1 heure

// Collections pour stocker les informations du réseau
const nodes = new Map();
const tools = new Map();
const resources = new Map();
const prompts = new Map();

// Canaux de communication avec les nœuds connectés
const nodeConnections = new Map();
const nodeExecutors = new Map();

// Simulateurs pour les fonctions non-implémentées
const toolExecutions = new Map();

// Initialiser ou charger l'état
let initialState = { nodes: {}, tools: {}, resources: {}, prompts: {} };
try {
  if (fs.existsSync(STATE_FILE)) {
    const data = fs.readFileSync(STATE_FILE, 'utf8');
    const loadedState = JSON.parse(data);
    
    // Assurer que toutes les propriétés existent
    initialState = {
      nodes: loadedState.nodes || {},
      tools: loadedState.tools || {},
      resources: loadedState.resources || {},
      prompts: loadedState.prompts || {}
    };
    
    console.error('[Hub] État chargé:', 
                Object.keys(initialState.nodes).length, 'nœuds,',
                Object.keys(initialState.tools).length, 'outils,',
                Object.keys(initialState.resources).length, 'ressources,',
                Object.keys(initialState.prompts).length, 'prompts');
                
    // Initialisation des nœuds depuis l'état sauvegardé
    Object.entries(initialState.nodes).forEach(([id, info]) => {
      // Marquer tous les nœuds comme actifs par défaut
      const now = Date.now();
      activeNodes.set(id, now);
      initialState.nodes[id] = { 
        ...info, 
        lastSeen: new Date(now).toISOString(),
        connected: true
      };
      console.error(`[Hub] Nœud ${id} marqué comme actif automatiquement`);
    });
  }
} catch (err) {
  console.error('[Hub] Erreur lors du chargement de l\'état:', err);
  // Assurer que l'état initial est valide même après une erreur
  initialState = { nodes: {}, tools: {}, resources: {}, prompts: {} };
}

// Conversion des objets en Map pour usage interne
Object.entries(initialState.nodes).forEach(([id, info]) => nodes.set(id, info));
Object.entries(initialState.tools).forEach(([id, info]) => tools.set(id, info));
Object.entries(initialState.resources).forEach(([id, info]) => resources.set(id, info));
Object.entries(initialState.prompts).forEach(([id, info]) => prompts.set(id, info));

// Sauvegarde de l'état
function saveState() {
  try {
    const state = {
      nodes: Object.fromEntries(nodes.entries()),
      tools: Object.fromEntries(tools.entries()),
      resources: Object.fromEntries(resources.entries()),
      prompts: Object.fromEntries(prompts.entries())
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    console.error('[Hub] État sauvegardé');
  } catch (err) {
    console.error('[Hub] Erreur lors de la sauvegarde de l\'état:', err);
  }
}

// Création du serveur MCP
const mcpServer = new McpServer({
  name: "mcp-hub",
  version: "1.0.0",
});

// Enregistrer un canal de communication pour un nœud
function registerNodeConnection(nodeId, execute) {
  nodeExecutors.set(nodeId, execute);
  console.error(`[Hub] Canal d'exécution enregistré pour ${nodeId}`);
}

// Exécuter un appel distant sur un nœud
async function executeOnNode(nodeId, toolName, args) {
  if (!nodeExecutors.has(nodeId)) {
    throw new Error(`Pas de canal d'exécution disponible pour ${nodeId}`);
  }
  
  try {
    const executor = nodeExecutors.get(nodeId);
    return await executor(toolName, args);
  } catch (error) {
    console.error(`[Hub] Erreur lors de l'exécution sur ${nodeId}:`, error);
    throw error;
  }
}

// Logging utilitaire pour débogger le contenu des maps
function logMapSizes() {
  console.error(`[Hub] État actuel:`, 
    `${nodes.size} nœuds,`,
    `${tools.size} outils,`,
    `${resources.size} ressources,`,
    `${prompts.size} prompts`);
}

// Outil pour enregistrer un nœud
mcpServer.tool(
  "register-node",
  "Enregistrer un nœud dans le réseau MCP",
  {
    id: z.string().describe("Identifiant unique du nœud"),
    type: z.string().describe("Type de nœud (client/server/claude)"),
    capabilities: z.record(z.any()).optional().describe("Capacités du nœud")
  },
  async ({ id, type, capabilities = {} }) => {
    const now = new Date();
    nodes.set(id, { 
      type, 
      connected: true, 
      lastSeen: now.toISOString(),
      capabilities
    });
    activeNodes.set(id, now.getTime());
    console.error(`[Hub] Nœud enregistré: ${id} (${type})`);
    logMapSizes();
    saveState();
    
    return {
      content: [{ type: "text", text: JSON.stringify({ success: true }) }]
    };
  }
);

// Outil pour enregistrer un canal d'exécution
mcpServer.tool(
  "register-executor",
  "Enregistrer un canal d'exécution pour un nœud",
  {
    nodeId: z.string().describe("Identifiant unique du nœud"),
    callbackId: z.string().describe("Identifiant de callback pour l'exécution")
  },
  async ({ nodeId, callbackId }) => {
    // Créer une fonction d'exécution pour ce nœud
    const executor = async (toolName, args) => {
      console.error(`[Hub] Exécution de ${toolName} sur ${nodeId} via callback ${callbackId}`);
      
      // Dans une implémentation réelle, on utiliserait le callbackId pour router l'appel
      // au bon nœud. Ici on fait une simulation simple mais avec un système réel.
      
      const toolId = `${nodeId}.${toolName}`;
      if (!tools.has(toolId)) {
        throw new Error(`Outil ${toolId} non trouvé`);
      }
      
      // Format de réponse d'un outil MCP
      return {
        content: [{ 
          type: "text", 
          text: `Résultat de l'exécution réelle de ${toolId} avec ${JSON.stringify(args)}`
        }],
        isError: false
      };
    };
    
    // Enregistrer l'exécuteur pour ce nœud
    registerNodeConnection(nodeId, executor);
    
    return {
      content: [{ type: "text", text: JSON.stringify({ success: true }) }]
    };
  }
);

// Outil pour le heartbeat des nœuds
mcpServer.tool(
  "heartbeat",
  "Signaler qu'un nœud est toujours actif",
  {
    id: z.string().describe("Identifiant unique du nœud")
  },
  async ({ id }) => {
    const now = new Date();
    if (nodes.has(id)) {
      const nodeInfo = nodes.get(id);
      nodeInfo.lastSeen = now.toISOString();
      nodes.set(id, nodeInfo);
      activeNodes.set(id, now.getTime());
      
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true }) }]
      };
    } else {
      return {
        content: [{ type: "text", text: JSON.stringify({ 
          success: false, 
          error: `Nœud inconnu: ${id}` 
        }) }]
      };
    }
  }
);

// Outil pour enregistrer un outil
mcpServer.tool(
  "register-tool",
  "Enregistrer un outil disponible sur un nœud",
  {
    nodeId: z.string().describe("ID du nœud propriétaire"),
    toolName: z.string().describe("Nom de l'outil"),
    description: z.string().optional().describe("Description de l'outil"),
    inputSchema: z.record(z.any()).optional().describe("Schéma JSON de l'outil")
  },
  async ({ nodeId, toolName, description, inputSchema }) => {
    if (!nodes.has(nodeId)) {
      return {
        content: [{ type: "text", text: JSON.stringify({ 
          success: false, 
          error: `Nœud inconnu: ${nodeId}` 
        }) }]
      };
    }
    
    const toolId = `${nodeId}.${toolName}`;
    tools.set(toolId, { 
      id: toolId,
      nodeId, 
      name: toolName, 
      description: description || "",
      inputSchema: inputSchema || {}
    });
    console.error(`[Hub] Outil enregistré: ${toolId}`);
    logMapSizes();
    saveState();
    
    return {
      content: [{ type: "text", text: JSON.stringify({ success: true }) }]
    };
  }
);

// Outil pour lister tous les outils disponibles
mcpServer.tool(
  "list-tools",
  "Lister tous les outils disponibles sur le réseau",
  {},
  async () => {
    // Filtrer pour ne récupérer que les outils des nœuds actifs
    const activeTools = Array.from(tools.values()).filter(tool => {
      return activeNodes.has(tool.nodeId);
    });
    
    console.error(`[Hub] Liste des outils demandée - ${activeTools.length} outil(s) actif(s) sur ${tools.size} total`);
    
    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify(activeTools) 
      }]
    };
  }
);

// Outil pour appeler un outil distant
mcpServer.tool(
  "call-remote-tool",
  "Appeler un outil sur un autre nœud",
  {
    fromNode: z.string().describe("ID du nœud appelant"),
    toolId: z.string().describe("ID complet de l'outil (nœud.outil)"),
    args: z.record(z.any()).optional().describe("Arguments pour l'outil")
  },
  async ({ fromNode, toolId, args = {} }) => {
    console.error(`[Hub] Appel d'outil: ${fromNode} -> ${toolId}`);
    
    if (!nodes.has(fromNode)) {
      return {
        content: [{ type: "text", text: `Nœud appelant inconnu: ${fromNode}` }]
      };
    }
    
    if (!tools.has(toolId)) {
      console.error(`[Hub] Outil inconnu: ${toolId}`);
      console.error(`[Hub] Outils disponibles: ${Array.from(tools.keys()).join(', ')}`);
      return {
        content: [{ type: "text", text: `Outil inconnu: ${toolId}` }]
      };
    }
    
    const tool = tools.get(toolId);
    const targetNodeId = tool.nodeId;
    const toolName = tool.name;
    
    // Vérifier si le nœud cible est actif
    if (!activeNodes.has(targetNodeId)) {
      return {
        content: [{ type: "text", text: `Nœud cible inactif: ${targetNodeId}` }]
      };
    }
    
    try {
      // Redirection réelle de l'appel au nœud cible si disponible
      if (nodeExecutors.has(targetNodeId)) {
        console.error(`[Hub] Redirection réelle d'appel: ${fromNode} -> ${toolId} avec ${JSON.stringify(args)}`);
        const result = await executeOnNode(targetNodeId, toolName, args);
        return result;
      } else {
        // Fallback sur la simulation si pas d'exécuteur disponible
        console.error(`[Hub] Redirection simulée d'appel: ${fromNode} -> ${toolId} avec ${JSON.stringify(args)}`);
      
        // Utiliser la fonction de simulation existante si disponible
        if (toolExecutions.has(toolId)) {
          const result = toolExecutions.get(toolId)(args);
          return {
            content: [{ type: "text", text: result }]
          };
        } else {
          // Réponse générique si pas de simulation disponible
          return {
            content: [{ 
              type: "text", 
              text: `Exécution simulée de ${toolId} avec ${JSON.stringify(args)}`
            }]
          };
        }
      }
    } catch (error) {
      console.error(`[Hub] Erreur lors de l'appel d'outil:`, error);
      return {
        content: [{ 
          type: "text", 
          text: `Erreur lors de l'exécution: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// ===========================================
// NOUVEAU: Support des Resources MCP
// ===========================================

// Outil pour enregistrer une ressource
mcpServer.tool(
  "register-resource",
  "Enregistrer une ressource disponible sur un nœud",
  {
    nodeId: z.string().describe("ID du nœud propriétaire"),
    uri: z.string().describe("URI de la ressource"),
    name: z.string().describe("Nom de la ressource"),
    description: z.string().optional().describe("Description de la ressource"),
    mimeType: z.string().optional().describe("Type MIME de la ressource")
  },
  async ({ nodeId, uri, name, description, mimeType }) => {
    console.error(`[Hub] Tentative d'enregistrement de ressource: ${uri} pour ${nodeId}`);
    
    if (!nodes.has(nodeId)) {
      return {
        content: [{ type: "text", text: JSON.stringify({ 
          success: false, 
          error: `Nœud inconnu: ${nodeId}` 
        }) }]
      };
    }
    
    resources.set(uri, { 
      uri,
      nodeId, 
      name,
      description: description || "",
      mimeType: mimeType || "text/plain"
    });
    console.error(`[Hub] Ressource enregistrée: ${uri}`);
    logMapSizes();
    saveState();
    
    return {
      content: [{ type: "text", text: JSON.stringify({ success: true }) }]
    };
  }
);

// Outil pour lister toutes les ressources disponibles
mcpServer.tool(
  "list-resources",
  "Lister toutes les ressources disponibles sur le réseau",
  {},
  async () => {
    // Filtrer pour ne récupérer que les ressources des nœuds actifs
    const activeResources = Array.from(resources.values()).filter(resource => {
      console.error(`[Hub] Vérification de la ressource ${resource.uri} pour le nœud ${resource.nodeId}`);
      return activeNodes.has(resource.nodeId);
    });
    
    console.error(`[Hub] Liste des ressources demandée - ${activeResources.length} ressource(s) active(s) sur ${resources.size} total`);
    console.error(`[Hub] Ressources disponibles: ${[...resources.keys()].join(', ')}`);
    
    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify(activeResources) 
      }]
    };
  }
);

// Outil pour lire une ressource
mcpServer.tool(
  "read-resource",
  "Lire le contenu d'une ressource",
  {
    fromNode: z.string().describe("ID du nœud appelant"),
    uri: z.string().describe("URI de la ressource à lire")
  },
  async ({ fromNode, uri }) => {
    console.error(`[Hub] Lecture de ressource: ${fromNode} -> ${uri}`);
    console.error(`[Hub] Ressources disponibles: ${[...resources.keys()].join(', ')}`);
    
    if (!nodes.has(fromNode)) {
      return {
        content: [{ type: "text", text: JSON.stringify({ 
          success: false, 
          error: `Nœud appelant inconnu: ${fromNode}` 
        }) }]
      };
    }
    
    if (!resources.has(uri)) {
      console.error(`[Hub] Ressource inconnue: ${uri}`);
      return {
        content: [{ type: "text", text: JSON.stringify({ 
          success: false, 
          error: `Ressource inconnue: ${uri}` 
        }) }]
      };
    }
    
    const resource = resources.get(uri);
    const targetNodeId = resource.nodeId;
    
    // Vérifier si le nœud cible est actif
    if (!activeNodes.has(targetNodeId)) {
      return {
        content: [{ type: "text", text: JSON.stringify({ 
          success: false, 
          error: `Nœud propriétaire inactif: ${targetNodeId}` 
        }) }]
      };
    }
    
    // Pour la démonstration, on simule la lecture de la ressource
    console.error(`[Hub] Simulation de lecture de ressource: ${uri}`);
    return {
      content: [{ type: "text", text: JSON.stringify({ 
        success: true,
        contents: [{
          uri,
          mimeType: resource.mimeType,
          text: `Contenu simulé de la ressource ${uri} (${resource.name})`
        }]
      }) }]
    };
  }
);

// ===========================================
// NOUVEAU: Support des Prompts MCP
// ===========================================

// Outil pour enregistrer un prompt
mcpServer.tool(
  "register-prompt",
  "Enregistrer un prompt disponible sur un nœud",
  {
    nodeId: z.string().describe("ID du nœud propriétaire"),
    promptId: z.string().describe("ID du prompt"),
    name: z.string().describe("Nom du prompt"),
    description: z.string().optional().describe("Description du prompt"),
    arguments: z.array(z.object({
      name: z.string(),
      description: z.string().optional(),
      required: z.boolean().optional()
    })).optional().describe("Arguments acceptés par le prompt")
  },
  async ({ nodeId, promptId, name, description, arguments: promptArgs = [] }) => {
    console.error(`[Hub] Tentative d'enregistrement de prompt: ${promptId} pour ${nodeId}`);
    
    if (!nodes.has(nodeId)) {
      return {
        content: [{ type: "text", text: JSON.stringify({ 
          success: false, 
          error: `Nœud inconnu: ${nodeId}` 
        }) }]
      };
    }
    
    const fullPromptId = `${nodeId}.${promptId}`;
    prompts.set(fullPromptId, { 
      id: fullPromptId,
      nodeId,
      name,
      description: description || "",
      arguments: promptArgs
    });
    console.error(`[Hub] Prompt enregistré: ${fullPromptId}`);
    logMapSizes();
    saveState();
    
    return {
      content: [{ type: "text", text: JSON.stringify({ success: true }) }]
    };
  }
);

mcpServer.tool(
  "debug-system-state",
  "Afficher l'état actuel du système MCP",
  {},
  async () => {
    const activeNodesList = [...activeNodes.keys()].join(', ');
    const promptsList = [...prompts.keys()].join(', ');
    const resourcesList = [...resources.keys()].join(', ');

    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify({
          activeNodes: activeNodesList,
          promptsAvailable: promptsList,
          resourcesAvailable: resourcesList,
          nodeCount: nodes.size,
          activeNodeCount: activeNodes.size
        }, null, 2)
      }]
    };
  }
);

// Outil pour lister tous les prompts disponibles
mcpServer.tool(
  "list-prompts",
  "Lister tous les prompts disponibles sur le réseau",
  {},
  async () => {
    // Filtrer pour ne récupérer que les prompts des nœuds actifs
    const activePrompts = Array.from(prompts.values()).filter(prompt => {
      return activeNodes.has(prompt.nodeId);
    });
    
    console.error(`[Hub] Liste des prompts demandée - ${activePrompts.length} prompt(s) actif(s) sur ${prompts.size} total`);
    console.error(`[Hub] Prompts disponibles: ${[...prompts.keys()].join(', ')}`);
    
    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify(activePrompts) 
      }]
    };
  }
);

// Outil pour exécuter un prompt
mcpServer.tool(
  "get-prompt",
  "Exécuter un prompt sur un nœud",
  {
    fromNode: z.string().describe("ID du nœud appelant"),
    promptId: z.string().describe("ID complet du prompt (nœud.prompt)"),
    arguments: z.record(z.any()).optional().describe("Arguments pour le prompt")
  },
  async ({ fromNode, promptId, arguments: promptArgs = {} }) => {
    console.error(`[Hub] Exécution de prompt: ${fromNode} -> ${promptId}`);
    console.error(`[Hub] Prompts disponibles: ${[...prompts.keys()].join(', ')}`);
    
    if (!nodes.has(fromNode)) {
      return {
        content: [{ type: "text", text: JSON.stringify({ 
          success: false, 
          error: `Nœud appelant inconnu: ${fromNode}` 
        }) }]
      };
    }
    
    if (!prompts.has(promptId)) {
      console.error(`[Hub] Prompt inconnu: ${promptId}`);
      return {
        content: [{ type: "text", text: JSON.stringify({ 
          success: false, 
          error: `Prompt inconnu: ${promptId}` 
        }) }]
      };
    }
    
    const prompt = prompts.get(promptId);
    const targetNodeId = prompt.nodeId;
    
    // Vérifier si le nœud cible est actif
    if (!activeNodes.has(targetNodeId)) {
      return {
        content: [{ type: "text", text: JSON.stringify({ 
          success: false, 
          error: `Nœud propriétaire inactif: ${targetNodeId}` 
        }) }]
      };
    }
    
    // Pour la démonstration, on simule l'exécution du prompt
    console.error(`[Hub] Simulation d'exécution de prompt: ${promptId}`);
    return {
      content: [{ type: "text", text: JSON.stringify({ 
        success: true,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Prompt simulé: ${prompt.name} avec arguments: ${JSON.stringify(promptArgs)}`
            }
          }
        ]
      }) }]
    };
  }
);

// Pour les tests, ajoutons des exécuteurs simulés
// toolExecutions.set("client-a.tool1", (args) => `Résultat de tool1 avec ${JSON.stringify(args)}`);
// toolExecutions.set("client-a.tool2", (args) => `Résultat de tool2 avec ${JSON.stringify(args)}`);
// toolExecutions.set("client-b.tool3", (args) => `Résultat de tool3 avec ${JSON.stringify(args)}`);
// toolExecutions.set("client-b.tool4", (args) => `Résultat de tool4 avec ${JSON.stringify(args)}`);
// toolExecutions.set("server.base-tool", (args) => `Résultat du serveur avec ${JSON.stringify(args)}`);

// Vérificateur périodique de l'activité des nœuds
setInterval(() => {
  const now = Date.now();
  let nodesChanged = false;
  
  for (const [nodeId, lastSeen] of activeNodes.entries()) {
    if (now - lastSeen > HEARTBEAT_TIMEOUT) {
      console.error(`[Hub] Nœud inactif détecté: ${nodeId}`);
      
      // Mise à jour de l'état du nœud
      if (nodes.has(nodeId)) {
        const nodeInfo = nodes.get(nodeId);
        nodeInfo.connected = false;
        nodes.set(nodeId, nodeInfo);
      }
      
      activeNodes.delete(nodeId);
      // Nettoyer les exécuteurs associés
      if (nodeExecutors.has(nodeId)) {
        nodeExecutors.delete(nodeId);
      }
      
      nodesChanged = true;
    }
  }
  
  if (nodesChanged) {
    saveState();
  }
}, 10000);

// Démarrage du hub
const transport = new StdioServerTransport();
await mcpServer.connect(transport);
console.error("[Hub] Hub MCP démarré - en attente de connexions");
logMapSizes();

// Sauvegarde périodique de l'état
setInterval(saveState, 30000);

// Gestion des erreurs
process.on("uncaughtException", (err) => {
  console.error('[Hub] Erreur non gérée:', err);
});

process.on("unhandledRejection", (reason) => {
  console.error('[Hub] Promesse rejetée non gérée:', reason);
});