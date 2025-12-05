// StackBlur - a fast almost Gaussian Blur
// Based on Mario Klingemann's StackBlur algorithm
// Safari-compatible implementation that doesn't rely on ctx.filter

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

  const ctx = canvas.getContext("2d")
  if (!ctx) return

  let imageData: ImageData
  try {
    imageData = ctx.getImageData(topX, topY, width, height)
  } catch {
    return
  }

  const pixels = imageData.data

  const div = 2 * radius + 1
  const widthMinus1 = width - 1
  const heightMinus1 = height - 1
  const radiusPlus1 = radius + 1
  const sumFactor = (radiusPlus1 * (radiusPlus1 + 1)) / 2

  const stackStart = new BlurStack()
  let stack = stackStart
  for (let i = 1; i < div; i++) {
    stack = stack.next = new BlurStack()
    if (i === radiusPlus1) var stackEnd = stack
  }
  stack.next = stackStart

  let stackIn: BlurStack | null = null
  let stackOut: BlurStack | null = null

  const mulSum = mulTable[radius]
  const shgSum = shgTable[radius]

  let p: number
  let rSum: number
  let gSum: number
  let bSum: number
  let aSum: number
  let rOutSum: number
  let gOutSum: number
  let bOutSum: number
  let aOutSum: number
  let rInSum: number
  let gInSum: number
  let bInSum: number
  let aInSum: number

  let yi = 0

  for (let y = 0; y < height; y++) {
    rInSum = gInSum = bInSum = aInSum = rSum = gSum = bSum = aSum = 0
    rOutSum = radiusPlus1 * (p = pixels[yi])
    gOutSum = radiusPlus1 * (p = pixels[yi + 1])
    bOutSum = radiusPlus1 * (p = pixels[yi + 2])
    aOutSum = radiusPlus1 * (p = pixels[yi + 3])

    rSum += sumFactor * pixels[yi]
    gSum += sumFactor * pixels[yi + 1]
    bSum += sumFactor * pixels[yi + 2]
    aSum += sumFactor * pixels[yi + 3]

    stack = stackStart

    for (let i = 0; i < radiusPlus1; i++) {
      stack.r = pixels[yi]
      stack.g = pixels[yi + 1]
      stack.b = pixels[yi + 2]
      stack.a = pixels[yi + 3]
      stack = stack.next!
    }

    for (let i = 1; i < radiusPlus1; i++) {
      p = yi + ((widthMinus1 < i ? widthMinus1 : i) << 2)
      rSum += (stack.r = pixels[p]) * (radiusPlus1 - i)
      gSum += (stack.g = pixels[p + 1]) * (radiusPlus1 - i)
      bSum += (stack.b = pixels[p + 2]) * (radiusPlus1 - i)
      aSum += (stack.a = pixels[p + 3]) * (radiusPlus1 - i)
      rInSum += stack.r
      gInSum += stack.g
      bInSum += stack.b
      aInSum += stack.a
      stack = stack.next!
    }

    stackIn = stackStart
    stackOut = stackEnd!

    for (let x = 0; x < width; x++) {
      pixels[yi + 3] = aSum = (aSum * mulSum) >>> shgSum
      if (aSum !== 0) {
        pixels[yi] = (rSum * mulSum) >>> shgSum
        pixels[yi + 1] = (gSum * mulSum) >>> shgSum
        pixels[yi + 2] = (bSum * mulSum) >>> shgSum
      } else {
        pixels[yi] = pixels[yi + 1] = pixels[yi + 2] = 0
      }

      rSum -= rOutSum
      gSum -= gOutSum
      bSum -= bOutSum
      aSum -= aOutSum

      rOutSum -= stackIn!.r
      gOutSum -= stackIn!.g
      bOutSum -= stackIn!.b
      aOutSum -= stackIn!.a

      p = x + radius + 1
      p = yi + (p < widthMinus1 ? p : widthMinus1) * 4

      rInSum += stackIn!.r = pixels[p]
      gInSum += stackIn!.g = pixels[p + 1]
      bInSum += stackIn!.b = pixels[p + 2]
      aInSum += stackIn!.a = pixels[p + 3]

      rSum += rInSum
      gSum += gInSum
      bSum += bInSum
      aSum += aInSum

      stackIn = stackIn!.next

      rOutSum += stackOut!.r
      gOutSum += stackOut!.g
      bOutSum += stackOut!.b
      aOutSum += stackOut!.a

      rInSum -= stackOut!.r
      gInSum -= stackOut!.g
      bInSum -= stackOut!.b
      aInSum -= stackOut!.a

      stackOut = stackOut!.next

      yi += 4
    }
  }

  for (let x = 0; x < width; x++) {
    rInSum = gInSum = bInSum = aInSum = rSum = gSum = bSum = aSum = 0

    yi = x << 2
    rOutSum = radiusPlus1 * (p = pixels[yi])
    gOutSum = radiusPlus1 * (p = pixels[yi + 1])
    bOutSum = radiusPlus1 * (p = pixels[yi + 2])
    aOutSum = radiusPlus1 * (p = pixels[yi + 3])

    rSum += sumFactor * pixels[yi]
    gSum += sumFactor * pixels[yi + 1]
    bSum += sumFactor * pixels[yi + 2]
    aSum += sumFactor * pixels[yi + 3]

    stack = stackStart

    for (let i = 0; i < radiusPlus1; i++) {
      stack.r = pixels[yi]
      stack.g = pixels[yi + 1]
      stack.b = pixels[yi + 2]
      stack.a = pixels[yi + 3]
      stack = stack.next!
    }

    let yp = width

    for (let i = 1; i <= radius; i++) {
      yi = (yp + x) << 2
      if (i < heightMinus1) yp += width

      rSum += (stack.r = pixels[yi]) * (radiusPlus1 - i)
      gSum += (stack.g = pixels[yi + 1]) * (radiusPlus1 - i)
      bSum += (stack.b = pixels[yi + 2]) * (radiusPlus1 - i)
      aSum += (stack.a = pixels[yi + 3]) * (radiusPlus1 - i)

      rInSum += stack.r
      gInSum += stack.g
      bInSum += stack.b
      aInSum += stack.a

      stack = stack.next!
    }

    yi = x
    stackIn = stackStart
    stackOut = stackEnd!

    for (let y = 0; y < height; y++) {
      p = yi << 2
      pixels[p + 3] = aSum = (aSum * mulSum) >>> shgSum
      if (aSum > 0) {
        pixels[p] = (rSum * mulSum) >>> shgSum
        pixels[p + 1] = (gSum * mulSum) >>> shgSum
        pixels[p + 2] = (bSum * mulSum) >>> shgSum
      } else {
        pixels[p] = pixels[p + 1] = pixels[p + 2] = 0
      }

      rSum -= rOutSum
      gSum -= gOutSum
      bSum -= bOutSum
      aSum -= aOutSum

      rOutSum -= stackIn!.r
      gOutSum -= stackIn!.g
      bOutSum -= stackIn!.b
      aOutSum -= stackIn!.a

      p = y + radiusPlus1
      p = (x + (p < heightMinus1 ? p : heightMinus1) * width) << 2

      rSum += rInSum += stackIn!.r = pixels[p]
      gSum += gInSum += stackIn!.g = pixels[p + 1]
      bSum += bInSum += stackIn!.b = pixels[p + 2]
      aSum += aInSum += stackIn!.a = pixels[p + 3]

      stackIn = stackIn!.next

      rOutSum += stackOut!.r
      gOutSum += stackOut!.g
      bOutSum += stackOut!.b
      aOutSum += stackOut!.a

      rInSum -= stackOut!.r
      gInSum -= stackOut!.g
      bInSum -= stackOut!.b
      aInSum -= stackOut!.a

      stackOut = stackOut!.next

      yi += width
    }
  }

  ctx.putImageData(imageData, topX, topY)
}

class BlurStack {
  r = 0
  g = 0
  b = 0
  a = 0
  next: BlurStack | null = null
}

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
