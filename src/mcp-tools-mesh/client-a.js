import { McpClient } from './mcp-client.js';

// Configuration du client
const nodeId = "client-a";
const clientType = "client";

// Outils locaux du client A
const localTools = {
  tool1: {
    name: "tool1",
    description: "Premier outil du client A",
    inputSchema: {
      type: "object",
      properties: {
        param: { type: "string" },
        from: { type: "string" }
      }
    },
    execute: (args) => `Résultat de tool1 avec ${JSON.stringify(args)}`
  },
  tool2: {
    name: "tool2",
    description: "Second outil du client A",
    inputSchema: {
      type: "object",
      properties: {
        param: { type: "string" },
        from: { type: "string" }
      }
    },
    execute: (args) => `Résultat de tool2 avec ${JSON.stringify(args)}`
  }
};

// Ressources locales
const localResources = {
  "client-a://data/resource1": {
    name: "Resource 1",
    description: "Première ressource du client A",
    mimeType: "text/plain",
    content: "Contenu de la ressource 1"
  },
  "client-a://data/resource2": {
    name: "Resource 2",
    description: "Seconde ressource du client A",
    mimeType: "application/json",
    content: JSON.stringify({ key: "value" })
  }
};

// Prompts locaux
const localPrompts = {
  "greeting": {
    name: "Salutation personnalisée",
    description: "Génère une salutation personnalisée",
    arguments: [
      {
        name: "name",
        description: "Nom de la personne à saluer",
        required: true
      },
      {
        name: "formal",
        description: "Style formel ou informel",
        required: false
      }
    ],
    execute: (args) => {
      const { name, formal } = args;
      if (formal === "true" || formal === true) {
        return `Bonjour ${name}, ravi de faire votre connaissance.`;
      } else {
        return `Salut ${name}! Comment ça va?`;
      }
    }
  }
};

// Pour suivre la disponibilité des autres nœuds
let clientBAvailable = false;
let serverAvailable = false;

// Déterminer le chemin du hub depuis les arguments en ligne de commande
const getHubPath = () => {
  const index = process.argv.findIndex(arg => arg === '--hub-path');
  if (index !== -1 && index < process.argv.length - 1) {
    return process.argv[index + 1];
  }
  // Valeur par défaut
  return "./mcp-hub.js";
};

// Fonction principale
async function main() {
  try {
    // Récupération du chemin du hub
    const hubPath = getHubPath();
    console.error(`[${nodeId}] Utilisation du hub: ${hubPath}`);
    
    // Création du client MCP
    const client = new McpClient({
      clientId: nodeId,
      clientType: clientType,
      hubPath: hubPath,
      transportType: 'stdio',
      debug: true,
      tools: localTools,
      resources: localResources,
      prompts: localPrompts,
      executeLocalTool: (toolName, args) => {
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
    });
    
    // Se connecter au hub
    await client.connect();
    
    // Vérifier périodiquement les outils disponibles et interagir avec eux
    async function checkToolsAndInteract() {
      try {
        // Récupérer les outils disponibles
        const tools = await client.listTools();
        const nodeIds = [...new Set(tools.map(t => t.nodeId))];
        console.info(`[${nodeId}] Nœuds actifs: ${nodeIds.join(', ')} (${tools.length} outils au total)`);
        
        // Vérifier les ressources disponibles
        const resources = await client.listResources();
        console.info(`[${nodeId}] Ressources disponibles: ${resources.length}`);
        
        // Vérifier les prompts disponibles
        const prompts = await client.listPrompts();
        console.info(`[${nodeId}] Prompts disponibles: ${prompts.length}`);
        
        // Vérifier si client-b est disponible
        const clientBTools = tools.filter(t => t.nodeId === "client-b");
        if (clientBTools.length > 0 && !clientBAvailable) {
          clientBAvailable = true;
          console.error(`[${nodeId}] Le client B est maintenant disponible avec ${clientBTools.length} outil(s)`);
          
          // Tester les outils de client-b
          for (const tool of clientBTools) {
            try {
              console.error(`[${nodeId}] Test de l'outil ${tool.id}...`);
              const result = await client.callTool(tool.id, { 
                param: "détection automatique", 
                from: nodeId 
              });
              console.error(`[${nodeId}] Résultat de ${tool.id}: ${result}`);
            } catch (error) {
              console.error(`[${nodeId}] Erreur lors de l'appel de ${tool.id}:`, error.message);
            }
          }
        } else if (clientBTools.length === 0 && clientBAvailable) {
          clientBAvailable = false;
          console.error(`[${nodeId}] Le client B n'est plus disponible`);
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
              const result = await client.callTool(tool.id, { 
                param: "détection automatique", 
                from: nodeId 
              });
              console.error(`[${nodeId}] Résultat de ${tool.id}: ${result}`);
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
    
    // Configurer la vérification périodique des outils
    const toolCheckInterval = setInterval(checkToolsAndInteract, 10000); // Toutes les 10 secondes
    
    // Faire une première vérification immédiate
    await checkToolsAndInteract();
    
    // Test manuel d'appel d'outils
    setTimeout(async () => {
      console.error(`\n[${nodeId}] Tests manuels d'appels d'outils:`);
      
      // Essayer d'appeler client-b.tool3
      try {
        console.error(`[${nodeId}] Appel manuel de client-b.tool3...`);
        const tool3Result = await client.callTool("client-b.tool3", { 
          param: "appel manuel", 
          from: nodeId 
        });
        console.error(`[${nodeId}] Résultat: ${tool3Result}`);
      } catch (error) {
        console.error(`[${nodeId}] Erreur lors de l'appel de client-b.tool3:`, error.message);
      }
      
      // Essayer d'appeler server.base-tool
      try {
        console.error(`[${nodeId}] Appel manuel de server.base-tool...`);
        const serverToolResult = await client.callTool("server.base-tool", { 
          query: "appel manuel", 
          from: nodeId 
        });
        console.error(`[${nodeId}] Résultat: ${serverToolResult}`);
      } catch (error) {
        console.error(`[${nodeId}] Erreur lors de l'appel de server.base-tool:`, error.message);
      }
      
      // Test de lecture de ressource
      if (serverAvailable) {
        try {
          console.error(`[${nodeId}] Lecture d'une ressource du serveur...`);
          const resourceUri = "server://data/config";
          const resourceContent = await client.readResource(resourceUri);
          console.error(`[${nodeId}] Contenu de la ressource: ${JSON.stringify(resourceContent)}`);
        } catch (error) {
          console.error(`[${nodeId}] Erreur lors de la lecture de ressource:`, error.message);
        }
      }
      
      // Test d'exécution de prompt
      if (clientBAvailable) {
        try {
          console.error(`[${nodeId}] Exécution d'un prompt de client-b...`);
          const promptId = "client-b.welcome";
          const promptResult = await client.getPrompt(promptId, { 
            name: nodeId,
            language: "français" 
          });
          console.error(`[${nodeId}] Résultat du prompt: ${JSON.stringify(promptResult)}`);
        } catch (error) {
          console.error(`[${nodeId}] Erreur lors de l'exécution du prompt:`, error.message);
        }
      }
    }, 3000);
    
    // Gestion de l'arrêt propre
    process.on('SIGINT', async () => {
      console.error(`\n[${nodeId}] Arrêt en cours...`);
      clearInterval(toolCheckInterval);
      await client.disconnect();
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