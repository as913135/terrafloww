/**
 * TerraFlow - 3D Subsurface Digital Twin Engine
 * WebGL Three.js visualization of terrain, transparent subterranean cutaways,
 * 3D multi-tier underground pipelines, station valves, depth slicing,
 * floating location billboards, and interactive on-hover location writing.
 */

class TerraFlow3DSubsurfaceEngine {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = options;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.raycaster = null;
    this.mouse = null;

    // Meshes and groups
    this.terrainGroup = null;
    this.pipesGroup = null;
    this.manholesGroup = null;
    this.markersGroup = null;
    this.depthPlaneGroup = null;
    this.labelsGroup = null;
    this.stationsGroup = null;
    this.pipeMeshMap = new Map(); // pipeId -> mesh

    // View state
    this.colorMode = 'utility'; // 'utility' or 'risk'
    this.groundOpacity = 0.35;
    this.showLabels = true;
    this.selectedPipeId = null;
    this.hoveredPipeId = null;
    this.isInitialized = false;
    this.isNational = false;
    this.scaleFactor = 1000;
    this.centerLat = 22.5937;
    this.centerLng = 78.9629;

    // Callbacks
    this.onPipeSelect = options.onPipeSelect || (() => {});
    this.onPipeHover = options.onPipeHover || (() => {});
  }

  init() {
    if (!this.container) return false;
    if (typeof THREE === 'undefined') {
      console.warn('Three.js not loaded yet, fallback mode active.');
      this.initFallback2DCanvas();
      return false;
    }

    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 550;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x061410); // Nocturnal deep forest/emerald slate
    this.scene.fog = new THREE.FogExp2(0x061410, 0.003);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 4000);
    this.camera.position.set(85, 75, 105);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    if (typeof THREE.OrbitControls !== 'undefined') {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.06;
      this.controls.maxPolarAngle = Math.PI / 2 + 0.18; // allow looking slightly from underground!
      this.controls.minDistance = 15;
      this.controls.maxDistance = 550;
      this.controls.target.set(0, 0, 0);
    }

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xd1fae5, 1.2);
    dirLight.position.set(120, 160, 90);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    const emeraldSubLight = new THREE.PointLight(0x10b981, 1.0, 300);
    emeraldSubLight.position.set(0, -20, 0);
    this.scene.add(emeraldSubLight);

    const skyFillLight = new THREE.PointLight(0x0284c7, 0.6, 300);
    skyFillLight.position.set(0, 60, 0);
    this.scene.add(skyFillLight);

    // 6. Groups
    this.terrainGroup = new THREE.Group();
    this.pipesGroup = new THREE.Group();
    this.stationsGroup = new THREE.Group();
    this.manholesGroup = new THREE.Group();
    this.markersGroup = new THREE.Group();
    this.depthPlaneGroup = new THREE.Group();
    this.labelsGroup = new THREE.Group();

    this.scene.add(this.terrainGroup);
    this.scene.add(this.pipesGroup);
    this.scene.add(this.stationsGroup);
    this.scene.add(this.manholesGroup);
    this.scene.add(this.markersGroup);
    this.scene.add(this.depthPlaneGroup);
    this.scene.add(this.labelsGroup);

    // 7. Raycasting
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.renderer.domElement.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.renderer.domElement.addEventListener('click', (e) => this.onPointerClick(e));
    window.addEventListener('resize', () => this.onResize());

    this.isInitialized = true;
    this.animate();
    return true;
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (this.controls) this.controls.update();

    // Floating citizen marker pulse animation
    if (this.markersGroup && this.markersGroup.children.length > 0) {
      const time = Date.now() * 0.003;
      this.markersGroup.children.forEach(marker => {
        if (marker.userData.isCitizenMarker) {
          marker.position.y = marker.userData.baseY + Math.sin(time + marker.userData.offset) * 0.8;
          marker.rotation.y += 0.015;
        }
      });
    }

    // Floating location billboards gentle float
    if (this.labelsGroup && this.labelsGroup.children.length > 0) {
      const time = Date.now() * 0.0018;
      this.labelsGroup.children.forEach((child, i) => {
        if (child.isSprite && child.userData && child.userData.baseY) {
          child.position.y = child.userData.baseY + Math.sin(time + i * 0.7) * 0.35;
        }
      });
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Loads pipeline dataset (National Pan-India or Regional) and constructs 3D digital twin
   */
  loadTownData(townData, riskResults = null) {
    if (!this.isInitialized) {
      const ok = this.init();
      if (!ok) return;
    }

    this.currentTown = townData;
    this.riskResults = riskResults;
    this.pipeMeshMap.clear();

    // Clear previous elements
    this.clearGroup(this.terrainGroup);
    this.clearGroup(this.pipesGroup);
    this.clearGroup(this.stationsGroup);
    this.clearGroup(this.manholesGroup);
    this.clearGroup(this.markersGroup);
    this.clearGroup(this.depthPlaneGroup);
    this.clearGroup(this.labelsGroup);

    // 1. Calculate dynamic coordinate bounds across all mapped pipes
    const pipes = townData.pipes || [];
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;

    pipes.forEach(p => {
      (p.coords || []).forEach(c => {
        if (c[0] < minLat) minLat = c[0];
        if (c[0] > maxLat) maxLat = c[0];
        if (c[1] < minLng) minLng = c[1];
        if (c[1] > maxLng) maxLng = c[1];
      });
    });

    const hasPipes = pipes.length > 0 && minLat !== 90 && maxLat !== -90;
    const centerLat = hasPipes ? (minLat + maxLat) / 2 : (townData.center ? townData.center[0] : 22.5937);
    const centerLng = hasPipes ? (minLng + maxLng) / 2 : (townData.center ? townData.center[1] : 78.9629);

    const latSpan = Math.max(0.005, hasPipes ? (maxLat - minLat) : 0.05);
    const lngSpan = Math.max(0.005, hasPipes ? (maxLng - minLng) : 0.05);
    const maxSpan = Math.max(latSpan, lngSpan);

    const isNational = maxSpan > 2.0;
    const targetSpan = 135; // 3D world bounding size
    const scaleFactor = targetSpan / maxSpan;
    const baseElev = townData.elevation || 1200;

    this.scaleFactor = scaleFactor;
    this.centerLat = centerLat;
    this.centerLng = centerLng;
    this.isNational = isNational;

    // Coordinate to 3D world vector conversion
    this.coordTo3D = (lat, lng, elev = baseElev) => {
      const x = (lng - centerLng) * scaleFactor;
      const z = -(lat - centerLat) * scaleFactor;
      const y = isNational ? 0 : (((elev - baseElev) / 100) * 1.5);
      return new THREE.Vector3(x, y, z);
    };

    // 2. Build Terrain & Subsurface Cutaway Strata
    this.buildTerrain(townData, targetSpan);

    // 3. Build Depth Slicing Reference Grid
    this.buildDepthSlicingGrid(targetSpan);

    // 4. Build 3D Buried Pipelines & Station Nodes
    this.buildPipelines(pipes, riskResults);

    // 5. Build 3D Manholes / Surface Inspection Chambers
    this.buildManholes(townData.manholes);

    // 6. Build 3D Citizen Anomaly Markers
    this.buildCommunityMarkers(townData.community_reports);

    // Reset camera target smoothly to center
    if (this.controls) {
      this.controls.target.set(0, 0, 0);
      this.camera.position.set(80, 75, 105);
      this.controls.update();
    }
  }

  /**
   * Builds realistic terrain with transparent cutaway allowing subterranean views
   */
  buildTerrain(townData, targetSpan = 140) {
    const size = Math.max(160, targetSpan * 1.3);
    const segments = 40;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const pos = geometry.attributes.position;
    const avgSlope = (townData.avgSlope || 3.5) * (Math.PI / 180);

    // Sculpt terrain height if regional/mountain; if national, keep smooth continental plate
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);

      let vy = 0;
      if (!this.isNational) {
        vy = (vz * Math.sin(avgSlope) * 0.45) - (vx * 0.15);
        vy += Math.sin(vx * 0.08) * 2.5 + Math.cos(vz * 0.06) * 3.0;
      }
      pos.setY(i, vy);
    }
    geometry.computeVertexNormals();

    // Semi-transparent surface material
    const surfaceMat = new THREE.MeshStandardMaterial({
      color: 0x0c2619, // Pale green / deep forest slate
      roughness: 0.85,
      metalness: 0.1,
      transparent: true,
      opacity: this.groundOpacity,
      side: THREE.DoubleSide
    });

    const terrainMesh = new THREE.Mesh(geometry, surfaceMat);
    terrainMesh.receiveShadow = true;
    this.terrainMesh = terrainMesh;
    this.terrainGroup.add(terrainMesh);

    // Topographical wireframe contour grid overlay
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.18
    });
    const wireMesh = new THREE.Mesh(geometry, wireMat);
    wireMesh.position.y += 0.08;
    this.terrainGroup.add(wireMesh);
  }

  /**
   * Depth reference planes: 0m Ground, -1m, -2m, -3.5m
   */
  buildDepthSlicingGrid(targetSpan = 140) {
    const size = Math.max(160, targetSpan * 1.3);
    const depthLevels = [
      { depth: -1.2, label: '1.2m Utility Depth', color: 0x059669 },
      { depth: -2.5, label: '2.5m Deep Feeder Depth', color: 0x0284c7 },
      { depth: -4.0, label: '4.0m Heavy Transmission Main', color: 0x9333ea }
    ];

    depthLevels.forEach(lvl => {
      const grid = new THREE.GridHelper(size, 16, lvl.color, 0x164e33);
      grid.position.y = lvl.depth * (this.isNational ? 1.5 : 3.0);
      grid.material.opacity = 0.18;
      grid.material.transparent = true;
      this.depthPlaneGroup.add(grid);
    });
  }

  /**
   * Builds 3D Pipe conduits with accurate burial depth, diameter, glowing shaders,
   * station junction valves, and 3D floating location billboards!
   */
  buildPipelines(pipes, riskResults) {
    if (!pipes || pipes.length === 0) return;

    pipes.forEach((pipe, pipeIdx) => {
      if (!pipe.coords || pipe.coords.length < 2) return;

      // Vertical burial depth scale
      const depthOffset = this.isNational ? 4.0 : Math.max(2.5, (pipe.depth_m || 1.5) * 3.2);

      const pts3D = pipe.coords.map(c => {
        const v = this.coordTo3D(c[0], c[1], c[2]);
        v.y -= depthOffset; // Subterranean depth!
        return v;
      });

      // Smooth 3D curve through all vertices
      const curve = new THREE.CatmullRomCurve3(pts3D);
      const radius = this.isNational ? 1.0 : Math.max(0.4, (pipe.diameter_mm || 200) / 280);
      const tubeSegments = Math.min(60, pipe.coords.length * 15);
      const tubeGeo = new THREE.TubeGeometry(curve, tubeSegments, radius, 12, false);

      const hexColor = this.getPipeColor(pipe, riskResults);
      const riskTier = riskResults && riskResults.byPipeId[pipe.id] ? riskResults.byPipeId[pipe.id].tier : 'low';

      // Pipe material with glowing emissive intensity
      const pipeMat = new THREE.MeshStandardMaterial({
        color: hexColor,
        roughness: 0.3,
        metalness: 0.6,
        emissive: hexColor,
        emissiveIntensity: riskTier === 'high' ? 0.8 : 0.4
      });

      const pipeMesh = new THREE.Mesh(tubeGeo, pipeMat);
      pipeMesh.castShadow = true;
      pipeMesh.userData = {
        isPipe: true,
        pipeId: pipe.id,
        pipeData: pipe,
        originalColor: hexColor,
        originalEmissive: pipeMat.emissive.getHex(),
        originalEmissiveIntensity: pipeMat.emissiveIntensity
      };

      this.pipesGroup.add(pipeMesh);
      this.pipeMeshMap.set(pipe.id, pipeMesh);

      // Station / Node Valve Spheres at key vertices
      pts3D.forEach((pt, idx) => {
        const nodeGeo = new THREE.SphereGeometry(radius * 1.7, 12, 12);
        const nodeMat = new THREE.MeshStandardMaterial({
          color: hexColor,
          emissive: hexColor,
          emissiveIntensity: 0.7,
          metalness: 0.8,
          roughness: 0.2
        });
        const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
        nodeMesh.position.copy(pt);
        this.stationsGroup.add(nodeMesh);
      });

      // 3D FLOATING LOCATION BILLBOARD CALLOUT
      // Extract clean short title and location from pipeline metadata
      const midIdx = Math.floor(pts3D.length / 2);
      const midPt = pts3D[midIdx];
      const midCoord = pipe.coords[midIdx];

      let shortTitle = pipe.name;
      if (shortTitle.includes('(')) {
        shortTitle = shortTitle.split('(')[0].trim();
      }
      if (shortTitle.length > 28) {
        shortTitle = shortTitle.substring(0, 26) + '...';
      }

      let locationSub = `${midCoord[0].toFixed(2)}°N, ${midCoord[1].toFixed(2)}°E • Depth: ${pipe.depth_m}m`;
      if (pipe.zone) {
        locationSub = `${pipe.zone.replace(/_/g, ' ').toUpperCase()} • ${locationSub}`;
      }

      const hexStr = '#' + hexColor.toString(16).padStart(6, '0');
      const sprite = this.createLocationSprite(shortTitle, locationSub, hexStr);

      const billboardY = midPt.y + (this.isNational ? 9.0 : 6.0);
      sprite.position.set(midPt.x, billboardY, midPt.z);
      sprite.userData = { baseY: billboardY };
      this.labelsGroup.add(sprite);

      // Glowing laser beacon connecting buried pipe up to floating billboard
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        midPt,
        new THREE.Vector3(midPt.x, billboardY - 1.5, midPt.z)
      ]);
      const lineMat = new THREE.LineBasicMaterial({
        color: hexColor,
        transparent: true,
        opacity: 0.55
      });
      const beaconLine = new THREE.Line(lineGeo, lineMat);
      this.labelsGroup.add(beaconLine);
    });
  }

  /**
   * Generates a crisp HTML5 Canvas texture for 3D location text billboards
   */
  createLocationSprite(title, subtitle, colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');

    // Card background
    ctx.fillStyle = 'rgba(12, 38, 25, 0.92)';
    ctx.strokeStyle = colorHex || '#10b981';
    ctx.lineWidth = 6;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(8, 8, 496, 144, 22);
    } else {
      ctx.rect(8, 8, 496, 144);
    }
    ctx.fill();
    ctx.stroke();

    // Title with Pin Icon
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📍 ' + title, 256, 64);

    // Subtitle / Location
    ctx.fillStyle = '#a7f3d0';
    ctx.font = 'bold 21px monospace';
    ctx.fillText(subtitle, 256, 116);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(this.isNational ? 18 : 13, this.isNational ? 5.5 : 4, 1);
    return sprite;
  }

  getPipeColor(pipe, riskResults) {
    if (this.colorMode === 'risk' && riskResults && riskResults.byPipeId[pipe.id]) {
      const r = riskResults.byPipeId[pipe.id];
      if (r.tier === 'high') return 0xe11d48;   // High risk red
      if (r.tier === 'medium') return 0xd97706; // Moderate amber
      return 0x059669; // Low risk emerald
    }

    // Default: Utility Type
    const meta = (typeof UTILITY_METADATA !== 'undefined' && UTILITY_METADATA[pipe.utilityType]);
    if (meta && meta.colorThree) return meta.colorThree;

    // Palette fallback
    const utilColors = {
      gas_transmission: 0xea580c,
      oil_petroleum: 0x9333ea,
      water_main: 0x0284c7,
      water_distribution: 0x06b6d4,
      telecom_fiber: 0xdb2777,
      electric_11kv: 0xd97706,
      sewer_gravity: 0x059669
    };
    return utilColors[pipe.utilityType] || 0x059669;
  }

  buildManholes(manholes) {
    if (!manholes) return;

    manholes.forEach(mh => {
      const surfacePos = this.coordTo3D(mh.lat, mh.lng);
      const shaftHeight = (mh.depth_m || 2.0) * 3.2;

      const shaftGeo = new THREE.CylinderGeometry(1.0, 1.0, shaftHeight, 10);
      const shaftMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        roughness: 0.85,
        transparent: true,
        opacity: 0.65
      });
      const shaft = new THREE.Mesh(shaftGeo, shaftMat);
      shaft.position.set(surfacePos.x, surfacePos.y - (shaftHeight / 2), surfacePos.z);
      this.manholesGroup.add(shaft);

      // Manhole cover
      const coverGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.25, 10);
      const coverMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9, roughness: 0.2 });
      const cover = new THREE.Mesh(coverGeo, coverMat);
      cover.position.set(surfacePos.x, surfacePos.y + 0.1, surfacePos.z);
      this.manholesGroup.add(cover);
    });
  }

  buildCommunityMarkers(reports) {
    if (!reports) return;

    reports.forEach((rep, idx) => {
      const surf = this.coordTo3D(rep.lat, rep.lng, rep.elevation);

      const group = new THREE.Group();
      group.position.set(surf.x, surf.y + 2.5, surf.z);
      group.userData = {
        isCitizenMarker: true,
        baseY: surf.y + 2.5,
        offset: idx * 1.5,
        reportId: rep.id,
        reportData: rep
      };

      const coneGeo = new THREE.ConeGeometry(1.2, 2.6, 6);
      coneGeo.rotateX(Math.PI);

      const isCritical = rep.severity === 'critical';
      const col = isCritical ? 0xe11d48 : rep.type === 'wet_patch' ? 0x0284c7 : 0xd97706;

      const markerMat = new THREE.MeshStandardMaterial({
        color: col,
        emissive: col,
        emissiveIntensity: 0.85,
        roughness: 0.2
      });

      const coneMesh = new THREE.Mesh(coneGeo, markerMat);
      group.add(coneMesh);

      const ringGeo = new THREE.RingGeometry(0.9, 1.6, 16);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y = -2.1;
      group.add(ringMesh);

      this.markersGroup.add(group);
    });
  }

  /**
   * Interactive camera presets
   */
  setCameraPreset(preset) {
    if (!this.camera || !this.controls) return;
    switch (preset) {
      case 'iso': // Isometric 3D
        this.camera.position.set(85, 75, 105);
        this.controls.target.set(0, 0, 0);
        break;
      case 'cross_section': // Subsurface Depth Trench
        this.camera.position.set(0, 8, 130);
        this.controls.target.set(0, -6, 0);
        break;
      case 'top_down': // Ortho Top View
        this.camera.position.set(0, 160, 0.1);
        this.controls.target.set(0, 0, 0);
        break;
      case 'underground': // Underground view peering up
        this.camera.position.set(45, -28, 55);
        this.controls.target.set(0, -4, 0);
        break;
    }
    this.controls.update();
  }

  flyCameraToPipe(pipeId) {
    const mesh = this.pipeMeshMap.get(pipeId);
    if (!mesh || !this.controls) return;
    this.highlightPipe(pipeId);

    const bbox = new THREE.Box3().setFromObject(mesh);
    const center = new THREE.Vector3();
    bbox.getCenter(center);

    this.controls.target.copy(center);
    this.camera.position.set(center.x + 30, center.y + 25, center.z + 40);
    this.controls.update();
  }

  toggleLabels(forceState) {
    if (this.labelsGroup) {
      this.showLabels = (forceState !== undefined) ? forceState : !this.labelsGroup.visible;
      this.labelsGroup.visible = this.showLabels;
      return this.showLabels;
    }
    return false;
  }

  toggleAutoRotate(forceState) {
    if (this.controls) {
      this.controls.autoRotate = (forceState !== undefined) ? forceState : !this.controls.autoRotate;
      this.controls.autoRotateSpeed = 1.0;
      return this.controls.autoRotate;
    }
    return false;
  }

  setGroundOpacity(val) {
    this.groundOpacity = Number(val);
    if (this.terrainMesh) {
      this.terrainMesh.material.opacity = this.groundOpacity;
      this.terrainMesh.material.needsUpdate = true;
    }
  }

  setColorMode(mode) {
    this.colorMode = mode;
    if (this.currentTown) {
      this.pipesGroup.children.forEach(mesh => {
        if (mesh.userData && mesh.userData.isPipe) {
          const newCol = this.getPipeColor(mesh.userData.pipeData, this.riskResults);
          mesh.material.color.setHex(newCol);
          mesh.material.emissive.setHex(newCol);
          mesh.userData.originalColor = newCol;
          mesh.userData.originalEmissive = newCol;
        }
      });
    }
  }

  highlightPipe(pipeId) {
    this.selectedPipeId = pipeId;
    this.pipesGroup.children.forEach(mesh => {
      if (mesh.userData && mesh.userData.isPipe) {
        if (mesh.userData.pipeId === pipeId) {
          mesh.material.emissive.setHex(0xffffff);
          mesh.material.emissiveIntensity = 1.0;
          mesh.scale.set(1.35, 1.35, 1.35);
        } else {
          mesh.material.emissive.setHex(mesh.userData.originalEmissive);
          mesh.material.emissiveIntensity = 0.25;
          mesh.scale.set(1.0, 1.0, 1.0);
        }
      }
    });
  }

  clearSelection() {
    this.selectedPipeId = null;
    this.pipesGroup.children.forEach(mesh => {
      if (mesh.userData && mesh.userData.isPipe) {
        mesh.material.emissive.setHex(mesh.userData.originalEmissive);
        mesh.material.emissiveIntensity = mesh.userData.originalEmissiveIntensity;
        mesh.scale.set(1.0, 1.0, 1.0);
      }
    });
  }

  onPointerMove(event) {
    if (!this.raycaster || !this.camera) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.pipesGroup.children);

    if (intersects.length > 0 && intersects[0].object.userData.isPipe) {
      const hitPipe = intersects[0].object.userData.pipeData;
      if (this.hoveredPipeId !== hitPipe.id) {
        this.hoveredPipeId = hitPipe.id;
        this.container.style.cursor = 'pointer';
        this.onPipeHover(hitPipe, event);
      }
      this.update3DHoverCard(hitPipe, event.clientX, event.clientY);
    } else {
      if (this.hoveredPipeId) {
        this.hoveredPipeId = null;
        this.container.style.cursor = 'grab';
        this.onPipeHover(null, event);
        this.hide3DHoverCard();
      }
    }
  }

  update3DHoverCard(pipe, x, y) {
    let card = document.getElementById('three-hover-card');
    if (!card) {
      card = document.createElement('div');
      card.id = 'three-hover-card';
      card.className = 'three-hover-card';
      document.body.appendChild(card);
    }

    const risk = this.riskResults && this.riskResults.byPipeId[pipe.id] ? this.riskResults.byPipeId[pipe.id] : { totalScore: 35, tier: 'low' };
    const firstCoord = pipe.coords && pipe.coords[0] ? pipe.coords[0] : [0, 0];

    card.innerHTML = `
      <div style="font-size:12px; font-weight:800; color:#10b981; margin-bottom:2px;">📍 ${pipe.name}</div>
      <div style="font-size:10px; color:#a7f3d0; font-family:monospace;">
        Lat: ${firstCoord[0].toFixed(4)}°N, Lng: ${firstCoord[1].toFixed(4)}°E
      </div>
      <div style="margin-top:4px; font-size:11px; color:#ffffff;">
        Depth: <strong>${pipe.depth_m}m subterranean</strong> &bull; Dia: <strong>${pipe.diameter_mm}mm</strong>
      </div>
      <div style="margin-top:3px; font-size:10px; color:#cbd5e1;">
        Operator: <strong style="color:#ffffff;">${pipe.operator || 'National Authority'}</strong>
      </div>
      <div style="margin-top:4px; font-size:10px; font-weight:700; color:${risk.tier === 'high' ? '#f43f5e' : '#10b981'};">
        AI Risk Score: ${risk.totalScore}/100 (${risk.tier.toUpperCase()})
      </div>
    `;

    card.style.left = `${x + 16}px`;
    card.style.top = `${y + 16}px`;
    card.style.display = 'block';
  }

  hide3DHoverCard() {
    const card = document.getElementById('three-hover-card');
    if (card) card.style.display = 'none';
  }

  onPointerClick(event) {
    if (!this.raycaster || !this.camera) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.pipesGroup.children);

    if (intersects.length > 0 && intersects[0].object.userData.isPipe) {
      const hitPipe = intersects[0].object.userData.pipeData;
      this.highlightPipe(hitPipe.id);
      this.onPipeSelect(hitPipe);
    } else {
      const markerHits = this.raycaster.intersectObjects(this.markersGroup.children, true);
      if (markerHits.length > 0) {
        let parentMarker = markerHits[0].object;
        while (parentMarker.parent && !parentMarker.userData.isCitizenMarker) {
          parentMarker = parentMarker.parent;
        }
        if (parentMarker.userData && parentMarker.userData.reportData) {
          if (this.options.onReportClick) {
            this.options.onReportClick(parentMarker.userData.reportData);
          }
        }
      }
    }
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  clearGroup(group) {
    if (!group) return;
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }
  }

  initFallback2DCanvas() {
    this.container.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#4b6357; background:#f5f9f6; padding:20px; text-align:center;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
        <h4 style="color:#0c2619; margin-top:10px; font-weight:800;">Three.js 3D Subsurface Engine Loading...</h4>
        <p style="font-size:13px; max-width:400px; color:#4b6357;">Rendering 3D underground pipeline coordinate matrix and location callouts.</p>
      </div>
    `;
  }
}
