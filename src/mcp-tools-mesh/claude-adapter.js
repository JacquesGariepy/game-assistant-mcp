import { McpClient } from './mcp-client.js';

export class ClaudeAdapter {
  constructor(options = {}) {
    this.clientId = options.clientId || 'claude-desktop';
    this.hubPath = options.hubPath || './mcp-hub.js';
    this.transportType = options.transportType || 'stdio';
    this.hubUrl = options.hubUrl; // Pour le transport HTTP
    
    this.client = new McpClient({
      clientId: this.clientId,
      clientType: 'llm',
      hubPath: this.hubPath,
      hubUrl: this.hubUrl,
      transportType: this.transportType,
      debug: options.debug || false
    });
    
    // Liste des éléments découverts
    this.discoveredTools = [];
    this.discoveredResources = [];
    this.discoveredPrompts = [];
    
    // Callback d'approbation utilisateur
    this.userApprovalCallback = options.userApprovalCallback;
    
    // Intervalle de rafraîchissement
    this.refreshInterval = null;
  }
  
  async connect() {
    await this.client.connect();
    
    // Rafraîchir maintenant
    await this.refreshAll();
    
    // Démarrer l'actualisation périodique
    this.refreshInterval = setInterval(() => this.refreshAll(), 15000);
    
    return true;
  }
  
  async refreshAll() {
    try {
      await Promise.all([
        this.refreshTools(),
        this.refreshResources(),
        this.refreshPrompts()
      ]);
      return true;
    } catch (error) {
      console.error('[ClaudeAdapter] Erreur lors du rafraîchissement:', error);
      return false;
    }
  }
  
  async refreshTools() {
    try {
      const tools = await this.client.listTools();
      this.discoveredTools = tools;
      return tools;
    } catch (error) {
      console.error('[ClaudeAdapter] Erreur lors de la récupération des outils:', error);
      return [];
    }
  }
  
  async refreshResources() {
    try {
      const resources = await this.client.listResources();
      this.discoveredResources = resources;
      return resources;
    } catch (error) {
      console.error('[ClaudeAdapter] Erreur lors de la récupération des ressources:', error);
      return [];
    }
  }
  
  async refreshPrompts() {
    try {
      const prompts = await this.client.listPrompts();
      this.discoveredPrompts = prompts;
      return prompts;
    } catch (error) {
      console.error('[ClaudeAdapter] Erreur lors de la récupération des prompts:', error);
      return [];
    }
  }
  
  // Convertit les outils MCP en format Claude
  getClaudeTools() {
    return this.discoveredTools.map(tool => ({
      name: tool.id,
      description: tool.description || `Outil ${tool.name} de ${tool.nodeId}`,
      input_schema: tool.inputSchema || {
        type: "object",
        properties: {
          // Schéma par défaut si aucun n'est fourni
          param: { type: "string" }
        }
      }
    }));
  }
  
  // Exécute un outil via le hub MCP
  async executeToolForClaude(toolId, args) {
    // Vérifier si l'approbation utilisateur est nécessaire
    if (this.userApprovalCallback) {
      const approved = await this.userApprovalCallback(toolId, args);
      if (!approved) {
        return { error: "L'utilisateur a refusé l'exécution de l'outil" };
      }
    }
    
    try {
      const result = await this.client.callTool(toolId, args);
      return { result };
    } catch (error) {
      return { error: error.message };
    }
  }
  
  // Obtient une ressource pour Claude
  async getResourceForClaude(uri) {
    try {
      const contents = await this.client.readResource(uri);
      return contents;
    } catch (error) {
      return { error: error.message };
    }
  }
  
  // Exécute un prompt pour Claude
  async executePromptForClaude(promptId, args) {
    try {
      const messages = await this.client.getPrompt(promptId, args);
      return messages;
    } catch (error) {
      return { error: error.message };
    }
  }
  
  // Déconnexion propre
  async disconnect() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    await this.client.disconnect();
    return true;
  }
}