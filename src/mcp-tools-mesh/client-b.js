import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Configuration du client
const nodeId = "client-b";
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

// Pour suivre la disponibilité des autres nœuds
let clientAAvailable = false;
let serverAvailable = false;

// Création du client
const client = new Client({ 
  name: nodeId, 
  version: "1.0.0" 
});

// Déterminer le chemin du hub depuis les arguments en ligne de commande
const getHubPath = () => {
  const index = process.argv.findIndex(arg => arg === '--hub-path');
  if (index !== -1 && index < process.argv.length - 1) {
    return process.argv[index + 1];
  }
  // Valeur par défaut
  return "./mcp-hub.js";
};

// Fonction pour envoyer un heartbeat périodique
async function sendHeartbeat() {
  try {
    const result = await client.callTool({
      name: "heartbeat",
      arguments: { id: nodeId }
    });
    
    if (result && result.content && result.content[0] && result.content[0].text) {
      const response = JSON.parse(result.content[0].text);
      if (response.success) {
        console.error(`[${nodeId}] Heartbeat envoyé avec succès`);
      } else {
        console.error(`[${nodeId}] Erreur lors du heartbeat: ${response.error}`);
        // Tenter de se réenregistrer
        await registerNode();
      }
    }
  } catch (error) {
    console.error(`[${nodeId}] Erreur lors de l'envoi du heartbeat:`, error.message);
    try {
      await registerNode();
    } catch (regError) {
      console.error(`[${nodeId}] Échec de ré-enregistrement:`, regError.message);
    }
  }
}

// Enregistrer le nœud avec le hub
async function registerNode() {
  try {
    console.error(`[${nodeId}] Enregistrement du nœud...`);
    const result = await client.callTool({
      name: "register-node",
      arguments: { id: nodeId, type: clientType }
    });
    
    // Enregistrer les outils
    for (const [name, tool] of Object.entries(localTools)) {
      await client.callTool({
        name: "register-tool",
        arguments: {
          nodeId: nodeId,
          toolName: name,
          description: tool.description
        }
      });
      console.error(`[${nodeId}] Outil enregistré: ${name}`);
    }
    
    return true;
  } catch (error) {
    console.error(`[${nodeId}] Erreur lors de l'enregistrement:`, error.message);
    return false;
  }
}

// Fonction pour exécuter un outil local
function executeLocalTool(toolName, args) {
  const tool = localTools[toolName];
  if (!tool) {
    return `Outil ${toolName} non trouvé sur ${nodeId}`;
  }
  
  try {
    return tool.execute(args);
  } catch (error) {
    console.error(`[${nodeId}] Erreur d'exécution de l'outil ${toolName}:`, error.message);
    return `Erreur: ${error.message}`;
  }
}

// Vérifier périodiquement les outils disponibles et interagir avec eux
async function checkToolsAndInteract() {
  try {
    const toolsResponse = await client.callTool({ 
      name: "list-tools", 
      arguments: {} 
    });
    
    if (!toolsResponse || !toolsResponse.content || !toolsResponse.content[0] || !toolsResponse.content[0].text) {
      console.error(`[${nodeId}] Réponse de liste d'outils invalide`);
      return;
    }
    
    const tools = JSON.parse(toolsResponse.content[0].text);
    const nodeIds = [...new Set(tools.map(t => t.nodeId))];
    console.error(`[${nodeId}] Nœuds actifs: ${nodeIds.join(', ')} (${tools.length} outils au total)`);
    
    // Vérifier si client-a est disponible
    const clientATools = tools.filter(t => t.nodeId === "client-a");
    if (clientATools.length > 0 && !clientAAvailable) {
      clientAAvailable = true;
      console.error(`[${nodeId}] Le client A est maintenant disponible avec ${clientATools.length} outil(s)`);
      
      // Tester les outils de client-a
      for (const tool of clientATools) {
        try {
          console.error(`[${nodeId}] Test de l'outil ${tool.id}...`);
          const result = await client.callTool({
            name: "call-remote-tool",
            arguments: {
              fromNode: nodeId,
              toolId: tool.id,
              args: { param: "détection automatique", from: nodeId }
            }
          });
          console.error(`[${nodeId}] Résultat de ${tool.id}:`, result.content[0].text);
        } catch (error) {
          console.error(`[${nodeId}] Erreur lors de l'appel de ${tool.id}:`, error.message);
        }
      }
    } else if (clientATools.length === 0 && clientAAvailable) {
      clientAAvailable = false;
      console.error(`[${nodeId}] Le client A n'est plus disponible`);
    }
    
    // Vérifier si le serveur est disponible
    const serverTools = tools.filter(t => t.nodeId === "server");
    if (serverTools.length > 0 && !serverAvailable) {
      serverAvailable = true;
      console.error(`[${nodeId}] Le serveur est maintenant disponible avec ${serverTools.length} outil(s)`);
      
      // Tester les outils du serveur
      for (const tool of serverTools) {
        try {
          console.error(`[${nodeId}] Test de l'outil ${tool.id}...`);
          const result = await client.callTool({
            name: "call-remote-tool",
            arguments: {
              fromNode: nodeId,
              toolId: tool.id,
              args: { param: "détection automatique", from: nodeId }
            }
          });
          console.error(`[${nodeId}] Résultat de ${tool.id}:`, result.content[0].text);
        } catch (error) {
          console.error(`[${nodeId}] Erreur lors de l'appel de ${tool.id}:`, error.message);
        }
      }
    } else if (serverTools.length === 0 && serverAvailable) {
      serverAvailable = false;
      console.error(`[${nodeId}] Le serveur n'est plus disponible`);
    }
    
  } catch (error) {
    console.error(`[${nodeId}] Erreur lors de la vérification des outils:`, error.message);
  }
}

async function main() {
  try {
    // Récupération du chemin du hub
    const hubPath = getHubPath();
    console.error(`[${nodeId}] Utilisation du hub: ${hubPath}`);
    
    // Création du transport avec le hub spécifié
    const transport = new StdioClientTransport({
      command: "node",
      args: [hubPath]
    });
    
    // Connexion au hub
    console.error(`[${nodeId}] Tentative de connexion au hub...`);
    await client.connect(transport);
    console.error(`[${nodeId}] Connecté au hub`);
    
    // Enregistrer le nœud et ses outils
    await registerNode();
    
    // Configurer le heartbeat périodique
    const heartbeatInterval = setInterval(sendHeartbeat, 5000); // Toutes les 5 secondes
    
    // Configurer la vérification des outils
    const toolCheckInterval = setInterval(checkToolsAndInteract, 10000); // Toutes les 10 secondes
    
    // Faire une première vérification immédiate
    await checkToolsAndInteract();
    
    // Test manuel d'appel d'outils
    setTimeout(async () => {
      console.error(`\n[${nodeId}] Tests manuels d'appels d'outils:`);
      
      // Essayer d'appeler client-a.tool1
      try {
        console.error(`[${nodeId}] Appel manuel de client-a.tool1...`);
        const tool1Result = await client.callTool({
          name: "call-remote-tool",
          arguments: {
            fromNode: nodeId,
            toolId: "client-a.tool1",
            args: { param: "appel manuel", from: nodeId }
          }
        });
        console.error(`[${nodeId}] Résultat:`, tool1Result.content[0].text);
      } catch (error) {
        console.error(`[${nodeId}] Erreur lors de l'appel de client-a.tool1:`, error.message);
      }
      
      // Essayer d'appeler server.base-tool
      try {
        console.error(`[${nodeId}] Appel manuel de server.base-tool...`);
        const serverToolResult = await client.callTool({
          name: "call-remote-tool",
          arguments: {
            fromNode: nodeId,
            toolId: "server.base-tool",
            args: { query: "appel manuel", from: nodeId }
          }
        });
        console.error(`[${nodeId}] Résultat:`, serverToolResult.content[0].text);
      } catch (error) {
        console.error(`[${nodeId}] Erreur lors de l'appel de server.base-tool:`, error.message);
      }
    }, 3000);
    
    // Gestion de l'arrêt propre
    process.on('SIGINT', async () => {
      console.error(`\n[${nodeId}] Arrêt en cours...`);
      clearInterval(heartbeatInterval);
      clearInterval(toolCheckInterval);
      await client.close();
      process.exit(0);
    });
    
    // Maintenir le processus actif
    console.error(`[${nodeId}] En attente de requêtes...`);
    await new Promise(() => {}); // Promise qui ne se résout jamais
    
  } catch (error) {
    console.error(`[${nodeId}] Erreur:`, error);
  }
}

main();