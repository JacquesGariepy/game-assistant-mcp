// src/player-assistant.js

/**
 * Fournit des astuces et des conseils basés sur la situation actuelle du joueur
 */
export async function getGameHint(gameState, hintType = "general", specificity = "clear") {
  const playerData = await gameState.getPlayerData();
  const quests = await gameState.getQuestLog();
  
  let hint = "";
  
  // Récupérer la quête active principale
  const activeMainQuest = quests.find(q => q.type === "main" && q.status === "active");
  const activeQuests = quests.filter(q => q.status === "active");
  
  // Générer différents types d'indices
  switch (hintType) {
    case "general":
      if (playerData.stuck_on_objective) {
        hint = `Pour progresser sur votre objectif actuel "${playerData.current_objective}", `;
        
        if (playerData.current_objective.includes("clé")) {
          hint += "cherchez des coffres ou parlez aux PNJ importants. Les clés sont souvent gardées par des personnages spécifiques ou cachées dans des endroits protégés.";
        } else if (playerData.current_objective.includes("temple")) {
          hint += "examinez les colonnes du temple et recherchez des symboles ou mécanismes cachés. Les temples anciens contiennent souvent des puzzles basés sur des motifs.";
        } else {
          hint += "vérifiez votre journal de quête pour des indices supplémentaires ou explorez les zones non découvertes de la carte.";
        }
      } else {
        hint = "Votre prochain objectif semble clair. ";
        
        // Suggestion générale basée sur le niveau du joueur
        if (playerData.level < 3) {
          hint += "À votre niveau, concentrez-vous sur l'exploration et les quêtes secondaires pour gagner de l'expérience avant d'affronter des défis plus importants.";
        } else if (playerData.level < 7) {
          hint += "Votre équipement actuel pourrait être amélioré. Cherchez un marchand ou des coffres de butin pour trouver de meilleurs objets.";
        } else {
          hint += "Vous êtes bien préparé pour les défis à venir. N'oubliez pas d'utiliser vos capacités spéciales dans les combats difficiles.";
        }
      }
      break;
      
    case "quest":
      if (activeMainQuest) {
        // Trouver le premier objectif actif
        const activeObjective = activeMainQuest.objectives.find(obj => obj.status === "active");
        
        if (activeObjective) {
          hint = `Pour avancer dans la quête "${activeMainQuest.title}", `;
          
          if (activeObjective.id.includes("find")) {
            hint += "cherchez dans les zones non explorées et scrutez l'environnement pour des indices visuels ou des objets brillants.";
          } else if (activeObjective.id.includes("solve")) {
            hint += "observez attentivement les motifs dans l'environnement. Les solutions aux énigmes sont souvent indiquées subtilement par des symboles ou des arrangements particuliers.";
          } else if (activeObjective.id.includes("open")) {
            hint += "vous aurez besoin d'une clé ou d'activer un mécanisme spécifique. Examinez les objets interactifs à proximité.";
          } else {
            hint += "suivez les marqueurs de quête sur votre carte et interagissez avec les personnages ou objets en surbrillance.";
          }
        } else {
          hint = "Vous avez terminé les objectifs actuels de votre quête principale. Retournez voir le donneur de quête pour la suite.";
        }
      } else if (activeQuests.length > 0) {
        hint = "Vous n'avez pas de quête principale active, mais vous avez des quêtes secondaires en cours. Vérifiez votre journal pour les détails.";
      } else {
        hint = "Vous n'avez aucune quête active. Explorez le monde et parlez aux personnages avec des icônes de quête pour en découvrir.";
      }
      break;
      
    case "combat":
      hint = "Pour améliorer vos performances au combat, ";
      
      if (playerData.combat_success_rate < 50) {
        hint += "essayez d'utiliser l'esquive plus fréquemment et attaquez seulement quand vous avez une ouverture claire. ";
        
        if (playerData.health / playerData.max_health < 0.3) {
          hint += "Utilisez vos potions de santé quand votre vie descend sous 30% plutôt que d'attendre une situation critique.";
        } else {
          hint += "Votre équipement actuel pourrait être insuffisant. Recherchez de meilleures armes ou armures.";
        }
      } else {
        hint += "vous semblez déjà efficace. Pour vous améliorer davantage, essayez de maîtriser les combos et les contre-attaques. ";
        
        if (playerData.abilities.length > 1) {
          hint += "Alternez entre vos capacités pour maximiser les dégâts. Utilisez Boule de Feu pour les groupes d'ennemis et Frappe pour les adversaires isolés.";
        } else {
          hint += "Recherchez de nouvelles capacités ou sorts pour diversifier votre arsenal.";
        }
      }
      break;
      
    case "puzzle":
      hint = "Lorsque vous êtes confronté à un puzzle, ";
      
      if (playerData.puzzle_success_rate < 60) {
        hint += "prenez le temps d'observer l'environnement entier avant d'essayer des solutions. Cherchez des motifs répétitifs, des indices écrits, ou des éléments qui semblent hors de place. ";
        hint += "La plupart des puzzles dans ce monde suivent des thèmes liés à leur environnement - un puzzle dans un temple forestier utilisera probablement des symboles d'animaux ou de plantes.";
      } else {
        hint += "vous avez déjà de bonnes compétences. Pour les puzzles plus complexes, n'hésitez pas à prendre des notes ou à dessiner les configurations. ";
        hint += "Parfois, la solution nécessite de revenir plus tard avec un nouvel objet ou une nouvelle connaissance.";
      }
      break;
      
    case "exploration":
      hint = "Pour maximiser votre exploration, ";
      
      const environmentData = await gameState.getEnvironmentData();
      
      if (environmentData.terrain_type === "forest") {
        hint += "cherchez des sentiers cachés entre les arbres. Dans cette forêt, les trésors et secrets sont souvent cachés hors des chemins battus. ";
        hint += "Prêtez attention aux formations de rochers ou aux arbres marqués qui peuvent indiquer des points d'intérêt.";
      } else if (environmentData.name.includes("Temple")) {
        hint += "examinez attentivement les murs pour des symboles ou des mécanismes cachés. Ce temple contient probablement des passages secrets révélés en activant des leviers ou en plaçant des objets dans le bon ordre.";
      } else {
        hint += "utilisez les points hauts pour repérer des zones intéressantes dans le paysage. Recherchez des structures inhabituelles, des lueurs, ou des groupes d'ennemis qui protègent souvent des trésors.";
      }
      
      hint += " N'oubliez pas d'interagir avec les points de sauvegarde, qui révèlent également les zones environnantes sur votre carte.";
      break;
  }
  
  // Ajuster la spécificité de l'indice
  if (specificity === "subtle") {
    // Rendre l'indice plus vague
    hint = hint.replace(/cherchez des coffres ou parlez aux PNJ/g, "cherchez dans des endroits qui pourraient être importants");
    hint = hint.replace(/examinez les colonnes du temple/g, "examinez attentivement l'architecture");
    hint = hint.replace(/Utilisez Boule de Feu pour les groupes/g, "Adaptez vos capacités selon la situation");
    hint = hint.split(". ")[0] + "."; // Garder seulement la première phrase
  } else if (specificity === "detailed") {
    // Rendre l'indice plus détaillé et spécifique
    if (hintType === "quest" && activeMainQuest) {
      const extraDetail = "Des rumeurs indiquent que la clé du temple se trouve probablement dans la hutte du chef de village, ou pourrait être obtenue en aidant le vieux marchand près du puits central. Examinez ces pistes pour avancer.";
      hint += " " + extraDetail;
    } else if (hintType === "combat") {
      const combatExtra = "Pour ce type d'ennemis spécifiques, visez leurs points faibles: les gobelins sont vulnérables aux attaques à la tête, tandis que les trolls ont un point faible sur leur dos. Utilisez l'environnement à votre avantage en les attirant près des pièges ou des éléments explosifs.";
      hint += " " + combatExtra;
    }
  }
  
  return hint;
}

/**
 * Suggère une stratégie pour résoudre une situation spécifique
 */
export async function suggestStrategy(gameState, situation, playerPreference = "balanced") {
  const playerData = await gameState.getPlayerData();
  
  let strategy = "";
  
  switch (situation) {
    case "boss_fight":
      strategy = "# Stratégie pour le Combat de Boss\n\n";
      
      if (playerPreference === "aggressive") {
        strategy += "## Approche Offensive\n\n";
        strategy += "1. Utilisez des potions de force avant le combat\n";
        strategy += "2. Concentrez-vous sur des attaques rapides et agressives\n";
        strategy += "3. Utilisez votre capacité Boule de Feu au moment où le boss est immobilisé\n";
        strategy += "4. Acceptez de prendre des dégâts pour maximiser ceux que vous infligez\n";
        strategy += "5. Utilisez des objets de soin uniquement quand votre santé tombe sous 30%\n";
      } else if (playerPreference === "defensive") {
        strategy += "## Approche Défensive\n\n";
        strategy += "1. Buvez une potion de résistance avant le combat\n";
        strategy += "2. Gardez votre distance et attendez les ouvertures sûres\n";
        strategy += "3. Esquivez les attaques spéciales signalées par un éclat rouge\n";
        strategy += "4. Utilisez des capacités à distance plutôt que des attaques de mêlée\n";
        strategy += "5. Maintenez votre santé au-dessus de 60% à tout moment\n";
      } else {
        strategy += "## Approche Équilibrée\n\n";
        strategy += "1. Préparez-vous avec des potions polyvalentes\n";
        strategy += "2. Alternez entre phases défensives et offensives\n";
        strategy += "3. Observez les patterns d'attaque pour anticiper\n";
        strategy += "4. Utilisez le terrain à votre avantage\n";
        strategy += "5. Adaptez votre stratégie selon les phases du combat\n";
      }
      
      // Ajouter des conseils spécifiques basés sur l'équipement du joueur
      strategy += "\n## Conseils spécifiques à votre équipement\n\n";
      
      const hasWeapon = playerData.inventory.some(item => item.id === "rusty_sword" && item.equipped);
      const hasArmor = playerData.inventory.some(item => item.id === "leather_armor" && item.equipped);
      
      if (hasWeapon) {
        strategy += "- Votre Épée Rouillée a une portée limitée; restez proche du boss\n";
      }
      
      if (hasArmor) {
        strategy += "- Votre Armure en Cuir offre une mobilité décente; utilisez-la pour esquiver activement\n";
      }
      
      if (playerData.abilities.some(a => a.id === "fireball")) {
        strategy += "- Économisez votre mana pour utiliser Boule de Feu pendant les moments de vulnérabilité du boss\n";
      }
      break;
      
    case "puzzle_room":
      strategy = "# Stratégie pour résoudre la Salle de Puzzle\n\n";
      
      strategy += "## Approche méthodique\n\n";
      strategy += "1. Examinez d'abord toute la salle sans toucher à rien\n";
      strategy += "2. Cherchez des inscriptions ou symboles sur les murs et le sol\n";
      strategy += "3. Notez la disposition des objets interactifs et leurs caractéristiques\n";
      strategy += "4. Recherchez des motifs ou séquences qui se répètent\n";
      strategy += "5. Essayez les solutions les plus évidentes avant les plus complexes\n\n";
      
      strategy += "## Si vous êtes bloqué\n\n";
      strategy += "- Vérifiez si vous avez manqué des objets cachés dans la salle\n";
      strategy += "- Réfléchissez au contexte du lieu (temple, caverne, ruine) pour des indices thématiques\n";
      strategy += "- Essayez d'utiliser des objets de votre inventaire avec les éléments du puzzle\n";
      break;
      
    case "stealth_section":
      strategy = "# Stratégie pour la Section d'Infiltration\n\n";
      
      if (playerPreference === "aggressive") {
        strategy += "## Infiltration Opportuniste\n\n";
        strategy += "1. Restez en mode furtif mais préparez-vous à éliminer des gardes isolés\n";
        strategy += "2. Créez des distractions pour séparer les ennemis\n";
        strategy += "3. Utilisez des attaques silencieuses par derrière\n";
        strategy += "4. Cachez les corps pour éviter d'alerter d'autres gardes\n";
        strategy += "5. Ayez un plan de secours si vous êtes repéré\n";
      } else if (playerPreference === "defensive") {
        strategy += "## Infiltration Pure\n\n";
        strategy += "1. Évitez tout combat, même avec des gardes isolés\n";
        strategy += "2. Utilisez des zones d'ombre et de hautes herbes pour vous cacher\n";
        strategy += "3. Apprenez les patterns de patrouille avant de vous déplacer\n";
        strategy += "4. Utilisez des objets pour créer des distractions à distance\n";
        strategy += "5. Soyez patient et attendez le moment parfait\n";
      } else {
        strategy += "## Infiltration Adaptative\n\n";
        strategy += "1. Privilégiez l'évitement mais éliminez les obstacles inévitables\n";
        strategy += "2. Alternez entre création de distractions et utilisation des ombres\n";
        strategy += "3. Repérez les routes alternatives moins gardées\n";
        strategy += "4. Gardez un œil sur les alertes de détection\n";
        strategy += "5. Adaptez votre approche selon la densité des gardes\n";
      }
      
      // Ajouter des conseils spécifiques basés sur les capacités du joueur
      if (playerData.abilities.some(a => a.id === "fireball")) {
        strategy += "\n**Attention:** Votre capacité Boule de Feu créera du bruit et de la lumière. Ne l'utilisez qu'en dernier recours ou comme distraction planifiée.\n";
      }
      break;
  }
  
  return strategy;
}

/**
 * Identifie les obstacles potentiels dans la progression actuelle du joueur
 */
export async function identifyObstacles(gameState) {
  const playerData = await gameState.getPlayerData();
  const quests = await gameState.getQuestLog();
  const sceneGraph = await gameState.getSceneGraph();
  
  let obstacles = "# Obstacles potentiels à votre progression\n\n";
  let foundObstacles = false;
  
  // Vérifier les obstacles liés aux quêtes
  const activeMainQuest = quests.find(q => q.type === "main" && q.status === "active");
  if (activeMainQuest) {
    const activeObjective = activeMainQuest.objectives.find(obj => obj.status === "active");
    
    if (activeObjective) {
      obstacles += "## Obstacle de quête\n\n";
      foundObstacles = true;
      
      if (activeObjective.id === "find_key") {
        obstacles += "Vous cherchez actuellement la clé du temple. Cet obstacle pourrait être dû à:\n\n";
        obstacles += "- Manque d'exploration dans les zones clés\n";
        obstacles += "- Un PNJ que vous n'avez pas encore rencontré possède l'information nécessaire\n";
        obstacles += "- La clé est cachée dans un coffre verrouillé ou protégé par des ennemis\n";
      } else if (activeObjective.id === "solve_puzzle") {
        obstacles += "Vous êtes bloqué sur une énigme. Les raisons potentielles sont:\n\n";
        obstacles += "- Indices manquants dans l'environnement\n";
        obstacles += "- Vous avez besoin d'un objet spécifique non encore obtenu\n";
        obstacles += "- L'ordre ou la séquence correcte n'est pas encore claire\n";
      } else {
        obstacles += `Votre objectif actuel "${activeObjective.description}" pourrait être bloqué par:\n\n`;
        obstacles += "- Zone verrouillée ou inaccessible avec votre progression actuelle\n";
        obstacles += "- Ennemis trop puissants pour votre niveau actuel\n";
        obstacles += "- Quête préalable non terminée\n";
      }
    }
  }
  
  // Vérifier les obstacles de niveau/équipement
  if (playerData.level < 3 && playerData.combat_success_rate < 60) {
    obstacles += "\n## Obstacle de progression de personnage\n\n";
    foundObstacles = true;
    
    obstacles += "Votre niveau et équipement actuels pourraient être insuffisants:\n\n";
    obstacles += "- Niveau actuel: " + playerData.level + " (potentiellement trop bas pour les défis à venir)\n";
    obstacles += "- Taux de réussite en combat: " + playerData.combat_success_rate + "% (indique des difficultés)\n";
    obstacles += "- Équipement: Basique (pourrait être amélioré)\n\n";
    
    obstacles += "**Recommandations:**\n";
    obstacles += "- Complétez des quêtes secondaires pour gagner de l'expérience\n";
    obstacles += "- Recherchez de meilleurs équipements chez les marchands ou dans les donjons annexes\n";
    obstacles += "- Pratiquez les mécaniques de combat sur des ennemis plus faibles\n";
  }
  
  // Vérifier les obstacles du monde (objets interactifs inaccessibles)
  // Fonction récursive pour trouver les objets interactifs verrouillés
  function findLockedObjects(node) {
    let locked = [];
    
    if (node.userData && node.userData.interactive === true && node.userData.locked === true) {
      locked.push(node);
    }
    
    if (node.children) {
      node.children.forEach(child => {
        locked = locked.concat(findLockedObjects(child));
      });
    }
    
    return locked;
  }
  
  const lockedObjects = findLockedObjects(sceneGraph);
  
  if (lockedObjects.length > 0) {
    obstacles += "\n## Obstacles environnementaux\n\n";
    foundObstacles = true;
    
    obstacles += "Objets verrouillés ou inaccessibles dans l'environnement actuel:\n\n";
    
    lockedObjects.forEach(obj => {
      obstacles += `- ${obj.name} (${obj.userData.type}) - Nécessite probablement une clé ou un mécanisme d'ouverture\n`;
    });
    
    obstacles += "\n**Recommandations:**\n";
    obstacles += "- Cherchez des clés ou mécanismes d'ouverture dans les environs\n";
    obstacles += "- Parlez aux PNJ qui pourraient avoir des informations sur ces objets\n";
    obstacles += "- Examinez l'environnement pour des passages secrets ou leviers cachés\n";
  }
  
  if (!foundObstacles) {
    obstacles += "Aucun obstacle majeur détecté dans votre progression actuelle. Vous semblez sur la bonne voie!\n\n";
    obstacles += "Continuez à suivre vos objectifs de quête actuels et explorez l'environnement pour découvrir de nouvelles opportunités.";
  }
  
  return obstacles;
}

/**
 * Fournit un guide détaillé pour une quête spécifique
 */
export async function getQuestGuide(gameState, questId) {
  const quests = await gameState.getQuestLog();
  const quest = quests.find(q => q.id === questId);
  
  if (!quest) {
    return `Quête avec ID "${questId}" non trouvée dans votre journal.`;
  }
  
  let guide = `# Guide de Quête: ${quest.title}\n\n`;
  guide += `Type: ${quest.type}\n`;
  guide += `Description: ${quest.description}\n\n`;
  
  guide += "## Objectifs\n\n";
  
  quest.objectives.forEach(objective => {
    guide += `### ${objective.description} (${objective.status})\n\n`;
    
    // Générer des conseils selon l'objectif et son statut
    if (objective.status === "active") {
      if (objective.id.includes("find")) {
        guide += "Pour trouver cet objet ou cet endroit:\n";
        guide += "- Explorez minutieusement la zone indiquée sur votre carte\n";
        guide += "- Cherchez des indices visuels comme des objets brillants ou des structures distinctives\n";
        guide += "- Parlez aux PNJ locaux qui pourraient avoir des informations\n";
      } else if (objective.id.includes("defeat") || objective.id.includes("kill")) {
        guide += "Pour ce combat:\n";
        guide += "- Préparez-vous avec des potions de soin et des buffs appropriés\n";
        guide += "- Étudiez les patterns d'attaque de l'ennemi\n";
        guide += "- Utilisez l'environnement à votre avantage\n";
        guide += "- Ciblez les points faibles (généralement signalés visuellement)\n";
      } else if (objective.id.includes("collect")) {
        guide += "Pour cette collecte:\n";
        guide += "- Les objets à collecter se trouvent généralement dans des zones spécifiques à l'environnement\n";
        guide += "- Cherchez des points d'intérêt qui correspondent au thème de l'objet\n";
        guide += "- Certains objets peuvent être obtenus en battant des ennemis ou en interagissant avec l'environnement\n";
      } else if (objective.id.includes("talk") || objective.id.includes("speak")) {
        guide += "Pour cette interaction:\n";
        guide += "- Le PNJ se trouve probablement dans un lieu peuplé ou important\n";
        guide += "- Vérifiez votre carte pour les marqueurs de quête\n";
        guide += "- Le PNJ pourrait avoir des conditions spécifiques d'apparition (heure de la journée, progression de quête)\n";
      } else if (objective.id.includes("solve")) {
        guide += "Pour cette énigme:\n";
        guide += "- Examinez attentivement tous les éléments de la zone\n";
        guide += "- Cherchez des motifs, des symboles ou des inscriptions\n";
        guide += "- Essayez différentes combinaisons ou séquences\n";
        guide += "- Les solutions sont souvent liées au contexte ou thème du lieu\n";
      } else {
        guide += "Conseils généraux:\n";
        guide += "- Suivez les marqueurs de quête sur votre carte\n";
        guide += "- Lisez attentivement les dialogues pour des indices\n";
        guide += "- Explorez soigneusement les zones associées à la quête\n";
      }
    } else if (objective.status === "completed") {
      guide += "Cet objectif a été accompli avec succès.\n";
    } else if (objective.status === "pending") {
      guide += "Cet objectif sera débloqué une fois les objectifs précédents complétés.\n";
    }
    
    guide += "\n";
  });
  
  guide += "## Récompenses\n\n";
  
  if (quest.rewards && quest.rewards.length > 0) {
    quest.rewards.forEach(reward => {
      if (typeof reward === 'string') {
        guide += `- ${reward}\n`;
      } else if (reward.type === "xp") {
        guide += `- ${reward.amount} points d'expérience\n`;
      } else if (reward.type === "gold") {
        guide += `- ${reward.amount} pièces d'or\n`;
      } else if (reward.type === "item") {
        guide += `- Item: ${reward.id}\n`;
      }
    });
  } else {
    guide += "Information sur les récompenses non disponible.\n";
  }
  
  guide += "\n## Astuces supplémentaires\n\n";
  
  // Ajouter des astuces spécifiques au type de quête
  if (quest.type === "fetch") {
    guide += "- Les objets à récupérer sont souvent protégés ou cachés\n";
    guide += "- Cherchez des chemins alternatifs ou des passages secrets\n";
    guide += "- Parfois, l'objet est détenu par un PNJ que vous devez convaincre\n";
  } else if (quest.type === "kill") {
    guide += "- Étudiez les faiblesses de vos cibles avant l'affrontement\n";
    guide += "- Utilisez le terrain et les éléments environnementaux à votre avantage\n";
    guide += "- Préparez des potions et équipements adaptés au type d'ennemi\n";
  } else if (quest.type === "escort") {
    guide += "- Les PNJ escortés ont généralement un rythme plus lent, ajustez votre vitesse\n";
    guide += "- Anticipez les embuscades aux points charnières du trajet\n";
    guide += "- Restez vigilant, les PNJ escortés sont souvent vulnérables aux attaques à distance\n";
  } else if (quest.type === "puzzle") {
    guide += "- Prenez des notes ou faites des croquis des indices trouvés\n";
    guide += "- La solution implique souvent des éléments cachés dans l'environnement\n";
    guide += "- Les puzzles suivent généralement un thème cohérent avec le lieu où ils se trouvent\n";
  } else if (quest.type === "boss") {
    guide += "- Les boss ont souvent plusieurs phases avec des mécaniques uniques\n";
    guide += "- Cherchez des faiblesses ou des moments de vulnérabilité dans leurs patterns d'attaque\n";
    guide += "- Gérez vos ressources (santé, mana, consommables) pour la durée du combat\n";
  }
  
  guide += "\n## Conséquences potentielles\n\n";
  
  // Ajouter des informations sur les conséquences potentielles de la quête
  if (quest.type === "main") {
    guide += "Cette quête principale peut:\n";
    guide += "- Débloquer de nouvelles zones ou capacités\n";
    guide += "- Faire avancer l'histoire centrale du jeu\n";
    guide += "- Influencer les relations avec certaines factions ou personnages\n";
  } else {
    guide += "Cette quête secondaire peut:\n";
    guide += "- Fournir des récompenses utiles pour votre progression\n";
    guide += "- Révéler des éléments de lore supplémentaires\n";
    guide += "- Améliorer votre réputation auprès de certains PNJ ou factions\n";
  }
  
  return guide;
}
