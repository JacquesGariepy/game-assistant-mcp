import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { HttpClientTransport } from "@modelcontextprotocol/sdk/client/http.js";

/**
 * Client MCP avec une connexion persistante et un système de heartbeat
 */
export class McpClient {
  constructor(options) {
    this.clientId = options.clientId;
    this.clientType = options.clientType || 'client';
    this.hubUrl = options.hubUrl || 'http://localhost:3000/mcp';
    this.tools = options.tools || {};
    this.debugMode = options.debug || false;
    this.connected = false;
    this.client = null;
    this.heartbeatInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.reconnectDelay = options.reconnectDelay || 5000;
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

      // Création du transport HTTP
      const transport = new HttpClientTransport({ 
        url: this.hubUrl 
      });

      this.info(`Connexion au hub: ${this.hubUrl}...`);
      await this.client.connect(transport);
      this.info(`Connecté au hub`);
      this.connected = true;
      this.reconnectAttempts = 0;

      // Enregistrement du nœud
      await this.registerNode();

      // Enregistrement des outils
      await this.registerTools();

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
          type: this.clientType
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
            description: tool.description
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

  /**
   * Exécute une fonction de rappel lorsqu'un outil est appelé
   * (Ce serait implémenté dans une version plus complète)
   */
  onToolCall(toolName, callback) {
    // Non implémenté dans cette version simplifiée
    this.log(`onToolCall n'est pas encore implémenté`);
  }
}

// Exemple d'utilisation:
/*
const clientA = new McpClient({
  clientId: 'client-a',
  hubUrl: 'http://localhost:3000/mcp',
  debug: true,
  tools: {
    tool1: {
      name: "tool1",
      description: "Premier outil du client A",
      execute: (args) => `Résultat de tool1 avec ${JSON.stringify(args)}`
    }
  }
});

await clientA.connect();
const tools = await clientA.listTools();
console.log(tools);

// Pour appeler un outil distant:
const result = await clientA.callTool("client-b.tool3", { param: "test" });
console.log(result);
*/