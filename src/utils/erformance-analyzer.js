// src/utils/performance-analyzer.js
import * as THREE from 'three';

// Classe pour suivre les FPS
export class FPSCounter {
  constructor(updateInterval = 1000) {
    this.updateInterval = updateInterval;
    this.fps = 0;
    this.frames = 0;
    this.lastTime = performance.now();
  }
  
  update() {
    this.frames++;
    const time = performance.now();
    const elapsed = time - this.lastTime;
    
    if (elapsed >= this.updateInterval) {
      this.fps = Math.round((this.frames * 1000) / elapsed);
      this.lastTime = time;
      this.frames = 0;
    }
    
    return this.fps;
  }
}

// Classe pour mesurer le temps d'exécution de fonctions
export class PerformanceTimer {
  constructor() {
    this.measurements = {};
  }
  
  start(label) {
    if (!this.measurements[label]) {
      this.measurements[label] = {
        startTime: 0,
        totalTime: 0,
        calls: 0,
        active: false
      };
    }
    
    const measurement = this.measurements[label];
    
    if (measurement.active) {
      console.warn(`Timer "${label}" already started`);
      return;
    }
    
    measurement.startTime = performance.now();
    measurement.active = true;
  }
  
  end(label) {
    const measurement = this.measurements[label];
    
    if (!measurement) {
      console.warn(`Timer "${label}" does not exist`);
      return;
    }
    
    if (!measurement.active) {
      console.warn(`Timer "${label}" not started`);
      return;
    }
    
    const elapsed = performance.now() - measurement.startTime;
    measurement.totalTime += elapsed;
    measurement.calls++;
    measurement.active = false;
    
    return elapsed;
  }
  
  getStats(label) {
    const measurement = this.measurements[label];
    
    if (!measurement) {
      console.warn(`Timer "${label}" does not exist`);
      return null;
    }
    
    return {
      totalTime: measurement.totalTime,
      calls: measurement.calls,
      averageTime: measurement.calls > 0 ? measurement.totalTime / measurement.calls : 0
    };
  }
  
  reset(label) {
    if (label) {
      this.measurements[label] = {
        startTime: 0,
        totalTime: 0,
        calls: 0,
        active: false
      };
    } else {
      this.measurements = {};
    }
  }
}

// Classe pour collecter des statistiques sur la scène Three.js
export class SceneStats {
  constructor(renderer, scene) {
    this.renderer = renderer;
    this.scene = scene;
    this.memoryInfo = null;
    this.drawCalls = 0;
    this.triangles = 0;
    this.points = 0;
    this.lines = 0;
    this.geometries = 0;
    this.textures = 0;
  }
  
  update() {
    // Obtenir les statistiques du renderer WebGL
    const info = this.renderer.info;
    
    this.memoryInfo = info.memory || {};
    this.drawCalls = info.render?.calls || 0;
    this.triangles = info.render?.triangles || 0;
    this.points = info.render?.points || 0;
    this.lines = info.render?.lines || 0;
    this.geometries = this.memoryInfo.geometries || 0;
    this.textures = this.memoryInfo.textures || 0;
    
    // Compter les différents types d'objets dans la scène
    let meshCount = 0;
    let lightCount = 0;
    let cameraCount = 0;
    let groupCount = 0;
    
    this.scene.traverse((object) => {
      if (object.isMesh) meshCount++;
      if (object.isLight) lightCount++;
      if (object.isCamera) cameraCount++;
      if (object.isGroup) groupCount++;
    });
    
    return {
      drawCalls: this.drawCalls,
      triangles: this.triangles,
      points: this.points,
      lines: this.lines,
      geometries: this.geometries,
      textures: this.textures,
      meshes: meshCount,
      lights: lightCount,
      cameras: cameraCount,
      groups: groupCount
    };
  }
  
  getMemoryUsage() {
    return {
      geometries: this.memoryInfo?.geometries || 0,
      textures: this.memoryInfo?.textures || 0
    };
  }
  
  analyzePerformance() {
    const stats = this.update();
    const issues = [];
    
    // Vérifier les problèmes potentiels
    if (stats.drawCalls > 100) {
      issues.push("Nombre élevé d'appels de dessin. Envisagez l'utilisation de l'instanciation ou la fusion de géométries.");
    }
    
    if (stats.triangles > 1000000) {
      issues.push("Nombre très élevé de triangles. Utilisez des niveaux de détail (LOD) ou simplifiez les géométries.");
    }
    
    if (stats.lights > 4) {
      issues.push("Nombre élevé de lumières. Limitez le nombre de lumières dynamiques et utilisez des lightmaps lorsque possible.");
    }
    
    if (stats.textures > 20) {
      issues.push("Nombre élevé de textures. Utilisez des atlas de texture pour réduire les changements d'état.");
    }
    
    if (stats.geometries > 100) {
      issues.push("Nombre élevé de géométries. Partagez et réutilisez les géométries lorsque possible.");
    }
    
    return {
      stats,
      issues,
      rating: this._calculatePerformanceRating(stats)
    };
  }
  
  _calculatePerformanceRating(stats) {
    // Calculer un score de performance sur 10
    let score = 10;
    
    if (stats.drawCalls > 100) score -= (stats.drawCalls - 100) / 200;
    if (stats.triangles > 500000) score -= (stats.triangles - 500000) / 500000;
    if (stats.lights > 4) score -= (stats.lights - 4) * 0.5;
    if (stats.textures > 20) score -= (stats.textures - 20) / 10;
    if (stats.geometries > 100) score -= (stats.geometries - 100) / 50;
    
    // Limiter le score entre 0 et 10
    return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
  }
}

// Classe pour détecter les goulots d'étranglement de performance
export class PerformanceBottleneckDetector {
  constructor(renderer) {
    this.renderer = renderer;
    this.timer = new PerformanceTimer();
    this.lastFrameTime = 0;
    this.frameTimeHistory = [];
    this.maxHistoryLength = 60; // Historique des 60 dernières frames
    this.cpuLimited = false;
    this.gpuLimited = false;
  }
  
  beginFrame() {
    this.timer.start('frame');
    this.timer.start('javascript');
  }
  
  endJavascript() {
    this.timer.end('javascript');
  }
  
  beginRender() {
    this.timer.start('render');
  }
  
  endRender() {
    this.timer.end('render');
  }
  
  endFrame() {
    this.timer.end('frame');
    
    const frameTime = this.timer.getStats('frame').totalTime - this.lastFrameTime;
    this.frameTimeHistory.push({
      total: frameTime,
      js: this.timer.getStats('javascript').averageTime,
      render: this.timer.getStats('render').averageTime
    });
    
    // Garder l'historique limité
    if (this.frameTimeHistory.length > this.maxHistoryLength) {
      this.frameTimeHistory.shift();
    }
    
    // Analyser les goulots d'étranglement
    this._analyzeBottlenecks();
    
    return frameTime;
  }
  
  _analyzeBottlenecks() {
    if (this.frameTimeHistory.length < 10) return; // Besoin de suffisamment de données
    
    // Calculer les moyennes
    const jsTime = this.frameTimeHistory.reduce((sum, frame) => sum + frame.js, 0) / this.frameTimeHistory.length;
    const renderTime = this.frameTimeHistory.reduce((sum, frame) => sum + frame.render, 0) / this.frameTimeHistory.length;
    const totalTime = this.frameTimeHistory.reduce((sum, frame) => sum + frame.total, 0) / this.frameTimeHistory.length;
    
    // Déterminer le goulot d'étranglement
    this.cpuLimited = jsTime > renderTime * 1.5;
    this.gpuLimited = renderTime > jsTime * 1.5;
    
    return {
      cpuLimited: this.cpuLimited,
      gpuLimited: this.gpuLimited,
      jsTime,
      renderTime,
      totalTime
    };
  }
  
  getRecommendations() {
    const bottlenecks = this._analyzeBottlenecks();
    if (!bottlenecks) return [];
    
    const recommendations = [];
    
    if (bottlenecks.cpuLimited) {
      recommendations.push("Performance limitée par le CPU. Optimisez le code JavaScript, réduisez les mises à jour de la physique et des animations.");
      
      if (bottlenecks.jsTime > 16) { // Plus de 16ms = moins de 60 FPS
        recommendations.push("Temps JavaScript élevé. Utilisez les Web Workers pour les calculs intensifs, réduisez la complexité des mises à jour, et espacez les tâches non critiques.");
      }
    }
    
    if (bottlenecks.gpuLimited) {
      recommendations.push("Performance limitée par le GPU. Réduisez la complexité visuelle, utilisez des shaders plus simples, diminuez la résolution des textures.");
      
      if (bottlenecks.renderTime > 16) {
        recommendations.push("Temps de rendu élevé. Réduisez la résolution de rendu, désactivez certains effets post-traitement, et utilisez les techniques de LOD (Level of Detail).");
      }
    }
    
    return recommendations;
  }
  
  reset() {
    this.timer.reset();
    this.frameTimeHistory = [];
    this.cpuLimited = false;
    this.gpuLimited = false;
  }
}
