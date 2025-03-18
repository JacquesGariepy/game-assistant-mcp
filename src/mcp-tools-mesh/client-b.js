import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from 'child_process';

// Configuration du client
const clientId = "client-b";
const clientType = "client";

// Outils locaux du client B
const localTools = {
  tool3: {
    name: "tool3",
    description: "Premier outil du client B",
    execute: (args) => `Résultat de tool3 avec ${JSON.stringify(args)}`
  },
  tool4: {
    name: "tool4",
    description: "Second outil du client B",
    execute: (args) => `Résultat de tool4 avec ${JSON.stringify(args)}`
  }
};

// Vérifier si le hub est en cours d'exécution
async function checkHubRunning() {
  // Tentative basique - on pourrait améliorer avec une vérification plus robuste
  try {
    const hubProcess = spawn('ps', ['aux']);
    return new Promise((resolve) => {
      let output = '';
      hubProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      hubProcess.on('close', () => {
        const isRunning = output.includes('mcp-hub.js');
        resolve(isRunning);
      });
    });
  } catch (error) {
    console.error("Erreur lors de la vérification du hub:", error);
    return false;
  }
}

async function main() {
  // Création du client
  const client = new Client({ 
    name: clientId, 
    version: "1.0.0" 
  });

  try {
    // Vérifier si le hub est en cours d'exécution
    const hubRunning = await checkHubRunning();
    
    if (!hubRunning) {
      console.error(`[${clientId}] ATTENTION: Le hub MCP ne semble pas être en cours d'exécution.`);
      console.error(`[${clientId}] Démarrez d'abord le hub avec: node mcp-hub.js`);
    }
    
    // Créer le transport pour se connecter au hub
    // Important: on se connecte à une instance externe du hub
    const transport = new StdioClientTransport({
      command: "node",
      args: ["mcp-hub.js"]
    });
    
    // Connexion au hub
    console.error(`[${clientId}] Tentative de connexion au hub...`);
    await client.connect(transport);
    console.error(`[${clientId}] Connecté au hub`);
    
    // S'enregistrer en tant que nœud
    console.error(`[${clientId}] Enregistrement du nœud...`);
    await client.callTool({
      name: "register-node",
      arguments: { id: clientId, type: clientType }
    });
    
    // Enregistrer les outils locaux
    console.error(`[${clientId}] Enregistrement des outils...`);
    for (const [name, tool] of Object.entries(localTools)) {
      await client.callTool({
        name: "register-tool",
        arguments: {
          nodeId: clientId,
          toolName: name,
          description: tool.description
        }
      });
    }
    
    // Lister tous les outils disponibles
    console.error(`[${clientId}] Demande de la liste des outils...`);
    const toolsResponse = await client.callTool({ 
      name: "list-tools", 
      arguments: {} 
    });
    const tools = JSON.parse(toolsResponse.content[0].text);
    console.error(`[${clientId}] Outils disponibles:`, tools);
    
    // Attendre un moment avant d'essayer de communiquer avec d'autres nœuds
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Appeler un outil de Client A (tool1)
    console.error(`[${clientId}] Appel de client-a.tool1...`);
    const tool1Result = await client.callTool({
      name: "call-remote-tool",
      arguments: {
        fromNode: clientId,
        toolId: "client-a.tool1",
        args: { param: "valeur depuis client B" }
      }
    });
    console.error(`[${clientId}] Résultat:`, tool1Result.content[0].text);
    
    // Appeler un outil de Client A (tool2)
    console.error(`[${clientId}] Appel de client-a.tool2...`);
    const tool2Result = await client.callTool({
      name: "call-remote-tool",
      arguments: {
        fromNode: clientId,
        toolId: "client-a.tool2",
        args: { option: false }
      }
    });
    console.error(`[${clientId}] Résultat:`, tool2Result.content[0].text);
    
    // Appeler un outil du serveur
    console.error(`[${clientId}] Appel de server.base-tool...`);
    const serverToolResult = await client.callTool({
      name: "call-remote-tool",
      arguments: {
        fromNode: clientId,
        toolId: "server.base-tool",
        args: { query: "demande depuis client B" }
      }
    });
    console.error(`[${clientId}] Résultat:`, serverToolResult.content[0].text);
    
    // Boucle de réception (simulation)
    console.error(`[${clientId}] En attente de requêtes...`);
    await new Promise(resolve => setTimeout(resolve, 60000));
    
  } catch (error) {
    console.error(`[${clientId}] Erreur:`, error);
  } finally {
    await client.close();
    console.error(`[${clientId}] Connexion fermée`);
  }
}

main();