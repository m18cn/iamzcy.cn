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
    // 头像形状：与默认（圆形）不同才写入
    if (data.about.avatarShape && data.about.avatarShape !== def.about.avatarShape) a.sh = data.about.avatarShape
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
    if (c.a.sh) a.avatarShape = c.a.sh
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

/* ============================================================
   短链接：把内容发布到仓库，链接里只带一个短 ID
   ------------------------------------------------------------
   长链接把图片一起塞进地址栏，图片越多链接越长（几十万字符）；
   短链接改为把内容提交到 GitHub 仓库的 public/shares/<id>.json，
   链接只保留 #/s/<id>，短且稳定。发布需要一次性的 GitHub Token，
   只存在浏览器本地，不会写进链接或提交内容。
   ============================================================ */

/** Token 的 localStorage 键名 */
const TOKEN_KEY = 'portfolio-editor-gh-token'

/** 发布目录（public 下的内容会随构建进入 Pages 站点） */
const SHARE_DIR = 'public/shares'

/**
 * 推导当前站点的 GitHub 仓库信息（GitHub Pages 形如 <owner>.github.io/<repo>/）
 * @returns {{owner: string, repo: string, branch: string}|null}
 */
export function detectRepo() {
  try {
    const m = window.location.hostname.match(/^([\w-]+)\.github\.io$/i)
    if (!m) return null
    const first = window.location.pathname.split('/').filter(Boolean)[0]
    return { owner: m[1], repo: first || `${m[1]}.github.io`, branch: 'main' }
  } catch {
    return null
  }
}

/** 读取本地保存的发布 Token */
export function getPublishToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

/** 保存 / 清除发布 Token（仅本机浏览器） */
export function setPublishToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* 忽略隐私模式下的写入失败 */
  }
  return token || ''
}

/** 生成短 ID（时间戳后缀保证不重复） */
function shortId() {
  return Math.random().toString(36).slice(2, 7) + Date.now().toString(36).slice(-5)
}

/** UTF-8 文本 → base64（GitHub Contents API 要求） */
function toBase64(text) {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK))
  }
  return btoa(bin)
}

/** 短链接地址（#/s/<id>） */
export function buildShortUrl(id) {
  const base = window.location.href.split('#')[0]
  return `${base}#/s/${id}`
}

/** 读取当前地址里的短链接 id */
export function readShortIdFromLocation() {
  const m = (window.location.hash || '').match(/^#\/s\/([\w-]+)$/)
  return m ? m[1] : null
}

/**
 * 把作品集内容发布到仓库，得到短链接
 * @param {Object} data 完整作品集数据
 * @param {string} token GitHub Token（需勾选 Contents 读写）
 * @returns {Promise<{id: string, url: string, path: string}>}
 */
export async function publishShare(data, token) {
  const info = detectRepo()
  if (!info) throw new Error('当前不是 GitHub Pages 站点，无法生成短链接')
  if (!token) throw new Error('请先填写 GitHub Token')

  const id = shortId()
  const path = `${SHARE_DIR}/${id}.json`
  const res = await fetch(`https://api.github.com/repos/${info.owner}/${info.repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: `share: ${id}`,
      content: toBase64(JSON.stringify(toCompact(data))),
      branch: info.branch
    })
  })

  if (!res.ok) {
    let detail = ''
    try {
      detail = (await res.json())?.message || ''
    } catch { /* 忽略非 JSON 响应 */ }
    const hint = {
      401: 'Token 无效或已过期，请重新生成',
      403: 'Token 权限不足：需要勾选 Contents 的读写权限',
      404: '找不到仓库或无权限：Token 需要授权给该仓库',
      409: '同名文件已存在，请重试'
    }[res.status]
    throw new Error(hint || `发布失败（HTTP ${res.status}${detail ? `：${detail}` : ''}）`)
  }

  return { id, url: buildShortUrl(id), path }
}

/**
 * 按短 ID 取回已发布的内容
 * 先读同源文件（站点上的 public/shares 副本），失败再回落到 raw.githubusercontent
 * （刚发布时站点还没重新部署，raw 立即可用）
 * @param {string} id 短 ID
 * @returns {Promise<Object|null>}
 */
export async function loadSharedById(id) {
  const repo = detectRepo()
  const sources = [`${import.meta.env.BASE_URL}shares/${id}.json`]
  if (repo) {
    sources.push(`https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${repo.branch}/${SHARE_DIR}/${id}.json`)
  }
  for (const src of sources) {
    try {
      const res = await fetch(src, { cache: 'no-cache' })
      if (!res.ok) continue
      const obj = await res.json()
      if (obj && obj.v === 2) return fromCompact(obj)
    } catch { /* 换下一个来源 */ }
  }
  return null
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
