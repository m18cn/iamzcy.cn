import { useRef, useState } from 'react'
import EditableText from '../EditableText'
import { processImageFiles, readFileAsDataURL, compressImage } from '../../utils/image'

/** 画廊图片数量上限（与原站一致） */
const GALLERY_MAX = 16

/** 空画廊时展示的幽灵占位卡片数量 */
const GHOST_COUNT = 6

/** 便签（浮动标签）定位样式类总数，按顺序循环使用 */
const TAG_POS_COUNT = 6

/**
 * 板块 01 · 关于我（Hero）
 * 左侧：问候语 + 大标题 + 简介 + 分隔线 + CTA + 添加便签入口
 * 右侧：圆形头像（更换/删除封面）+ 浮动便签标签 + NOW 状态卡
 * 底部：横向画廊卡片（悬停上浮位移动效）
 *
 * @param {Object} props
 * @param {Object} props.about about 板块数据
 * @param {Function} props.update (patch: Object) => void 更新 about 板段
 * @param {boolean} props.preview 是否预览模式（隐藏编辑控件）
 * @param {Function} props.onToast toast 提示回调
 * @param {Function} props.onGoSection 板块跳转回调 (key: string) => void
 */
export default function AboutSection({ about, update, preview, onToast, onGoSection }) {
  const avatarInput = useRef(null)
  const galleryInput = useRef(null)
  const [galleryBusy, setGalleryBusy] = useState(false)

  /** 触发头像文件选择 */
  const pickAvatar = () => {
    if (!preview) avatarInput.current?.click()
  }

  /** 处理头像上传：读取 → 压缩 → 更新数据 */
  const onAvatarFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const raw = await readFileAsDataURL(file)
    const compressed = await compressImage(raw, 800, 0.78)
    update({ avatar: compressed })
    onToast('头像已更新')
    e.target.value = ''
  }

  /** 删除头像封面 */
  const removeAvatar = () => {
    update({ avatar: null })
    onToast('已删除封面')
  }

  /** 触发画廊多选图片（达到上限时提示） */
  const pickGallery = () => {
    if (about.gallery.length >= GALLERY_MAX) {
      onToast(`最多添加 ${GALLERY_MAX} 张图片`)
      return
    }
    galleryInput.current?.click()
  }

  /** 批量处理画廊图片上传（自动截断到上限） */
  const onGalleryFiles = async (e) => {
    const files = e.target.files
    if (!files?.length) return
    setGalleryBusy(true)
    const remain = GALLERY_MAX - about.gallery.length
    const imgs = await processImageFiles(files, { maxWidth: 640, quality: 0.68 })
    const picked = imgs.slice(0, Math.max(remain, 0))
    if (picked.length) {
      update((a) => ({
        gallery: [...a.gallery, ...picked.map((src) => ({ id: Math.random().toString(36).slice(2, 9), src }))]
      }))
    }
    setGalleryBusy(false)
    onToast(picked.length < imgs.length ? `已达上限，添加了 ${picked.length} 张图片` : `已添加 ${picked.length} 张图片`)
    e.target.value = ''
  }

  /** 删除指定画廊图片 */
  const removeGalleryItem = (id) => {
    update((a) => ({ gallery: a.gallery.filter((g) => g.id !== id) }))
  }

  /** 清空画廊（二次确认） */
  const clearGallery = () => {
    if (about.gallery.length && window.confirm('确定清空全部画廊图片吗？')) {
      update({ gallery: [] })
    }
  }

  /** 添加一条便签（浮动标签） */
  const addNote = () => {
    const text = window.prompt('输入便签内容')
    if (text?.trim()) {
      update((a) => ({ notes: [...a.notes, { id: Math.random().toString(36).slice(2, 9), text: text.trim() }] }))
    }
  }

  /** 删除指定便签 */
  const removeNote = (id) => {
    update((a) => ({ notes: a.notes.filter((n) => n.id !== id) }))
  }

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="watermark">PORTFOLIO</div>

      <div className="hero">
        {/* 左侧文案区 */}
        <div>
          <EditableText as="p" className="hero-hello" value={about.hello} disabled={preview}
            onChange={(v) => update({ hello: v })} placeholder="HELLO / 你好" />
          <EditableText as="h1" className="hero-name" value={about.name} disabled={preview}
            onChange={(v) => update({ name: v })} placeholder="我是XXX" />
          <EditableText as="p" className="hero-subtitle" value={about.subtitle} disabled={preview}
            onChange={(v) => update({ subtitle: v })} placeholder="PORTFOLIO" />
          <EditableText as="p" className="hero-title" value={about.title} disabled={preview}
            onChange={(v) => update({ title: v })} placeholder="职业名称" />
          <EditableText as="p" className="hero-bio" value={about.bio} disabled={preview} multiline
            onChange={(v) => update({ bio: v })} placeholder="写一句关于你的简介" />

          {/* 简介下的强调色细分隔线 */}
          <div className="hero-divider" />

          <div className="hero-cta">
            <button className="btn btn-primary" onClick={() => onGoSection('works')}>查看我的作品 ↗</button>
            <button className="btn btn-ghost" onClick={() => onGoSection('contact')}>联系我</button>
          </div>

          {/* 添加便签入口（编辑模式） */}
          {!preview && (
            <div className="notes-row">
              <button className="btn btn-subtle" onClick={addNote}>+ 添加便签</button>
            </div>
          )}
        </div>

        {/* 右侧头像区 */}
        <div className="avatar-wrap">
          {/* 头像主体（圆形 / 圆角胶囊两种形状可切换） */}
          <div
            className={`avatar-box card-parent ${about.avatarShape === 'rounded' ? 'shape-rounded' : ''}`}
            onClick={pickAvatar}
          >
            {about.avatar ? (
              <img src={about.avatar} alt="头像" />
            ) : (
              <div className="avatar-ph">
                <span className="plus-ring">+</span>
                <span>上传头像</span>
              </div>
            )}
            {!preview && <div className="avatar-tip">点击替换头像</div>}
          </div>

          {/* 头像形状切换胶囊（编辑模式，头像下方居中） */}
          {!preview && (
            <div className="shape-toggle">
              <button
                className={`st-btn ${about.avatarShape !== 'rounded' ? 'active' : ''}`}
                onClick={() => update({ avatarShape: 'circle' })}
              >
                圆形胶囊
              </button>
              <button
                className={`st-btn ${about.avatarShape === 'rounded' ? 'active' : ''}`}
                onClick={() => update({ avatarShape: 'rounded' })}
              >
                圆角胶囊
              </button>
            </div>
          )}

          {/* 封面操作胶囊按钮（编辑模式，位于圆形头像上方） */}
          {!preview && about.avatar && (
            <div className="avatar-ops">
              <button className="av-op" onClick={(e) => { e.stopPropagation(); pickAvatar() }}>更换封面</button>
              <button className="av-op av-op-danger" onClick={(e) => { e.stopPropagation(); removeAvatar() }}>删除封面</button>
            </div>
          )}

          {/* 头像浮动便签标签（围绕圆形头像漂浮） */}
          {about.notes.map((n, i) => (
            <span key={n.id} className={`avatar-tag tag-pos-${i % TAG_POS_COUNT}`}
              style={{ animationDelay: `${(i % 5) * 0.55}s` }}>
              {n.text}
              {!preview && <button className="n-del" onClick={() => removeNote(n.id)}>✕</button>}
            </span>
          ))}

          {/* NOW 状态浮动卡片 */}
          {about.nowBadge?.visible && (
            <div className="now-card">
              <span className="now-label">NOW</span>
              <EditableText value={about.nowBadge.text} disabled={preview}
                onChange={(v) => update({ nowBadge: { ...about.nowBadge, text: v } })}
                placeholder="开放合作 / 作品交流" />
              {!preview && (
                <button className="now-close" title="隐藏此卡片"
                  onClick={() => update({ nowBadge: { ...about.nowBadge, visible: false } })}>✕</button>
              )}
            </div>
          )}
          {/* NOW 卡片被关闭后可重新显示（仅编辑模式） */}
          {!preview && !about.nowBadge?.visible && (
            <button className="btn btn-subtle now-card" style={{ right: -14, bottom: 22, left: 'auto', position: 'absolute' }}
              onClick={() => update({ nowBadge: { ...about.nowBadge, visible: true } })}>+ 显示状态卡</button>
          )}
        </div>
      </div>

      {/* 底部横向画廊 */}
      <div className="gallery-area">
        <div className="gallery-row">
          {about.gallery.map((g) => (
            <div key={g.id} className="g-card card-parent">
              <img src={g.src} alt="画廊图片" />
              {!preview && <button className="card-del" onClick={() => removeGalleryItem(g.id)}>✕</button>}
            </div>
          ))}
          {/* 空画廊幽灵占位卡片（编辑模式） */}
          {!preview && about.gallery.length === 0 && Array.from({ length: GHOST_COUNT }).map((_, i) => (
            <button key={`ghost-${i}`} className="g-ghost" onClick={pickGallery} disabled={galleryBusy} title="点击上传图片">
              <span>+</span>
            </button>
          ))}
          {/* 尾部添加卡片（编辑模式，未达上限时显示） */}
          {!preview && about.gallery.length > 0 && about.gallery.length < GALLERY_MAX && (
            <button className="g-add" onClick={pickGallery} disabled={galleryBusy}>
              {galleryBusy ? '…' : '+'}
            </button>
          )}
        </div>
        {!preview && (
          <div className="gallery-ctrl">
            <button className="btn btn-primary btn-sm" onClick={pickGallery}>+ 增加图片</button>
            <button className="link-btn" onClick={clearGallery}>清空图片</button>
            <span className="gallery-count">{about.gallery.length}/{GALLERY_MAX}</span>
          </div>
        )}
      </div>

      {/* 隐藏的文件选择器 */}
      <input ref={avatarInput} type="file" accept="image/*" hidden onChange={onAvatarFile} />
      <input ref={galleryInput} type="file" accept="image/*" multiple hidden onChange={onGalleryFiles} />
    </div>
  )
}
