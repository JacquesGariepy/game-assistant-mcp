// src/utils/three-utils.js
import * as THREE from 'three';

/**
 * Crée une grille pour représenter le sol dans une scène Three.js
 * @param {number} size - Taille de la grille
 * @param {number} divisions - Nombre de divisions
 * @param {number} color1 - Couleur principale en hexadécimal
 * @param {number} color2 - Couleur secondaire en hexadécimal
 * @returns {THREE.GridHelper} - L'objet de grille créé
 */
export function createGrid(size = 100, divisions = 100, color1 = 0x444444, color2 = 0x888888) {
  const grid = new THREE.GridHelper(size, divisions, color1, color2);
  grid.name = "grid";
  grid.position.y = -0.01; // Légèrement sous le niveau du sol pour éviter le z-fighting
  return grid;
}

/**
 * Crée un système d'axes pour visualiser l'orientation
 * @param {number} size - Longueur des axes
 * @returns {THREE.AxesHelper} - L'objet d'axes créé
 */
export function createAxes(size = 5) {
  const axes = new THREE.AxesHelper(size);
  axes.name = "axes";
  return axes;
}

/**
 * Applique une texture à un mesh Three.js
 * @param {THREE.Mesh} mesh - Le mesh à texturer
 * @param {string} texturePath - Chemin vers la texture
 * @param {boolean} repeat - Si la texture doit être répétée
 * @param {number} repeatX - Nombre de répétitions en X
 * @param {number} repeatY - Nombre de répétitions en Y
 */
export function applyTexture(mesh, texturePath, repeat = false, repeatX = 1, repeatY = 1) {
  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load(texturePath);
  
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
  }
  
  if (mesh.material) {
    mesh.material.map = texture;
    mesh.material.needsUpdate = true;
  } else {
    mesh.material = new THREE.MeshStandardMaterial({ map: texture });
  }
}

/**
 * Attache des métadonnées à un objet Three.js pour faciliter l'interaction
 * @param {THREE.Object3D} object - L'objet à enrichir
 * @param {object} metadata - Les métadonnées à attacher
 */
export function attachMetadata(object, metadata) {
  if (!object.userData) {
    object.userData = {};
  }
  
  Object.assign(object.userData, metadata);
}

/**
 * Crée un marqueur visuel pour les positions importantes dans la scène
 * @param {THREE.Vector3} position - Position du marqueur
 * @param {number} color - Couleur du marqueur en hexadécimal
 * @param {number} size - Taille du marqueur
 * @returns {THREE.Mesh} - Le marqueur créé
 */
export function createMarker(position, color = 0xff0000, size = 0.5) {
  const geometry = new THREE.SphereGeometry(size, 16, 16);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 });
  const marker = new THREE.Mesh(geometry, material);
  marker.position.copy(position);
  marker.name = "marker";
  return marker;
}

/**
 * Trouve un objet dans la scène par son nom ou autre propriété
 * @param {THREE.Scene} scene - La scène dans laquelle chercher
 * @param {string} property - La propriété à vérifier (par défaut 'name')
 * @param {any} value - La valeur à chercher
 * @returns {THREE.Object3D|null} - L'objet trouvé ou null
 */
export function findObjectInScene(scene, value, property = 'name') {
  let result = null;
  
  scene.traverse((object) => {
    if (result) return; // Si déjà trouvé, ne pas continuer
    
    if (object[property] === value) {
      result = object;
    }
  });
  
  return result;
}

/**
 * Calcule la distance entre deux objets 3D
 * @param {THREE.Object3D} object1 - Premier objet
 * @param {THREE.Object3D} object2 - Second objet
 * @returns {number} - Distance entre les objets
 */
export function distanceBetween(object1, object2) {
  return object1.position.distanceTo(object2.position);
}

/**
 * Applique un material de surbrillance à un objet pour le mettre en évidence
 * @param {THREE.Object3D} object - L'objet à mettre en évidence
 * @param {boolean} highlight - Activer/désactiver la surbrillance
 * @param {number} color - Couleur de la surbrillance
 */
export function highlightObject(object, highlight = true, color = 0xffff00) {
  if (!object.originalMaterial && highlight) {
    // Sauvegarder le matériau original
    if (object.material) {
      object.originalMaterial = object.material.clone();
      
      // Appliquer le matériau de surbrillance
      object.material = new THREE.MeshBasicMaterial({
        color: color,
        wireframe: false,
        transparent: true,
        opacity: 0.7
      });
    }
    
    // Traiter les enfants
    if (object.children) {
      object.children.forEach(child => {
        if (child.isMesh) {
          highlightObject(child, highlight, color);
        }
      });
    }
  } else if (object.originalMaterial && !highlight) {
    // Restaurer le matériau original
    object.material = object.originalMaterial;
    object.originalMaterial = null;
    
    // Traiter les enfants
    if (object.children) {
      object.children.forEach(child => {
        if (child.isMesh) {
          highlightObject(child, highlight, color);
        }
      });
    }
  }
}

/**
 * Crée une lumière ambiante et directionnelle pour éclairer la scène
 * @param {object} options - Options pour les lumières
 * @returns {Array<THREE.Light>} - Tableau des lumières créées
 */
export function createDefaultLights(options = {}) {
  const lights = [];
  
  // Lumière ambiante
  const ambientLight = new THREE.AmbientLight(
    options.ambientColor || 0x404040,
    options.ambientIntensity || 0.5
  );
  ambientLight.name = "ambientLight";
  lights.push(ambientLight);
  
  // Lumière directionnelle
  const directionalLight = new THREE.DirectionalLight(
    options.directionalColor || 0xffffff,
    options.directionalIntensity || 0.8
  );
  directionalLight.position.set(
    options.directionalX || 1,
    options.directionalY || 1,
    options.directionalZ || 1
  );
  directionalLight.name = "directionalLight";
  lights.push(directionalLight);
  
  return lights;
}
