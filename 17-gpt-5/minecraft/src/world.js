import * as THREE from 'three'

// Simple hilly height function without external noise deps
export function heightAt(x, z) {
  // Gentle rolling hills using sines; deterministic and fast
  const s = Math.sin(x * 0.15) * 0.5 + Math.cos(z * 0.17) * 0.5
  const s2 = Math.sin((x + z) * 0.07) * 0.5
  const base = 10
  const amp = 4
  return Math.floor(base + amp * (s + s2))
}

export class VoxelWorld {
  constructor(scene, material) {
    this.scene = scene
    this.material = material
    this.blockGeometry = new THREE.BoxGeometry(1, 1, 1)
    this.blocks = new Map() // key -> Mesh
  }

  key(x, y, z) { return `${x},${y},${z}` }

  has(x, y, z) { return this.blocks.has(this.key(x, y, z)) }

  add(x, y, z) {
    const k = this.key(x, y, z)
    if (this.blocks.has(k)) return
    const mesh = new THREE.Mesh(this.blockGeometry, this.material)
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5)
    mesh.castShadow = false
    mesh.receiveShadow = true
    mesh.userData.block = { x, y, z }
    this.scene.add(mesh)
    this.blocks.set(k, mesh)
  }

  remove(x, y, z) {
    const k = this.key(x, y, z)
    const mesh = this.blocks.get(k)
    if (!mesh) return
    this.scene.remove(mesh)
    // material is shared
    this.blocks.delete(k)
  }

  // Generate a finite world region
  generate({ minX = -24, maxX = 24, minZ = -24, maxZ = 24 } = {}) {
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        const h = heightAt(x, z)
        const top = Math.max(1, h)
        for (let y = 0; y < top; y++) {
          this.add(x, y, z)
        }
      }
    }
  }

  // Raycast using Three's Raycaster against individual block meshes (fine for small worlds)
  intersectRay(raycaster) {
    const objs = Array.from(this.blocks.values())
    const hits = raycaster.intersectObjects(objs, false)
    return hits[0] || null
  }
}
