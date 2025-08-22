import * as THREE from 'three'
import { VoxelWorld, heightAt } from './world.js'
import { makeGrassTexture } from './texture.js'

// Scene setup
const app = document.getElementById('app')
const overlay = document.getElementById('overlay')
const hud = document.getElementById('hud')
const debugEl = document.getElementById('debug')
const playBtn = document.getElementById('play')

const renderer = new THREE.WebGLRenderer({ antialias: false })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
renderer.shadowMap.enabled = false
app.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x7ec0ee) // sky

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500)

// Lighting
const hemi = new THREE.HemisphereLight(0xffffff, 0x666666, 0.9)
scene.add(hemi)
const dir = new THREE.DirectionalLight(0xffffff, 0.6)
dir.position.set(40, 60, 20)
scene.add(dir)

// Materials and world
const grassTex = makeGrassTexture()
const mat = new THREE.MeshLambertMaterial({ map: grassTex, transparent: false, opacity: 1, side: THREE.FrontSide })
const world = new VoxelWorld(scene, mat)
world.generate({ minX: -24, maxX: 24, minZ: -24, maxZ: 24 })

// Player state
const player = {
  position: new THREE.Vector3(0, 0, 0),
  velocity: new THREE.Vector3(0, 0, 0),
  yaw: 0,
  pitch: 0,
  onGround: false,
}

// Start above ground at center
const startH = heightAt(0, 0)
player.position.set(0.5, startH + 3, 0.5)

const PLAYER = { halfW: 0.3, halfD: 0.3, height: 1.8 }
const GRAVITY = 24
const MOVE_SPEED = 6
const SPRINT = 1.7
const JUMP_SPEED = 9
const STEP_EPS = 1e-6

// Input
const keys = new Set()
let pointerLocked = false
const sensitivity = 0.0023

document.addEventListener('keydown', (e) => {
  if (e.repeat) return
  if (e.code === 'KeyQ') actionBreak()
  if (e.code === 'KeyE') actionPlace()
  keys.add(e.code)
})
document.addEventListener('keyup', (e) => keys.delete(e.code))

renderer.domElement.addEventListener('click', () => {
  if (!pointerLocked) renderer.domElement.requestPointerLock()
})
playBtn.addEventListener('click', () => {
  renderer.domElement.requestPointerLock()
})

document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === renderer.domElement
  overlay.style.display = pointerLocked ? 'none' : 'flex'
  hud.style.opacity = pointerLocked ? '1' : '0'
})

document.addEventListener('mousemove', (e) => {
  if (!pointerLocked) return
  player.yaw -= e.movementX * sensitivity
  player.pitch -= e.movementY * sensitivity
  const limit = Math.PI / 2 - 0.01
  player.pitch = Math.max(-limit, Math.min(limit, player.pitch))
})

// Mouse buttons: 0 left, 2 right
renderer.domElement.addEventListener('mousedown', (e) => {
  if (!pointerLocked) return
  if (e.button === 0) actionBreak()
  if (e.button === 2) { e.preventDefault(); actionPlace() }
})
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault())

// Utility: AABB vs blocks
function aabbOverlapsSolid(min, max) {
  const minX = Math.floor(min.x)
  const minY = Math.floor(min.y)
  const minZ = Math.floor(min.z)
  const maxX = Math.floor(max.x - STEP_EPS)
  const maxY = Math.floor(max.y - STEP_EPS)
  const maxZ = Math.floor(max.z - STEP_EPS)
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        if (world.has(x, y, z)) return true
      }
    }
  }
  return false
}

function resolveCollisions(pos, vel, dt) {
  // Move axis-by-axis and resolve against blocks
  // X
  if (vel.x !== 0) {
    const nx = pos.x + vel.x * dt
    const min = new THREE.Vector3(nx - PLAYER.halfW, pos.y, pos.z - PLAYER.halfD)
    const max = new THREE.Vector3(nx + PLAYER.halfW, pos.y + PLAYER.height, pos.z + PLAYER.halfD)
    if (!aabbOverlapsSolid(min, max)) {
      pos.x = nx
    } else {
      vel.x = 0
    }
  }
  // Z
  if (vel.z !== 0) {
    const nz = pos.z + vel.z * dt
    const min = new THREE.Vector3(pos.x - PLAYER.halfW, pos.y, nz - PLAYER.halfD)
    const max = new THREE.Vector3(pos.x + PLAYER.halfW, pos.y + PLAYER.height, nz + PLAYER.halfD)
    if (!aabbOverlapsSolid(min, max)) {
      pos.z = nz
    } else {
      vel.z = 0
    }
  }
  // Y (gravity/jump)
  player.onGround = false
  if (vel.y !== 0) {
    const ny = pos.y + vel.y * dt
    const min = new THREE.Vector3(pos.x - PLAYER.halfW, ny, pos.z - PLAYER.halfD)
    const max = new THREE.Vector3(pos.x + PLAYER.halfW, ny + PLAYER.height, pos.z + PLAYER.halfD)
    if (!aabbOverlapsSolid(min, max)) {
      pos.y = ny
    } else {
      // Collided vertically: snap to nearest non-colliding position
      if (vel.y < 0) {
        // moving down: place feet on top of the block
        const footY = Math.floor(min.y)
        pos.y = footY + 1 + 1e-5
        player.onGround = true
      } else {
        // moving up: hit ceiling
        const headY = Math.floor(max.y)
        pos.y = headY - PLAYER.height - 1e-5
      }
      vel.y = 0
    }
  }
}

// Movement
function updateControls(dt) {
  // View quaternion
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ'))
  camera.quaternion.copy(q)
  camera.position.copy(player.position).add(new THREE.Vector3(0, PLAYER.height * 0.9, 0))

  // Direction vectors based on camera (ensure no reverse)
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
  forward.y = 0; forward.normalize()
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

  let wish = new THREE.Vector3()
  if (keys.has('KeyW')) wish.add(forward)
  if (keys.has('KeyS')) wish.addScaledVector(forward, -1)
  if (keys.has('KeyA')) wish.addScaledVector(right, -1)
  if (keys.has('KeyD')) wish.add(right)
  if (wish.lengthSq() > 0) wish.normalize()

  const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? MOVE_SPEED * SPRINT : MOVE_SPEED
  const accel = 30
  const targetVel = wish.multiplyScalar(speed)
  // Accelerate horizontally, keep y from physics
  player.velocity.x = THREE.MathUtils.lerp(player.velocity.x, targetVel.x, 1 - Math.exp(-accel * dt))
  player.velocity.z = THREE.MathUtils.lerp(player.velocity.z, targetVel.z, 1 - Math.exp(-accel * dt))

  // Gravity
  player.velocity.y -= GRAVITY * dt
  if ((keys.has('Space')) && player.onGround) {
    player.velocity.y = JUMP_SPEED
    player.onGround = false
  }

  resolveCollisions(player.position, player.velocity, dt)
}

// Actions
const raycaster = new THREE.Raycaster()
raycaster.far = 8

function centerRaycast() {
  const ndc = new THREE.Vector2(0, 0)
  raycaster.setFromCamera(ndc, camera)
  return world.intersectRay(raycaster)
}

function actionBreak() {
  const hit = centerRaycast()
  if (!hit) return
  const { x, y, z } = hit.object.userData.block
  world.remove(x, y, z)
}

function actionPlace() {
  const hit = centerRaycast()
  if (!hit) return
  const { x, y, z } = hit.object.userData.block
  const n = hit.face.normal
  const nx = x + n.x
  const ny = y + n.y
  const nz = z + n.z
  // Prevent placing inside player
  const min = new THREE.Vector3(nx, ny, nz)
  const max = new THREE.Vector3(nx + 1, ny + 1, nz + 1)
  const pmin = new THREE.Vector3(player.position.x - PLAYER.halfW, player.position.y, player.position.z - PLAYER.halfD)
  const pmax = new THREE.Vector3(player.position.x + PLAYER.halfW, player.position.y + PLAYER.height, player.position.z + PLAYER.halfD)
  const overlap = !(max.x <= pmin.x || min.x >= pmax.x || max.y <= pmin.y || min.y >= pmax.y || max.z <= pmin.z || min.z >= pmax.z)
  if (overlap) return
  world.add(nx | 0, ny | 0, nz | 0)
}

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// Loop
let last = performance.now()
function tick() {
  const now = performance.now()
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now

  updateControls(dt)

  // Debug HUD (toggle if needed)
  if (debugEl) {
    debugEl.textContent = `pos ${player.position.x.toFixed(2)}, ${player.position.y.toFixed(2)}, ${player.position.z.toFixed(2)}  ` +
      `vel ${player.velocity.x.toFixed(2)}, ${player.velocity.y.toFixed(2)}, ${player.velocity.z.toFixed(2)} ` +
      (player.onGround ? 'ground' : '')
  }

  renderer.render(scene, camera)
  requestAnimationFrame(tick)
}
tick()

