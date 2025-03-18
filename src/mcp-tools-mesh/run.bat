echo "Démarrage du hub MCP..."
node mcp-hub.js

# Attendez que le hub soit bien démarré, puis dans un AUTRE terminal:

# Étape 2: Démarrer le serveur dans un nouveau terminal
echo "Démarrage du serveur..."
node server.js

# Attendez que le serveur soit bien enregistré, puis dans un AUTRE terminal:

# Étape 3: Démarrer le client A dans un nouveau terminal
echo "Démarrage du client A..."
node client-a.js

# Attendez que le client A soit bien enregistré, puis dans un AUTRE terminal:

# Étape 4: Démarrer le client B dans un nouveau terminal
echo "Démarrage du client B..."
node client-b.js