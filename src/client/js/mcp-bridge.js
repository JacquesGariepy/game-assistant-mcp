// client/js/mcp-bridge.js
// Ce script sert de pont entre le serveur MCP et l'interface web

class McpBridge {
    constructor(gameViewer) {
        this.gameViewer = gameViewer;
        this.setupInterception();
        this.setupWebSocket();
    }
    
    setupInterception() {
        // Intercepter les logs pour capturer les messages du serveur MCP
        const originalConsoleError = console.error;
        console.error = (...args) => {
            // Vérifier si c'est un message de mise à jour
            if (args.length > 0 && typeof args[0] === 'string') {
                if (args[0].startsWith('GAMEVIEWER_UPDATE:')) {
                    this.handleMcpMessage(args[0].substring('GAMEVIEWER_UPDATE:'.length));
                }
            }
            
            // Continuer avec le comportement normal de console.error
            return originalConsoleError.apply(console, args);
        };
        
        console.log("McpBridge: Interception des logs configurée");
    }
    
    setupWebSocket() {
        // Optionnel: Configurer WebSocket pour une communication bidirectionnelle
        // Dans un environnement de production, cette approche serait préférable
        try {
            this.ws = new WebSocket('ws://localhost:8080');
            
            this.ws.onopen = () => {
                console.log("McpBridge: WebSocket connecté");
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'PLAYER_MOVED') {
                        this.updatePlayerPosition(data.position.x, data.position.y, data.position.z);
                    }
                } catch (error) {
                    console.error("McpBridge: Erreur de traitement du message WebSocket", error);
                }
            };
            
            this.ws.onerror = (error) => {
                console.error("McpBridge: Erreur WebSocket", error);
            };
            
            this.ws.onclose = () => {
                console.log("McpBridge: WebSocket déconnecté");
                // Tentative de reconnexion après un délai
                setTimeout(() => this.setupWebSocket(), 5000);
            };
        } catch (error) {
            console.log("McpBridge: WebSocket non disponible", error);
        }
    }
    
    handleMcpMessage(message) {
        console.log("McpBridge: Message reçu du serveur MCP:", message);
        
        try {
            // Évaluation sécurisée du code
            // Dans un environnement de production, il serait préférable
            // d'utiliser une approche plus sécurisée avec des commandes structurées
            new Function('gameViewer', message)(this.gameViewer);
        } catch (error) {
            console.error("McpBridge: Erreur lors de l'exécution du message", error);
        }
    }
    
    updatePlayerPosition(x, y, z) {
        if (!this.gameViewer) return;
        
        const player = this.gameViewer.scene.getObjectByName('player');
        if (player) {
            console.log(`McpBridge: Mise à jour de la position du joueur vers (${x}, ${y}, ${z})`);
            player.position.set(x, y, z);
            this.gameViewer.centerCameraOnPlayer(true);
            this.gameViewer.renderer.render(this.gameViewer.scene, this.gameViewer.camera);
        }
    }
    
    // Méthodes publiques utilisables par d'autres parties du code
    
    movePlayer(x, y, z) {
        this.updatePlayerPosition(x, y, z);
        
        // Si WebSocket est disponible, envoyer la mise à jour au serveur
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'PLAYER_MOVED',
                position: { x, y, z }
            }));
        }
    }
}

export { McpBridge };