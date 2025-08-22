import * as THREE from 'three'

export function makeGrassTexture() {
  const size = 32
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')

  // Solid green base
  ctx.fillStyle = '#4CAF50' // mid green
  ctx.fillRect(0, 0, size, size)

  // Border to clearly show edges
  ctx.lineWidth = 2
  ctx.strokeStyle = '#2E7D32' // darker green
  ctx.strokeRect(1, 1, size - 2, size - 2)

  // Subtle noise squares for texture
  for (let i = 0; i < 80; i++) {
    const x = (Math.random() * size) | 0
    const y = (Math.random() * size) | 0
    ctx.fillStyle = Math.random() > 0.5 ? '#43A047' : '#388E3C'
    ctx.fillRect(x, y, 1, 1)
  }

  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestMipmapNearestFilter
  tex.generateMipmaps = true
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

