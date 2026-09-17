/**
 * 图片处理工具：File 转 base64、canvas 压缩
 */

/**
 * 读取文件为 dataURL (base64) 字符串
 * @param {File} file 用户上传的文件对象
 * @returns {Promise<string>} base64 dataURL
 */
export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 将图片压缩到指定最大宽度并输出 JPEG base64（大幅减小体积，便于存储与分享）
 * @param {string} dataURL 原始图片 base64
 * @param {number} maxWidth 最大宽度（像素），默认 900
 * @param {number} quality JPEG 质量 0~1，默认 0.72
 * @returns {Promise<string>} 压缩后的 base64 dataURL
 */
export function compressImage(dataURL, maxWidth = 900, quality = 0.72) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      // 小图无需放大，按原始尺寸计算缩放比
      const scale = Math.min(1, maxWidth / img.width)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      // 白底填充，避免 PNG 透明通道转 JPEG 后变黑
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => resolve(dataURL) // 压缩失败时降级返回原图
    img.src = dataURL
  })
}

/**
 * 批量处理上传的图片文件：读取 + 压缩
 * @param {FileList|File[]} files 文件列表
 * @param {Object} opts 压缩参数 { maxWidth, quality }
 * @returns {Promise<string[]>} 压缩后的 base64 数组
 */
export async function processImageFiles(files, opts = {}) {
  const { maxWidth = 900, quality = 0.72 } = opts
  const results = []
  for (const file of Array.from(files)) {
    if (!file.type.startsWith('image/')) continue // 仅处理图片
    const dataURL = await readFileAsDataURL(file)
    results.push(await compressImage(dataURL, maxWidth, quality))
  }
  return results
}

/**
 * 读取视频文件为 base64（视频不做压缩转码，仅限制体积）
 * @param {File} file 视频文件
 * @returns {Promise<string|null>} base64 或 null（类型不符时）
 */
export async function processVideoFile(file) {
  if (!file.type.startsWith('video/')) return null
  return readFileAsDataURL(file)
}
