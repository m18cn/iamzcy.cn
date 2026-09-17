/**
 * 导出网页工具：生成自包含的单文件 HTML（数据 + 样式全部内嵌）
 * 导出后的文件可直接双击打开，或上传到任意静态托管
 */

/**
 * HTML 转义，防止内容破坏页面结构
 * @param {string} str 原始字符串
 * @returns {string} 转义后的安全字符串
 */
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * 生成作品的媒体 HTML（图片网格 + 视频列表）
 * @param {Object} work 作品卡片数据
 * @returns {string} HTML 片段
 */
function renderWorkMedia(work) {
  const imgs = (work.images || [])
    .map((src) => `<img src="${src}" alt="${esc(work.title)}" loading="lazy" />`)
    .join('')
  const vids = (work.videos || [])
    .map((src) => `<video src="${src}" controls playsinline></video>`)
    .join('')
  if (!imgs && !vids) return ''
  return `<div class="w-media">${imgs}${vids}</div>`
}

/**
 * 生成完整的独立作品集展示页 HTML
 * @param {Object} data 完整作品集数据
 * @returns {string} 完整 HTML 文档字符串
 */
export function buildStandaloneHtml(data) {
  const accent = data.theme?.accent || '#C8FF00'
  const { about, experiences = [], works = [], advantages = [], contact } = data

  // 头像区域：有头像显示图片，否则显示占位
  const avatarHtml = about.avatar
    ? `<img src="${about.avatar}" alt="头像" />`
    : `<div class="ph-avatar">点击替换头像</div>`

  // Hero 画廊（横向滚动）
  const galleryHtml = (about.gallery || [])
    .map((g) => `<div class="g-item"><img src="${g.src}" alt="画廊图片" /></div>`)
    .join('')

  // 工作经历时间线
  const expHtml = experiences
    .map(
      (e, i) => `
      <div class="exp-item ${i % 2 === 0 ? 'left' : 'right'}">
        <div class="exp-card">
          <h3>${esc(e.company)}</h3>
          <p class="pos">${esc(e.position)}</p>
          <p class="desc">${esc(e.description)}</p>
        </div>
        <div class="exp-node">${i + 1}</div>
        <div class="exp-period">${esc(e.period)}</div>
      </div>`
    )
    .join('')

  // 作品网格
  const worksHtml = works
    .map(
      (w) => `
      <div class="work-card">
        ${renderWorkMedia(w)}
        <div class="w-body">
          <h3>${esc(w.title)}</h3>
          <p>${esc(w.desc)}</p>
        </div>
      </div>`
    )
    .join('')

  // 优势卡片
  const advHtml = advantages
    .map(
      (a) => `
      <div class="adv-card">
        <span class="adv-tag">${esc(a.tag)}</span>
        <h3>${esc(a.title)}</h3>
        <p>${esc(a.desc).replace(/\n/g, '<br/>')}</p>
      </div>`
    )
    .join('')

  // 联系标签
  const tagHtml = (contact.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('')

  // 联系二维码
  const qrHtml = contact.qrCode
    ? `<img src="${contact.qrCode}" alt="联系二维码" />`
    : `<div class="qr-ph">扫码联系我</div>`

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(about.name)} - PORTFOLIO</title>
<style>
:root { --accent: ${accent}; --bg: #0a0e17; --card: rgba(255,255,255,.04); --border: rgba(255,255,255,.09); }
* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-snap-type: y mandatory; scroll-behavior: smooth; }
body { background: var(--bg); color: #fff; font-family: 'PingFang SC','Microsoft YaHei',-apple-system,sans-serif; overflow-x: hidden; }
::selection { background: var(--accent); color: #0a0e17; }
nav { position: fixed; top: 18px; left: 50%; transform: translateX(-50%); display: flex; gap: 4px; background: rgba(13,17,26,.72); border: 1px solid var(--border); border-radius: 999px; padding: 6px; backdrop-filter: blur(16px); z-index: 100; }
nav a { color: rgba(255,255,255,.65); text-decoration: none; font-size: 13px; padding: 8px 16px; border-radius: 999px; transition: .2s; white-space: nowrap; }
nav a:hover { color: #fff; background: rgba(255,255,255,.08); }
/* 每个板块占满一屏，下拉整页切换（与编辑器一致的分页体验） */
section { max-width: 1080px; margin: 0 auto; padding: 110px 24px 60px; position: relative; min-height: 100vh; min-height: 100svh; scroll-snap-align: start; scroll-snap-stop: always; display: flex; flex-direction: column; justify-content: center; }
.kicker { color: var(--accent); font-size: 12px; letter-spacing: 3px; font-weight: 600; margin-bottom: 14px; }
h2.sec-title { font-size: clamp(34px, 5vw, 56px); font-weight: 800; letter-spacing: -1px; margin-bottom: 10px; }
.sec-sub { color: rgba(255,255,255,.45); font-size: 14px; margin-bottom: 48px; }
/* Hero */
.hero { display: grid; grid-template-columns: 1.2fr .8fr; gap: 48px; align-items: center; }
.hello { color: var(--accent); font-size: 13px; letter-spacing: 3px; margin-bottom: 18px; }
.h-name { font-size: clamp(44px, 7vw, 84px); font-weight: 800; color: var(--accent); letter-spacing: -2px; line-height: 1.05; }
.h-sub { font-size: clamp(20px, 2.4vw, 28px); font-weight: 700; letter-spacing: 6px; margin: 10px 0 6px; }
.h-title { color: var(--accent); font-size: 18px; font-weight: 600; margin-bottom: 16px; }
.h-bio { color: rgba(255,255,255,.55); line-height: 1.9; max-width: 420px; margin-bottom: 30px; }
.btn-row { display: flex; gap: 14px; flex-wrap: wrap; }
.btn { display: inline-flex; align-items: center; gap: 8px; padding: 13px 26px; border-radius: 999px; font-size: 14px; font-weight: 600; text-decoration: none; cursor: pointer; border: none; transition: .2s; }
.btn-primary { background: var(--accent); color: #0a0e17; }
.btn-primary:hover { filter: brightness(1.1); transform: translateY(-2px); }
.btn-ghost { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,.25); }
.btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
.avatar-wrap { position: relative; }
.avatar-box { aspect-ratio: 1/1; max-width: 360px; border-radius: 50%; overflow: hidden; border: 1px solid var(--border); background: var(--card); }
.avatar-box.shape-rounded { border-radius: 40px; }
.avatar-box img { width: 100%; height: 100%; object-fit: cover; }
.ph-avatar { display: flex; align-items: center; justify-content: center; height: 100%; color: rgba(255,255,255,.35); font-size: 14px; }
.now-card { position: absolute; right: -14px; bottom: 24px; background: rgba(13,17,26,.9); border: 1px solid var(--accent); border-radius: 14px; padding: 10px 16px; font-size: 12px; }
.now-card b { color: var(--accent); letter-spacing: 2px; display: block; margin-bottom: 4px; }
/* Gallery */
.gallery { display: flex; gap: 14px; overflow-x: auto; padding: 8px 4px 16px; margin-top: 60px; scrollbar-width: thin; }
.g-item { flex: 0 0 auto; width: 180px; aspect-ratio: 4/3; border-radius: 14px; overflow: hidden; border: 1px solid var(--border); }
.g-item img { width: 100%; height: 100%; object-fit: cover; }
/* Experience timeline */
.timeline { position: relative; max-width: 760px; margin: 0 auto; }
.timeline::before { content: ''; position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; background: var(--accent); opacity: .5; }
.exp-item { position: relative; display: grid; grid-template-columns: 1fr 1fr; margin-bottom: 44px; }
.exp-node { position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: 34px; height: 34px; border-radius: 50%; background: var(--accent); color: #0a0e17; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
.exp-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 22px 24px; }
.exp-item.left .exp-card { grid-column: 1; margin-right: 44px; }
.exp-item.right .exp-card { grid-column: 2; margin-left: 44px; }
.exp-card h3 { font-size: 17px; margin-bottom: 6px; }
.exp-card .pos { color: var(--accent); font-size: 13px; margin-bottom: 10px; }
.exp-card .desc { color: rgba(255,255,255,.55); font-size: 13px; line-height: 1.8; }
.exp-period { position: absolute; top: 6px; color: rgba(255,255,255,.5); font-size: 12px; }
.exp-item.left .exp-period { left: calc(50% + 28px); }
.exp-item.right .exp-period { right: calc(50% + 28px); }
/* Works */
.works-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
.work-card { background: var(--card); border: 1px solid var(--border); border-radius: 18px; overflow: hidden; }
.work-card:first-child { grid-row: span 2; }
.w-media { display: grid; gap: 8px; padding: 12px; }
.w-media img, .w-media video { width: 100%; border-radius: 10px; display: block; }
.w-body { padding: 6px 20px 20px; }
.w-body h3 { font-size: 16px; margin-bottom: 6px; }
.w-body p { color: rgba(255,255,255,.5); font-size: 13px; }
/* Advantages */
.adv-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; }
.adv-card { background: var(--card); border: 1px solid var(--border); border-radius: 18px; padding: 26px; min-height: 200px; display: flex; flex-direction: column; }
.adv-tag { color: var(--accent); font-size: 11px; letter-spacing: 2px; margin-bottom: 14px; }
.adv-card h3 { font-size: 18px; line-height: 1.5; margin-bottom: 12px; }
.adv-card p { color: rgba(255,255,255,.5); font-size: 13px; line-height: 1.9; }
/* Contact */
.contact-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 48px; align-items: start; }
.c-headline { font-size: clamp(26px, 4vw, 44px); font-weight: 800; line-height: 1.4; margin-bottom: 18px; }
.c-desc { color: rgba(255,255,255,.5); line-height: 1.9; margin-bottom: 28px; }
.tags { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 28px; }
.tag { border: 1px solid var(--border); border-radius: 999px; padding: 8px 18px; font-size: 13px; }
.c-phone { color: rgba(255,255,255,.5); font-size: 13px; }
.c-phone b { color: #fff; letter-spacing: 2px; }
.qr-box { background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 28px; text-align: center; }
.qr-box img { width: 180px; height: 180px; object-fit: cover; border-radius: 12px; }
.qr-ph { padding: 80px 0; color: rgba(255,255,255,.35); font-size: 14px; }
.qr-tip { margin-top: 14px; color: rgba(255,255,255,.5); font-size: 13px; }
/* 背景水印与光晕 */
.watermark { position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); font-size: clamp(70px, 12vw, 160px); font-weight: 800; color: transparent; -webkit-text-stroke: 1px rgba(255,255,255,.06); white-space: nowrap; pointer-events: none; user-select: none; }
.glow { position: fixed; top: -220px; right: -160px; width: 560px; height: 560px; border-radius: 50%; background: radial-gradient(circle, ${accent}26 0%, transparent 70%); pointer-events: none; z-index: 0; }
footer { text-align: center; color: rgba(255,255,255,.3); font-size: 12px; padding: 40px 0; letter-spacing: 2px; }
@media (max-width: 760px) {
  .hero, .contact-grid { grid-template-columns: 1fr; }
  .works-grid { grid-template-columns: 1fr; }
  .work-card:first-child { grid-row: auto; }
  .timeline::before { left: 16px; }
  .exp-item, .exp-item.left, .exp-item.right { display: block; margin-left: 44px; margin-right: 0; }
  .exp-item.left .exp-card, .exp-item.right .exp-card { margin: 0; }
  .exp-node { left: -44px; transform: none; }
  .exp-period { position: static; display: block; margin-bottom: 6px; }
}
</style>
</head>
<body>
<div class="glow"></div>
<nav>
  <a href="#about">关于我</a><a href="#exp">工作经历</a><a href="#works">个人作品</a><a href="#adv">个人优势</a><a href="#contact">联系我</a>
</nav>

<section id="about">
  <div class="hero">
    <div>
      <p class="hello">${esc(about.hello)}</p>
      <h1 class="h-name">${esc(about.name)}</h1>
      <p class="h-sub">${esc(about.subtitle)}</p>
      <p class="h-title">${esc(about.title)}</p>
      <p class="h-bio">${esc(about.bio)}</p>
      <div class="btn-row">
        <a class="btn btn-primary" href="#works">查看我的作品 →</a>
        <a class="btn btn-ghost" href="#contact">联系我</a>
      </div>
    </div>
    <div class="avatar-wrap">
      <div class="avatar-box ${about.avatarShape === 'rounded' ? 'shape-rounded' : ''}">${avatarHtml}</div>
      ${about.nowBadge?.visible ? `<div class="now-card"><b>NOW</b>${esc(about.nowBadge.text)}</div>` : ''}
    </div>
  </div>
  ${galleryHtml ? `<div class="gallery">${galleryHtml}</div>` : ''}
  <div class="watermark">PORTFOLIO</div>
</section>

<section id="exp">
  <p class="kicker">02 / THE JOURNEY</p>
  <h2 class="sec-title">Work Experience</h2>
  <p class="sec-sub">个人经历 / 每一段经历都在形成现在的我</p>
  <div class="timeline">${expHtml}</div>
</section>

<section id="works">
  <p class="kicker">03 / THE PRACTITIONER</p>
  <h2 class="sec-title">Portfolio / 作品集</h2>
  <p class="sec-sub"></p>
  <div class="works-grid">${worksHtml}</div>
</section>

<section id="adv">
  <p class="kicker">04 / WHAT I DO BEST</p>
  <h2 class="sec-title">Advantages / 个人优势</h2>
  <p class="sec-sub"></p>
  <div class="adv-grid">${advHtml}</div>
</section>

<section id="contact">
  <p class="kicker">05 / CONTACT</p>
  <p class="hello">LET'S TALK</p>
  <div class="contact-grid">
    <div>
      <h2 class="c-headline">${esc(contact.headline)}</h2>
      <p class="c-desc">${esc(contact.desc)}</p>
      <div class="tags">${tagHtml}</div>
      <p class="c-phone">PHONE <b>${esc(contact.phone)}</b></p>
    </div>
    <div class="qr-box">
      ${qrHtml}
      <p class="qr-tip">扫码联系我</p>
    </div>
  </div>
  <div class="watermark">LET'S BUILD</div>
</section>

<footer>PORTFOLIO © ${new Date().getFullYear()}</footer>
</body>
</html>`
}

/**
 * 触发浏览器下载独立 HTML 文件
 * @param {Object} data 完整作品集数据
 */
export function downloadStandaloneHtml(data) {
  const html = buildStandaloneHtml(data)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'my-portfolio.html'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
