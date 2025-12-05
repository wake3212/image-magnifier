// StackBlur - fast, almost Gaussian blur
// Based on Mario Klingemann's algorithm - O(n) complexity regardless of radius
// Uses pre-computed lookup tables to avoid division operations

const mulTable = [
  512, 512, 456, 512, 328, 456, 335, 512, 405, 328, 271, 456, 388, 335, 292, 512, 454, 405, 364, 328, 298, 271, 496,
  456, 420, 388, 360, 335, 312, 292, 273, 512, 482, 454, 428, 405, 383, 364, 345, 328, 312, 298, 284, 271, 259, 496,
  475, 456, 437, 420, 404, 388, 374, 360, 347, 335, 323, 312, 302, 292, 282, 273, 265, 512, 497, 482, 468, 454, 441,
  428, 417, 405, 394, 383, 373, 364, 354, 345, 337, 328, 320, 312, 305, 298, 291, 284, 278, 271, 265, 259, 507, 496,
  485, 475, 465, 456, 446, 437, 428, 420, 412, 404, 396, 388, 381, 374, 367, 360, 354, 347, 341, 335, 329, 323, 318,
  312, 307, 302, 297, 292, 287, 282, 278, 273, 269, 265, 261, 512, 505, 497, 489, 482, 475, 468, 461, 454, 447, 441,
  435, 428, 422, 417, 411, 405, 399, 394, 389, 383, 378, 373, 368, 364, 359, 354, 350, 345, 341, 337, 332, 328, 324,
  320, 316, 312, 309, 305, 301, 298, 294, 291, 287, 284, 281, 278, 274, 271, 268, 265, 262, 259, 257, 507, 501, 496,
  491, 485, 480, 475, 470, 465, 460, 456, 451, 446, 442, 437, 433, 428, 424, 420, 416, 412, 408, 404, 400, 396, 392,
  388, 385, 381, 377, 374, 370, 367, 363, 360, 357, 354, 350, 347, 344, 341, 338, 335, 332, 329, 326, 323, 320, 318,
  315, 312, 310, 307, 304, 302, 299, 297, 294, 292, 289, 287, 285, 282, 280, 278, 275, 273, 271, 269, 267, 265, 263,
  261, 259,
]

const shgTable = [
  9, 11, 12, 13, 13, 14, 14, 15, 15, 15, 15, 16, 16, 16, 16, 17, 17, 17, 17, 17, 17, 17, 18, 18, 18, 18, 18, 18, 18, 18,
  18, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20,
  20, 20, 20, 20, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21,
  21, 21, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22,
  22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
  23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
  23, 23, 23, 23, 23, 23, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
  24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
  24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
]

export function stackBlurCanvas(
  canvas: HTMLCanvasElement,
  topX: number,
  topY: number,
  width: number,
  height: number,
  radius: number,
) {
  if (isNaN(radius) || radius < 1) return
  radius = Math.round(radius)
  if (radius > 254) radius = 254

  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return

  let imageData: ImageData
  try {
    imageData = ctx.getImageData(topX, topY, width, height)
  } catch {
    return
  }

  const pixels = imageData.data
  if (pixels.length === 0) return

  const wm = width - 1
  const hm = height - 1
  const rad1 = radius + 1
  const divSum = (radius + rad1) * rad1

  const mulSum = mulTable[radius]
  const shgSum = shgTable[radius]

  // Pre-allocate typed arrays for better performance
  const rSum = new Int32Array(width * height)
  const gSum = new Int32Array(width * height)
  const bSum = new Int32Array(width * height)
  const aSum = new Int32Array(width * height)

  const rOutSum = new Int32Array(width)
  const gOutSum = new Int32Array(width)
  const bOutSum = new Int32Array(width)
  const aOutSum = new Int32Array(width)

  const rInSum = new Int32Array(width)
  const gInSum = new Int32Array(width)
  const bInSum = new Int32Array(width)
  const aInSum = new Int32Array(width)

  // Stack for each position
  const stackSize = divSum
  const rStack = new Int32Array(stackSize)
  const gStack = new Int32Array(stackSize)
  const bStack = new Int32Array(stackSize)
  const aStack = new Int32Array(stackSize)

  let stackPointer: number
  let stackStart: number
  let yi = 0
  const yw = 0
  let p: number
  let pr: number
  let pg: number
  let pb: number
  let pa: number

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    let rSumVal = 0,
      gSumVal = 0,
      bSumVal = 0,
      aSumVal = 0
    let rOutSumVal = 0,
      gOutSumVal = 0,
      bOutSumVal = 0,
      aOutSumVal = 0
    let rInSumVal = 0,
      gInSumVal = 0,
      bInSumVal = 0,
      aInSumVal = 0

    // Initialize stack with left edge pixel repeated
    pr = pixels[yi]
    pg = pixels[yi + 1]
    pb = pixels[yi + 2]
    pa = pixels[yi + 3]

    for (let i = 0; i <= radius; i++) {
      const stackIdx = i
      rStack[stackIdx] = pr
      gStack[stackIdx] = pg
      bStack[stackIdx] = pb
      aStack[stackIdx] = pa

      const weight = rad1 - i
      rSumVal += pr * weight
      gSumVal += pg * weight
      bSumVal += pb * weight
      aSumVal += pa * weight

      if (i > 0) {
        rOutSumVal += pr
        gOutSumVal += pg
        bOutSumVal += pb
        aOutSumVal += pa
      }
    }

    for (let i = 1; i <= radius; i++) {
      const srcIdx = yi + Math.min(i, wm) * 4
      pr = pixels[srcIdx]
      pg = pixels[srcIdx + 1]
      pb = pixels[srcIdx + 2]
      pa = pixels[srcIdx + 3]

      const stackIdx = i + radius
      rStack[stackIdx] = pr
      gStack[stackIdx] = pg
      bStack[stackIdx] = pb
      aStack[stackIdx] = pa

      rSumVal += pr * (rad1 - i)
      gSumVal += pg * (rad1 - i)
      bSumVal += pb * (rad1 - i)
      aSumVal += pa * (rad1 - i)

      rInSumVal += pr
      gInSumVal += pg
      bInSumVal += pb
      aInSumVal += pa
    }

    stackPointer = radius

    for (let x = 0; x < width; x++) {
      const idx = yi + x * 4
      pixels[idx] = (rSumVal * mulSum) >>> shgSum
      pixels[idx + 1] = (gSumVal * mulSum) >>> shgSum
      pixels[idx + 2] = (bSumVal * mulSum) >>> shgSum
      pixels[idx + 3] = (aSumVal * mulSum) >>> shgSum

      rSumVal -= rOutSumVal
      gSumVal -= gOutSumVal
      bSumVal -= bOutSumVal
      aSumVal -= aOutSumVal

      stackStart = stackPointer - radius + divSum - 1
      if (stackStart >= divSum) stackStart -= divSum
      const outStackIdx = stackStart % (radius * 2 + 1)

      rOutSumVal -= rStack[outStackIdx]
      gOutSumVal -= gStack[outStackIdx]
      bOutSumVal -= bStack[outStackIdx]
      aOutSumVal -= aStack[outStackIdx]

      const srcX = x + radius + 1
      const srcIdx = yi + Math.min(srcX, wm) * 4
      pr = pixels[srcIdx]
      pg = pixels[srcIdx + 1]
      pb = pixels[srcIdx + 2]
      pa = pixels[srcIdx + 3]

      rStack[outStackIdx] = pr
      gStack[outStackIdx] = pg
      bStack[outStackIdx] = pb
      aStack[outStackIdx] = pa

      rInSumVal += pr
      gInSumVal += pg
      bInSumVal += pb
      aInSumVal += pa

      rSumVal += rInSumVal
      gSumVal += gInSumVal
      bSumVal += bInSumVal
      aSumVal += aInSumVal

      stackPointer = (stackPointer + 1) % (radius * 2 + 1)
      const inStackIdx = stackPointer % (radius * 2 + 1)

      rOutSumVal += rStack[inStackIdx]
      gOutSumVal += gStack[inStackIdx]
      bOutSumVal += bStack[inStackIdx]
      aOutSumVal += aStack[inStackIdx]

      rInSumVal -= rStack[inStackIdx]
      gInSumVal -= gStack[inStackIdx]
      bInSumVal -= bStack[inStackIdx]
      aInSumVal -= aStack[inStackIdx]
    }

    yi += width * 4
  }

  // Vertical pass
  for (let x = 0; x < width; x++) {
    let rSumVal = 0,
      gSumVal = 0,
      bSumVal = 0,
      aSumVal = 0
    let rOutSumVal = 0,
      gOutSumVal = 0,
      bOutSumVal = 0,
      aOutSumVal = 0
    let rInSumVal = 0,
      gInSumVal = 0,
      bInSumVal = 0,
      aInSumVal = 0

    let yp = x * 4
    pr = pixels[yp]
    pg = pixels[yp + 1]
    pb = pixels[yp + 2]
    pa = pixels[yp + 3]

    for (let i = 0; i <= radius; i++) {
      const stackIdx = i
      rStack[stackIdx] = pr
      gStack[stackIdx] = pg
      bStack[stackIdx] = pb
      aStack[stackIdx] = pa

      const weight = rad1 - i
      rSumVal += pr * weight
      gSumVal += pg * weight
      bSumVal += pb * weight
      aSumVal += pa * weight

      if (i > 0) {
        rOutSumVal += pr
        gOutSumVal += pg
        bOutSumVal += pb
        aOutSumVal += pa
      }
    }

    for (let i = 1; i <= radius; i++) {
      const srcY = Math.min(i, hm)
      const srcIdx = (srcY * width + x) * 4
      pr = pixels[srcIdx]
      pg = pixels[srcIdx + 1]
      pb = pixels[srcIdx + 2]
      pa = pixels[srcIdx + 3]

      const stackIdx = i + radius
      rStack[stackIdx] = pr
      gStack[stackIdx] = pg
      bStack[stackIdx] = pb
      aStack[stackIdx] = pa

      rSumVal += pr * (rad1 - i)
      gSumVal += pg * (rad1 - i)
      bSumVal += pb * (rad1 - i)
      aSumVal += pa * (rad1 - i)

      rInSumVal += pr
      gInSumVal += pg
      bInSumVal += pb
      aInSumVal += pa
    }

    stackPointer = radius
    yp = x

    for (let y = 0; y < height; y++) {
      const idx = (y * width + x) * 4
      pixels[idx] = (rSumVal * mulSum) >>> shgSum
      pixels[idx + 1] = (gSumVal * mulSum) >>> shgSum
      pixels[idx + 2] = (bSumVal * mulSum) >>> shgSum
      pixels[idx + 3] = (aSumVal * mulSum) >>> shgSum

      rSumVal -= rOutSumVal
      gSumVal -= gOutSumVal
      bSumVal -= bOutSumVal
      aSumVal -= aOutSumVal

      stackStart = stackPointer - radius + divSum - 1
      if (stackStart >= divSum) stackStart -= divSum
      const outStackIdx = stackStart % (radius * 2 + 1)

      rOutSumVal -= rStack[outStackIdx]
      gOutSumVal -= gStack[outStackIdx]
      bOutSumVal -= bStack[outStackIdx]
      aOutSumVal -= aStack[outStackIdx]

      const srcY = y + radius + 1
      const srcIdx = (Math.min(srcY, hm) * width + x) * 4
      pr = pixels[srcIdx]
      pg = pixels[srcIdx + 1]
      pb = pixels[srcIdx + 2]
      pa = pixels[srcIdx + 3]

      rStack[outStackIdx] = pr
      gStack[outStackIdx] = pg
      bStack[outStackIdx] = pb
      aStack[outStackIdx] = pa

      rInSumVal += pr
      gInSumVal += pg
      bInSumVal += pb
      aInSumVal += pa

      rSumVal += rInSumVal
      gSumVal += gInSumVal
      bSumVal += bInSumVal
      aSumVal += aInSumVal

      stackPointer = (stackPointer + 1) % (radius * 2 + 1)
      const inStackIdx = stackPointer % (radius * 2 + 1)

      rOutSumVal += rStack[inStackIdx]
      gOutSumVal += gStack[inStackIdx]
      bOutSumVal += bStack[inStackIdx]
      aOutSumVal += aStack[inStackIdx]

      rInSumVal -= rStack[inStackIdx]
      gInSumVal -= gStack[inStackIdx]
      bInSumVal -= bStack[inStackIdx]
      aInSumVal -= aStack[inStackIdx]
    }
  }

  ctx.putImageData(imageData, topX, topY)
}
