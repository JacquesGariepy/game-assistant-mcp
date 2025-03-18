// src/content-generator.js

/**
 * Génère un terrain procédural pour le jeu
 */
export async function generateTerrain(terrainType, size, complexity, seed = null) {
  // Si un seed n'est pas fourni, en générer un aléatoirement
  const usedSeed = seed !== null ? seed : Math.floor(Math.random() * 1000000);
  
  // Simuler un temps de traitement (en pratique, la génération prendrait du temps)
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Nombre de points de contrôle et de triangles basés sur la taille et la complexité
  const controlPoints = size * complexity * 100;
  const triangles = size * complexity * 300;
  
  // Simuler différentes caractéristiques selon le type de terrain
  let features = [];
  
  switch (terrainType) {
    case "mountains":
      features = [
        "pics montagneux",
        "vallées profondes",
        "sentiers escarpés",
        "falaises",
        "cascades"
      ];
      break;
    case "desert":
      features = [
        "dunes de sable",
        "canyons",
        "oasis",
        "formations rocheuses",
        "tempêtes de sable"
      ];
      break;
    case "forest":
      features = [
        "arbres denses",
        "clairières",
        "sentiers forestiers",
        "petits ruisseaux",
        "sous-bois"
      ];
      break;
    case "ocean":
      features = [
        "vagues animées",
        "récifs coralliens",
        "zones profondes",
        "îles",
        "plages"
      ];
      break;
    case "cave":
      features = [
        "stalactites et stalagmites",
        "passages étroits",
        "chambres caverneuses",
        "puits naturels",
        "rivières souterraines"
      ];
      break;
  }
  
  // Sélectionner aléatoirement des caractéristiques basées sur la complexité
  const selectedFeatures = [];
  for (let i = 0; i < Math.min(complexity, features.length); i++) {
    const randomIndex = Math.floor(Math.random() * features.length);
    selectedFeatures.push(features[randomIndex]);
    features.splice(randomIndex, 1);
  }
  
  // Générer un ID unique pour le terrain
  const terrainId = `terrain_${terrainType}_${usedSeed}`;
  
  // Retourner les métadonnées du terrain généré
  return {
    terrain_id: terrainId,
    type: terrainType,
    seed: usedSeed,
    width: size * 20,
    height: size * 5,
    depth: size * 20,
    control_points: controlPoints,
    triangles: triangles,
    features: selectedFeatures
  };
}

/**
 * Crée un personnage non-joueur (PNJ) avec des attributs spécifiques
 */
export async function createNPC(characterType, options = {}) {
  // Options par défaut
  const difficulty = options.difficulty || 5;
  const personality = options.personality || generatePersonality(characterType);
  const appearance = options.appearance || generateAppearance(characterType);
  const dialog = options.dialog || generateDialog(characterType, personality);
  
  // Simuler un temps de traitement
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Générer un nom aléatoire
  const firstNames = ["Aldric", "Brenna", "Cedric", "Dalia", "Eadric", "Fiona", "Gavin", "Hilda", "Ingmar", "Jocelyn"];
  const lastNames = ["Smith", "Ironheart", "Greenwood", "Blackthorn", "Silverhand", "Oakenshield", "Fireforge", "Stormborn"];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const name = `${firstName} ${lastName}`;
  
  // Définir les attributs selon le type de personnage
  let level, hitpoints, abilities, loot, behavior_type;
  
  switch (characterType) {
    case "villager":
      level = 1;
      hitpoints = 20;
      abilities = [];
      loot = ["coin_pouch", "common_item"];
      behavior_type = "passive";
      break;
    case "merchant":
      level = 3;
      hitpoints = 30;
      abilities = [];
      loot = ["gold_coins", "trade_goods"];
      behavior_type = "interactive";
      break;
    case "guard":
      level = 5;
      hitpoints = 50 + (difficulty * 10);
      abilities = ["sword_slash", "shield_block"];
      loot = ["iron_sword", "light_armor"];
      behavior_type = "defensive";
      break;
    case "quest_giver":
      level = 4;
      hitpoints = 40;
      abilities = [];
      loot = ["quest_item", "gold_coins"];
      behavior_type = "interactive";
      break;
    case "enemy":
      level = Math.max(1, Math.round(difficulty * 1.5));
      hitpoints = 30 + (difficulty * 15);
      abilities = ["attack", "special_attack"];
      loot = ["weapon", "armor", "potion"];
      behavior_type = "aggressive";
      break;
    default:
      level = 1;
      hitpoints = 20;
      abilities = [];
      loot = [];
      behavior_type = "passive";
  }
  
  // Ajuster les attributs en fonction de la difficulté
  level = Math.max(1, Math.round(level * (difficulty / 5)));
  hitpoints = Math.round(hitpoints * (difficulty / 5));
  
  // Générer un ID unique
  const npcId = `npc_${characterType}_${Math.floor(Math.random() * 10000)}`;
  
  return {
    id: npcId,
    name: name,
    type: characterType,
    level: level,
    hitpoints: hitpoints,
    abilities: abilities,
    loot: loot,
    behavior_type: behavior_type,
    personality: personality,
    appearance: appearance,
    dialog: dialog
  };
}

/**
 * Conçoit une quête personnalisée pour le jeu
 */
export async function designQuest(questTitle, questType, difficulty, rewards, description) {
  // Simuler un temps de traitement
  await new Promise(resolve => setTimeout(resolve, 700));
  
  // Générer un ID unique pour la quête
  const questId = `quest_${questType}_${Math.floor(Math.random() * 10000)}`;
  
  // Générer des récompenses basées sur la difficulté et le type
  const questRewards = [];
  
  if (rewards) {
    questRewards.push(...rewards.split(",").map(r => r.trim()));
  } else {
    // Récompenses par défaut basées sur la difficulté
    questRewards.push(`${Math.round(50 * difficulty)} XP`);
    questRewards.push(`${Math.round(10 * difficulty)} Gold`);
    
    if (difficulty >= 3) {
      questRewards.push("Uncommon Item");
    }
    
    if (difficulty >= 7) {
      questRewards.push("Rare Item");
    }
    
    if (difficulty >= 9) {
      questRewards.push("Epic Item");
    }
  }
  
  // Générer des étapes en fonction du type de quête
  let questSteps = [];
  
  switch (questType) {
    case "fetch":
      questSteps = [
        "Trouver l'emplacement de l'objet",
        "Récupérer l'objet",
        "Surmonter les obstacles qui gardent l'objet",
        "Rapporter l'objet au donneur de quête"
      ];
      break;
    case "kill":
      questSteps = [
        "Localiser les ennemis",
        `Vaincre ${Math.round(3 + (difficulty * 0.7))} ennemis`,
        "Récupérer une preuve de la victoire",
        "Retourner au donneur de quête"
      ];
      break;
    case "escort":
      questSteps = [
        "Rencontrer la personne à escorter",
        "Protéger la personne pendant le voyage",
        "Surmonter une embuscade en chemin",
        "Arriver à destination en toute sécurité"
      ];
      break;
    case "puzzle":
      questSteps = [
        "Découvrir le mécanisme du puzzle",
        "Rassembler les indices/objets nécessaires",
        "Résoudre l'énigme principale",
        "Recueillir la récompense cachée"
      ];
      break;
    case "boss":
      questSteps = [
        "Découvrir l'emplacement du boss",
        "Se préparer pour le combat (équipement/buffs)",
        "Vaincre les sbires du boss",
        "Vaincre le boss dans un combat épique"
      ];
      break;
    case "story":
      questSteps = [
        "Parler à des personnages clés",
        "Découvrir des informations cachées",
        "Faire un choix important qui affecte l'histoire",
        "Assister à une cinématique révélant un élément d'intrigue"
      ];
      break;
  }
  
  // Ajouter des étapes supplémentaires en fonction de la difficulté
  if (difficulty >= 8) {
    questSteps.push("Faire face à un défi supplémentaire inattendu");
  }
  
  if (difficulty >= 5) {
    questSteps.push("Faire un choix moral qui affecte la résolution de la quête");
  }
  
  // Réorganiser légèrement les étapes pour plus de variété
  if (questSteps.length > 4) {
    const temp = questSteps[1];
    questSteps[1] = questSteps[2];
    questSteps[2] = temp;
  }
  
  return {
    id: questId,
    title: questTitle,
    type: questType,
    difficulty: difficulty,
    description: description,
    steps: questSteps,
    rewards: questRewards,
    estimated_time: Math.round(10 + (difficulty * 5)) // temps estimé en minutes
  };
}

// Fonctions auxiliaires

function generatePersonality(characterType) {
  const personalities = {
    "villager": ["amical", "méfiant", "travailleur", "bavard", "timide"],
    "merchant": ["cupide", "honnête", "marchandeur", "excentrique", "bien informé"],
    "guard": ["strict", "corruptible", "loyal", "suspicieux", "vétéran"],
    "quest_giver": ["mystérieux", "désespéré", "noble", "manipulateur", "sage"],
    "enemy": ["vindicatif", "sadique", "stratégique", "impulsif", "honorable"]
  };
  
  const options = personalities[characterType] || ["neutre"];
  return options[Math.floor(Math.random() * options.length)];
}

function generateAppearance(characterType) {
  const appearances = {
    "villager": ["vêtements simples", "attitude humble", "mains calleuses", "visage fatigué"],
    "merchant": ["vêtements colorés", "bijoux extravagants", "chariot de marchandises", "bourse bien garnie"],
    "guard": ["armure officielle", "posture rigide", "cicatrices de bataille", "regard vigilant"],
    "quest_giver": ["vêtements distinctifs", "accessoire unique", "regard perçant", "présence imposante"],
    "enemy": ["armure intimidante", "arme menaçante", "cicatrices de bataille", "regard hostile"]
  };
  
  const options = appearances[characterType] || ["apparence générique"];
  return options[Math.floor(Math.random() * options.length)];
}

function generateDialog(characterType, personality) {
  const dialogs = {
    "villager": {
      "amical": "Bienvenue, voyageur ! Notre village est modeste, mais nous sommes accueillants.",
      "méfiant": "Je ne vous connais pas. Que faites-vous dans notre village ?",
      "default": "Bonjour. Belle journée, n'est-ce pas ?"
    },
    "merchant": {
      "cupide": "Ah, un client ! J'ai des marchandises rares, mais elles ne sont pas bon marché...",
      "honnête": "Bienvenue ! Je propose les meilleurs prix de la région, garanti.",
      "default": "Regardez mes marchandises ! Quelque chose vous intéresse ?"
    },
    "guard": {
      "strict": "Halte ! Identifiez-vous ou passez votre chemin.",
      "loyal": "Je protège ces terres au péril de ma vie. Passez en paix.",
      "default": "Gardez vos armes rangées dans la ville, étranger."
    },
    "quest_giver": {
      "mystérieux": "Psst... j'ai besoin de quelqu'un avec vos... compétences pour une tâche spéciale.",
      "désespéré": "Je vous en prie, aidez-moi ! Vous êtes mon dernier espoir !",
      "default": "Ah, vous semblez capable. J'ai une tâche qui pourrait vous intéresser."
    },
    "enemy": {
      "vindicatif": "Enfin, je vais pouvoir me venger !",
      "honorable": "Affrontez-moi avec honneur, et que le meilleur gagne.",
      "default": "Vous ne devriez pas être ici. C'est votre dernière erreur !"
    }
  };
  
  // Sélectionner le dialogue approprié ou utiliser une valeur par défaut
  const characterDialogs = dialogs[characterType] || { "default": "..." };
  return characterDialogs[personality] || characterDialogs["default"];
}
