import { ClaudeAdapter } from './claude-adapter.js';
import fs from 'fs';

// Simuler l'interface utilisateur de Claude Desktop pour les tests
class ClaudeDesktopSimulator {
  constructor() {
    this.adapter = null;
    this.connected = false;
    this.config = this.loadConfig();
  }
  
  loadConfig() {
    try {
      // Chemin à adapter selon la plateforme
      const configPath = 'C:\Users/admlocal/AppData/Roaming/Claude/claude_desktop_config.json';
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration:', error);
    }
    
    return { mcpServers: {} };
  }
  
  async initialize() {
    console.log('Initialisation de Claude Desktop...');
    
    // Créer l'adaptateur MCP
    this.adapter = new ClaudeAdapter({
      clientId: 'claude-desktop',
      hubPath: './mcp-hub.js', // À adapter selon la configuration
      transportType: 'stdio',
      debug: true,
      userApprovalCallback: this.userApprovalPrompt.bind(this)
    });
    
    try {
      // Se connecter au hub
      await this.adapter.connect();
      this.connected = true;
      console.log('Connecté au hub MCP');
      
      // Rafraîchir les outils disponibles
      await this.refreshMcpCapabilities();
      
      return true;
    } catch (error) {
      console.error('Erreur de connexion au hub MCP:', error);
      return false;
    }
  }
  
  async refreshMcpCapabilities() {
    if (!this.connected || !this.adapter) {
      console.log('Non connecté au hub MCP');
      return false;
    }
    
    // Rafraîchir les outils, ressources et prompts
    await this.adapter.refreshAll();
    
    // Afficher les capacités
    const tools = this.adapter.discoveredTools;
    const resources = this.adapter.discoveredResources;
    const prompts = this.adapter.discoveredPrompts;
    
    console.log(`MCP: ${tools.length} outil(s), ${resources.length} ressource(s), ${prompts.length} prompt(s) disponible(s)`);
    
    return true;
  }
  
  // Simuler la demande d'approbation utilisateur
  async userApprovalPrompt(toolId, args) {
    console.log(`--- DEMANDE D'APPROBATION ---`);
    console.log(`Claude souhaite utiliser l'outil: ${toolId}`);
    console.log(`Arguments: ${JSON.stringify(args, null, 2)}`);
    console.log(`Autoriser? (Oui par défaut)`);
    
    // Pour la démo, on approuve automatiquement
    return true;
  }
  
  // Simuler une interaction avec Claude
  async simulateQuery(userQuery) {
    console.log(`\n--- UTILISATEUR: ${userQuery} ---`);
    
    // Analyser la requête pour voir si des outils pourraient être utilisés
    const toolsToUse = this.identifyRelevantTools(userQuery);
    
    console.log('Claude analyse la requête...');
    
    // Simuler la réponse de Claude
    let claudeResponse = `Je vais vous aider avec cette requête.`;
    
    // Simuler l'utilisation des outils si pertinent
    if (toolsToUse.length > 0) {
      console.log(`Claude a identifié ${toolsToUse.length} outil(s) pertinent(s)`);
      
      for (const tool of toolsToUse) {
        // Générer des arguments fictifs basés sur la requête
        const args = this.generateToolArgs(tool, userQuery);
        
        // Demander l'approbation et exécuter l'outil
        try {
          console.log(`Claude souhaite utiliser l'outil: ${tool.id}`);
          const result = await this.adapter.executeToolForClaude(tool.id, args);
          
          if (result.error) {
            claudeResponse += `\n\nJ'ai essayé d'utiliser ${tool.id}, mais j'ai rencontré une erreur: ${result.error}`;
          } else {
            claudeResponse += `\n\nJ'ai utilisé ${tool.id} et voici le résultat: ${result.result}`;
          }
        } catch (error) {
          claudeResponse += `\n\nJ'ai essayé d'utiliser ${tool.id}, mais j'ai rencontré une erreur: ${error.message}`;
        }
      }
    }
    
    console.log(`\n--- CLAUDE: ${claudeResponse} ---`);
    return claudeResponse;
  }
  
  // Identifier les outils pertinents pour une requête
  identifyRelevantTools(query) {
    // Version simplifiée: retourne les outils correspondant à des mots-clés
    const lowercaseQuery = query.toLowerCase();
    
    return this.adapter.discoveredTools.filter(tool => {
      // Vérifier si le nom ou la description de l'outil contient un mot-clé de la requête
      const toolNameLower = tool.name.toLowerCase();
      const toolDescLower = (tool.description || '').toLowerCase();
      
      // Extraire des mots clés de la requête (simplifié)
      const keywords = lowercaseQuery.split(/\s+/);
      
      return keywords.some(keyword => 
        toolNameLower.includes(keyword) || 
        toolDescLower.includes(keyword)
      );
    });
  }
  
  // Générer des arguments pour un outil basés sur la requête
  generateToolArgs(tool, query) {
    // Version simplifiée: génère des arguments génériques
    return {
      query: query,
      from: 'claude-desktop'
    };
  }
  
  async shutdown() {
    if (this.adapter) {
      await this.adapter.disconnect();
    }
    console.log('Claude Desktop arrêté');
  }
}

// Exemple d'utilisation
async function main() {
  const claudeDesktop = new ClaudeDesktopSimulator();
  
  try {
    // Initialiser Claude Desktop
    await claudeDesktop.initialize();
    
    // Simuler quelques requêtes utilisateur
    await claudeDesktop.simulateQuery("Quels sont les outils disponibles?");
    
    await claudeDesktop.simulateQuery("Peux-tu utiliser l'outil de client-a pour m'aider?");
    
    await claudeDesktop.simulateQuery("J'aimerais accéder aux ressources du serveur.");
    
    // Arrêt propre
    //await claudeDesktop.shutdown();
    
  } catch (error) {
    console.error('Erreur:', error);
  }
}

// Exécuter la démo
main();