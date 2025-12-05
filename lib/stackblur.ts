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
  console.log("[v0] stackBlurCanvas called:", { topX, topY, width, height, radius })

  if (isNaN(radius) || radius < 1) {
    console.log("[v0] stackBlurCanvas early return - invalid radius")
    return
  }
  radius = Math.round(radius)

  if (radius > 254) {
    console.log("[v0] capping radius from", radius, "to 254")
    radius = 254
  }

  const ctx = canvas.getContext("2d")
  if (!ctx) {
    console.log("[v0] stackBlurCanvas early return - no context")
    return
  }

  let imageData: ImageData
  try {
    imageData = ctx.getImageData(topX, topY, width, height)
    console.log("[v0] got imageData:", imageData.width, "x", imageData.height, "pixels:", imageData.data.length)
    console.log(
      "[v0] sample pixels before blur:",
      imageData.data[0],
      imageData.data[1],
      imageData.data[2],
      imageData.data[3],
    )
  } catch (e) {
    console.log("[v0] stackBlurCanvas getImageData error:", e)
    return
  }

  const pixels = imageData.data
  const pixelsCopy = new Uint8ClampedArray(pixels)

  // Three passes of box blur approximates Gaussian blur
  for (let pass = 0; pass < 3; pass++) {
    // Horizontal pass
    boxBlurH(pixelsCopy, pixels, width, height, radius)
    // Vertical pass
    boxBlurV(pixels, pixelsCopy, width, height, radius)
  }

  // Copy final result back
  for (let i = 0; i < pixels.length; i++) {
    pixels[i] = pixelsCopy[i]
  }

  ctx.putImageData(imageData, topX, topY)

  console.log("[v0] stackBlur complete, sample pixels after:", pixels[0], pixels[1], pixels[2], pixels[3])
}

function boxBlurH(src: Uint8ClampedArray, dst: Uint8ClampedArray, width: number, height: number, radius: number) {
  const iarr = 1 / (radius + radius + 1)
  for (let i = 0; i < height; i++) {
    let ti = i * width * 4
    let li = ti
    let ri = ti + radius * 4

    const fvR = src[ti]
    const fvG = src[ti + 1]
    const fvB = src[ti + 2]
    const fvA = src[ti + 3]

    const lvR = src[ti + (width - 1) * 4]
    const lvG = src[ti + (width - 1) * 4 + 1]
    const lvB = src[ti + (width - 1) * 4 + 2]
    const lvA = src[ti + (width - 1) * 4 + 3]

    let valR = (radius + 1) * fvR
    let valG = (radius + 1) * fvG
    let valB = (radius + 1) * fvB
    let valA = (radius + 1) * fvA

    for (let j = 0; j < radius; j++) {
      const idx = ti + Math.min(j, width - 1) * 4
      valR += src[idx]
      valG += src[idx + 1]
      valB += src[idx + 2]
      valA += src[idx + 3]
    }

    for (let j = 0; j <= radius; j++) {
      const ridx = Math.min(j + radius, width - 1) * 4 + i * width * 4
      valR += src[ridx] - fvR
      valG += src[ridx + 1] - fvG
      valB += src[ridx + 2] - fvB
      valA += src[ridx + 3] - fvA

      dst[ti] = Math.round(valR * iarr)
      dst[ti + 1] = Math.round(valG * iarr)
      dst[ti + 2] = Math.round(valB * iarr)
      dst[ti + 3] = Math.round(valA * iarr)
      ti += 4
    }

    for (let j = radius + 1; j < width - radius; j++) {
      valR += src[ri] - src[li]
      valG += src[ri + 1] - src[li + 1]
      valB += src[ri + 2] - src[li + 2]
      valA += src[ri + 3] - src[li + 3]

      dst[ti] = Math.round(valR * iarr)
      dst[ti + 1] = Math.round(valG * iarr)
      dst[ti + 2] = Math.round(valB * iarr)
      dst[ti + 3] = Math.round(valA * iarr)

      ri += 4
      li += 4
      ti += 4
    }

    for (let j = width - radius; j < width; j++) {
      valR += lvR - src[li]
      valG += lvG - src[li + 1]
      valB += lvB - src[li + 2]
      valA += lvA - src[li + 3]

      dst[ti] = Math.round(valR * iarr)
      dst[ti + 1] = Math.round(valG * iarr)
      dst[ti + 2] = Math.round(valB * iarr)
      dst[ti + 3] = Math.round(valA * iarr)

      li += 4
      ti += 4
    }
  }
}

function boxBlurV(src: Uint8ClampedArray, dst: Uint8ClampedArray, width: number, height: number, radius: number) {
  const iarr = 1 / (radius + radius + 1)
  const w4 = width * 4

  for (let i = 0; i < width; i++) {
    let ti = i * 4
    let li = ti
    let ri = ti + radius * w4

    const fvR = src[ti]
    const fvG = src[ti + 1]
    const fvB = src[ti + 2]
    const fvA = src[ti + 3]

    const lvR = src[ti + (height - 1) * w4]
    const lvG = src[ti + (height - 1) * w4 + 1]
    const lvB = src[ti + (height - 1) * w4 + 2]
    const lvA = src[ti + (height - 1) * w4 + 3]

    let valR = (radius + 1) * fvR
    let valG = (radius + 1) * fvG
    let valB = (radius + 1) * fvB
    let valA = (radius + 1) * fvA

    for (let j = 0; j < radius; j++) {
      const idx = ti + Math.min(j, height - 1) * w4
      valR += src[idx]
      valG += src[idx + 1]
      valB += src[idx + 2]
      valA += src[idx + 3]
    }

    for (let j = 0; j <= radius; j++) {
      const ridx = i * 4 + Math.min(j + radius, height - 1) * w4
      valR += src[ridx] - fvR
      valG += src[ridx + 1] - fvG
      valB += src[ridx + 2] - fvB
      valA += src[ridx + 3] - fvA

      dst[ti] = Math.round(valR * iarr)
      dst[ti + 1] = Math.round(valG * iarr)
      dst[ti + 2] = Math.round(valB * iarr)
      dst[ti + 3] = Math.round(valA * iarr)
      ti += w4
    }

    for (let j = radius + 1; j < height - radius; j++) {
      valR += src[ri] - src[li]
      valG += src[ri + 1] - src[li + 1]
      valB += src[ri + 2] - src[li + 2]
      valA += src[ri + 3] - src[li + 3]

      dst[ti] = Math.round(valR * iarr)
      dst[ti + 1] = Math.round(valG * iarr)
      dst[ti + 2] = Math.round(valB * iarr)
      dst[ti + 3] = Math.round(valA * iarr)

      ri += w4
      li += w4
      ti += w4
    }

    for (let j = height - radius; j < height; j++) {
      valR += lvR - src[li]
      valG += lvG - src[li + 1]
      valB += lvB - src[li + 2]
      valA += lvA - src[li + 3]

      dst[ti] = Math.round(valR * iarr)
      dst[ti + 1] = Math.round(valG * iarr)
      dst[ti + 2] = Math.round(valB * iarr)
      dst[ti + 3] = Math.round(valA * iarr)

      li += w4
      ti += w4
    }
  }
}
