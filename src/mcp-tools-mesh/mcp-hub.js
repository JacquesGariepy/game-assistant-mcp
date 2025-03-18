import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from 'fs';

// Fichier pour persister l'état du hub entre les exécutions
const STATE_FILE = './hub-state.json';

// Initialiser ou charger l'état
let initialState = { nodes: {}, tools: {} };
try {
  if (fs.existsSync(STATE_FILE)) {
    const data = fs.readFileSync(STATE_FILE, 'utf8');
    initialState = JSON.parse(data);
    console.error('[Hub] État chargé:', 
                  Object.keys(initialState.nodes).length, 'nœuds,',
                  Object.keys(initialState.tools).length, 'outils');
  }
} catch (err) {
  console.error('[Hub] Erreur lors du chargement de l\'état:', err);
}

// Conversion des objets en Map pour usage interne
const nodes = new Map(Object.entries(initialState.nodes));
const tools = new Map(Object.entries(initialState.tools));
const toolExecutions = new Map();

// Sauvegarde de l'état
function saveState() {
  try {
    const state = {
      nodes: Object.fromEntries(nodes.entries()),
      tools: Object.fromEntries(tools.entries())
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    console.error('[Hub] État sauvegardé');
  } catch (err) {
    console.error('[Hub] Erreur lors de la sauvegarde de l\'état:', err);
  }
}

// Création du serveur MCP
const server = new McpServer({
  name: "mcp-hub",
  version: "1.0.0",
});

// Outil pour enregistrer un nœud
server.tool(
  "register-node",
  "Enregistrer un nœud dans le réseau MCP",
  {
    id: z.string().describe("Identifiant unique du nœud"),
    type: z.string().describe("Type de nœud (client/server/claude)")
  },
  async ({ id, type }) => {
    nodes.set(id, { type, connected: true, lastSeen: new Date() });
    console.error(`[Hub] Nœud enregistré: ${id} (${type})`);
    saveState();
    
    return {
      content: [{ type: "text", text: JSON.stringify({ success: true }) }]
    };
  }
);

// Outil pour enregistrer un outil
server.tool(
  "register-tool",
  "Enregistrer un outil disponible sur un nœud",
  {
    nodeId: z.string().describe("ID du nœud propriétaire"),
    toolName: z.string().describe("Nom de l'outil"),
    description: z.string().optional().describe("Description de l'outil")
  },
  async ({ nodeId, toolName, description }) => {
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
      description: description || "" 
    });
    console.error(`[Hub] Outil enregistré: ${toolId}`);
    saveState();
    
    return {
      content: [{ type: "text", text: JSON.stringify({ success: true }) }]
    };
  }
);

// Outil pour lister tous les outils disponibles
server.tool(
  "list-tools",
  "Lister tous les outils disponibles sur le réseau",
  {},
  async () => {
    console.error(`[Hub] Liste des outils demandée - ${tools.size} outil(s) disponible(s)`);
    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify(Array.from(tools.values())) 
      }]
    };
  }
);

// Outil pour appeler un outil distant
server.tool(
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
    
    // Dans une implémentation réelle, il faudrait ici rediriger l'appel vers le nœud cible
    // Ici, nous simulons l'exécution
    console.error(`[Hub] Redirection d'appel: ${fromNode} -> ${toolId} avec ${JSON.stringify(args)}`);
    
    // Simuler l'exécution (dans une implémentation réelle, nous contacterions le nœud cible)
    let result;
    if (toolExecutions.has(toolId)) {
      // Si nous avons une fonction d'exécution enregistrée, utilisons-la
      result = toolExecutions.get(toolId)(args);
    } else {
      // Sinon, simulons une réponse générique du nœud cible
      result = `Exécution simulée de ${toolId} avec ${JSON.stringify(args)}`;
    }
    
    return {
      content: [{ type: "text", text: result }]
    };
  }
);

// Pour les tests, ajoutons des exécuteurs simulés
toolExecutions.set("client-a.tool1", (args) => `Résultat de tool1 avec ${JSON.stringify(args)}`);
toolExecutions.set("client-a.tool2", (args) => `Résultat de tool2 avec ${JSON.stringify(args)}`);
toolExecutions.set("client-b.tool3", (args) => `Résultat de tool3 avec ${JSON.stringify(args)}`);
toolExecutions.set("client-b.tool4", (args) => `Résultat de tool4 avec ${JSON.stringify(args)}`);
toolExecutions.set("server.base-tool", (args) => `Résultat du serveur avec ${JSON.stringify(args)}`);

// Démarrage du hub
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[Hub] Hub MCP démarré - en attente de connexions");

// Sauvegarde périodique de l'état
setInterval(saveState, 10000);

// Gestion des erreurs
process.on("uncaughtException", (err) => {
  console.error("[Hub] Erreur non gérée:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[Hub] Promesse rejetée non gérée:", reason);
});