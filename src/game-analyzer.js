// src/game-analyzer.js

/**
 * Analyse la scène de jeu actuelle et fournit des informations détaillées
 */
export async function analyzeScene(gameState, detailLevel = "detailed", focusArea = "all") {
  const sceneGraph = await gameState.getSceneGraph();
  const playerData = await gameState.getPlayerData();
  const environmentData = await gameState.getEnvironmentData();
  
  let analysis = `# Analyse de la Scène: ${environmentData.name}\n\n`;
  
  // Analyse de l'environnement
  if (focusArea === "all" || focusArea === "environment") {
    analysis += `## Environnement\n\n`;
    analysis += `Type: ${environmentData.terrain_type}\n`;
    analysis += `Heure: ${environmentData.time_of_day}\n`;
    analysis += `Météo: ${environmentData.weather}\n`;
    analysis += `Éclairage: ${environmentData.ambient_lighting * 100}%\n\n`;
    
    if (detailLevel !== "basic") {
      analysis += `### Hazards and Points of Interest\n\n`;
      
      if (environmentData.hazards && environmentData.hazards.length > 0) {
        analysis += `**Dangers:**\n`;
        environmentData.hazards.forEach(hazard => {
          analysis += `- ${hazard.type} at (${hazard.location.x}, ${hazard.location.z})\n`;
        });
        analysis += `\n`;
      }
      
      if (environmentData.interactive_objects && environmentData.interactive_objects.length > 0) {
        analysis += `**Points d'intérêt:**\n`;
        environmentData.interactive_objects.forEach(poi => {
          analysis += `- ${poi.type} (${poi.id}) at (${poi.location.x}, ${poi.location.z})\n`;
        });
        analysis += `\n`;
      }
    }
  }
  
  // Analyse des personnages
  if (focusArea === "all" || focusArea === "character") {
    analysis += `## Personnage du Joueur\n\n`;
    analysis += `Nom: ${playerData.name}\n`;
    analysis += `Niveau: ${playerData.level}\n`;
    analysis += `Santé: ${playerData.health}/${playerData.max_health}\n`;
    analysis += `Mana: ${playerData.mana}/${playerData.max_mana}\n`;
    analysis += `Position: (${playerData.position.x}, ${playerData.position.z})\n\n`;
    
    if (detailLevel !== "basic") {
      analysis += `### Inventaire\n\n`;
      playerData.inventory.forEach(item => {
        if (item.quantity) {
          analysis += `- ${item.name} (x${item.quantity})\n`;
        } else {
          analysis += `- ${item.name}${item.equipped ? " (Équipé)" : ""}\n`;
        }
      });
      analysis += `\n`;
      
      analysis += `### Capacités\n\n`;
      playerData.abilities.forEach(ability => {
        let details = `Dégâts: ${ability.damage}`;
        if (ability.mana_cost) details += `, Coût: ${ability.mana_cost} mana`;
        if (ability.cooldown) details += `, Recharge: ${ability.cooldown}s`;
        
        analysis += `- ${ability.name} (${details})\n`;
      });
      analysis += `\n`;
    }
  }
  
  // Analyse des objets interactifs
  if (focusArea === "all" || focusArea === "interactive_objects") {
    analysis += `## Objets Interactifs\n\n`;
    
    // Fonction récursive pour trouver les objets interactifs
    function findInteractiveObjects(node) {
      let interactives = [];
      
      if (node.userData && node.userData.interactive === true) {
        interactives.push(node);
      }
      
      if (node.children) {
        node.children.forEach(child => {
          interactives = interactives.concat(findInteractiveObjects(child));
        });
      }
      
      return interactives;
    }
    
    const interactiveObjects = findInteractiveObjects(sceneGraph);
    
    if (interactiveObjects.length > 0) {
      interactiveObjects.forEach(obj => {
        analysis += `### ${obj.name}\n\n`;
        analysis += `Type: ${obj.userData.type}\n`;
        analysis += `Position: (${obj.position.x}, ${obj.position.z})\n`;
        
        // Inclure des détails supplémentaires selon le type d'objet
        if (obj.userData.type === "container") {
          analysis += `Verrouillé: ${obj.userData.locked ? "Oui" : "Non"}\n`;
          if (obj.userData.loot) {
            analysis += `Contenu: ${obj.userData.loot.join(", ")}\n`;
          }
        } else if (obj.userData.type === "npc") {
          analysis += `Rôle: ${obj.userData.npcType}\n`;
          analysis += `Dialogue: "${obj.userData.dialogue}"\n`;
        } else if (obj.userData.type === "building") {
          analysis += `Contient: ${obj.userData.contains}\n`;
        }
        
        analysis += `\n`;
      });
    } else {
      analysis += `Aucun objet interactif trouvé dans la vue actuelle.\n\n`;
    }
  }
  
  // Analyse plus détaillée
  if (detailLevel === "comprehensive") {
    analysis += `## État des Quêtes\n\n`;
    
    const quests = await gameState.getQuestLog();
    const activeQuests = quests.filter(q => q.status === "active");
    
    if (activeQuests.length > 0) {
      activeQuests.forEach(quest => {
        analysis += `### ${quest.title}\n\n`;
        analysis += `Type: ${quest.type}\n`;
        analysis += `Description: ${quest.description}\n\n`;
        
        analysis += `**Objectifs:**\n`;
        quest.objectives.forEach(objective => {
          analysis += `- ${objective.description} (${objective.status})\n`;
        });
        
        analysis += `\n**Récompenses:**\n`;
        quest.rewards.forEach(reward => {
          if (reward.type === "xp") {
            analysis += `- ${reward.amount} points d'expérience\n`;
          } else if (reward.type === "gold") {
            analysis += `- ${reward.amount} pièces d'or\n`;
          } else if (reward.type === "item") {
            analysis += `- Item: ${reward.id}\n`;
          }
        });
        
        analysis += `\n`;
      });
    } else {
      analysis += `Aucune quête active.\n\n`;
    }
    
    analysis += `## Statistiques Techniques\n\n`;
    analysis += `Nombre d'objets dans la scène: ${countObjects(sceneGraph)}\n`;
    analysis += `Nombre de lumières: ${countLights(sceneGraph)}\n`;
    analysis += `Nombre d'objets interactifs: ${countInteractiveObjects(sceneGraph)}\n`;
  }
  
  return analysis;
}

/**
 * Obtient des détails sur un objet spécifique dans la scène
 */
export async function getObjectDetails(gameState, objectId, includeMeshData = false) {
  const sceneGraph = await gameState.getSceneGraph();
  
  // Fonction récursive pour trouver un objet par son UUID ou son nom
  function findObject(node, id) {
    if (node.uuid === id || node.name === id) {
      return node;
    }
    
    if (node.children) {
      for (const child of node.children) {
        const found = findObject(child, id);
        if (found) return found;
      }
    }
    
    return null;
  }
  
  const object = findObject(sceneGraph, objectId);
  
  if (!object) {
    return `Objet avec ID "${objectId}" non trouvé dans la scène.`;
  }
  
  let details = `# Détails de l'objet: ${object.name}\n\n`;
  details += `Type: ${object.type}\n`;
  details += `UUID: ${object.uuid}\n`;
  
  if (object.position) {
    details += `Position: (${object.position.x}, ${object.position.y}, ${object.position.z})\n`;
  }
  
  // Ajouter les métadonnées
  if (object.userData && Object.keys(object.userData).length > 0) {
    details += `\n## Metadata\n\n`;
    
    for (const [key, value] of Object.entries(object.userData)) {
      details += `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}\n`;
    }
  }
  
  // Détails selon le type d'objet
  if (object.geometry) {
    details += `\n## Géométrie\n\n`;
    details += `Type: ${object.geometry.type}\n`;
    
    if (object.geometry.parameters) {
      details += `\nParamètres:\n`;
      for (const [key, value] of Object.entries(object.geometry.parameters)) {
        if (value !== undefined) {
          details += `${key}: ${value}\n`;
        }
      }
    }
  }
  
  if (object.material) {
    details += `\n## Matériau\n\n`;
    details += `Type: ${object.material.type}\n`;
    
    if (object.material.color) {
      details += `Couleur: ${object.material.color}\n`;
    }
  }
  
  if (object.children && object.children.length > 0) {
    details += `\n## Enfants\n\n`;
    object.children.forEach(child => {
      details += `- ${child.name} (${child.type})\n`;
    });
  }
  
  // Si l'objet est interactif, fournir des informations spécifiques
  if (object.userData && object.userData.interactive) {
    details += `\n## Interaction\n\n`;
    
    if (object.userData.type === "npc") {
      details += `Rôle: ${object.userData.npcType}\n`;
      details += `Dialogue: "${object.userData.dialogue}"\n`;
    } else if (object.userData.type === "container") {
      details += `Verrouillé: ${object.userData.locked ? "Oui" : "Non"}\n`;
      if (object.userData.loot) {
        details += `Contenu: ${object.userData.loot.join(", ")}\n`;
      }
    } else if (object.userData.type === "building") {
      details += `Contient: ${object.userData.contains}\n`;
    }
  }
  
  // Inclure des données de maillage détaillées si demandé
  if (includeMeshData && object.geometry) {
    details += `\n## Données de Maillage\n\n`;
    details += `Nombre de vertices: ${object.geometry.attributes?.position?.count || "N/A"}\n`;
    details += `Nombre de faces: ${object.geometry.index ? object.geometry.index.count / 3 : "N/A"}\n`;
  }
  
  return details;
}

/**
 * Obtient des statistiques détaillées sur le rendu
 */
export async function getRenderStats(gameState, detailed = false) {
  // Dans un vrai projet, cette fonction obtiendrait les statistiques de rendu de Three.js
  // Pour cet exemple, nous renvoyons des données simulées
  
  const sceneGraph = await gameState.getSceneGraph();
  
  // Compter les objets pour simuler les statistiques
  const objectCount = countObjects(sceneGraph);
  const triangleCount = estimateTriangles(sceneGraph);
  
  // Simuler différentes métriques de performance
  const stats = {
    fps: Math.round(60 - (objectCount / 100) * 5),
    render_time_ms: Math.round(5 + (triangleCount / 10000) * 3),
    visible_objects: Math.round(objectCount * 0.7),
    draw_calls: Math.round(objectCount * 0.4),
    triangles: triangleCount,
    memory_mb: 100 + triangleCount / 1000,
    recommendations: []
  };
  
  // Génerer des recommandations basées sur les métriques
  if (stats.fps < 45) {
    stats.recommendations.push("Les FPS sont bas. Envisagez de réduire la complexité de la scène ou d'activer le Level of Detail (LOD).");
  }
  
  if (stats.draw_calls > 100) {
    stats.recommendations.push("Nombre élevé d'appels de dessin. Envisagez d'utiliser le batching ou l'instanciation pour les objets similaires.");
  }
  
  if (stats.triangles > 500000) {
    stats.recommendations.push("Nombre élevé de triangles. Optimisez les modèles 3D ou utilisez des modèles moins détaillés pour les objets distants.");
  }
  
  if (stats.memory_mb > 200) {
    stats.recommendations.push("Utilisation mémoire élevée. Vérifiez la taille des textures et envisagez la compression.");
  }
  
  if (detailed) {
    // Ajouter des informations plus détaillées pour une analyse approfondie
    stats.vertex_count = triangleCount * 3;
    stats.texture_memory_mb = Math.round(stats.memory_mb * 0.6);
    stats.geometry_memory_mb = Math.round(stats.memory_mb * 0.3);
    stats.shader_complexity = Math.round(Math.random() * 10);
    
    // Recommandations supplémentaires
    if (stats.texture_memory_mb > 100) {
      stats.recommendations.push("Forte utilisation de mémoire texture. Réduisez la taille des textures ou utilisez la mipmapping.");
    }
    
    if (stats.shader_complexity > 7) {
      stats.recommendations.push("Shaders complexes détectés. Simplifiez les effets de rendu pour les plateformes à faible puissance.");
    }
  }
  
  if (stats.recommendations.length === 0) {
    stats.recommendations.push("Les performances semblent bonnes. Aucune optimisation majeure nécessaire.");
  }
  
  return stats;
}

// Fonctions auxiliaires

function countObjects(node) {
  let count = 1; // Compter le nœud actuel
  
  if (node.children) {
    node.children.forEach(child => {
      count += countObjects(child);
    });
  }
  
  return count;
}

function countLights(node) {
  let count = node.type && node.type.includes("Light") ? 1 : 0;
  
  if (node.children) {
    node.children.forEach(child => {
      count += countLights(child);
    });
  }
  
  return count;
}

function countInteractiveObjects(node) {
  let count = node.userData && node.userData.interactive === true ? 1 : 0;
  
  if (node.children) {
    node.children.forEach(child => {
      count += countInteractiveObjects(child);
    });
  }
  
  return count;
}

function estimateTriangles(node) {
  let count = 0;
  
  // Estimer le nombre de triangles en fonction du type de géométrie
  if (node.geometry) {
    const type = node.geometry.type;
    
    if (type.includes("Box")) {
      count += 12; // 6 faces, 2 triangles par face
    } else if (type.includes("Sphere")) {
      count += 500; // Approximation
    } else if (type.includes("Plane")) {
      count += 2; // 2 triangles
    } else if (type.includes("Cylinder")) {
      count += 100; // Approximation
    } else if (type.includes("Cone")) {
      count += 80; // Approximation
    } else {
      count += 20; // Valeur par défaut
    }
  }
  
  if (node.children) {
    node.children.forEach(child => {
      count += estimateTriangles(child);
    });
  }
  
  return count;
}
