import { useRef } from 'react'
import EditableText from '../EditableText'
import { processImageFiles, processVideoFile } from '../../utils/image'

/** 图片/视频数量上限（超出时提示，避免 localStorage 溢出） */
const MAX_IMAGES = 10
const MAX_VIDEOS = 5

/**
 * 板块 03 · 个人作品（Bento 不对称网格）
 * 每张作品卡片支持：标题/介绍编辑、图片批量上传、视频上传
 * @param {Object} props
 * @param {Array} props.works 作品卡片列表
 * @param {Function} props.update (updater: Function) => void 以函数形式更新数组
 * @param {boolean} props.preview 是否预览模式
 * @param {Function} props.onToast toast 提示回调
 */
export default function WorksSection({ works, update, preview, onToast }) {
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
      <p className="kicker">03 / THE PRACTITIONER</p>
      <h2 className="sec-title">Portfolio / 作品集</h2>
      <p className="sec-sub">每一个作品都是一次深度的表达</p>

      <div className="works-grid">
        {works.map((work) => (
          <div key={work.id} className="work-card card-parent">
            {!preview && <button className="card-del" onClick={() => removeWork(work.id)} title="删除作品">✕</button>}

            {/* 媒体区：无内容时显示上传占位，有内容时显示缩略图列表 */}
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

            {/* 文案区 */}
            <div className="work-body">
              <EditableText as="h3" className="work-title" value={work.title} disabled={preview}
                onChange={(v) => patchWork(work.id, 'title', v)} placeholder="作品 / 案例标题" />
              <EditableText as="p" className="work-desc" value={work.desc} disabled={preview}
                onChange={(v) => patchWork(work.id, 'desc', v)} placeholder="一句简短的作品介绍" />
              <div className="work-meta">
                <span>图片 {work.images.length}/{MAX_IMAGES}</span>
                <span>视频 {work.videos.length}/{MAX_VIDEOS}</span>
              </div>
            </div>
          </div>
        ))}
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

  const boxStyle = compact
    ? { width: 150, minHeight: 150, flex: '0 0 auto' }
    : {}

  return (
    <div className="work-upload" style={boxStyle} onClick={(e) => e.stopPropagation()}>
      <span className="plus">+</span>
      <span>{compact ? '继续添加' : '上传图片或视频'}</span>
      <div style={{ display: 'flex', gap: 10, marginTop: 6 }} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="btn btn-subtle" style={{ padding: '6px 14px', fontSize: 12 }}
          onClick={() => imgInput.current?.click()}>选图片</button>
        <button type="button" className="btn btn-subtle" style={{ padding: '6px 14px', fontSize: 12 }}
          onClick={() => vidInput.current?.click()}>选视频</button>
      </div>
      <input ref={imgInput} type="file" accept="image/*" multiple hidden
        onChange={(e) => { onImages(e.target.files); e.target.value = '' }} />
      <input ref={vidInput} type="file" accept="video/*" hidden
        onChange={(e) => { onVideo(e.target.files?.[0]); e.target.value = '' }} />
    </div>
  )
}
