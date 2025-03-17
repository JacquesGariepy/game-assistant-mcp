// src/utils/geometry-utils.js
import * as THREE from 'three';

/**
 * Génère un terrain en utilisant un algorithme de bruit de Perlin
 * @param {number} width - Largeur du terrain
 * @param {number} height - Hauteur du terrain
 * @param {number} segments - Nombre de segments
 * @param {number} amplitude - Amplitude des variations de hauteur
 * @param {number} scale - Échelle du bruit de Perlin
 * @returns {THREE.Mesh} - Le terrain généré
 */
export function generatePerlinTerrain(width = 100, height = 100, segments = 100, amplitude = 10, scale = 0.1) {
  const geometry = new THREE.PlaneGeometry(width, height, segments, segments);
  const material = new THREE.MeshStandardMaterial({
    color: 0x3c8031,
    side: THREE.DoubleSide,
    flatShading: true
  });
  
  // Simuler un bruit de Perlin avec Math.random pour cet exemple
  // Dans un vrai projet, on utiliserait une bibliothèque de bruit comme SimplexNoise
  const vertices = geometry.attributes.position.array;
  
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i];
    const z = vertices[i + 2];
    
    // Génération de hauteur avec une approximation du bruit de Perlin
    // Pour un vrai bruit de Perlin, utilisez simplex-noise ou une bibliothèque similaire
    const noise = Math.sin(x * scale) * Math.cos(z * scale) * amplitude;
    vertices[i + 1] = noise;
  }
  
  // Mettre à jour les normales pour l'éclairage
  geometry.computeVertexNormals();
  
  const terrain = new THREE.Mesh(geometry, material);
  terrain.rotation.x = -Math.PI / 2; // Orienter horizontalement
  terrain.receiveShadow = true;
  terrain.name = "perlinTerrain";
  
  return terrain;
}

/**
 * Génère un chemin 3D avec des points de contrôle
 * @param {Array<THREE.Vector3>} controlPoints - Points de contrôle du chemin
 * @param {number} curveSegments - Nombre de segments de la courbe
 * @param {number} width - Largeur du chemin
 * @param {number} color - Couleur du chemin
 * @returns {THREE.Object3D} - Le chemin généré
 */
export function createPath(controlPoints, curveSegments = 50, width = 2, color = 0x8B4513) {
  // Créer une courbe à partir des points de contrôle
  const curve = new THREE.CatmullRomCurve3(controlPoints);
  
  // Créer la géométrie du tube
  const geometry = new THREE.TubeGeometry(curve, curveSegments, width / 2, 8, false);
  const material = new THREE.MeshStandardMaterial({ color });
  
  const path = new THREE.Mesh(geometry, material);
  path.name = "path";
  path.receiveShadow = true;
  path.castShadow = true;
  
  return path;
}

/**
 * Convertit des coordonnées monde en coordonnées sur une grille discrète
 * @param {THREE.Vector3} worldPosition - Position dans le monde
 * @param {number} gridSize - Taille de chaque cellule de la grille
 * @returns {object} - Coordonnées dans la grille {x, y, z}
 */
export function worldToGrid(worldPosition, gridSize = 1) {
  return {
    x: Math.floor(worldPosition.x / gridSize),
    y: Math.floor(worldPosition.y / gridSize),
    z: Math.floor(worldPosition.z / gridSize)
  };
}

/**
 * Convertit des coordonnées de grille en coordonnées monde
 * @param {object} gridPosition - Position dans la grille {x, y, z}
 * @param {number} gridSize - Taille de chaque cellule de la grille
 * @returns {THREE.Vector3} - Position dans le monde
 */
export function gridToWorld(gridPosition, gridSize = 1) {
  return new THREE.Vector3(
    gridPosition.x * gridSize + gridSize / 2,
    gridPosition.y * gridSize + gridSize / 2,
    gridPosition.z * gridSize + gridSize / 2
  );
}

/**
 * Calcule le point d'intersection d'un rayon avec un plan
 * @param {THREE.Ray} ray - Le rayon
 * @param {THREE.Plane} plane - Le plan
 * @returns {THREE.Vector3|null} - Le point d'intersection ou null
 */
export function rayPlaneIntersection(ray, plane) {
  const denominator = plane.normal.dot(ray.direction);
  
  if (Math.abs(denominator) < 0.0001) {
    return null; // Le rayon est parallèle au plan
  }
  
  const t = -(ray.origin.dot(plane.normal) + plane.constant) / denominator;
  
  if (t < 0) {
    return null; // L'intersection est derrière l'origine du rayon
  }
  
  return ray.at(t, new THREE.Vector3());
}

/**
 * Crée une géométrie de terrain à partir d'une heightmap
 * @param {ImageData|Array} heightmap - Données de la carte de hauteur
 * @param {number} width - Largeur du terrain
 * @param {number} height - Hauteur du terrain
 * @param {number} widthSegments - Nombre de segments en largeur
 * @param {number} heightSegments - Nombre de segments en hauteur
 * @param {number} maxHeight - Hauteur maximale du terrain
 * @returns {THREE.BufferGeometry} - La géométrie créée
 */
export function heightmapToGeometry(heightmap, width = 100, height = 100, widthSegments = 100, heightSegments = 100, maxHeight = 20) {
  const geometry = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);
  const vertices = geometry.attributes.position.array;
  
  // Fonction pour obtenir la hauteur à partir de la heightmap
  const getHeight = (x, y) => {
    // Pour les données d'image
    if (heightmap.data) {
      const i = (y * heightmap.width + x) * 4; // Format RGBA
      return heightmap.data[i] / 255 * maxHeight; // Utilise seulement le canal R
    }
    // Pour un tableau simple
    else if (Array.isArray(heightmap)) {
      return heightmap[y * widthSegments + x] * maxHeight;
    }
    return 0;
  };
  
  // Appliquer les hauteurs
  for (let i = 0, j = 0; i < vertices.length; i += 3, j++) {
    const x = j % (widthSegments + 1);
    const y = Math.floor(j / (widthSegments + 1));
    
    vertices[i + 1] = getHeight(x, y);
  }
  
  // Mettre à jour la géométrie et calculer les normales
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();
  
  return geometry;
}

/**
 * Calcule les points d'une spirale 3D
 * @param {number} turns - Nombre de tours de la spirale
 * @param {number} segments - Nombre de segments
 * @param {number} radius - Rayon de la spirale
 * @param {number} height - Hauteur totale de la spirale
 * @returns {Array<THREE.Vector3>} - Points de la spirale
 */
export function generateSpiral(turns = 3, segments = 100, radius = 10, height = 20) {
  const points = [];
  const segmentsPerTurn = segments / turns;
  
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segmentsPerTurn) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = (i / segments) * height;
    
    points.push(new THREE.Vector3(x, y, z));
  }
  
  return points;
}

/**
 * Génère une forme organique en déformant une sphère
 * @param {number} radius - Rayon de base
 * @param {number} detail - Niveau de détail
 * @param {number} distortion - Niveau de distortion
 * @param {number} seed - Graine aléatoire
 * @returns {THREE.Geometry} - La géométrie de la forme organique
 */
export function generateOrganicShape(radius = 5, detail = 3, distortion = 1, seed = 1) {
  // Créer une géométrie de base
  const geometry = new THREE.IcosahedronGeometry(radius, detail);
  
  // Fonction de pseudo-aléatoire reproductible avec seed
  const random = (i) => {
    const x = Math.sin(seed + i) * 10000;
    return x - Math.floor(x);
  };
  
  // Déformer les vertices
  const positionAttribute = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  
  for (let i = 0; i < positionAttribute.count; i++) {
    vertex.fromBufferAttribute(positionAttribute, i);
    
    // Normaliser et appliquer une distortion
    vertex.normalize();
    const noise = distortion * (0.5 - random(i));
    vertex.multiplyScalar(radius * (1 + noise));
    
    // Mettre à jour le vertex
    positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  
  // Recalculer les normales
  geometry.computeVertexNormals();
  
  return geometry;
}
