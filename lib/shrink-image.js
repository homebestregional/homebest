'use client'

// Shrinks a phone photo to at most 1200px before upload. Stock photos are
// proof of what is on the shelf, not product pictures, so they can be smaller
// than shop photos. Smaller uploads matter on shop mobile data.
export async function shrinkPhoto(file, maxSide = 1200) {
  if (!file?.type?.startsWith('image/')) throw new Error('Choose a photo file.')
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const webp = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82))
  if (webp) return new File([webp], 'photo.webp', { type: 'image/webp' })
  const jpg = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
  return new File([jpg], 'photo.jpg', { type: 'image/jpeg' })
}
