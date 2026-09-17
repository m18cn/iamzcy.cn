import LZString from 'lz-string'
import { createDefaultData } from '../data/defaultData'

/**
 * 分享链接工具：将作品集数据压缩编码进 URL hash，实现"发送链接即可观看"
 * 数据流：编辑数据 → 差量紧凑格式（仅保留与默认模板不同的部分）→ LZString 压缩 → #/view/<payload>
 * 未修改任何内容时链接极短；图片仍完整携带
 */

/** 生成短随机 ID */
const uid = () => Math.random().toString(36).slice(2, 9)

/** JSON 深比较的快捷方式 */
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/**
 * 将完整数据转为差量紧凑格式（v2：短键 + 元组数组 + 仅含差异）
 * @param {Object} data 完整作品集数据
 * @returns {Object} 紧凑差量对象
 */
function toCompact(data) {
  const def = createDefaultData()
  const c = { v: 2 }

  /* —— 关于我 —— */
  const a = {}
  if (data.about) {
    if (data.about.hello !== def.about.hello) a.h = data.about.hello
    if (data.about.name !== def.about.name) a.n = data.about.name
    if (data.about.subtitle !== def.about.subtitle) a.s = data.about.subtitle
    if (data.about.title !== def.about.title) a.t = data.about.title
    if (data.about.bio !== def.about.bio) a.b = data.about.bio
    if (data.about.avatar) a.av = data.about.avatar
    if (data.about.nowBadge) {
      const nb = {}
      if (data.about.nowBadge.text !== def.about.nowBadge.text) nb.t = data.about.nowBadge.text
      if (data.about.nowBadge.visible === false) nb.v = 0
      if (Object.keys(nb).length) a.nw = nb
    }
    // 画廊：仅存图片地址（id 在分享侧重新生成）
    if (data.about.gallery?.length) a.g = data.about.gallery.map((g) => g.src)
    // 便签：与默认一致则省略；被清空（空数组）也需显式记录
    const noteTexts = (data.about.notes || []).map((n) => n.text)
    const defNotes = def.about.notes.map((n) => n.text)
    if (!same(noteTexts, defNotes)) a.nt = noteTexts
  }
  if (Object.keys(a).length) c.a = a

  /* —— 工作经历（元组数组 [公司, 职位, 时间, 描述]）—— */
  const expTuples = (data.experiences || []).map((e) => [e.company, e.position, e.period, e.description])
  const defExp = def.experiences.map((e) => [e.company, e.position, e.period, e.description])
  if (!same(expTuples, defExp)) c.e = expTuples

  /* —— 个人作品（元组数组 [标题, 描述, 图片[], 视频[]]）—— */
  const workTuples = (data.works || []).map((w) => [w.title, w.desc, w.images || [], w.videos || []])
  const defWorks = def.works.map((w) => [w.title, w.desc, w.images, w.videos])
  if (!same(workTuples, defWorks)) c.w = workTuples

  /* —— 个人优势（元组数组 [标签, 标题, 描述, 图标]）—— */
  const advTuples = (data.advantages || []).map((x) => [x.tag, x.title, x.desc, x.icon])
  const defAdv = def.advantages.map((x) => [x.tag, x.title, x.desc, x.icon])
  if (!same(advTuples, defAdv)) c.d = advTuples

  /* —— 联系我 —— */
  const ct = {}
  if (data.contact) {
    if (data.contact.headline !== def.contact.headline) ct.h = data.contact.headline
    if (data.contact.desc !== def.contact.desc) ct.d = data.contact.desc
    if (!same(data.contact.tags || [], def.contact.tags)) ct.t = data.contact.tags
    if (data.contact.phone !== def.contact.phone) ct.p = data.contact.phone
    if (data.contact.qrCode) ct.q = data.contact.qrCode
  }
  if (Object.keys(ct).length) c.c = ct

  /* —— 主题色 —— */
  if (data.theme?.accent && data.theme.accent !== def.theme.accent) c.ac = data.theme.accent

  return c
}

/**
 * 从差量紧凑格式还原完整数据（以默认模板为基底叠加差异）
 * @param {Object} c 紧凑差量对象
 * @returns {Object} 完整作品集数据
 */
function fromCompact(c) {
  const d = createDefaultData()

  if (c.a) {
    const a = d.about
    if (c.a.h !== undefined) a.hello = c.a.h
    if (c.a.n !== undefined) a.name = c.a.n
    if (c.a.s !== undefined) a.subtitle = c.a.s
    if (c.a.t !== undefined) a.title = c.a.t
    if (c.a.b !== undefined) a.bio = c.a.b
    if (c.a.av) a.avatar = c.a.av
    if (c.a.nw) a.nowBadge = { text: c.a.nw.t ?? a.nowBadge.text, visible: c.a.nw.v !== 0 }
    if (Array.isArray(c.a.g)) a.gallery = c.a.g.map((src) => ({ id: uid(), src }))
    if (Array.isArray(c.a.nt)) a.notes = c.a.nt.map((text) => ({ id: uid(), text }))
  }
  if (Array.isArray(c.e)) {
    d.experiences = c.e.map(([company, position, period, description]) =>
      ({ id: uid(), company, position, period, description }))
  }
  if (Array.isArray(c.w)) {
    d.works = c.w.map(([title, desc, images, videos]) =>
      ({ id: uid(), title, desc, images: images || [], videos: videos || [] }))
  }
  if (Array.isArray(c.d)) {
    d.advantages = c.d.map(([tag, title, desc, icon]) => ({ id: uid(), tag, title, desc, icon }))
  }
  if (c.c) {
    if (c.c.h !== undefined) d.contact.headline = c.c.h
    if (c.c.d !== undefined) d.contact.desc = c.c.d
    if (Array.isArray(c.c.t)) d.contact.tags = c.c.t
    if (c.c.p !== undefined) d.contact.phone = c.c.p
    if (c.c.q) d.contact.qrCode = c.c.q
  }
  if (c.ac) d.theme.accent = c.ac

  return d
}

/**
 * 将作品集数据编码为 URL 片段（差量压缩）
 * @param {Object} data 完整作品集数据
 * @returns {string} URL 安全的压缩字符串
 */
export function encodeSharePayload(data) {
  return LZString.compressToEncodedURIComponent(JSON.stringify(toCompact(data)))
}

/**
 * 解码 URL 片段为作品集数据（自动兼容 v2 差量格式与 v1 全量格式）
 * @param {string} payload 压缩字符串
 * @returns {Object|null} 解码后的数据对象，失败返回 null
 */
export function decodeSharePayload(payload) {
  try {
    const json = LZString.decompressFromEncodedURIComponent(payload)
    if (!json) return null
    const obj = JSON.parse(json)
    if (obj && obj.v === 2) return fromCompact(obj) // 新版差量格式
    return obj // 旧版全量格式
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
