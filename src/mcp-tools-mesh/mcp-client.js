import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/**
 * Client MCP avec une connexion persistante et support complet du protocole MCP
 */
export class McpClient {
  constructor(options) {
    this.clientId = options.clientId;
    this.clientType = options.clientType || 'client';
    this.hubPath = options.hubPath;
    this.tools = options.tools || {};
    this.resources = options.resources || {};
    this.prompts = options.prompts || {};
    this.debugMode = options.debug || false;
    this.connected = false;
    this.client = null;
    this.heartbeatInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.reconnectDelay = options.reconnectDelay || 5000;
    
    // ID unique pour les callbacks d'exécution
    this.executorId = `executor-${this.clientId}-${Date.now()}`;
    
    // Gestionnaire d'exécution locale
    this.executeLocalTool = options.executeLocalTool || this._defaultToolExecutor.bind(this);
  }

  /**
   * Écrit dans la console en mode debug
   */
  log(...args) {
    if (this.debugMode) {
      console.log(`[${this.clientId}]`, ...args);
    }
  }

  /**
   * Écrit toujours dans la console
   */
  info(...args) {
    console.log(`[${this.clientId}]`, ...args);
  }

  /**
   * Écrit les erreurs dans la console
   */
  error(...args) {
    console.error(`[${this.clientId}]`, ...args);
  }

  /**
   * Initialise et connecte le client au hub MCP
   */
  async connect() {
    try {
      this.client = new Client({
        name: this.clientId,
        version: "1.0.0"
      });

      // Création du transport StdIO puisque le transport HTTP n'est pas disponible
      if (!this.hubPath) {
        throw new Error('Le chemin du hub est nécessaire pour la connexion StdIO');
      }
      
      const transport = new StdioClientTransport({
        command: "node",
        args: [this.hubPath]
      });
      
      this.info(`Connexion au hub via StdIO: ${this.hubPath}...`);

      await this.client.connect(transport);
      this.info(`Connecté au hub`);
      this.connected = true;
      this.reconnectAttempts = 0;

      // Enregistrement du nœud
      await this.registerNode();
      
      // Enregistrement du canal d'exécution
      await this.registerExecutor();

      // Enregistrement des outils
      await this.registerTools();
      
      // Enregistrement des ressources
      await this.registerResources();
      
      // Enregistrement des prompts
      await this.registerPrompts();

      // Démarrer le heartbeat
      this.startHeartbeat();

      return true;
    } catch (error) {
      this.error(`Erreur de connexion:`, error);
      
      // Tentative de reconnexion si ce n'est pas la limite
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        this.info(`Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts} dans ${this.reconnectDelay/1000}s...`);
        
        setTimeout(() => {
          this.connect();
        }, this.reconnectDelay);
      } else {
        this.error(`Nombre maximum de tentatives de reconnexion atteint.`);
        throw error;
      }
    }
  }

  /**
   * Enregistre ce nœud auprès du hub
   */
  async registerNode() {
    try {
      this.info(`Enregistrement du nœud: ${this.clientId}...`);
      const result = await this.client.callTool({
        name: "register-node",
        arguments: {
          id: this.clientId,
          type: this.clientType,
          capabilities: {
            tools: Object.keys(this.tools).length > 0,
            resources: Object.keys(this.resources).length > 0,
            prompts: Object.keys(this.prompts).length > 0
          }
        }
      });
      
      if (result?.content?.[0]?.text) {
        const response = JSON.parse(result.content[0].text);
        if (response.success) {
          this.info(`Nœud enregistré avec succès`);
          return true;
        } else {
          this.error(`Échec de l'enregistrement: ${response.error || 'Erreur inconnue'}`);
        }
      }
      
      return false;
    } catch (error) {
      this.error(`Erreur lors de l'enregistrement du nœud:`, error);
      throw error;
    }
  }
  
  /**
   * Enregistre le canal d'exécution pour ce nœud
   */
  async registerExecutor() {
    try {
      this.info(`Enregistrement du canal d'exécution...`);
      const result = await this.client.callTool({
        name: "register-executor",
        arguments: {
          nodeId: this.clientId,
          callbackId: this.executorId
        }
      });
      
      if (result?.content?.[0]?.text) {
        const response = JSON.parse(result.content[0].text);
        if (response.success) {
          this.info(`Canal d'exécution enregistré avec succès`);
          return true;
        } else {
          this.error(`Échec de l'enregistrement du canal: ${response.error || 'Erreur inconnue'}`);
        }
      }
      
      return false;
    } catch (error) {
      this.error(`Erreur lors de l'enregistrement du canal d'exécution:`, error);
      // Non critique, on continue
      return false;
    }
  }

  /**
   * Enregistre les outils locaux auprès du hub
   */
  async registerTools() {
    this.info(`Enregistrement des outils (${Object.keys(this.tools).length})...`);
    
    for (const [name, tool] of Object.entries(this.tools)) {
      try {
        const result = await this.client.callTool({
          name: "register-tool",
          arguments: {
            nodeId: this.clientId,
            toolName: name,
            description: tool.description,
            inputSchema: tool.inputSchema || {}
          }
        });
        
        if (result?.content?.[0]?.text) {
          const response = JSON.parse(result.content[0].text);
          if (response.success) {
            this.log(`Outil enregistré: ${name}`);
          } else {
            this.error(`Échec de l'enregistrement de l'outil ${name}: ${response.error || 'Erreur inconnue'}`);
          }
        }
      } catch (error) {
        this.error(`Erreur lors de l'enregistrement de l'outil ${name}:`, error);
      }
    }
  }
  
  /**
   * Enregistre les ressources locales auprès du hub
   */
  async registerResources() {
    this.info(`Enregistrement des ressources (${Object.keys(this.resources).length})...`);
    
    for (const [uri, resource] of Object.entries(this.resources)) {
      try {
        const result = await this.client.callTool({
          name: "register-resource",
          arguments: {
            nodeId: this.clientId,
            uri,
            name: resource.name,
            description: resource.description,
            mimeType: resource.mimeType
          }
        });
        
        if (result?.content?.[0]?.text) {
          const response = JSON.parse(result.content[0].text);
          if (response.success) {
            this.log(`Ressource enregistrée: ${uri}`);
          } else {
            this.error(`Échec de l'enregistrement de la ressource ${uri}: ${response.error || 'Erreur inconnue'}`);
          }
        }
      } catch (error) {
        this.error(`Erreur lors de l'enregistrement de la ressource ${uri}:`, error);
      }
    }
  }
  
  /**
   * Enregistre les prompts locaux auprès du hub
   */
  async registerPrompts() {
    this.info(`Enregistrement des prompts (${Object.keys(this.prompts).length})...`);
    
    for (const [id, prompt] of Object.entries(this.prompts)) {
      try {
        const result = await this.client.callTool({
          name: "register-prompt",
          arguments: {
            nodeId: this.clientId,
            promptId: id,
            name: prompt.name,
            description: prompt.description,
            arguments: prompt.arguments || []
          }
        });
        
        if (result?.content?.[0]?.text) {
          const response = JSON.parse(result.content[0].text);
          if (response.success) {
            this.log(`Prompt enregistré: ${id}`);
          } else {
            this.error(`Échec de l'enregistrement du prompt ${id}: ${response.error || 'Erreur inconnue'}`);
          }
        }
      } catch (error) {
        this.error(`Erreur lors de l'enregistrement du prompt ${id}:`, error);
      }
    }
  }

  /**
   * Démarre le heartbeat périodique pour signaler que ce nœud est actif
   */
  startHeartbeat() {
    const HEARTBEAT_INTERVAL = 10000; // 10 secondes
    
    // Nettoyer l'intervalle existant si nécessaire
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(async () => {
      try {
        if (!this.connected) {
          this.log(`Heartbeat ignoré - client déconnecté`);
          return;
        }
        
        this.log(`Envoi du heartbeat...`);
        const result = await this.client.callTool({
          name: "heartbeat",
          arguments: {
            id: this.clientId
          }
        });
        
        if (result?.content?.[0]?.text) {
          const response = JSON.parse(result.content[0].text);
          if (!response.success) {
            this.error(`Échec du heartbeat: ${response.error || 'Erreur inconnue'}`);
            // Tenter de se réenregistrer
            await this.registerNode();
          }
        }
      } catch (error) {
        this.error(`Erreur lors du heartbeat:`, error);
        this.connected = false;
        
        // Tenter de se reconnecter
        this.reconnect();
      }
    }, HEARTBEAT_INTERVAL);
    
    this.info(`Système de heartbeat démarré (intervalle: ${HEARTBEAT_INTERVAL/1000}s)`);
  }

  /**
   * Tente de se reconnecter après une déconnexion
   */
  async reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.info(`Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
      
      try {
        await this.connect();
        this.info(`Reconnecté avec succès au hub`);
      } catch (error) {
        this.error(`Échec de la reconnexion:`, error);
      }
    } else {
      this.error(`Nombre maximum de tentatives de reconnexion atteint.`);
    }
  }

  /**
   * Liste tous les outils disponibles sur le réseau
   */
  async listTools() {
    try {
      this.info(`Demande de la liste des outils...`);
      const result = await this.client.callTool({
        name: "list-tools",
        arguments: {}
      });
      
      if (result?.content?.[0]?.text) {
        const tools = JSON.parse(result.content[0].text);
        this.info(`${tools.length} outil(s) disponible(s)`);
        return tools;
      }
      
      return [];
    } catch (error) {
      this.error(`Erreur lors de la récupération des outils:`, error);
      throw error;
    }
  }
  
  /**
   * Liste toutes les ressources disponibles sur le réseau
   */
  async listResources() {
    try {
      this.info(`Demande de la liste des ressources...`);
      const result = await this.client.callTool({
        name: "list-resources",
        arguments: {}
      });
      
      if (result?.content?.[0]?.text) {
        const resources = JSON.parse(result.content[0].text);
        this.info(`${resources.length} ressource(s) disponible(s)`);
        return resources;
      }
      
      return [];
    } catch (error) {
      this.error(`Erreur lors de la récupération des ressources:`, error);
      throw error;
    }
  }
  
  /**
   * Liste tous les prompts disponibles sur le réseau
   */
  async listPrompts() {
    try {
      this.info(`Demande de la liste des prompts...`);
      const result = await this.client.callTool({
        name: "list-prompts",
        arguments: {}
      });
      
      if (result?.content?.[0]?.text) {
        const prompts = JSON.parse(result.content[0].text);
        this.info(`${prompts.length} prompt(s) disponible(s)`);
        return prompts;
      }
      
      return [];
    } catch (error) {
      this.error(`Erreur lors de la récupération des prompts:`, error);
      throw error;
    }
  }

  /**
   * Appelle un outil distant
   */
  async callTool(toolId, args = {}) {
    try {
      this.info(`Appel de l'outil: ${toolId}`);
      const result = await this.client.callTool({
        name: "call-remote-tool",
        arguments: {
          fromNode: this.clientId,
          toolId: toolId,
          args: args
        }
      });
      
      return result?.content?.[0]?.text;
    } catch (error) {
      this.error(`Erreur lors de l'appel de l'outil ${toolId}:`, error);
      throw error;
    }
  }
  
  /**
   * Lit une ressource distante
   */
  async readResource(uri) {
    try {
      this.info(`Lecture de la ressource: ${uri}`);
      const result = await this.client.callTool({
        name: "read-resource",
        arguments: {
          fromNode: this.clientId,
          uri: uri
        }
      });
      
      if (result?.content?.[0]?.text) {
        const response = JSON.parse(result.content[0].text);
        if (response.success) {
          return response.contents;
        } else {
          throw new Error(response.error || "Erreur inconnue lors de la lecture");
        }
      }
      
      throw new Error("Format de réponse invalide");
    } catch (error) {
      this.error(`Erreur lors de la lecture de la ressource ${uri}:`, error);
      throw error;
    }
  }
  
  /**
   * Exécute un prompt distant
   */
  async getPrompt(promptId, args = {}) {
    try {
      this.info(`Exécution du prompt: ${promptId}`);
      const result = await this.client.callTool({
        name: "get-prompt",
        arguments: {
          fromNode: this.clientId,
          promptId: promptId,
          arguments: args
        }
      });
      
      if (result?.content?.[0]?.text) {
        const response = JSON.parse(result.content[0].text);
        if (response.success) {
          return response.messages;
        } else {
          throw new Error(response.error || "Erreur inconnue lors de l'exécution du prompt");
        }
      }
      
      throw new Error("Format de réponse invalide");
    } catch (error) {
      this.error(`Erreur lors de l'exécution du prompt ${promptId}:`, error);
      throw error;
    }
  }

  /**
   * Vérifie si un outil est disponible sur le réseau
   */
  async checkToolAvailability(toolId) {
    try {
      const tools = await this.listTools();
      return tools.some(tool => tool.id === toolId);
    } catch (error) {
      this.error(`Erreur lors de la vérification de l'outil ${toolId}:`, error);
      return false;
    }
  }
  
  /**
   * Vérifie si une ressource est disponible sur le réseau
   */
  async checkResourceAvailability(uri) {
    try {
      const resources = await this.listResources();
      return resources.some(resource => resource.uri === uri);
    } catch (error) {
      this.error(`Erreur lors de la vérification de la ressource ${uri}:`, error);
      return false;
    }
  }
  
  /**
   * Vérifie si un prompt est disponible sur le réseau
   */
  async checkPromptAvailability(promptId) {
    try {
      const prompts = await this.listPrompts();
      return prompts.some(prompt => prompt.id === promptId);
    } catch (error) {
      this.error(`Erreur lors de la vérification du prompt ${promptId}:`, error);
      return false;
    }
  }

  /**
   * Exécuteur d'outil local par défaut
   */
  _defaultToolExecutor(toolName, args) {
    const tool = this.tools[toolName];
    if (!tool || !tool.execute) {
      throw new Error(`Outil local ${toolName} non disponible ou sans fonction d'exécution`);
    }
    
    try {
      return tool.execute(args);
    } catch (error) {
      this.error(`Erreur lors de l'exécution de l'outil ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * Ferme proprement la connexion
   */
  async disconnect() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.client && this.connected) {
      try {
        await this.client.close();
        this.info(`Connexion fermée`);
      } catch (error) {
        this.error(`Erreur lors de la fermeture de la connexion:`, error);
      }
    }
    
    this.connected = false;
  }
}