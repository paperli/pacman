import { Engine, Scene, UniversalCamera, ArcRotateCamera, Vector3, HemisphericLight, PointLight, MeshBuilder, StandardMaterial, Color3, TransformNode } from "@babylonjs/core";

// Debug flag: set to true to enable debug features (e.g., map view)
const Debug = true;

// Simple PAC-MAN-like maze: 1 = wall, 0 = corridor
const MAZE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,0,1],
  [1,0,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
  [1,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,1],
  [0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0],
  [1,1,1,1,0,1,1,1,2,2,2,1,1,1,0,1,1,1,1],
  [1,1,1,1,0,1,1,1,2,2,2,1,1,1,0,1,1,1,1],
  [1,1,1,1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,1],
  [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,0,1],
  [1,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,1],
  [1,1,0,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
  [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
  [1,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const CELL_SIZE = 2;
const MAZE_ROWS = MAZE.length;
const MAZE_COLS = MAZE[0].length;
const MAZE_WIDTH = MAZE_COLS * CELL_SIZE;
const MAZE_HEIGHT = MAZE_ROWS * CELL_SIZE;
const MAZE_CENTER_X = (MAZE_COLS - 1) * CELL_SIZE / 2;
const MAZE_CENTER_Z = (MAZE_ROWS - 1) * CELL_SIZE / 2;
const PLAYER_HEIGHT = 1.7;
const PLAYER_SPEED = 0.1;

// Pellet constants
const PELLET_RADIUS = 0.2;
const POWER_PELLET_RADIUS = 0.4;
const PELLET_COLOR = new Color3(255/255, 227/255, 0/255); // Goose yellow (#F9D71C)
const POWER_PELLET_COLOR = new Color3(1, 129/255, 0); // Brighter orange (#FFA500)
const PELLET_COLLECTION_DIST = 0.5;

// Ghost constants
const GHOST_TYPES = [
  { type: 'blinky', color: new Color3(1, 0, 0), start: [9, 9] },   // Red (top left of house)
  { type: 'pinky',  color: new Color3(1, 0.72, 1), start: [10, 9] }, // Pink (top right)
  { type: 'inky',   color: new Color3(0, 1, 1), start: [9, 10] },    // Cyan (bottom left)
  { type: 'clyde',  color: new Color3(1, 0.72, 0.32), start: [10, 10] } // Orange (bottom right)
];
const GHOST_RADIUS = 0.7;
const GHOST_HEIGHT = 1.2;
const GHOST_FLOAT_AMPLITUDE = 0.2;
const GHOST_FLOAT_SPEED = 2.0;

// Ghost AI configuration (for future difficulty tuning)
const GHOST_CONFIG = {
  blinky: { pathInterval: 0.5, moveSpeed: 2.5 },
  pinky:  { pathInterval: 0.5, moveSpeed: 2.5 },
  inky:   { pathInterval: 0.5, moveSpeed: 2.5 },
  clyde:  { pathInterval: 0.5, moveSpeed: 2.5 },
};

// Ghost state durations (seconds)
const GHOST_STATE_DURATIONS = {
  chase: 5,
  scatter: 3,
};

// Scatter corners for each ghost
const GHOST_SCATTER_CORNERS = {
  blinky: [MAZE_COLS - 1, 0], // top-right
  pinky: [0, 0],             // top-left
  inky: [MAZE_COLS - 1, MAZE_ROWS - 1], // bottom-right
  clyde: [0, MAZE_ROWS - 1], // bottom-left
};

// Ghost release times (seconds after game start)
const GHOST_RELEASE_TIMES = {
  blinky: 0,
  pinky: 3,
  inky: 6,
  clyde: 9,
};

let pellets = [];
let score = 0;
let totalPellets = 0;
let isMapView = false;
let savedCameraState = null;
let playerCamera = null;
let mapCamera = null;
let playerDot = null;
let blinkInterval = null;
let ghosts = [];

// Player spawn cell (remove pellet here)
const PLAYER_SPAWN_X = 1;
const PLAYER_SPAWN_Z = 1;

// Player respawn corners (ensure open cell)
const PLAYER_RESPAWN_CORNERS = [
  nearestOpenCell(1, 1), // top-left
  nearestOpenCell(MAZE_COLS - 2, 1), // top-right
  nearestOpenCell(1, MAZE_ROWS - 2), // bottom-left
  nearestOpenCell(MAZE_COLS - 2, MAZE_ROWS - 2), // bottom-right
];

// Debug: Visualize A* path with spheres
let pathSpheres = [];

// Track whether ghosts should move (active only when pointer is locked)
let ghostsActive = false;

let ghostGlobalState = 'chase';
let ghostStateTimer = 0;

// Frightened mode config
const FRIGHTENED_DURATION = 6; // seconds
const FRIGHTENED_COLOR = new Color3(0, 0.4, 1); // ocean blue
const FRIGHTENED_SPEED = 1.2; // slower than normal
let frightenedTimer = 0;
let isFrightened = false;

// Power pellet positions (adjustable)
const POWER_PELLET_POSITIONS = [
  [1, 3],
  [17, 3],
  [1, 17],
  [17, 17],
];

// Filter power pellet positions to only valid corridor cells
const VALID_POWER_PELLET_POSITIONS = POWER_PELLET_POSITIONS.filter(([x, z]) => {
  if (MAZE[z][x] !== 0) {
    console.warn(`Power pellet position [${x},${z}] is not on a corridor (0) cell and will be skipped.`);
    return false;
  }
  return true;
});

// Portal configuration: center left and right openings (row 8, col 0 and col 18)
const PORTAL_ROW = 8;
const PORTAL_LEFT = [0, PORTAL_ROW];
const PORTAL_RIGHT = [MAZE_COLS - 1, PORTAL_ROW];
const PORTAL_LEFT_WORLD = [PORTAL_LEFT[0] * CELL_SIZE, PORTAL_LEFT[1] * CELL_SIZE];
const PORTAL_RIGHT_WORLD = [PORTAL_RIGHT[0] * CELL_SIZE, PORTAL_RIGHT[1] * CELL_SIZE];
const PORTAL_THRESHOLD = 0.7; // How close player must be to trigger portal

// Basic A* pathfinding for the maze grid
function findPathAStar(start, end, maze) {
  const [startX, startZ] = start;
  const [endX, endZ] = end;
  const rows = maze.length;
  const cols = maze[0].length;
  const openSet = [];
  const closedSet = new Set();
  const cameFrom = {};
  const gScore = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
  const fScore = Array.from({ length: rows }, () => Array(cols).fill(Infinity));

  function heuristic(x, z) {
    return Math.abs(x - endX) + Math.abs(z - endZ);
  }

  function key(x, z) {
    return `${x},${z}`;
  }

  gScore[startZ][startX] = 0;
  fScore[startZ][startX] = heuristic(startX, startZ);
  openSet.push({ x: startX, z: startZ, f: fScore[startZ][startX] });

  const directions = [
    [0, -1], // up
    [0, 1],  // down
    [-1, 0], // left
    [1, 0],  // right
  ];

  while (openSet.length > 0) {
    // Get node with lowest f
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift();
    if (current.x === endX && current.z === endZ) {
      // Reconstruct path
      const path = [];
      let currKey = key(endX, endZ);
      while (currKey !== key(startX, startZ)) {
        const [cx, cz] = currKey.split(",").map(Number);
        path.push([cx, cz]);
        currKey = cameFrom[currKey];
      }
      path.push([startX, startZ]);
      path.reverse();
      return path;
    }
    closedSet.add(key(current.x, current.z));
    for (const [dx, dz] of directions) {
      const nx = current.x + dx;
      const nz = current.z + dz;
      if (
        nx < 0 || nx >= cols || nz < 0 || nz >= rows ||
        maze[nz][nx] === 1 // wall
      ) continue;
      const neighborKey = key(nx, nz);
      if (closedSet.has(neighborKey)) continue;
      const tentativeG = gScore[current.z][current.x] + 1;
      if (tentativeG < gScore[nz][nx]) {
        cameFrom[neighborKey] = key(current.x, current.z);
        gScore[nz][nx] = tentativeG;
        fScore[nz][nx] = tentativeG + heuristic(nx, nz);
        if (!openSet.some(n => n.x === nx && n.z === nz)) {
          openSet.push({ x: nx, z: nz, f: fScore[nz][nx] });
        }
      }
    }
  }
  return null; // No path found
}

function isWall(x, z) {
  const gridX = Math.floor(x / CELL_SIZE);
  const gridZ = Math.floor(z / CELL_SIZE);
  if (
    gridZ < 0 || gridZ >= MAZE_ROWS ||
    gridX < 0 || gridX >= MAZE_COLS
  ) return true;
  return MAZE[gridZ][gridX] === 1;
}

function isPowerPellet(x, z) {
  return VALID_POWER_PELLET_POSITIONS.some(([px, pz]) => x === px && z === pz);
}

function horizontalDistanceXZ(a, b) {
  return Math.sqrt(
    (a.x - b.x) * (a.x - b.x) +
    (a.z - b.z) * (a.z - b.z)
  );
}

// Set ArcRotateCamera to a true top-down view (beta ~0 is pole, alpha = Math.PI/2 faces -Z)
function setMapCameraTopDown(mapCamera) {
  mapCamera.alpha = Math.PI / 2;
  mapCamera.beta = 0.0001; // Just above 0 to avoid gimbal lock
  mapCamera.radius = Math.max(MAZE_WIDTH, MAZE_HEIGHT) * 1.2;
  mapCamera.setTarget(new Vector3(MAZE_CENTER_X, 0, MAZE_CENTER_Z));
  mapCamera.lowerBetaLimit = 0.0001;
  mapCamera.upperBetaLimit = 0.0001;
  mapCamera.lowerAlphaLimit = Math.PI / 2;
  mapCamera.upperAlphaLimit = Math.PI / 2;
  mapCamera.lowerRadiusLimit = mapCamera.radius;
  mapCamera.upperRadiusLimit = mapCamera.radius;
  mapCamera.panningSensibility = 0;
  mapCamera.allowUpsideDown = false;
}

function createPlayerDot(scene) {
  const mat = new StandardMaterial("playerDotMat", scene);
  mat.diffuseColor = new Color3(0, 1, 0);
  const dot = MeshBuilder.CreateSphere("playerDot", { diameter: 0.4, segments: 8 }, scene);
  dot.material = mat;
  dot.position.y = 1.5;
  dot.isVisible = true;
  return dot;
}

// Helper: Convert world position to grid cell
function worldToGrid(x, z) {
  return [Math.round(x / CELL_SIZE), Math.round(z / CELL_SIZE)];
}

// Helper: Convert grid cell to world position
function gridToWorld(x, z) {
  return [x * CELL_SIZE, z * CELL_SIZE];
}

// Helper: Find nearest open cell to a target (avoiding walls)
function nearestOpenCell(targetX, targetZ) {
  // BFS from target cell
  const visited = Array.from({ length: MAZE_ROWS }, () => Array(MAZE_COLS).fill(false));
  const queue = [[targetX, targetZ]];
  while (queue.length > 0) {
    const [x, z] = queue.shift();
    if (x < 0 || x >= MAZE_COLS || z < 0 || z >= MAZE_ROWS) continue;
    if (visited[z][x]) continue;
    visited[z][x] = true;
    if (MAZE[z][x] !== 1) return [x, z];
    // Add neighbors
    queue.push([x+1, z], [x-1, z], [x, z+1], [x, z-1]);
  }
  // Fallback: just return the original
  return [targetX, targetZ];
}

class Ghost {
  constructor(type, color, startX, startZ, scene) {
    this.type = type;
    this.color = color;
    this.gridX = startX;
    this.gridZ = startZ;
    this.startX = startX; // Store original start cell
    this.startZ = startZ;
    this.position = new Vector3(startX * CELL_SIZE, GHOST_HEIGHT - 0.3, startZ * CELL_SIZE);
    this.baseY = GHOST_HEIGHT - 0.3;
    this.mesh = this.createCompositeMesh(scene);
    this.floatPhase = Math.random() * Math.PI * 2;
    // Pathfinding state (for all ghosts)
    this.path = [];
    this.pathIndex = 0;
    this.pathTimer = 0;
    this.moveSpeed = GHOST_CONFIG[type].moveSpeed;
    this.state = type === 'blinky' ? ghostGlobalState : 'home'; // 'chase', 'scatter', 'frightened', 'home'
    this.releaseTime = GHOST_RELEASE_TIMES[type];
    this.homeTimer = 0;
    this.normalColor = color;
    this.isFrightened = false;
    this.isEaten = false;
    this.eatenTimer = 0;
    this.eyes = this.createEyes(scene);
    this.setEyesVisible(false);
  }
  createCompositeMesh(scene) {
    const mat = new StandardMaterial(`${this.type}Mat`, scene);
    mat.diffuseColor = this.color;
    // Cylinder body (shorter)
    const bodyHeight = GHOST_RADIUS * 1.2;
    const body = MeshBuilder.CreateCylinder(`${this.type}Body`, {
      diameter: GHOST_RADIUS * 2,
      height: bodyHeight,
      tessellation: 16
    }, scene);
    body.material = mat;
    body.position.y = 0; // base at y=0
    // Hemisphere head
    const head = MeshBuilder.CreateSphere(`${this.type}Head`, {
      diameter: GHOST_RADIUS * 2,
      segments: 16,
      slice: 0.5 // Only top half
    }, scene);
    head.material = mat;
    head.position.y = bodyHeight / 2; // Place on top of body
    // Group for animation
    const group = new TransformNode(`${this.type}GhostGroup`, scene);
    body.parent = group;
    head.parent = group;
    group.position.copyFrom(this.position);
    // Save references for show/hide
    group.body = body;
    group.head = head;
    return group;
  }
  createEyes(scene) {
    // Eyes group
    const eyesGroup = new TransformNode(`${this.type}EyesGroup`, scene);
    // Left eye
    const leftEye = MeshBuilder.CreateSphere(`${this.type}LeftEye`, { diameter: 0.32, segments: 8 }, scene);
    const leftEyeMat = new StandardMaterial(`${this.type}LeftEyeMat`, scene);
    leftEyeMat.diffuseColor = new Color3(1, 1, 1);
    leftEye.material = leftEyeMat;
    leftEye.parent = eyesGroup;
    leftEye.position.x = -0.28;
    leftEye.position.y = GHOST_RADIUS * 0.7;
    leftEye.position.z = GHOST_RADIUS * 0.7;
    // Left pupil
    const leftPupil = MeshBuilder.CreateSphere(`${this.type}LeftPupil`, { diameter: 0.14, segments: 8 }, scene);
    const leftPupilMat = new StandardMaterial(`${this.type}LeftPupilMat`, scene);
    leftPupilMat.diffuseColor = new Color3(0.2, 0.4, 1);
    leftPupil.material = leftPupilMat;
    leftPupil.parent = leftEye;
    leftPupil.position.z = 0.16;
    // Right eye
    const rightEye = MeshBuilder.CreateSphere(`${this.type}RightEye`, { diameter: 0.32, segments: 8 }, scene);
    const rightEyeMat = new StandardMaterial(`${this.type}RightEyeMat`, scene);
    rightEyeMat.diffuseColor = new Color3(1, 1, 1);
    rightEye.material = rightEyeMat;
    rightEye.parent = eyesGroup;
    rightEye.position.x = 0.28;
    rightEye.position.y = GHOST_RADIUS * 0.7;
    rightEye.position.z = GHOST_RADIUS * 0.7;
    // Right pupil
    const rightPupil = MeshBuilder.CreateSphere(`${this.type}RightPupil`, { diameter: 0.14, segments: 8 }, scene);
    const rightPupilMat = new StandardMaterial(`${this.type}RightPupilMat`, scene);
    rightPupilMat.diffuseColor = new Color3(0.2, 0.4, 1);
    rightPupil.material = rightPupilMat;
    rightPupil.parent = rightEye;
    rightPupil.position.z = 0.16;
    eyesGroup.parent = this.mesh;
    eyesGroup.position = new Vector3(0, 0, 0);
    return eyesGroup;
  }
  setEyesVisible(visible) {
    if (this.eyes) this.eyes.setEnabled(visible);
    if (this.mesh.body) this.mesh.body.setEnabled(!visible);
    if (this.mesh.head) this.mesh.head.setEnabled(!visible);
  }
  updateFloat(time) {
    this.mesh.position.y = this.baseY + Math.sin(time * GHOST_FLOAT_SPEED + this.floatPhase) * GHOST_FLOAT_AMPLITUDE;
  }
  setFrightened(isFright) {
    if (isFright && !this.isFrightened) {
      this.isFrightened = true;
      this.state = 'frightened';
      this.moveSpeed = FRIGHTENED_SPEED;
      // Change color on all mesh parts
      this.mesh.getChildMeshes().forEach(m => {
        if (m.material) {
          m.material.diffuseColor = FRIGHTENED_COLOR;
        }
      });
    } else if (!isFright && this.isFrightened) {
      this.isFrightened = false;
      this.state = ghostGlobalState;
      this.moveSpeed = GHOST_CONFIG[this.type].moveSpeed;
      this.mesh.getChildMeshes().forEach(m => {
        if (m.material) {
          m.material.diffuseColor = this.normalColor;
        }
      });
    }
  }
  getTarget(playerCamera, ghosts) {
    if (this.state === 'home') {
      // Stay in ghost house (center)
      return [9, 10];
    }
    if (this.state === 'frightened') {
      // Target a random open cell
      let tries = 0;
      while (tries < 10) {
        const rx = Math.floor(Math.random() * MAZE_COLS);
        const rz = Math.floor(Math.random() * MAZE_ROWS);
        if (MAZE[rz][rx] !== 1) return [rx, rz];
        tries++;
      }
      return [this.gridX, this.gridZ]; // fallback: stay put
    }
    if (this.state === 'scatter') {
      const [cornerX, cornerZ] = GHOST_SCATTER_CORNERS[this.type];
      return nearestOpenCell(cornerX, cornerZ);
    }
    if (this.type === 'pinky') {
      // Pinky targets 4 tiles ahead of player direction
      const dir = playerCamera.getDirection(new Vector3(0, 0, 1));
      let px = playerCamera.position.x / CELL_SIZE;
      let pz = playerCamera.position.z / CELL_SIZE;
      // Move 4 tiles ahead in the direction
      px += dir.x * 4;
      pz += dir.z * 4;
      // Clamp to grid and maze bounds
      const tx = Math.max(0, Math.min(MAZE_COLS - 1, Math.round(px)));
      const tz = Math.max(0, Math.min(MAZE_ROWS - 1, Math.round(pz)));
      // If target is a wall, fallback to player's current cell
      if (MAZE[tz][tx] === 1) {
        return worldToGrid(playerCamera.position.x, playerCamera.position.z);
      }
      return [tx, tz];
    }
    if (this.type === 'inky') {
      // Inky targets a position calculated by doubling the vector from Blinky to a point 2 tiles ahead of the player
      const dir = playerCamera.getDirection(new Vector3(0, 0, 1));
      let px = playerCamera.position.x / CELL_SIZE;
      let pz = playerCamera.position.z / CELL_SIZE;
      // 2 tiles ahead of player
      px += dir.x * 2;
      pz += dir.z * 2;
      // Blinky's position (ghosts[0])
      const blinky = ghosts && ghosts[0];
      if (!blinky) return worldToGrid(playerCamera.position.x, playerCamera.position.z);
      const bx = blinky.position.x / CELL_SIZE;
      const bz = blinky.position.z / CELL_SIZE;
      // Vector from Blinky to 2-ahead point
      let vx = px - bx;
      let vz = pz - bz;
      // Double the vector
      let tx = bx + vx * 2;
      let tz = bz + vz * 2;
      // Clamp to grid and maze bounds
      tx = Math.max(0, Math.min(MAZE_COLS - 1, Math.round(tx)));
      tz = Math.max(0, Math.min(MAZE_ROWS - 1, Math.round(tz)));
      // If target is a wall, fallback to player's current cell
      if (MAZE[tz][tx] === 1) {
        return worldToGrid(playerCamera.position.x, playerCamera.position.z);
      }
      return [tx, tz];
    }
    if (this.type === 'clyde') {
      // Clyde: if farther than 8 tiles from player, target player; else, target nearest open cell to bottom-left corner
      const playerGrid = worldToGrid(playerCamera.position.x, playerCamera.position.z);
      const dist = Math.sqrt(
        (this.gridX - playerGrid[0]) ** 2 + (this.gridZ - playerGrid[1]) ** 2
      );
      if (dist > 8) {
        return playerGrid;
      } else {
        return nearestOpenCell(0, MAZE_ROWS - 1); // nearest open cell to bottom-left
      }
    }
    // Default: target player's current cell
    return worldToGrid(playerCamera.position.x, playerCamera.position.z);
  }
  // For Blinky/Pinky: update path to target grid cell
  updatePathTo(targetGrid) {
    this.path = findPathAStar([this.gridX, this.gridZ], targetGrid, MAZE) || [];
    this.pathIndex = 0;
  }
  // For Blinky/Pinky: move along path
  moveAlongPath(deltaTime) {
    if (!this.path || this.path.length < 2) return;
    // Next cell in path
    const [nextX, nextZ] = this.path[this.pathIndex + 1];
    const [worldX, worldZ] = gridToWorld(nextX, nextZ);
    const dir = new Vector3(worldX - this.position.x, 0, worldZ - this.position.z);
    const dist = dir.length();
    if (dist < 0.05) {
      // Snap to cell, advance path
      this.gridX = nextX;
      this.gridZ = nextZ;
      this.position.x = worldX;
      this.position.z = worldZ;
      this.pathIndex++;
      if (this.pathIndex >= this.path.length - 1) {
        this.path = [];
      }
    } else {
      dir.normalize();
      const moveDist = this.moveSpeed * deltaTime;
      this.position.x += dir.x * moveDist;
      this.position.z += dir.z * moveDist;
    }
    // Update mesh position
    this.mesh.position.x = this.position.x;
    this.mesh.position.z = this.position.z;
  }
  setEaten() {
    this.isEaten = true;
    this.state = 'eaten';
    this.moveSpeed = 4.0; // fast return
    this.setEyesVisible(true);
    this.eatenTimer = 0;
  }
  updateEaten(deltaTime) {
    if (!this.isEaten) return;
    // Target ghost house center
    const [houseX, houseZ] = [9, 10];
    const [worldX, worldZ] = gridToWorld(houseX, houseZ);
    const dir = new Vector3(worldX - this.position.x, 0, worldZ - this.position.z);
    const dist = dir.length();
    if (dist < 0.1) {
      // Arrived at house: respawn after short delay
      this.eatenTimer += deltaTime;
      if (this.eatenTimer > 1.0) {
        this.isEaten = false;
        this.state = 'home';
        // Respawn at original start cell
        this.gridX = this.startX;
        this.gridZ = this.startZ;
        const [sx, sz] = gridToWorld(this.startX, this.startZ);
        this.position.x = sx;
        this.position.z = sz;
        this.setEyesVisible(false);
        // Restore color
        this.mesh.getChildMeshes().forEach(m => {
          if (m.material) {
            m.material.diffuseColor = this.normalColor;
          }
        });
        this.moveSpeed = GHOST_CONFIG[this.type].moveSpeed;
      }
    } else {
      dir.normalize();
      const moveDist = this.moveSpeed * deltaTime;
      this.position.x += dir.x * moveDist;
      this.position.z += dir.z * moveDist;
      this.mesh.position.x = this.position.x;
      this.mesh.position.z = this.position.z;
    }
  }
}

// Play one of 5 different notes (no repeat) for scoring (Web Audio API)
const SCORE_NOTES = [659, 784, 880, 988, 1047]; // E5, G5, A5, B5, C6
let lastScoreNoteIdx = -1;
function playScoreSound() {
  // Pick a random note index, not repeating the last one
  let idx;
  do {
    idx = Math.floor(Math.random() * SCORE_NOTES.length);
  } while (SCORE_NOTES.length > 1 && idx === lastScoreNoteIdx);
  lastScoreNoteIdx = idx;
  const freq = SCORE_NOTES[idx];
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'square';
  o.frequency.value = freq;
  g.gain.value = 0.1;
  o.connect(g);
  g.connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + 0.12);
  o.onended = () => ctx.close();
}

let defaultClearColor = null;
const FRIGHTENED_SKY_COLOR = new Color3(0.4, 0.6, 1);

// HUD setup: create overlay div if not present
function setupHUD() {
  let hud = document.getElementById('hud');
  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'hud';
    hud.style.position = 'fixed';
    hud.style.top = '16px';
    hud.style.left = '50%';
    hud.style.transform = 'translateX(-50%)';
    hud.style.background = 'rgba(0,0,0,0.7)';
    hud.style.color = '#fff';
    hud.style.fontFamily = 'monospace, sans-serif';
    hud.style.fontSize = '2rem';
    hud.style.padding = '8px 32px';
    hud.style.borderRadius = '16px';
    hud.style.zIndex = '9999'; // ensure always on top
    hud.style.pointerEvents = 'none';
    hud.style.border = '2px solid #fff';
    document.body.appendChild(hud);
    console.log('[PACMAN] HUD created and injected into DOM');
  }
  // Only set innerHTML if not already set
  if (!document.getElementById('hud-score')) {
    hud.innerHTML = `Score: <span id=\"hud-score\">0</span>`;
  }
}
function updateHUD() {
  let scoreEl = document.getElementById('hud-score');
  if (!scoreEl) {
    setupHUD();
    scoreEl = document.getElementById('hud-score');
  }
  if (scoreEl) {
    scoreEl.textContent = score;
  } else {
    console.warn('[PACMAN] HUD score element not found!');
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("renderCanvas");
  const engine = new Engine(canvas, true);

  // Pointer lock event listeners to control ghost movement (now inside DOMContentLoaded)
  function updateGhostsActive() {
    ghostsActive = document.pointerLockElement === canvas;
  }
  document.addEventListener('pointerlockchange', updateGhostsActive);
  // Also set on initial load
  updateGhostsActive();

  const createScene = () => {
    const scene = new Scene(engine);
    // Store default clear color
    defaultClearColor = scene.clearColor.clone();
    // Player (first-person) camera
    playerCamera = new UniversalCamera("playerCamera", new Vector3(1 * CELL_SIZE, PLAYER_HEIGHT, 1 * CELL_SIZE), scene);
    playerCamera.attachControl(canvas, true);
    playerCamera.speed = PLAYER_SPEED;
    playerCamera.ellipsoid = new Vector3(0.4, 0.9, 0.4); // Player collision shape
    playerCamera.checkCollisions = true;
    playerCamera.applyGravity = false;
    playerCamera.minZ = 0.1;
    playerCamera.maxZ = 100;
    playerCamera.keysUp = [87];    // W
    playerCamera.keysDown = [83];  // S
    playerCamera.keysLeft = [65];  // A
    playerCamera.keysRight = [68]; // D

    // Enable collisions in the scene
    scene.collisionsEnabled = true;

    // Set the active camera to playerCamera initially
    scene.activeCamera = playerCamera;

    // Lighting
    new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
    new PointLight("pointLight", new Vector3(MAZE_CENTER_X, 10, MAZE_CENTER_Z), scene);

    // Materials
    const wallMat = new StandardMaterial("wallMat", scene);
    wallMat.diffuseColor = new Color3(0.1, 0.2, 0.8);
    const floorMat = new StandardMaterial("floorMat", scene);
    floorMat.diffuseColor = new Color3(0.1, 0.1, 0.1);

    // Floor (centered)
    const floor = MeshBuilder.CreateGround("floor", {
      width: MAZE_WIDTH,
      height: MAZE_HEIGHT
    }, scene);
    floor.position.x = MAZE_CENTER_X;
    floor.position.y = -0.5;
    floor.position.z = MAZE_CENTER_Z;
    floor.material = floorMat;
    floor.checkCollisions = false;

    // Maze walls (centered, with collisions)
    for (let z = 0; z < MAZE_ROWS; z++) {
      for (let x = 0; x < MAZE_COLS; x++) {
        if (MAZE[z][x] === 1) {
          const wall = MeshBuilder.CreateBox(`wall_${x}_${z}`, {
            width: CELL_SIZE,
            height: CELL_SIZE,
            depth: CELL_SIZE
          }, scene);
          wall.position.x = x * CELL_SIZE;
          wall.position.y = CELL_SIZE / 2;
          wall.position.z = z * CELL_SIZE;
          // Offset to center
          wall.position.x -= MAZE_CENTER_X;
          wall.position.z -= MAZE_CENTER_Z;
          wall.position.x += MAZE_CENTER_X;
          wall.position.z += MAZE_CENTER_Z;
          wall.material = wallMat;
          wall.checkCollisions = true;
        }
      }
    }

    // Pellets
    pellets = [];
    totalPellets = 0;
    for (let z = 0; z < MAZE_ROWS; z++) {
      for (let x = 0; x < MAZE_COLS; x++) {
        // Skip pellet at player spawn and respawn corners
        if ((x === PLAYER_SPAWN_X && z === PLAYER_SPAWN_Z) ||
            PLAYER_RESPAWN_CORNERS.some(([cx, cz]) => x === cx && z === cz)) continue;
        if (MAZE[z][x] === 0) {
          // Place regular pellet unless this is a power pellet position
          if (!VALID_POWER_PELLET_POSITIONS.some(([px, pz]) => x === px && z === pz)) {
            const mat = new StandardMaterial("pelletMat", scene);
            mat.diffuseColor = PELLET_COLOR;
            const pellet = MeshBuilder.CreateSphere(`pellet_${x}_${z}`,
              { diameter: PELLET_RADIUS * 2, segments: 8 }, scene);
            pellet.position.x = x * CELL_SIZE;
            pellet.position.y = 1.2;
            pellet.position.z = z * CELL_SIZE;
            pellet.material = mat;
            pellet.isPowerPellet = false;
            pellets.push(pellet);
            totalPellets++;
          }
        }
      }
    }
    // Place power pellets
    for (const [x, z] of VALID_POWER_PELLET_POSITIONS) {
      if (x === PLAYER_SPAWN_X && z === PLAYER_SPAWN_Z) continue;
      const mat = new StandardMaterial("powerPelletMat", scene);
      mat.diffuseColor = POWER_PELLET_COLOR;
      const pellet = MeshBuilder.CreateSphere(`powerPellet_${x}_${z}`,
        { diameter: POWER_PELLET_RADIUS * 2, segments: 8 }, scene);
      pellet.position.x = x * CELL_SIZE;
      pellet.position.y = 1.2;
      pellet.position.z = z * CELL_SIZE;
      pellet.material = mat;
      pellet.isPowerPellet = true;
      pellets.push(pellet);
      totalPellets++;
    }

    // Ghosts
    ghosts = [];
    for (const g of GHOST_TYPES) {
      ghosts.push(new Ghost(g.type, g.color, g.start[0], g.start[1], scene));
    }

    // Camera view switching (M key)
    if (Debug) {
      window.addEventListener('keydown', (e) => {
        if (e.key === 'm' && !isMapView) {
          isMapView = true;
          // Save player camera state
          savedCameraState = {
            position: playerCamera.position.clone(),
            rotation: playerCamera.rotation.clone(),
          };
          // Create map camera if not already created
          if (!mapCamera) {
            mapCamera = new ArcRotateCamera(
              "mapCamera",
              Math.PI / 2, // alpha
              0.0001, // beta (just above 0 for top-down)
              Math.max(MAZE_WIDTH, MAZE_HEIGHT) * 1.2, // radius
              new Vector3(MAZE_CENTER_X, 0, MAZE_CENTER_Z),
              scene
            );
          }
          setMapCameraTopDown(mapCamera);
          // Switch to map camera
          scene.activeCamera.detachControl(canvas);
          scene.activeCamera = mapCamera;
          mapCamera.attachControl(canvas, true);
          // Create player dot if not exists
          if (!playerDot) {
            playerDot = createPlayerDot(scene);
          }
          playerDot.isVisible = true;
          // Start blinking
          if (!blinkInterval) {
            blinkInterval = setInterval(() => {
              if (playerDot) playerDot.isVisible = !playerDot.isVisible;
            }, 500);
          }
        }
      });
      window.addEventListener('keyup', (e) => {
        if (e.key === 'm' && isMapView) {
          isMapView = false;
          // Switch back to player camera
          scene.activeCamera.detachControl(canvas);
          scene.activeCamera = playerCamera;
          playerCamera.attachControl(canvas, true);
          // Restore player camera state
          if (savedCameraState) {
            playerCamera.position = savedCameraState.position.clone();
            playerCamera.rotation = savedCameraState.rotation.clone();
          }
          if (playerDot) playerDot.isVisible = false;
          if (blinkInterval) {
            clearInterval(blinkInterval);
            blinkInterval = null;
          }
        }
      });
      // Update player dot position each frame
      scene.onBeforeRenderObservable.add(() => {
        if (isMapView && playerDot) {
          playerDot.position.x = playerCamera.position.x;
          playerDot.position.z = playerCamera.position.z;
        }
      });

      // Visualize A* path from Blinky to player spawn on 'P' key
      window.addEventListener('keydown', (e) => {
        if (e.key === 'p') {
          // Remove previous path spheres
          for (const s of pathSpheres) s.dispose();
          pathSpheres = [];
          // Find path from Blinky's start to player spawn
          const path = findPathAStar([9, 9], [PLAYER_SPAWN_X, PLAYER_SPAWN_Z], MAZE);
          if (path && path.length > 0) {
            for (const [x, z] of path) {
              const sphere = MeshBuilder.CreateSphere('pathSphere', { diameter: 0.5, segments: 4 }, scene);
              sphere.position.x = x * CELL_SIZE;
              sphere.position.y = 1.5;
              sphere.position.z = z * CELL_SIZE;
              const mat = new StandardMaterial('pathMat', scene);
              mat.diffuseColor = new Color3(1, 0, 0);
              sphere.material = mat;
              pathSpheres.push(sphere);
            }
          }
        }
      });
    }

    // Pointer lock for mouse look
    canvas.addEventListener("click", () => {
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
      }
    });

    // Custom collision check for WASD movement
    scene.onBeforeRenderObservable.add(() => {
      // Save current position
      const prev = playerCamera.position.clone();
      // Babylon.js handles movement and collisions, but we can add extra logic if needed
      // Clamp camera to maze bounds
      playerCamera.position.x = Math.max(0.5, Math.min(MAZE_WIDTH - 0.5, playerCamera.position.x));
      playerCamera.position.z = Math.max(0.5, Math.min(MAZE_HEIGHT - 0.5, playerCamera.position.z));
      // Prevent camera from going through walls (extra check)
      if (isWall(playerCamera.position.x, playerCamera.position.z)) {
        playerCamera.position.copyFrom(prev);
      }
      // Always keep the player on the horizontal plane
      playerCamera.position.y = PLAYER_HEIGHT;

      // Pellet collection
      for (let i = pellets.length - 1; i >= 0; i--) {
        const pellet = pellets[i];
        const distXZ = horizontalDistanceXZ(pellet.position, scene.activeCamera.position);
        if (distXZ < PELLET_COLLECTION_DIST) {
          if (pellet.isPowerPellet) {
            score += 50;
            // Trigger frightened mode
            frightenedTimer = FRIGHTENED_DURATION;
            isFrightened = true;
            for (const ghost of ghosts) ghost.setFrightened(true);
          } else {
            score += 10;
          }
          pellet.dispose();
          pellets.splice(i, 1);
          const collected = totalPellets - pellets.length;
          console.log(`Pellets collected: ${collected} / ${totalPellets}`);
          playScoreSound();
        }
      }
      // Level complete check
      if (pellets.length === 0) {
        console.log("Level complete! Score:", score);
      }

      // Portal logic: teleport player if at left/right portal
      const playerGrid = worldToGrid(playerCamera.position.x, playerCamera.position.z);
      // Left portal
      if (playerGrid[0] === PORTAL_LEFT[0] && playerGrid[1] === PORTAL_LEFT[1]) {
        if (playerCamera.position.x < (PORTAL_LEFT_WORLD[0] + 0.2)) {
          // Teleport to right portal
          playerCamera.position.x = PORTAL_RIGHT_WORLD[0] - 0.2;
          playerCamera.position.z = PORTAL_RIGHT_WORLD[1];
        }
      }
      // Right portal
      if (playerGrid[0] === PORTAL_RIGHT[0] && playerGrid[1] === PORTAL_RIGHT[1]) {
        if (playerCamera.position.x > (PORTAL_RIGHT_WORLD[0] - 0.2)) {
          // Teleport to left portal
          playerCamera.position.x = PORTAL_LEFT_WORLD[0] + 0.2;
          playerCamera.position.z = PORTAL_LEFT_WORLD[1];
        }
      }
    });

    return scene;
  };

  const scene = createScene();
  setupHUD(); // Ensure HUD is set up before render loop
  engine.runRenderLoop(() => {
    // If frightened, override state
    if (isFrightened) {
      frightenedTimer -= engine.getDeltaTime() / 1000;
      if (frightenedTimer <= 0) {
        isFrightened = false;
        for (const ghost of ghosts) ghost.setFrightened(false);
      }
    } else {
      // Ghost state machine: alternate chase/scatter
      ghostStateTimer += engine.getDeltaTime() / 1000;
      if (ghostGlobalState === 'chase' && ghostStateTimer > GHOST_STATE_DURATIONS.chase) {
        ghostGlobalState = 'scatter';
        ghostStateTimer = 0;
        for (const ghost of ghosts) ghost.state = 'scatter';
      } else if (ghostGlobalState === 'scatter' && ghostStateTimer > GHOST_STATE_DURATIONS.scatter) {
        ghostGlobalState = 'chase';
        ghostStateTimer = 0;
        for (const ghost of ghosts) ghost.state = 'chase';
      }
    }
    // Animate ghosts floating
    const time = performance.now() * 0.001;
    for (const ghost of ghosts) {
      ghost.updateFloat(time);
    }
    // Ghost house release logic
    const now = performance.now() / 1000;
    for (const ghost of ghosts) {
      if (ghost.state === 'home' && now > ghost.releaseTime) {
        ghost.state = ghostGlobalState;
      }
    }
    // Only move ghosts if pointer is locked (ghostsActive)
    if (ghostsActive && ghosts.length > 0) {
      // Blinky (ghosts[0])
      const blinky = ghosts[0];
      blinky.pathTimer = (blinky.pathTimer || 0) + engine.getDeltaTime() / 1000;
      if (blinky.pathTimer > GHOST_CONFIG.blinky.pathInterval) {
        const target = blinky.getTarget(playerCamera, ghosts);
        blinky.updatePathTo(target);
        blinky.pathTimer = 0;
      }
      blinky.moveAlongPath(engine.getDeltaTime() / 1000);
      // Pinky (ghosts[1])
      if (ghosts.length > 1) {
        const pinky = ghosts[1];
        pinky.pathTimer = (pinky.pathTimer || 0) + engine.getDeltaTime() / 1000;
        if (pinky.pathTimer > GHOST_CONFIG.pinky.pathInterval) {
          const target = pinky.getTarget(playerCamera, ghosts);
          pinky.updatePathTo(target);
          pinky.pathTimer = 0;
        }
        pinky.moveAlongPath(engine.getDeltaTime() / 1000);
      }
      // Inky (ghosts[2])
      if (ghosts.length > 2) {
        const inky = ghosts[2];
        inky.pathTimer = (inky.pathTimer || 0) + engine.getDeltaTime() / 1000;
        if (inky.pathTimer > GHOST_CONFIG.inky.pathInterval) {
          const target = inky.getTarget(playerCamera, ghosts);
          inky.updatePathTo(target);
          inky.pathTimer = 0;
        }
        inky.moveAlongPath(engine.getDeltaTime() / 1000);
      }
      // Clyde (ghosts[3])
      if (ghosts.length > 3) {
        const clyde = ghosts[3];
        clyde.pathTimer = (clyde.pathTimer || 0) + engine.getDeltaTime() / 1000;
        if (clyde.pathTimer > GHOST_CONFIG.clyde.pathInterval) {
          const target = clyde.getTarget(playerCamera, ghosts);
          clyde.updatePathTo(target);
          clyde.pathTimer = 0;
        }
        clyde.moveAlongPath(engine.getDeltaTime() / 1000);
      }
    }
    // Frightened sky color logic with blinking when ending
    if (isFrightened) {
      if (frightenedTimer < 3) {
        // Blink: alternate every 0.3s
        const blink = Math.floor(performance.now() / 300) % 2 === 0;
        const targetColor = blink ? FRIGHTENED_SKY_COLOR : defaultClearColor;
        if (!scene.clearColor.equals(targetColor)) {
          scene.clearColor.copyFrom(targetColor);
        }
      } else {
        if (!scene.clearColor.equals(FRIGHTENED_SKY_COLOR)) {
          scene.clearColor.copyFrom(FRIGHTENED_SKY_COLOR);
        }
      }
    } else {
      if (!scene.clearColor.equals(defaultClearColor)) {
        scene.clearColor.copyFrom(defaultClearColor);
      }
    }
    // Player-Ghost collision and eaten logic
    let ghostsEatenInFright = 0;
    for (const ghost of ghosts) {
      // Skip if ghost is in home or not active
      if (ghost.state === 'home') continue;
      // If ghost is eaten, update its return to house
      if (ghost.isEaten) {
        ghost.updateEaten(engine.getDeltaTime() / 1000);
        continue;
      }
      // Collision check
      const dist = horizontalDistanceXZ(ghost.position, playerCamera.position);
      if (dist < GHOST_RADIUS + 0.5) {
        if (ghost.state === 'frightened') {
          ghost.setEaten();
          ghostsEatenInFright++;
          // Score: 200, 400, 800, 1600 for consecutive ghosts
          const points = 200 * Math.pow(2, ghostsEatenInFright - 1);
          score += points;
          console.log(`Ghost eaten! +${points} points`);
        } else {
          // Player dies: respawn at random open corner
          console.log('Player caught by ghost!');
          score = 0; // Reset score on death
          const idx = Math.floor(Math.random() * PLAYER_RESPAWN_CORNERS.length);
          const [respawnX, respawnZ] = PLAYER_RESPAWN_CORNERS[idx];
          playerCamera.position.x = respawnX * CELL_SIZE;
          playerCamera.position.z = respawnZ * CELL_SIZE;
        }
      }
    }
    updateHUD();
    scene.render();
  });

  window.addEventListener("resize", () => {
    engine.resize();
  });
});
