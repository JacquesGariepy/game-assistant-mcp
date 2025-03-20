import { McpClient } from './mcp-client.js';

// Configuration du client
const nodeId = "client-b";
const clientType = "client";

// Outils locaux du client B
const localTools = {
  tool3: {
    name: "tool3",
    description: "Premier outil du client B",
    inputSchema: {
      type: "object",
      properties: {
        param: { type: "string" },
        from: { type: "string" }
      }
    },
    execute: (args) => `Résultat de tool3 avec ${JSON.stringify(args)}`
  },
  tool4: {
    name: "tool4",
    description: "Second outil du client B",
    inputSchema: {
      type: "object",
      properties: {
        param: { type: "string" },
        from: { type: "string" }
      }
    },
    execute: (args) => `Résultat de tool4 avec ${JSON.stringify(args)}`
  }
};

// Ressources locales
const localResources = {
  "client-b://data/report": {
    name: "Rapport mensuel",
    description: "Rapport mensuel du client B",
    mimeType: "text/plain",
    content: "Contenu du rapport mensuel du client B"
  },
  "client-b://images/logo": {
    name: "Logo",
    description: "Logo du client B",
    mimeType: "image/png",
    content: "Données du logo (simulé)"
  }
};

// Prompts locaux
const localPrompts = {
  "welcome": {
    name: "Message de bienvenue",
    description: "Génère un message de bienvenue personnalisé",
    arguments: [
      {
        name: "name",
        description: "Nom de la personne à accueillir",
        required: true
      },
      {
        name: "language",
        description: "Langue du message",
        required: false
      }
    ],
    execute: (args) => {
      const { name, language } = args;
      if (language && language.toLowerCase() === "français") {
        return `Bienvenue, ${name}! Nous sommes ravis de vous avoir avec nous.`;
      } else {
        return `Welcome, ${name}! We're delighted to have you with us.`;
      }
    }
  }
};

// Pour suivre la disponibilité des autres nœuds
let clientAAvailable = false;
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
        console.error(`[${nodeId}] Nœuds actifs: ${nodeIds.join(', ')} (${tools.length} outils au total)`);
        
        // Vérifier les ressources disponibles
        const resources = await client.listResources();
        console.error(`[${nodeId}] Ressources disponibles: ${resources.length}`);
        
        // Vérifier les prompts disponibles
        const prompts = await client.listPrompts();
        console.error(`[${nodeId}] Prompts disponibles: ${prompts.length}`);
        
        // Vérifier si client-a est disponible
        const clientATools = tools.filter(t => t.nodeId === "client-a");
        if (clientATools.length > 0 && !clientAAvailable) {
          clientAAvailable = true;
          console.error(`[${nodeId}] Le client A est maintenant disponible avec ${clientATools.length} outil(s)`);
          
          // Tester les outils de client-a
          for (const tool of clientATools) {
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
      
      // Essayer d'appeler client-a.tool1
      try {
        console.error(`[${nodeId}] Appel manuel de client-a.tool1...`);
        const tool1Result = await client.callTool("client-a.tool1", { 
          param: "appel manuel", 
          from: nodeId 
        });
        console.error(`[${nodeId}] Résultat: ${tool1Result}`);
      } catch (error) {
        console.error(`[${nodeId}] Erreur lors de l'appel de client-a.tool1:`, error.message);
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
      if (clientAAvailable) {
        try {
          console.error(`[${nodeId}] Lecture d'une ressource de client-a...`);
          const resourceUri = "client-a://data/resource1";
          const resourceContent = await client.readResource(resourceUri);
          console.error(`[${nodeId}] Contenu de la ressource: ${JSON.stringify(resourceContent)}`);
        } catch (error) {
          console.error(`[${nodeId}] Erreur lors de la lecture de ressource:`, error.message);
        }
      }
      
      // Test d'exécution de prompt
      if (clientAAvailable) {
        try {
          console.error(`[${nodeId}] Exécution d'un prompt de client-a...`);
          const promptId = "client-a.greeting";
          const promptResult = await client.getPrompt(promptId, { 
            name: nodeId,
            formal: true 
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