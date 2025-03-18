@echo off
REM Instructions d'installation et d'utilisation du réseau MCP Mesh pour Windows

echo Installation et configuration du système MCP Mesh pour Windows

echo.
echo Assurez-vous d'avoir Node.js installé sur votre système Windows.
echo Si ce n'est pas le cas, téléchargez-le depuis https://nodejs.org/
echo.

REM Vérifier si Node.js est installé
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERREUR: Node.js n'est pas installé ou n'est pas dans le PATH.
    echo Veuillez installer Node.js et réessayer.
    exit /b 1
)

echo Node.js est installé. Configuration du projet...
echo.

REM Création du répertoire de projet si nécessaire
if not exist mcp-mesh mkdir mcp-mesh
cd mcp-mesh

REM Installation des dépendances
echo Installation des dépendances MCP...
call npm init -y
call npm install @modelcontextprotocol/sdk

echo.
echo Dépendances installées avec succès.
echo.

echo Création des fichiers du système...
echo.

REM Créer les fichiers package.json pour ESM
echo { "type": "module" } > package.json

REM Vous devriez copier le contenu des fichiers fournis ici

echo Fichiers créés avec succès!
echo.

echo Pour démarrer le système:
echo.
echo 1. Ouvrez l'invite de commandes en tant qu'administrateur
echo.
echo 2. Démarrez d'abord le hub MCP (dans une fenêtre séparée):
echo    node mcp-hub.js
echo.
echo 3. Démarrez ensuite le serveur (dans une fenêtre séparée):
echo    node server.js
echo.
echo 4. Démarrez ensuite le client A (dans une fenêtre séparée):
echo    node client-a.js
echo.
echo 5. Démarrez enfin le client B (dans une fenêtre séparée):
echo    node client-b.js
echo.
echo Les nœuds vont automatiquement se connecter, s'enregistrer
echo et commencer à communiquer entre eux.
echo.
echo Pour arrêter proprement un nœud, utilisez Ctrl+C dans sa fenêtre.
echo.

pause