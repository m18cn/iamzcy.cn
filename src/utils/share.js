import LZString from 'lz-string'

/**
 * 分享链接工具：将作品集数据压缩编码进 URL hash，实现"发送链接即可观看"
 * 数据流：编辑数据 → JSON → LZString 压缩 → URL 安全编码 → #/view/<payload>
 */

/**
 * 将作品集数据编码为 URL 片段
 * @param {Object} data 完整作品集数据
 * @returns {string} URL 安全的压缩字符串
 */
export function encodeSharePayload(data) {
  const json = JSON.stringify(data)
  return LZString.compressToEncodedURIComponent(json)
}

/**
 * 解码 URL 片段为作品集数据
 * @param {string} payload 压缩字符串
 * @returns {Object|null} 解码后的数据对象，失败返回 null
 */
export function decodeSharePayload(payload) {
  try {
    const json = LZString.decompressFromEncodedURIComponent(payload)
    if (!json) return null
    return JSON.parse(json)
  } catch {
    return null
  }
}

/**
 * 生成完整的分享预览链接
 * @param {Object} data 完整作品集数据
 * @param {string} origin 当前站点地址（默认 location.origin + base 路径）
 * @returns {string} 可直接发送给他人的链接
 */
export function buildShareUrl(data, origin) {
  const base = origin || window.location.href.split('#')[0]
  const payload = encodeSharePayload(data)
  return `${base}#/view/${payload}`
}

/**
 * 从当前页面地址中解析分享数据（若存在）
 * @returns {Object|null} 分享数据或 null
 */
export function readShareFromLocation() {
  const hash = window.location.hash || ''
  const match = hash.match(/^#\/view\/(.+)$/)
  if (!match) return null
  return decodeSharePayload(match[1])
}

/**
 * 复制文本到剪贴板（带降级方案）
 * @param {string} text 要复制的文本
 * @returns {Promise<boolean>} 是否复制成功
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // 降级：使用旧版 execCommand
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  }
}
