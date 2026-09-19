import LZString from 'lz-string'
import { createDefaultData } from '../data/defaultData'

/**
 * 分享工具
 *
 * 唯一的分享方式 = 短链接：内容 → 紧凑差量格式 → 提交到仓库
 * public/shares/<id>.json，链接只保留 #/s/<id>。
 * - 短：链接里不带图片，随便发微信/群里都不会超长
 * - 稳：id 存在作品集数据里（data.share.id），再次发布是覆盖同一个文件，
 *   所以地址不变、内容可更新（覆盖时必须带上文件 sha，见 publishShare）
 * - 多人多设备：内容是仓库里的静态文件，任何人不登录、不用 Token 都能看，
 *   读取时带时间戳参数绕过 CDN 缓存，刷新即最新
 *
 * 旧的"完整链接"（#/view/<压缩数据>，把图片一起塞进地址栏）不再生成，
 * 但历史链接仍可正常打开（见 readShareFromLocation）。
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

  /* —— 板块标题文案（只记与默认不同的字段）—— */
  const st = {}
  for (const [key, defVal] of Object.entries(def.sections || {})) {
    const cur = data.sections?.[key]
    if (!cur) continue
    const diff = {}
    for (const field of ['kicker', 'title', 'sub']) {
      if (cur[field] !== undefined && cur[field] !== defVal[field]) diff[field] = cur[field]
    }
    if (Object.keys(diff).length) st[key] = diff
  }
  if (Object.keys(st).length) c.st = st

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
  /* 板块标题文案差异 */
  if (c.st) {
    for (const [key, diff] of Object.entries(c.st)) {
      d.sections[key] = { ...(d.sections[key] || {}), ...diff }
    }
  }
  if (c.ac) d.theme.accent = c.ac

  return d
}

/**
 * 解码 URL 片段为作品集数据（自动兼容 v2 差量格式与 v1 全量格式）
 * 仅用于打开历史遗留的 #/view/ 长链接，新内容不再生成这种链接
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
 * 从当前页面地址中解析分享数据（仅历史遗留的 #/view/ 长链接会命中）
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
   内容提交到 GitHub 仓库的 public/shares/<id>.json，链接只保留
   #/s/<id>。同一个作品集永远用同一个 id（存在 data.share.id 里），
   再次发布就是覆盖同一个文件 —— 地址不变，内容更新。
   发布需要一次性的 GitHub Token，只存在浏览器本地。
   ============================================================ */

/** Token 的 localStorage 键名 */
const TOKEN_KEY = 'portfolio-editor-gh-token'

/** 手动指定仓库时的 localStorage 键名（自定义域名下无法自动识别时用） */
const REPO_KEY = 'portfolio-editor-gh-repo'

/** 发布目录（public 下的内容会随构建进入 Pages 站点） */
const SHARE_DIR = 'public/shares'

/**
 * 站点配置文件名（放在发布目录里）：
 * 记录"内容发布在哪个仓库"，发布时自动补上，之后任何设备打开分享链接
 * 都能直接读仓库里的最新版本（自定义域名下 window.location 里没有仓库信息）
 */
const CONFIG_PATH = `${SHARE_DIR}/config.json`

/** 站点配置的页面内缓存（一次加载只取一次） */
let siteRepoCache

/**
 * 读取单个来源的超时时间（毫秒）—— 等响应头的上限
 * 超出说明这个来源不通（网络被墙 / 域名解析不了），不必再等
 */
const SOURCE_TIMEOUT = 20000

/** 正文下载预算：最小 20 秒，按体积放宽（约 40 KB/s 的保守速度），最多 2 分钟 */
const BODY_TIMEOUT_MIN = 20000
const BODY_TIMEOUT_MAX = 120000
const BODY_BYTES_PER_MS = 0.04

/**
 * 首个来源返回后，再等一小会儿其它来源的宽限时间（毫秒）：
 * 刚更新完内容时，站点上的副本可能还是上一次部署的旧版，
 * 而仓库直读（raw）已是新内容 —— 这点时间刚好能把更新的那份挑出来
 */
const SOURCE_GRACE = 1500

/** 站点副本的版本号比这个时间还新（毫秒）时，认为它已经是最新版，不再直读仓库（省一半流量） */
const SITE_FRESH_MS = 3 * 60 * 1000

/**
 * 自动推导当前站点的 GitHub 仓库（GitHub Pages 形如 <owner>.github.io/<repo>/）
 * @returns {{owner: string, repo: string, branch: string, auto: boolean}|null}
 */
export function detectRepo() {
  try {
    const m = window.location.hostname.match(/^([\w-]+)\.github\.io$/i)
    if (!m) return null
    const first = window.location.pathname.split('/').filter(Boolean)[0]
    return { owner: m[1], repo: first || `${m[1]}.github.io`, branch: 'main', auto: true }
  } catch {
    return null
  }
}

/** 读取手动配置的仓库 */
function readRepoOverride() {
  try {
    const raw = localStorage.getItem(REPO_KEY)
    if (!raw) return null
    const [owner, repo] = raw.split('/').filter(Boolean)
    return owner && repo ? { owner, repo, branch: 'main', auto: false } : null
  } catch {
    return null
  }
}

/**
 * 当前使用的仓库：优先自动识别，其次用本地手动配置
 * （站点绑定了自定义域名时 window.location 里没有仓库信息，只能手动填一次）
 * @returns {{owner: string, repo: string, branch: string, auto: boolean}|null}
 */
export function getShareRepo() {
  return detectRepo() || readRepoOverride()
}

/**
 * 保存 / 清除手动配置的仓库
 * @param {string} input 形如 owner/repo，也接受完整仓库地址
 * @returns {{owner: string, repo: string}|null} 解析结果，格式不对返回 null
 */
export function setShareRepo(input) {
  const cleaned = String(input || '')
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '')
  const [owner, repo] = cleaned.split('/').filter(Boolean)
  try {
    if (!owner || !repo) localStorage.removeItem(REPO_KEY)
    else localStorage.setItem(REPO_KEY, `${owner}/${repo}`)
  } catch {
    /* 忽略隐私模式下的写入失败 */
  }
  return owner && repo ? { owner, repo } : null
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

/** 生成短 ID（首次发布用，之后固定不变） */
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

/** GitHub API 状态码 → 中文提示 */
function apiHint(status) {
  return {
    401: 'Token 无效或已过期，请重新生成',
    403: 'Token 权限不足：在 Repository permissions 里把 Contents 设为 Read and write',
    404: '找不到仓库或无权限：Token 的 Repository access 要勾上该仓库（选 Public repositories 只有只读权限，发布不了）',
    409: '仓库刚被另一次发布改动过，请再点一次「更新内容」',
    422: '仓库刚被另一次发布改动过，请再点一次「更新内容」'
  }[status]
}

/** base64 → 文本 */
function fromBase64(text) {
  try {
    const bin = atob(String(text).replace(/\s/g, ''))
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return ''
  }
}

/**
 * 读取仓库里的文件
 * @returns {Promise<{sha: string|null, text: string}>} 不存在时 sha 为 null
 */
async function fetchFile(info, path, token) {
  const res = await fetch(
    `https://api.github.com/repos/${info.owner}/${info.repo}/contents/${path}?ref=${info.branch}`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      cache: 'no-store'
    }
  )
  if (res.status === 404) return { sha: null, text: '' } // 文件还不存在（仓库不对时 PUT 会报更准确的错）
  if (!res.ok) throw new Error(apiHint(res.status) || `读取仓库失败（HTTP ${res.status}）`)
  const json = await res.json()
  return { sha: json.sha || null, text: json.content ? fromBase64(json.content) : '' }
}

/** 提交（新建或覆盖）仓库里的文件 */
async function putFile(info, path, token, content, sha, message) {
  return fetch(`https://api.github.com/repos/${info.owner}/${info.repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,
      content,
      branch: info.branch,
      ...(sha ? { sha } : {})
    })
  })
}

/**
 * 确保站点配置文件存在且指向当前仓库（只在第一次发布或仓库变了时才提交）
 * 失败不影响分享本身，所以整体 try 住
 */
async function ensureSiteConfig(info, token) {
  try {
    const body = { owner: info.owner, repo: info.repo, branch: info.branch }
    const { sha, text } = await fetchFile(info, CONFIG_PATH, token)
    if (sha && text) {
      const cur = JSON.parse(text)
      if (cur.owner === body.owner && cur.repo === body.repo && cur.branch === body.branch) return
    }
    await putFile(info, CONFIG_PATH, token, toBase64(JSON.stringify(body)), sha, 'share: 记录发布仓库')
  } catch {
    /* 配置写不进去只是少了"发布后立刻可见"，分享本身照常 */
  }
}

/**
 * 解析用户粘贴的分享地址 / 短 ID，取出里面的 ID
 * 支持 https://xxx/#/s/abc123、abc123、#/s/abc123
 * @param {string} input
 * @returns {string} 解析出的 ID，未识别返回空串
 */
export function parseShareId(input) {
  const text = String(input || '').trim()
  if (!text) return ''
  const m = text.match(/#\/s\/([\w-]+)/) || text.match(/^[\w-]{4,}$/)
  return m ? (m[1] || m[0]) : ''
}

/**
 * 解析"读取分享内容时用哪个仓库"：
 * 域名自动识别 → 本机手动配置 → 站点上的 config.json（发布时自动写入）
 * @returns {Promise<{owner: string, repo: string, branch: string}|null>}
 */
async function resolveReadRepo() {
  const direct = detectRepo() || readRepoOverride()
  if (direct) return direct
  if (siteRepoCache !== undefined) return siteRepoCache
  siteRepoCache = null
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 2500)
    const res = await fetch(`${import.meta.env.BASE_URL}shares/config.json`, {
      cache: 'no-store',
      signal: ctrl.signal
    })
    clearTimeout(timer)
    if (res.ok) {
      const cfg = await res.json()
      if (cfg?.owner && cfg?.repo) {
        siteRepoCache = { owner: cfg.owner, repo: cfg.repo, branch: cfg.branch || 'main' }
      }
    }
  } catch {
    /* 没有配置就只用站点副本 */
  }
  return siteRepoCache
}

/* ============================================================
   内容与图片分开存放（v3）
   ------------------------------------------------------------
   v2 把图片 base64 塞进同一个 JSON：14 张图就是 1.55 MB，而 base64 本身
   多占 33%，GitHub Pages 又不压缩 JSON —— 观看者要干等十几秒才看到内容。
   v3 改为：<id>.json 只存文字与图片引用（几 KB），图片各自一个 WebP 文件
   （<id>/m0.webp …）。于是页面立刻渲染，图片并行流式加载，跟正常网站一样。
   旧的 v2 链接继续可以打开。
   ============================================================ */

/** 发布时图片长边上限与 WebP 质量（比 JPEG 小很多，观感基本一致） */
const MEDIA_MAX_EDGE = 1280
const MEDIA_QUALITY = 0.72

/** dataURL → { mime, base64 } */
function splitDataUrl(url) {
  const comma = url.indexOf(',')
  const head = url.slice(5, comma)           // 去掉 "data:"
  return {
    mime: head.replace(';base64', ''),
    base64: url.slice(comma + 1)
  }
}

/** mime → 文件扩展名 */
function extFor(mime) {
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('png')) return 'png'
  if (mime.includes('svg')) return 'svg'
  if (mime.includes('gif')) return 'gif'
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  if (mime.includes('mp4')) return 'mp4'
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('quicktime') || mime.includes('mov')) return 'mov'
  return 'bin'
}

/**
 * 把图片重新编码成 WebP（长边压到 MEDIA_MAX_EDGE 以内）
 * 失败、或转出来反而更大时返回 null，调用方保留原图
 * @param {string} dataURL 原图
 * @returns {Promise<{base64: string, bytes: number}|null>}
 */
function encodeWebp(dataURL) {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') { resolve(null); return }
    const img = new Image()
    img.onload = () => {
      try {
        const scale = Math.min(1, MEDIA_MAX_EDGE / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        const out = canvas.toDataURL('image/webp', MEDIA_QUALITY)
        if (!out.startsWith('data:image/webp')) { resolve(null); return } // 浏览器不支持时退回原图
        const base64 = splitDataUrl(out).base64
        resolve({ base64, bytes: Math.round(base64.length * 3 / 4) })
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = dataURL
  })
}

/**
 * 把数据里的媒体抽出来单独成文件，正文里只留 "@序号" 引用
 * @param {Object} data 完整作品集数据
 * @returns {Promise<{payload: Object, files: {name: string, base64: string}[], mediaBytes: number}>}
 */
async function buildShareFiles(data) {
  const compact = toCompact(data)
  compact.v = 3
  const files = []
  const names = []
  let mediaBytes = 0

  /** 单个 dataURL → 文件 + 引用标记；非 dataURL（已是链接）原样返回 */
  const put = async (value) => {
    if (typeof value !== 'string' || !value.startsWith('data:')) return value
    const { mime, base64 } = splitDataUrl(value)
    let outBase64 = base64
    let ext = extFor(mime)
    if (mime.startsWith('image/') && !mime.includes('svg')) {
      const webp = await encodeWebp(value)
      const originBytes = Math.round(base64.length * 3 / 4)
      if (webp && webp.bytes < originBytes) {
        outBase64 = webp.base64
        ext = 'webp'
      }
    }
    mediaBytes += Math.round(outBase64.length * 3 / 4)
    const name = `m${files.length}.${ext}`
    files.push({ name, base64: outBase64 })
    names.push(name)
    return `@${files.length - 1}`
  }

  if (compact.a) {
    if (compact.a.av) compact.a.av = await put(compact.a.av)
    if (Array.isArray(compact.a.g)) {
      for (let i = 0; i < compact.a.g.length; i++) compact.a.g[i] = await put(compact.a.g[i])
    }
  }
  if (compact.c?.q) compact.c.q = await put(compact.c.q)
  if (Array.isArray(compact.w)) {
    for (const w of compact.w) {
      if (Array.isArray(w[2])) for (let i = 0; i < w[2].length; i++) w[2][i] = await put(w[2][i])
      if (Array.isArray(w[3])) for (let i = 0; i < w[3].length; i++) w[3][i] = await put(w[3][i])
    }
  }

  return { payload: { ...compact, f: names, u: Date.now() }, files, mediaBytes }
}

/** 把 v3 载荷里的 "@序号" 还原成可直接渲染的图片地址 */
function resolveMediaTokens(compact, base, version) {
  const url = (token) => {
    const name = compact.f?.[Number(String(token).slice(1))]
    return name ? `${base}${name}?v=${version}` : ''
  }
  const walk = (value) => (typeof value === 'string' && value.startsWith('@') ? url(value) : value)

  if (compact.a) {
    if (compact.a.av) compact.a.av = walk(compact.a.av)
    if (Array.isArray(compact.a.g)) compact.a.g = compact.a.g.map(walk)
  }
  if (compact.c?.q) compact.c.q = walk(compact.c.q)
  if (Array.isArray(compact.w)) {
    for (const w of compact.w) {
      if (Array.isArray(w[2])) w[2] = w[2].map(walk)
      if (Array.isArray(w[3])) w[3] = w[3].map(walk)
    }
  }
  return compact
}

/**
 * 把作品集内容发布到仓库，得到（或更新）短链接
 *
 * v3：文字与图片分开提交 —— 图片各存一个 WebP 文件，正文 JSON 只留引用，
 * 一次发布只产生一个提交（Git Data API：blobs → tree → commit → 移动分支）。
 * 传了 existingId 就是"更新"：同一个 id 覆盖，地址保持不变。
 *
 * @param {Object} data 完整作品集数据
 * @param {string} token GitHub Token（需勾选 Contents 读写）
 * @param {string} [existingId] 已存在的短 ID（不传则新建一个）
 * @param {Function} [onProgress] (text: string) => void 发布进度
 * @returns {Promise<{id: string, url: string, updated: boolean, mediaBytes: number}>}
 */
export async function publishShare(data, token, existingId, onProgress) {
  const info = getShareRepo()
  if (!info) throw new Error('无法识别 GitHub 仓库，请先填写 仓库 owner/repo')
  if (!token) throw new Error('请先填写 GitHub Token')

  const id = existingId || shortId()

  onProgress?.('正在压缩图片…')
  const { payload, files, mediaBytes } = await buildShareFiles(data)

  onProgress?.(`正在上传 ${files.length + 1} 个文件…`)
  await commitShare(info, token, id, payload, files, existingId)

  // 顺手把"发布仓库"记到站点上，任何设备打开链接都能直读最新内容
  await ensureSiteConfig(info, token)

  return { id, url: buildShortUrl(id), updated: !!existingId, mediaBytes }
}

/** GitHub API 调用（带中文错误提示） */
async function ghApi(info, token, path, options = {}) {
  const res = await fetch(`https://api.github.com/repos/${info.owner}/${info.repo}${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(options.body ? { body: options.body } : {}),
    cache: 'no-store'
  })
  if (!res.ok) {
    let detail = ''
    try {
      detail = (await res.json())?.message || ''
    } catch { /* 忽略 */ }
    throw new Error(apiHint(res.status) || `发布失败（HTTP ${res.status}${detail ? `：${detail}` : ''}）`)
  }
  return res.status === 204 ? null : res.json()
}

/**
 * 用 Git Data API 一次性提交正文与所有图片（只产生一个提交）
 * 同时清理本次不再引用的旧图片文件
 */
async function commitShare(info, token, id, payload, files, existingId) {
  const ref = await ghApi(info, token, `/git/ref/heads/${info.branch}`)
  const head = ref.object.sha
  const headCommit = await ghApi(info, token, `/git/commits/${head}`)
  const baseTree = headCommit.tree.sha

  /** 上一次发布留下的图片文件名（用于删除已不用的） */
  let oldFiles = []
  if (existingId) {
    try {
      const old = await fetchFile(info, `${SHARE_DIR}/${id}.json`, token)
      if (old.text) {
        const parsed = JSON.parse(old.text)
        if (Array.isArray(parsed.f)) oldFiles = parsed.f
      }
    } catch { /* 旧的读不到就不清理，不影响本次发布 */ }
  }

  const tree = []
  for (const f of files) {
    const blob = await ghApi(info, token, '/git/blobs', {
      method: 'POST',
      body: JSON.stringify({ content: f.base64, encoding: 'base64' })
    })
    tree.push({ path: `${SHARE_DIR}/${id}/${f.name}`, mode: '100644', type: 'blob', sha: blob.sha })
  }

  const jsonBlob = await ghApi(info, token, '/git/blobs', {
    method: 'POST',
    body: JSON.stringify({ content: toBase64(JSON.stringify(payload)), encoding: 'base64' })
  })
  tree.push({ path: `${SHARE_DIR}/${id}.json`, mode: '100644', type: 'blob', sha: jsonBlob.sha })

  // 新版没有引用的旧图片：置空即从目录里删掉（避免仓库里越堆越多）
  const keep = new Set(files.map((f) => f.name))
  for (const name of oldFiles) {
    if (!keep.has(name)) {
      tree.push({ path: `${SHARE_DIR}/${id}/${name}`, mode: '100644', type: 'blob', sha: null })
    }
  }

  const newTree = await ghApi(info, token, '/git/trees', {
    method: 'POST',
    body: JSON.stringify({ base_tree: baseTree, tree })
  })
  const newCommit = await ghApi(info, token, '/git/commits', {
    method: 'POST',
    body: JSON.stringify({
      message: `${existingId ? 'update' : 'share'}: ${id}`,
      tree: newTree.sha,
      parents: [head]
    })
  })
  await ghApi(info, token, `/git/refs/heads/${info.branch}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: newCommit.sha })
  })
}

/**
 * 读取单个来源的分享正文（失败或超时返回 null）
 *
 * 超时按"等响应头"和"下载正文"两段算：v3 之后正文只有几 KB，但旧的 v2
 * 链接仍可能带着几 MB 的 base64 图片，慢网络下要几十秒，所以正文预算按
 * content-length 放宽，避免在下载途中被中断、误报"内容不存在"。
 * @param {string} src 地址
 * @param {'site'|'raw'} source 来源标记（v3 用它决定图片走哪个域名）
 * @returns {Promise<Object|null>} 正文对象（带 __source 标记）
 */
async function readShareFile(src, source) {
  const ctrl = new AbortController()
  let timer = setTimeout(() => ctrl.abort(), SOURCE_TIMEOUT)
  try {
    const res = await fetch(src, { cache: 'no-store', signal: ctrl.signal })
    if (!res.ok) return null
    // 响应头已到：按内容体积重新算一次下载预算（慢速也允许读完）
    clearTimeout(timer)
    const len = Number(res.headers.get('content-length') || 0)
    const budget = Math.min(BODY_TIMEOUT_MAX, Math.max(BODY_TIMEOUT_MIN, len / BODY_BYTES_PER_MS))
    timer = setTimeout(() => ctrl.abort(), budget)
    const obj = await res.json()
    if (!obj || (obj.v !== 2 && obj.v !== 3)) return null
    return { ...obj, __source: source }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 并发读取多个来源，返回版本最新（u 最大）的那份
 * 首个成功的来源返回后最多再等 SOURCE_GRACE，避免页面被慢来源拖住
 * @param {Promise<Object|null>[]} promises 各来源的读取任务
 * @returns {Promise<Object|null>}
 */
function pickNewest(promises) {
  return new Promise((resolve) => {
    let left = promises.length
    let best = null
    let graceTimer = null
    const finish = () => {
      if (graceTimer) clearTimeout(graceTimer)
      resolve(best)
    }
    for (const p of promises) {
      p.then((obj) => {
        if (obj && (!best || (obj.u || 0) > (best.u || 0))) best = obj
        left -= 1
        if (obj && !graceTimer) graceTimer = setTimeout(finish, SOURCE_GRACE)
        if (left === 0) finish()
      })
    }
    if (!promises.length) resolve(null)
  })
}

/**
 * 按短 ID 取回已发布的内容
 * 两个来源：站点上的副本（<base>/shares/<id>.json）与仓库直读（raw）。
 * - 站点副本先取：同一个域名，通常最快
 * - 它若是 404（刚发布还没部署）或版本号较旧（3 分钟以外），再去读仓库拿最新版
 * 取版本号更新的那份，并强制绕过 CDN 缓存，所以刷新就是最新内容。
 * @param {string} id 短 ID
 * @returns {Promise<Object|null>}
 */
export async function loadSharedById(id) {
  const bust = `ts=${Date.now()}`
  const siteUrl = `${import.meta.env.BASE_URL}shares/${id}.json?${bust}`

  const siteTask = readShareFile(siteUrl, 'site')
  // 站点副本够新就直接用它：避免为了对比新旧把同样的内容再下一遍
  const rawTask = siteTask.then((site) => {
    const obj = site?.obj
    if (obj && Date.now() - (obj.u || 0) < SITE_FRESH_MS) return null
    return resolveReadRepo().then((repo) => {
      if (!repo) return null
      return readShareFile(
        `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${repo.branch}/${SHARE_DIR}/${id}.json?${bust}`,
        'raw'
      )
    })
  })

  const picked = await pickNewest([siteTask, rawTask])
  if (!picked) return null

  // v3：正文里的 "@序号" 是图片引用，按"正文是从哪读到的"拼出图片地址
  if (picked.v === 3) {
    const repo = getShareRepo()
    const base = picked.__source === 'raw' && repo
      ? `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${repo.branch}/${SHARE_DIR}/${id}/`
      : `${import.meta.env.BASE_URL}shares/${id}/`
    return fromCompact(resolveMediaTokens(picked, base, picked.u || 0))
  }

  // v2（旧链接）：图片仍在正文里
  return fromCompact(picked)
}

/**
 * 估算发布后的内容体积（字节）：正文 + 图片（不含 base64 膨胀）
 * 图片发布时会转成 WebP 并单独存放，这里按原图体积给个上界
 * @param {Object} data 完整作品集数据
 * @returns {number} 字节数（出错返回 0）
 */
export function estimateShareSize(data) {
  try {
    const compact = toCompact(data)
    let media = 0
    const count = (val) => {
      if (typeof val !== 'string' || !val.startsWith('data:')) return
      media += Math.round((val.length - val.indexOf(',')) * 3 / 4)
    }
    count(compact.a?.av)
    ;(compact.a?.g || []).forEach(count)
    count(compact.c?.q)
    ;(compact.w || []).forEach((w) => {
      (w[2] || []).forEach(count)
      ;(w[3] || []).forEach(count)
    })
    return JSON.stringify(compact).length + media
  } catch {
    return 0
  }
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
