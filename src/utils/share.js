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
    404: '找不到仓库或无权限：Token 的 Repository access 要勾上该仓库（选 Public repositories 只有只读权限，发布不了）'
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

/**
 * 把作品集内容发布到仓库，得到（或更新）短链接
 *
 * 传了 existingId 就是"更新"：覆盖同一个 <id>.json，地址保持不变。
 * GitHub 覆盖文件必须带上当前文件的 sha，所以先查一次；查询与提交之间
 * 若文件被改动（sha 过期）会返回 409/422，这里自动重查重试一次。
 *
 * @param {Object} data 完整作品集数据
 * @param {string} token GitHub Token（需勾选 Contents 读写）
 * @param {string} [existingId] 已存在的短 ID（不传则新建一个）
 * @returns {Promise<{id: string, url: string, path: string, updated: boolean}>}
 *          updated 为 true 表示覆盖更新，false 表示首次创建
 */
export async function publishShare(data, token, existingId) {
  const info = getShareRepo()
  if (!info) throw new Error('无法识别 GitHub 仓库，请先填写 仓库 owner/repo')
  if (!token) throw new Error('请先填写 GitHub Token')

  const id = existingId || shortId()
  const path = `${SHARE_DIR}/${id}.json`
  // u 为内容版本时间戳：观看端用它判断两个来源哪份更新
  const payload = { ...toCompact(data), u: Date.now() }
  const content = toBase64(JSON.stringify(payload))

  let { sha } = await fetchFile(info, path, token)
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await putFile(
      info, path, token, content, sha,
      `${existingId ? 'update' : 'share'}: ${id}`
    )

    if (res.ok) {
      // 顺手把"发布仓库"记到站点上，任何设备打开链接都能直读最新内容
      await ensureSiteConfig(info, token)
      return { id, url: buildShortUrl(id), path, updated: !!existingId }
    }

    // sha 过期（刚才有人改过同一个文件）→ 重新查一次再试
    if ((res.status === 409 || res.status === 422) && attempt < 2) {
      sha = (await fetchFile(info, path, token)).sha
      continue
    }

    let detail = ''
    try {
      detail = (await res.json())?.message || ''
    } catch { /* 忽略非 JSON 响应 */ }
    throw new Error(apiHint(res.status) || `发布失败（HTTP ${res.status}${detail ? `：${detail}` : ''}）`)
  }
  throw new Error('发布失败：文件被反复修改，请稍后重试')
}

/**
 * 读取单个来源的分享文件（失败或超时返回 null）
 *
 * 超时按"等响应头"和"下载正文"两段算：内容里打包了 base64 图片，
 * 1~2 MB 很常见，慢网络下正文要几十秒；如果统一用一个短超时，
 * 会在下载途中被中断，页面就误报"分享内容不存在或已被删除"。
 */
async function readShareFile(src) {
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
    return obj && obj.v === 2 ? obj : null
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

  const siteTask = readShareFile(siteUrl)
  // 站点副本够新就直接用它：避免为了对比新旧把同样的几百 KB~几 MB 再下一遍
  const rawTask = siteTask.then((site) => {
    if (site && Date.now() - (site.u || 0) < SITE_FRESH_MS) return null
    return resolveReadRepo().then((repo) => {
      if (!repo) return null
      return readShareFile(
        `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${repo.branch}/${SHARE_DIR}/${id}.json?${bust}`
      )
    })
  })

  const picked = await pickNewest([siteTask, rawTask])
  return picked ? fromCompact(picked) : null
}

/**
 * 估算发布后的内容体积（字节）
 * 图片以 base64 存在内容里，作品图片多时能到几 MB，读取本身要花十几秒；
 * 分享弹窗用它给出提示，避免用户以为链接坏了
 * @param {Object} data 完整作品集数据
 * @returns {number} 字节数（出错返回 0）
 */
export function estimateShareSize(data) {
  try {
    return JSON.stringify({ ...toCompact(data), u: Date.now() }).length
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
