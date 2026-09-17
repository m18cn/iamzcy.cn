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
  EDIT: 'edit',       // 编辑模式（分屏切换板块）
  PREVIEW: 'preview'  // 预览模式（长页滚动展示）
}

/**
 * 应用根组件
 * - 编辑模式：顶部导航切换五大板块，右下操作栏（预览/色彩/导出网页）
 * - 预览模式：整页滚动展示，可复制分享链接
 * - 分享访问（URL 含 #/view/<数据>）：直接以只读模式渲染分享者数据
 */
export default function App() {
  const { data, updateData, updateSection, resetAll } = usePortfolio()

  /** URL 中的分享数据（存在即为分享访问模式） */
  const [shareData, setShareData] = useState(() => readShareFromLocation())
  /** 当前编辑板块 */
  const [section, setSection] = useState('about')
  /** 当前模式 */
  const [mode, setMode] = useState(MODE.EDIT)
  /** 弹窗与 toast */
  const [colorOpen, setColorOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  // 主题色同步到 CSS 变量（编辑数据或分享数据）
  useEffect(() => {
    const accent = (shareData || data).theme?.accent || '#C8FF00'
    document.documentElement.style.setProperty('--accent', accent)
  }, [data, shareData])

  // 模式切换时同步 body class（控制编辑控件显隐）
  useEffect(() => {
    const readonly = !!shareData || mode === MODE.PREVIEW
    document.body.classList.toggle('preview-mode', readonly)
  }, [shareData, mode])

  /** 显示 toast 提示（2 秒后自动消失） */
  const showToast = useCallback((msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 2200)
  }, [])

  /** 切换板块 */
  const goSection = useCallback((key) => {
    if (shareData) return // 分享模式下不允许跳转编辑
    setSection(key)
    setMode(MODE.EDIT)
    window.scrollTo({ top: 0 })
  }, [shareData])

  /** 进入预览模式 */
  const enterPreview = () => {
    setMode(MODE.PREVIEW)
    window.scrollTo({ top: 0 })
  }

  /** 返回编辑模式 */
  const backToEdit = () => {
    setMode(MODE.EDIT)
    window.scrollTo({ top: 0 })
  }

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

  /** 导出独立网页文件 */
  const handleExport = () => {
    downloadStandaloneHtml(data)
    showToast('网页文件已开始下载')
  }

  /** 生成分享链接 */
  const handleShare = () => {
    return buildShareUrl(data)
  }

  /* ---------- 分享访问模式（只读长页） ---------- */
  if (shareData) {
    const d = shareData
    return (
      <div className="stage">
        <div className="preview-banner">
          <span>正在查看分享的作品集</span>
          <span className="p-back" onClick={() => {
            setShareData(null)
            window.location.hash = ''
          }}>我也要做一个 →</span>
        </div>
        <div className="preview-sections">
          <AboutSection about={d.about} update={() => {}} preview onToast={showToast} onGoSection={() => {}} />
          <ExperienceSection experiences={d.experiences} update={() => {}} preview />
          <WorksSection works={d.works} update={() => {}} preview onToast={showToast} />
          <AdvantagesSection advantages={d.advantages} update={() => {}} preview onGoSection={() => {}} />
          <ContactSection contact={d.contact} update={() => {}} preview onToast={showToast} />
        </div>
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
        <div className="preview-sections">
          <AboutSection about={data.about} update={() => {}} preview onToast={showToast} onGoSection={() => {}} />
          <ExperienceSection experiences={data.experiences} update={() => {}} preview />
          <WorksSection works={data.works} update={() => {}} preview onToast={showToast} />
          <AdvantagesSection advantages={data.advantages} update={() => {}} preview onGoSection={() => {}} />
          <ContactSection contact={data.contact} update={() => {}} preview onToast={showToast} />
        </div>
        {shareOpen && <ShareModal url={handleShare()} onClose={() => setShareOpen(false)} onToast={showToast} />}
        {toastMsg && <div className="toast">{toastMsg}</div>}
      </div>
    )
  }

  /* ---------- 编辑模式（分屏切换） ---------- */
  return (
    <>
      <NavBar current={section} onSelect={goSection} onExit={handleExit} />

      <div className="stage" key={section}>
        {section === 'about' && (
          <AboutSection
            about={data.about}
            update={(patch) => updateSection('about', patch)}
            preview={false}
            onToast={showToast}
            onGoSection={goSection}
          />
        )}
        {section === 'experiences' && (
          <ExperienceSection
            experiences={data.experiences}
            update={(updater) => updateData((prev) => ({ ...prev, experiences: updater(prev.experiences) }))}
            preview={false}
          />
        )}
        {section === 'works' && (
          <WorksSection
            works={data.works}
            update={(updater) => updateData((prev) => ({ ...prev, works: updater(prev.works) }))}
            preview={false}
            onToast={showToast}
          />
        )}
        {section === 'advantages' && (
          <AdvantagesSection
            advantages={data.advantages}
            update={(updater) => updateData((prev) => ({ ...prev, advantages: updater(prev.advantages) }))}
            preview={false}
            onGoSection={goSection}
          />
        )}
        {section === 'contact' && (
          <ContactSection
            contact={data.contact}
            update={(patch) => updateSection('contact', patch)}
            preview={false}
            onToast={showToast}
          />
        )}
      </div>

      <ActionBar onPreview={enterPreview} onColor={() => setColorOpen(true)} onExport={handleExport} />

      {colorOpen && (
        <ColorPanel accent={data.theme.accent} onPick={pickColor} onClose={() => setColorOpen(false)} />
      )}
      {shareOpen && <ShareModal url={handleShare()} onClose={() => setShareOpen(false)} onToast={showToast} />}
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </>
  )
}
