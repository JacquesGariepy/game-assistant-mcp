import { McpClient } from './mcp-client.js';

// Configuration du serveur
const nodeId = "server";
const nodeType = "server";

// Outils locaux du serveur
const localTools = {
  "base-tool": {
    name: "base-tool",
    description: "Outil de base du serveur",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        from: { type: "string" }
      }
    },
    execute: (args) => `Résultat du serveur avec ${JSON.stringify(args)}`
  },
  "data-analyzer": {
    name: "data-analyzer",
    description: "Analyse des données",
    inputSchema: {
      type: "object",
      properties: {
        dataset: { type: "string" },
        operation: { type: "string" }
      }
    },
    execute: (args) => {
      const { dataset, operation } = args;
      return `Analyse de ${dataset} avec opération ${operation}: Résultats simulés`;
    }
  }
};

// Ressources locales
const localResources = {
  "server://data/config": {
    name: "Configuration",
    description: "Fichier de configuration du serveur",
    mimeType: "application/json",
    content: JSON.stringify({
      version: "1.0.0",
      apiEndpoint: "https://api.example.com",
      maxConnections: 100
    })
  },
  "server://data/status": {
    name: "Statut du serveur",
    description: "Statut actuel du serveur",
    mimeType: "text/plain",
    content: "Serveur opérationnel - Charge: 45% - Mémoire: 2.3GB/8GB"
  }
};

// Prompts locaux
const localPrompts = {
  "system-status": {
    name: "Statut du système",
    description: "Génère un rapport de statut du système",
    arguments: [
      {
        name: "format",
        description: "Format du rapport (court/détaillé)",
        required: false
      }
    ],
    execute: (args) => {
      const { format } = args;
      const isDetailed = format === "détaillé" || format === "detailed";
      
      if (isDetailed) {
        return `Rapport détaillé du statut système:
- Serveur: Opérationnel
- Charge CPU: 45%
- Mémoire: 2.3GB/8GB utilisée
- Disque: 234GB/500GB utilisé
- Services: 12/12 actifs
- Connexions réseau: 78 établies
- Dernier redémarrage: il y a 14 jours`;
      } else {
        return `Statut système: OPÉRATIONNEL (Charge: Moyenne, Ressources: Bonnes)`;
      }
    }
  }
};

// Pour suivre la disponibilité des autres nœuds
let clientAAvailable = false;
let clientBAvailable = false;

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
      clientType: nodeType,
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
      
      if (clientBAvailable) {
        try {
          console.error(`[${nodeId}] Lecture d'une ressource de client-b...`);
          const resourceUri = "client-b://data/report";
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