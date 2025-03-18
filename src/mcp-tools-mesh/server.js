import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from 'child_process';

// Configuration du serveur
const nodeId = "server";
const nodeType = "server";

// Outils locaux du serveur
const localTools = {
  "base-tool": {
    name: "base-tool",
    description: "Outil de base du serveur",
    execute: (args) => `Résultat du serveur avec ${JSON.stringify(args)}`
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
    name: nodeId, 
    version: "1.0.0" 
  });

  try {
    // Vérifier si le hub est en cours d'exécution
    const hubRunning = await checkHubRunning();
    
    if (!hubRunning) {
      console.error(`[${nodeId}] ATTENTION: Le hub MCP ne semble pas être en cours d'exécution.`);
      console.error(`[${nodeId}] Démarrez d'abord le hub avec: node mcp-hub.js`);
    }
    
    // Créer le transport pour se connecter au hub
    // Important: on se connecte à une instance externe du hub
    const transport = new StdioClientTransport({
      command: "node",
      args: ["mcp-hub.js"]
    });
    
    // Connexion au hub
    console.error(`[${nodeId}] Tentative de connexion au hub...`);
    await client.connect(transport);
    console.error(`[${nodeId}] Connecté au hub`);
    
    // S'enregistrer en tant que nœud
    console.error(`[${nodeId}] Enregistrement du nœud...`);
    await client.callTool({
      name: "register-node",
      arguments: { id: nodeId, type: nodeType }
    });
    
    // Enregistrer les outils locaux
    console.error(`[${nodeId}] Enregistrement des outils...`);
    for (const [name, tool] of Object.entries(localTools)) {
      await client.callTool({
        name: "register-tool",
        arguments: {
          nodeId: nodeId,
          toolName: name,
          description: tool.description
        }
      });
    }
    
    // Lister tous les outils disponibles
    console.error(`[${nodeId}] Demande de la liste des outils...`);
    const toolsResponse = await client.callTool({ 
      name: "list-tools", 
      arguments: {} 
    });
    const tools = JSON.parse(toolsResponse.content[0].text);
    console.error(`[${nodeId}] Outils disponibles:`, tools);
    
    // Attendre un moment avant d'essayer de communiquer avec d'autres nœuds
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Appeler un outil de Client A
    console.error(`[${nodeId}] Appel de client-a.tool1...`);
    const tool1Result = await client.callTool({
      name: "call-remote-tool",
      arguments: {
        fromNode: nodeId,
        toolId: "client-a.tool1",
        args: { param: "valeur depuis serveur" }
      }
    });
    console.error(`[${nodeId}] Résultat:`, tool1Result.content[0].text);
    
    // Appeler un outil de Client B
    console.error(`[${nodeId}] Appel de client-b.tool3...`);
    const tool3Result = await client.callTool({
      name: "call-remote-tool",
      arguments: {
        fromNode: nodeId,
        toolId: "client-b.tool3",
        args: { param: "valeur depuis serveur" }
      }
    });
    console.error(`[${nodeId}] Résultat:`, tool3Result.content[0].text);
    
    // Boucle de réception (simulation)
    console.error(`[${nodeId}] En attente de requêtes...`);
    await new Promise(resolve => setTimeout(resolve, 60000));
    
  } catch (error) {
    console.error(`[${nodeId}] Erreur:`, error);
  } finally {
    await client.close();
    console.error(`[${nodeId}] Connexion fermée`);
  }
}

main();