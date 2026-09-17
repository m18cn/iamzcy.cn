import { useEffect, useMemo, useState, useCallback } from 'react'
import { usePortfolio } from './hooks/usePortfolio'
import {
  readShareFromLocation, readShortIdFromLocation, loadSharedById, buildShareUrl
} from './utils/share'
import NavBar from './components/NavBar'
import ActionBar from './components/ActionBar'
import ColorPanel from './components/ColorPanel'
import ShareModal from './components/ShareModal'
import AboutSection from './components/sections/AboutSection'
import ExperienceSection from './components/sections/ExperienceSection'
import WorksSection from './components/sections/WorksSection'
import AdvantagesSection from './components/sections/AdvantagesSection'
import ContactSection from './components/sections/ContactSection'

/** 应用运行模式 */
const MODE = {
  EDIT: 'edit',       // 编辑模式（长页滚动，边看边改）
  PREVIEW: 'preview'  // 预览模式（同布局，隐藏编辑控件）
}

/** 板块键名顺序（用于锚点定位与滚动高亮） */
const SECTION_KEYS = ['about', 'experiences', 'works', 'advantages', 'contact']

/** 空操作（预览/分享模式下传给板块的 update 占位） */
const noop = () => {}

/**
 * 应用根组件
 * - 编辑模式：全屏分页布局（每个导航板块占满一屏，下拉整页切换），
 *   顶部导航点击平滑滚动到对应板块；右下角操作栏（预览 / 色彩 / 生成地址），
 *   点击"色彩"展开/收起主题色板；编辑内容自动保存到本地
 * - 预览模式：同布局隐藏编辑控件，但保留顶部导航胶囊；
 *   返回编辑 / 生成地址都收进右下操作栏（不再有顶部横幅）
 * - 分享访问：URL 含 #/view/<压缩数据>（免配置长链接）或 #/s/<短ID>
 *   （内容发布在仓库 public/shares 下）时，以只读模式渲染分享者数据
 */
export default function App() {
  const { data, updateData, updateSection, saveNow } = usePortfolio()

  /** URL 中的分享数据（存在即为分享访问模式） */
  const [shareData, setShareData] = useState(() => readShareFromLocation())
  /**
   * 短链接（#/s/<id>）的加载状态：
   * idle 直接看本地编辑内容 / loading 正在取回已发布内容 / error 取回失败 / ready 取回成功
   */
  const [shortState, setShortState] = useState(() => (readShortIdFromLocation() ? 'loading' : 'idle'))
  /** 当前高亮板块（导航激活态） */
  const [section, setSection] = useState('about')
  /** 当前模式 */
  const [mode, setMode] = useState(MODE.EDIT)
  /** 弹窗与 toast */
  const [shareOpen, setShareOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  /** 主题色板是否展开 */
  const [colorOpen, setColorOpen] = useState(false)

  /** 是否只读（分享访问或预览模式） */
  const readonly = !!shareData || mode === MODE.PREVIEW
  /** 当前渲染的数据来源（分享数据或本地编辑数据） */
  const viewData = shareData || data

  // 短链接访问（#/s/<id>）：异步取回已发布到仓库的内容
  useEffect(() => {
    const id = readShortIdFromLocation()
    if (!id) return
    let alive = true
    setShortState('loading')
    loadSharedById(id).then((shared) => {
      if (!alive) return
      if (shared) {
        setShareData(shared)
        setShortState('ready')
      } else {
        setShortState('error')
      }
    })
    return () => { alive = false }
  }, [])

  // 主题色同步到 CSS 变量
  useEffect(() => {
    const accent = viewData.theme?.accent || '#C8FF00'
    document.documentElement.style.setProperty('--accent', accent)
  }, [viewData])

  // 模式切换时同步 body class（控制编辑控件显隐）
  useEffect(() => {
    document.body.classList.toggle('preview-mode', readonly)
  }, [readonly])

  // 监听滚动：检测占据视口中线的板块，自动高亮导航
  // （编辑与预览模式都保留顶部导航胶囊，只有分享访问模式没有导航）
  useEffect(() => {
    if (shareData) return
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const mid = window.innerHeight / 2
        for (const k of SECTION_KEYS) {
          const el = document.getElementById(`sec-${k}`)
          if (!el) continue
          const rect = el.getBoundingClientRect()
          if (rect.top <= mid && rect.bottom >= mid) {
            setSection(k)
            break
          }
        }
        ticking = false
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [shareData])

  /** 显示 toast 提示（2 秒后自动消失） */
  const showToast = useCallback((msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 2200)
  }, [])

  /** 跳转板块：平滑滚动到对应区块（编辑/预览/分享模式通用） */
  const goSection = useCallback((key) => {
    setSection(key)
    document.getElementById(`sec-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  /** 进入预览模式（先静默保存，防止防抖未落盘） */
  const enterPreview = () => {
    saveNow()
    setMode(MODE.PREVIEW)
    window.scrollTo({ top: 0 })
  }

  /** 返回编辑模式 */
  const backToEdit = () => {
    setMode(MODE.EDIT)
    window.scrollTo({ top: 0 })
  }

  /** 切换主题色板展开/收起 */
  const toggleColor = () => setColorOpen((v) => !v)

  /** 选择主题色 */
  const pickColor = (color) => {
    updateSection('theme', { accent: color })
  }

  /**
   * 更新某个板块的标题文案（kicker / title / sub）
   * @param {string} key 板块键名（与 data.sections 对应）
   * @param {Object} patch 标题增量，如 { title: '...' }
   */
  const updateSectionMeta = useCallback((key, patch) => {
    updateData((prev) => ({
      ...prev,
      sections: { ...prev.sections, [key]: { ...prev.sections?.[key], ...patch } }
    }))
  }, [updateData])

  /**
   * 生成某板块标题区的编辑回调（预览模式给空操作）
   * @param {boolean} preview 是否预览模式
   * @param {string} key 板块键名
   */
  const metaProps = (preview, key) => ({
    meta: viewData.sections?.[key] || {},
    onMetaChange: preview ? noop : (patch) => updateSectionMeta(key, patch)
  })

  /**
   * 完整分享链接（把数据压缩进 hash，图片多时字符串很长）
   * 按 data 记忆化：弹窗内输入 Token 等重渲染不再重复压缩
   */
  const longShareUrl = useMemo(() => buildShareUrl(data), [data])

  /**
   * 全屏背景底板：始终铺满整个视口（不受 1600px 画布宽度限制）
   * 画在 #root 内部而不是 body 上，嵌入宿主页面时底色依然完整
   */
  const backdrop = <div className="bg-base" aria-hidden="true" />

  /**
   * 渲染全部板块（编辑与预览/分享共用长页布局，
   * 每个 page-sec 自带整屏铺满的背景层，见 global.css 的 .page-sec::before）
   * @param {boolean} preview 是否隐藏编辑控件
   */
  const renderSections = (preview) => (
    <div className="stage">
      <div className="page-sections">
        <div className="page-sec" id="sec-about" data-sec="about">
          <AboutSection
            about={viewData.about}
            update={preview ? noop : (patch) => updateSection('about', patch)}
            preview={preview}
            onToast={showToast}
            onGoSection={goSection}
          />
        </div>
        <div className="page-sec" id="sec-experiences" data-sec="experiences">
          <ExperienceSection
            experiences={viewData.experiences}
            update={preview ? noop : (updater) => updateData((prev) => ({ ...prev, experiences: updater(prev.experiences) }))}
            {...metaProps(preview, 'experiences')}
            preview={preview}
          />
        </div>
        <div className="page-sec" id="sec-works" data-sec="works">
          <WorksSection
            works={viewData.works}
            update={preview ? noop : (updater) => updateData((prev) => ({ ...prev, works: updater(prev.works) }))}
            {...metaProps(preview, 'works')}
            preview={preview}
            onToast={showToast}
          />
        </div>
        <div className="page-sec" id="sec-advantages" data-sec="advantages">
          <AdvantagesSection
            advantages={viewData.advantages}
            update={preview ? noop : (updater) => updateData((prev) => ({ ...prev, advantages: updater(prev.advantages) }))}
            {...metaProps(preview, 'advantages')}
            preview={preview}
            onGoSection={goSection}
          />
        </div>
        <div className="page-sec" id="sec-contact" data-sec="contact">
          <ContactSection
            contact={viewData.contact}
            update={preview ? noop : (patch) => updateSection('contact', patch)}
            preview={preview}
            onToast={showToast}
          />
        </div>
      </div>
    </div>
  )

  /* ---------- 短链接加载中 / 加载失败 ---------- */
  if (!shareData && shortState === 'loading') {
    return (
      <>
        {backdrop}
        <div className="share-loading">
          <span className="share-loading-dot" />
          正在打开分享的作品集…
        </div>
      </>
    )
  }

  if (!shareData && shortState === 'error') {
    return (
      <>
        {backdrop}
        <div className="share-loading error">
          <p className="share-loading-title">分享内容不存在或已被删除</p>
          <p className="share-loading-tip">请确认链接是否完整，或让对方重新生成一次分享链接。</p>
          <button className="btn btn-primary" onClick={() => {
            setShortState('idle')
            window.location.hash = ''
          }}>返回编辑器</button>
        </div>
      </>
    )
  }

  /* ---------- 分享访问模式（只读长页） ---------- */
  if (shareData) {
    return (
      <>
        {backdrop}
        <div className="preview-banner">
          <span>正在查看分享的作品集</span>
          <span className="p-back" onClick={() => {
            setShareData(null)
            setShortState('idle')
            window.location.hash = ''
          }}>我也要做一个 →</span>
        </div>
        {renderSections(true)}
        {toastMsg && <div className="toast">{toastMsg}</div>}
      </>
    )
  }

  /* ---------- 预览模式（保留顶部导航 + 右下操作栏） ---------- */
  if (mode === MODE.PREVIEW) {
    return (
      <>
        {backdrop}
        <NavBar current={section} onSelect={goSection} />
        {renderSections(true)}
        <ActionBar
          preview
          onToggleMode={backToEdit}
          onToggleColor={toggleColor}
          colorOpen={colorOpen}
          onShare={() => setShareOpen(true)}
        />
        <ColorPanel accent={data.theme.accent} onPick={pickColor} open={colorOpen} />
        {shareOpen && (
          <ShareModal url={longShareUrl} data={data} onClose={() => setShareOpen(false)} onToast={showToast} />
        )}
        {toastMsg && <div className="toast">{toastMsg}</div>}
      </>
    )
  }

  /* ---------- 编辑模式（全屏分页，下拉整页切换编辑） ---------- */
  return (
    <>
      {backdrop}

      <NavBar current={section} onSelect={goSection} />

      {renderSections(false)}

      <ActionBar
        preview={false}
        onToggleMode={enterPreview}
        onToggleColor={toggleColor}
        colorOpen={colorOpen}
        onShare={() => setShareOpen(true)}
      />
      <ColorPanel accent={data.theme.accent} onPick={pickColor} open={colorOpen} />

      {shareOpen && (
        <ShareModal url={longShareUrl} data={data} onClose={() => setShareOpen(false)} onToast={showToast} />
      )}
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </>
  )
}
