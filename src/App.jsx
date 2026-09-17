import { useEffect, useState, useCallback } from 'react'
import { usePortfolio } from './hooks/usePortfolio'
import { readShareFromLocation, buildShareUrl } from './utils/share'
import { downloadStandaloneHtml } from './utils/exportHtml'
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
 *   顶部导航点击平滑滚动到对应板块；右下角操作栏（预览/色彩/导出网页），
 *   点击"色彩"展开/收起主题色板；编辑内容自动保存到本地
 * - 预览模式：同布局隐藏编辑控件，顶部横幅可返回编辑 / 复制分享链接
 * - 分享访问（URL 含 #/view/<数据>）：直接以只读模式渲染分享者数据
 */
export default function App() {
  const { data, updateData, updateSection, resetAll, saveNow } = usePortfolio()

  /** URL 中的分享数据（存在即为分享访问模式） */
  const [shareData, setShareData] = useState(() => readShareFromLocation())
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

  // 主题色同步到 CSS 变量
  useEffect(() => {
    const accent = viewData.theme?.accent || '#C8FF00'
    document.documentElement.style.setProperty('--accent', accent)
  }, [viewData])

  // 模式切换时同步 body class（控制编辑控件显隐）
  useEffect(() => {
    document.body.classList.toggle('preview-mode', readonly)
  }, [readonly])

  // 编辑模式下监听滚动：检测占据视口中线的板块，自动高亮导航
  // （全屏分页布局下，中线检测与 scroll-snap 吸附位置天然对应）
  useEffect(() => {
    if (readonly) return
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
  }, [readonly])

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

  /** 退出编辑：确认后重置全部内容 */
  const handleExit = () => {
    if (window.confirm('确定退出吗？将清空本地编辑内容并恢复默认模板。')) {
      resetAll()
      setSection('about')
      setMode(MODE.EDIT)
      showToast('已重置为默认模板')
    }
  }

  /** 导出独立网页文件（先静默保存） */
  const handleExport = () => {
    saveNow()
    downloadStandaloneHtml(data)
    showToast('网页文件已开始下载')
  }

  /** 生成分享链接 */
  const handleShare = () => {
    return buildShareUrl(data)
  }

  /**
   * 渲染全部板块（编辑与预览/分享共用长页布局）
   * @param {boolean} preview 是否隐藏编辑控件
   */
  const renderSections = (preview) => (
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
          preview={preview}
        />
      </div>
      <div className="page-sec" id="sec-works" data-sec="works">
        <WorksSection
          works={viewData.works}
          update={preview ? noop : (updater) => updateData((prev) => ({ ...prev, works: updater(prev.works) }))}
          preview={preview}
          onToast={showToast}
        />
      </div>
      <div className="page-sec" id="sec-advantages" data-sec="advantages">
        <AdvantagesSection
          advantages={viewData.advantages}
          update={preview ? noop : (updater) => updateData((prev) => ({ ...prev, advantages: updater(prev.advantages) }))}
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
  )

  /* ---------- 分享访问模式（只读长页） ---------- */
  if (shareData) {
    return (
      <div className="stage">
        <div className="preview-banner">
          <span>正在查看分享的作品集</span>
          <span className="p-back" onClick={() => {
            setShareData(null)
            window.location.hash = ''
          }}>我也要做一个 →</span>
        </div>
        {renderSections(true)}
        {toastMsg && <div className="toast">{toastMsg}</div>}
      </div>
    )
  }

  /* ---------- 预览模式（长页滚动 + 顶部横幅） ---------- */
  if (mode === MODE.PREVIEW) {
    return (
      <div className="stage">
        <div className="preview-banner">
          <span>预览模式</span>
          <span className="p-back" onClick={backToEdit}>← 返回编辑</span>
          <span className="p-back" onClick={() => setShareOpen(true)}>复制分享链接</span>
        </div>
        {renderSections(true)}
        {shareOpen && <ShareModal url={handleShare()} onClose={() => setShareOpen(false)} onToast={showToast} />}
        {toastMsg && <div className="toast">{toastMsg}</div>}
      </div>
    )
  }

  /* ---------- 编辑模式（全屏分页，下拉整页切换编辑） ---------- */
  return (
    <>
      <NavBar current={section} onSelect={goSection} onExit={handleExit} />

      <div className="stage">
        {renderSections(false)}
      </div>

      <ActionBar
        onPreview={enterPreview}
        onToggleColor={toggleColor}
        onExport={handleExport}
        colorOpen={colorOpen}
      />
      <ColorPanel accent={data.theme.accent} onPick={pickColor} open={colorOpen} />

      {shareOpen && <ShareModal url={handleShare()} onClose={() => setShareOpen(false)} onToast={showToast} />}
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </>
  )
}
