import { useEffect, useRef, useState } from 'react'
import EditableText from '../EditableText'
import SectionHeading from '../SectionHeading'
import { processImageFiles, processVideoFile } from '../../utils/image'

/** 图片/视频数量上限（超出时提示，避免 localStorage 溢出） */
const MAX_IMAGES = 10
const MAX_VIDEOS = 5

/** 网格最大列数（对标站最多 4 列，每列放 2 张卡片） */
const MAX_COLS = 4

/** 各视口宽度下允许的最大列数（窄屏收敛，避免卡片被挤扁） */
function colsForViewport() {
  if (typeof window === 'undefined') return MAX_COLS
  const w = window.innerWidth
  if (w <= 900) return 1
  if (w <= 1100) return 2
  if (w <= 1500) return 3
  return MAX_COLS
}

/** 图片状态胶囊里的方形图标 */
function ImageIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.4 10.6 6 7.2l2.8 2.4L11 7.6l2.8 2.7" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

/** 视频状态胶囊里的播放图标 */
function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4.8 2.9 12.6 8l-7.8 5.1V2.9Z" fill="currentColor" />
    </svg>
  )
}

/**
 * 板块 03 · 个人作品（Bento 不对称网格）
 * 卡片对齐对标站：强调色玻璃底 + 整卡上传区 + 右下角状态胶囊；
 * 标题/副标题可编辑，每张卡片支持标题/介绍编辑、图片批量上传、视频上传
 *
 * @param {Object} props
 * @param {Array} props.works 作品卡片列表
 * @param {Function} props.update (updater: Function) => void 以函数形式更新数组
 * @param {Object} props.meta 板块标题文案（可编辑）
 * @param {Function} props.onMetaChange (patch: Object) => void 更新标题文案
 * @param {boolean} props.preview 是否预览模式
 * @param {Function} props.onToast toast 提示回调
 */
export default function WorksSection({ works, update, meta, onMetaChange, preview, onToast }) {
  /** 视口允许的最大列数（跟随窗口宽度收敛） */
  const [maxCols, setMaxCols] = useState(colsForViewport)

  useEffect(() => {
    const onResize = () => setMaxCols(colsForViewport())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  /**
   * 网格结构（一比一复刻对标站的自适应规律）：
   * - 每列放 2 张卡片，列数 = min(视口上限, ⌊卡片数/2⌋ + 1)，最多 4 列
   *   1 张 → 1 列、2~3 张 → 2 列、4~5 张 → 3 列、6 张以上 → 4 列
   * - 2 列 × 行数 的槽位若多于卡片数，多出的槽位由首张（剩余 2 个槽位时再加末张）
   *   跨两行填满，于是 3 张 =「左大 + 右二」、4 张 =「左大 + 中二 + 右大」……
   */
  const cols = Math.max(1, Math.min(maxCols, Math.floor(works.length / 2) + 1))
  const tallCount = Math.max(0, cols * 2 - works.length)

  /** 更新指定作品的字段 */
  const patchWork = (id, field, value) => {
    update((list) => list.map((w) => (w.id === id ? { ...w, [field]: value } : w)))
  }

  /** 追加一张空白作品卡片 */
  const addWork = () => {
    update((list) => [...list, {
      id: Math.random().toString(36).slice(2, 9),
      title: '作品 / 案例标题',
      desc: '一句简短的作品介绍',
      images: [],
      videos: []
    }])
  }

  /** 删除指定作品卡片 */
  const removeWork = (id) => {
    update((list) => list.filter((w) => w.id !== id))
  }

  /** 批量上传作品图片 */
  const addImages = async (work, files) => {
    const room = MAX_IMAGES - work.images.length
    if (room <= 0) {
      onToast(`单个作品最多 ${MAX_IMAGES} 张图片`)
      return
    }
    const picked = Array.from(files).slice(0, room)
    const imgs = await processImageFiles(picked, { maxWidth: 900, quality: 0.7 })
    patchWork(work.id, 'images', [...work.images, ...imgs])
    onToast(`已上传 ${imgs.length} 张图片`)
  }

  /** 上传单个作品视频 */
  const addVideo = async (work, file) => {
    if (!file) return
    if (work.videos.length >= MAX_VIDEOS) {
      onToast(`单个作品最多 ${MAX_VIDEOS} 个视频`)
      return
    }
    if (file.size > 25 * 1024 * 1024) {
      onToast('视频请控制在 25MB 以内')
      return
    }
    const src = await processVideoFile(file)
    if (src) {
      patchWork(work.id, 'videos', [...work.videos, src])
      onToast('视频已上传')
    }
  }

  /** 删除指定媒体项（type: image | video, index: 序号） */
  const removeMedia = (work, type, index) => {
    const list = [...work[type]]
    list.splice(index, 1)
    patchWork(work.id, type, list)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <SectionHeading meta={meta} onChange={onMetaChange} preview={preview}
        placeholders={{ kicker: '03 / THE PRACTITIONER', title: 'Portfolio / 作品集', sub: '每一个作品都是一次深度的表达' }} />

      <div className="works-grid" style={{ '--works-cols': cols }}>
        {works.map((work, i) => {
          /**
           * 跨两行的"大卡"：首张固定放第 1 列、末张固定放最后一列（都占第 1~2 行），
           * 其余卡片交给自动流逐格填充，于是得到对标站的结构：
           * 3 张=左大+右二、4 张=左大+中二+右大、5 张=左大+中二+右二……
           */
          const firstTall = i === 0 && tallCount >= 1
          const lastTall = i === works.length - 1 && tallCount >= 2
          const place = firstTall
            ? { gridColumn: 1, gridRow: '1 / span 2' }
            : lastTall
              ? { gridColumn: cols, gridRow: '1 / span 2' }
              : undefined
          return (
          <div key={work.id} className={`work-card card-parent ${place ? 'is-tall' : ''}`} style={place}>
            {!preview && <button className="card-del" onClick={() => removeWork(work.id)} title="删除作品">✕</button>}

            {/* 媒体区：无内容时整卡即上传区，有内容时显示缩略图列表 */}
            {work.images.length + work.videos.length === 0 ? (
              <WorkUploadZone preview={preview}
                onImages={(files) => addImages(work, files)}
                onVideo={(file) => addVideo(work, file)} />
            ) : (
              <div className="work-media">
                {work.images.map((src, i) => (
                  <div key={`img-${i}`} className="m-item">
                    <img src={src} alt={`${work.title} 图片${i + 1}`} />
                    {!preview && <button className="m-del" onClick={() => removeMedia(work, 'images', i)}>✕</button>}
                  </div>
                ))}
                {work.videos.map((src, i) => (
                  <div key={`vid-${i}`} className="m-item">
                    <video src={src} controls playsInline />
                    {!preview && <button className="m-del" onClick={() => removeMedia(work, 'videos', i)}>✕</button>}
                  </div>
                ))}
                {/* 编辑模式下可继续追加 */}
                {!preview && (
                  <WorkUploadZone compact
                    onImages={(files) => addImages(work, files)}
                    onVideo={(file) => addVideo(work, file)} />
                )}
              </div>
            )}

            {/* 文案区：左侧标题/介绍，右下角图片/视频数量胶囊（对齐对标站） */}
            <div className="work-body">
              <div className="work-body-main">
                <EditableText as="h3" className="work-title" value={work.title} disabled={preview}
                  onChange={(v) => patchWork(work.id, 'title', v)} placeholder="作品 / 案例标题" />
                <EditableText as="p" className="work-desc" value={work.desc} disabled={preview}
                  onChange={(v) => patchWork(work.id, 'desc', v)} placeholder="一句简短的作品介绍" />
              </div>
              <div className="work-meta">
                <span className="work-pill"><ImageIcon />图片 ({work.images.length}/{MAX_IMAGES})</span>
                <span className="work-pill"><PlayIcon />视频 ({work.videos.length}/{MAX_VIDEOS})</span>
              </div>
            </div>
          </div>
          )
        })}
      </div>

      {!preview && (
        <div className="works-footer">
          <button className="btn btn-subtle" onClick={addWork}>+ 添加作品板块</button>
          <span className="exp-count">已添加 {works.length} 个板块</span>
        </div>
      )}
    </div>
  )
}

/**
 * 作品上传占位区（支持图片批量 + 单视频）
 * @param {Object} props
 * @param {boolean} [props.compact] 紧凑模式（已有媒体时继续追加）
 * @param {boolean} [props.preview] 预览模式下不渲染
 * @param {Function} props.onImages 图片文件回调
 * @param {Function} props.onVideo 视频文件回调
 */
function WorkUploadZone({ compact = false, preview = false, onImages, onVideo }) {
  const imgInput = useRef(null)
  const vidInput = useRef(null)
  if (preview) return null

  /* 紧凑模式：已有媒体时在缩略图末尾追加一个小方块 */
  if (compact) {
    return (
      <div className="work-upload compact" onClick={(e) => e.stopPropagation()}>
        <span className="plus">+</span>
        <span>继续添加</span>
        <div className="work-upload-actions" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn btn-subtle btn-xs"
            onClick={() => imgInput.current?.click()}>选图片</button>
          <button type="button" className="btn btn-subtle btn-xs"
            onClick={() => vidInput.current?.click()}>选视频</button>
        </div>
        <input ref={imgInput} type="file" accept="image/*" multiple hidden
          onChange={(e) => { onImages(e.target.files); e.target.value = '' }} />
        <input ref={vidInput} type="file" accept="video/*" hidden
          onChange={(e) => { onVideo(e.target.files?.[0]); e.target.value = '' }} />
      </div>
    )
  }

  /* 空卡：整张卡片就是上传区，提示文字居中，点卡片即选图片（对齐对标站） */
  return (
    <div className="work-drop" onClick={() => imgInput.current?.click()}>
      <span className="work-drop-hint">上传图片或视频</span>
      <div className="work-drop-actions" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="btn btn-subtle btn-xs"
          onClick={() => imgInput.current?.click()}>选图片</button>
        <button type="button" className="btn btn-subtle btn-xs"
          onClick={() => vidInput.current?.click()}>选视频</button>
      </div>
      <input ref={imgInput} type="file" accept="image/*" multiple hidden
        onChange={(e) => { onImages(e.target.files); e.target.value = '' }} />
      <input ref={vidInput} type="file" accept="video/*" hidden
        onChange={(e) => { onVideo(e.target.files?.[0]); e.target.value = '' }} />
    </div>
  )
}
