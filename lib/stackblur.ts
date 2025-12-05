// Gaussian Blur - smooth, high-quality blur for Safari compatibility
// Uses separable Gaussian convolution (horizontal + vertical passes)

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
  if (radius > 100) radius = 100 // Cap for performance

  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return

  let imageData: ImageData
  try {
    imageData = ctx.getImageData(topX, topY, width, height)
  } catch {
    return
  }

  const pixels = imageData.data

  // Verify we have valid pixel data
  if (pixels.length === 0) return

  // Generate Gaussian kernel
  const kernel = makeGaussianKernel(radius)

  // Create buffers for processing - use regular arrays for better compatibility
  const len = width * height * 4
  const src = new Array(len)
  const dst = new Array(len)

  // Copy to float buffer for precision
  for (let i = 0; i < len; i++) {
    src[i] = pixels[i]
  }

  // Horizontal pass
  gaussianH(src, dst, width, height, kernel, radius)
  // Vertical pass
  gaussianV(dst, src, width, height, kernel, radius)

  // Copy back to pixel data
  for (let i = 0; i < len; i++) {
    pixels[i] = Math.round(Math.max(0, Math.min(255, src[i])))
  }

  ctx.putImageData(imageData, topX, topY)
}

function makeGaussianKernel(radius: number): number[] {
  const size = radius * 2 + 1
  const kernel: number[] = new Array(size)
  const sigma = Math.max(radius / 2, 1) // Adjusted sigma for smoother blur
  const sigma2 = 2 * sigma * sigma

  let sum = 0
  for (let i = 0; i < size; i++) {
    const x = i - radius
    kernel[i] = Math.exp(-(x * x) / sigma2)
    sum += kernel[i]
  }

  // Normalize kernel
  for (let i = 0; i < size; i++) {
    kernel[i] /= sum
  }

  return kernel
}

function gaussianH(src: number[], dst: number[], width: number, height: number, kernel: number[], radius: number) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0

      for (let k = -radius; k <= radius; k++) {
        const sx = Math.min(Math.max(x + k, 0), width - 1)
        const idx = (y * width + sx) * 4
        const weight = kernel[k + radius]

        r += src[idx] * weight
        g += src[idx + 1] * weight
        b += src[idx + 2] * weight
        a += src[idx + 3] * weight
      }

      const dstIdx = (y * width + x) * 4
      dst[dstIdx] = r
      dst[dstIdx + 1] = g
      dst[dstIdx + 2] = b
      dst[dstIdx + 3] = a
    }
  }
}

function gaussianV(src: number[], dst: number[], width: number, height: number, kernel: number[], radius: number) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0

      for (let k = -radius; k <= radius; k++) {
        const sy = Math.min(Math.max(y + k, 0), height - 1)
        const idx = (sy * width + x) * 4
        const weight = kernel[k + radius]

        r += src[idx] * weight
        g += src[idx + 1] * weight
        b += src[idx + 2] * weight
        a += src[idx + 3] * weight
      }

      const dstIdx = (y * width + x) * 4
      dst[dstIdx] = r
      dst[dstIdx + 1] = g
      dst[dstIdx + 2] = b
      dst[dstIdx + 3] = a
    }
  }
}
