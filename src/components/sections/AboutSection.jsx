import { useEffect, useRef, useState } from 'react'
import EditableText from '../EditableText'
import { processImageFiles, readFileAsDataURL, compressImage } from '../../utils/image'

/** 画廊图片数量上限（与原站一致） */
const GALLERY_MAX = 16

/** 画廊 dock 基础卡位数：7 张卡形成两端上翘的弧形（与原站一致） */
const DOCK_SLOTS = 7

/** 每个卡位的旋转角（度）：-5 → +5 递增，首尾对称 */
const DOCK_ROTATES = [-5, -3.33, -1.67, 0, 1.67, 3.33, 5]

/** 每个卡位的抬升量（px）：两端高中间低，形成弧形卡片带 */
const DOCK_LIFTS = [16, 6, -3, -8, -3, 6, 16]

/**
 * 拆字动画文本组件（复刻原站 model3-split-char）
 * 视觉层：逐字 span 播放 m3-split-char-in 弹入动画，--m3-split-delay 逐字递增
 * 编辑层：透明 contentEditable 覆盖在视觉层之上（仅编辑模式），光标为强调色；
 * 输入时通过 live 状态实时重拆视觉层，打字即见（失焦才正式提交到全局数据）
 *
 * @param {Object} props
 * @param {string} props.value 当前文本
 * @param {Function} props.onChange 提交回调
 * @param {boolean} props.disabled 是否禁用编辑（预览模式只显示拆字动画）
 * @param {string} [props.className] 附加类名（控制字体大小与颜色）
 * @param {number} [props.step] 每字动画延迟递增量（ms）
 * @param {string} [props.placeholder] 空值占位提示
 */
function SplitText({ value, onChange, disabled, className = '', step = 92, placeholder = '' }) {
  /** 输入中的实时文本（null 表示未在编辑，回落到全局 value） */
  const [live, setLive] = useState(null)
  /** 实际渲染文本：编辑中用 live，平时用全局 value */
  const shown = live ?? value ?? ''
  const chars = Array.from(shown)

  return (
    <span className={`m3-edit-wrap ${className}`.trim()}>
      {/* 视觉层：拆字动画（预览与编辑共用，输入时实时重拆） */}
      <span className="m3-split-text" aria-label={shown}>
        {chars.length
          ? chars.map((c, i) => (
              <span
                key={`${i}-${c}`}
                className="m3-split-char"
                aria-hidden="true"
                style={{ '--m3-split-delay': `${i * step}ms` }}
              >
                {c}
              </span>
            ))
          : <span className="m3-split-ph">{placeholder}</span>}
      </span>
      {/* 编辑层：透明文字的可编辑覆盖层，直接在拆字效果上打字 */}
      {!disabled && (
        <EditableText as="span" className="m3-edit-overlay" value={value}
          onChange={(v) => { setLive(null); onChange(v) }}
          onInput={(t) => setLive(t?.replace(/\u00a0/g, ' '))}
          placeholder="" />
      )}
    </span>
  )
}

/**
 * 板块 01 · 关于我（Hero）
 * 左侧：问候语 + 大标题（名字/英文标拆字动画）+ 职业 + 简介 + 双胶囊 CTA + 便签板
 * 右侧：圆形头像（更换/删除封面）+ NOW 状态卡
 * 底部：画廊 dock（两端上翘的弧形卡片带，悬停上浮回正）
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
  /** dock 容器引用：上传后滚动到最新卡片，让结果立刻可见 */
  const dockRef = useRef(null)
  /** 待替换的卡片下标（null 表示本次是追加新图片） */
  const replaceIndex = useRef(null)
  /** 高亮计时器 */
  const flashTimer = useRef(null)
  /** 便签板容器引用：新增便签后聚焦新卡 */
  const noteBoardRef = useRef(null)
  const [galleryBusy, setGalleryBusy] = useState(false)
  /** 刚上传/替换完成的卡片 id：短暂强调色高亮，明确反馈上传结果 */
  const [justAdded, setJustAdded] = useState([])
  /** 刚添加的便签 id：不做进场延迟，点完立刻可见可输入 */
  const [newNoteId, setNewNoteId] = useState(null)

  // 卸载时清理高亮计时器
  useEffect(() => () => clearTimeout(flashTimer.current), [])

  /** 高亮刚加入的卡片（1.2s 后自动淡出高亮） */
  const flashNew = (ids) => {
    const list = ids.filter(Boolean)
    if (!list.length) return
    setJustAdded(list)
    clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setJustAdded([]), 1200)
  }

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
    replaceIndex.current = null
    galleryInput.current?.click()
  }

  /** 点击已上传的卡片：替换该位置的图片 */
  const replaceGalleryItem = (index) => {
    if (preview) return
    replaceIndex.current = index
    galleryInput.current?.click()
  }

  /** 批量处理画廊图片上传（替换单张 / 追加多张，自动截断到上限） */
  const onGalleryFiles = async (e) => {
    const files = e.target.files
    if (!files?.length) return
    setGalleryBusy(true)
    const replaceAt = replaceIndex.current
    replaceIndex.current = null

    // 情况一：点击某张卡片 → 只替换这一张
    if (replaceAt !== null) {
      const [one] = await processImageFiles([files[0]], { maxWidth: 640, quality: 0.68 })
      setGalleryBusy(false)
      e.target.value = ''
      if (!one) return
      const target = about.gallery[replaceAt]
      update((a) => ({ gallery: a.gallery.map((g, i) => (i === replaceAt ? { ...g, src: one } : g)) }))
      flashNew([target?.id])
      onToast('图片已替换')
      return
    }

    // 情况二：追加新图片
    const remain = GALLERY_MAX - about.gallery.length
    const imgs = await processImageFiles(files, { maxWidth: 640, quality: 0.68 })
    const picked = imgs.slice(0, Math.max(remain, 0))
    if (picked.length) {
      const items = picked.map((src) => ({ id: Math.random().toString(36).slice(2, 9), src }))
      update((a) => ({ gallery: [...a.gallery, ...items] }))
      flashNew(items.map((it) => it.id))
      // 新卡片追加在队列末尾：自动滚到最右，上传结果立刻可见
      requestAnimationFrame(() => {
        const dock = dockRef.current
        if (dock) dock.scrollTo({ left: dock.scrollWidth, behavior: 'smooth' })
      })
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

  /** 添加一条便签：
   *  先在便签板末尾"占位"插入一张空便签卡（显示占位文案），
   *  添加按钮顺势排到它后面，并立刻聚焦等待输入——不再弹系统 prompt。 */
  const addNote = () => {
    const id = Math.random().toString(36).slice(2, 9)
    update((a) => ({ notes: [...a.notes, { id, text: '' }] }))
    setNewNoteId(id)
    focusLastNote()
  }

  /** 聚焦最后一张便签的编辑区（新卡挂载后自动进入输入状态） */
  const focusLastNote = (tries = 0) => {
    requestAnimationFrame(() => {
      const list = noteBoardRef.current?.querySelectorAll('.note-card .editable')
      const last = list?.[list.length - 1]
      if (last) last.focus()
      else if (tries < 3) setTimeout(() => focusLastNote(tries + 1), 45)
    })
  }

  /** 删除指定便签 */
  const removeNote = (id) => {
    update((a) => ({ notes: a.notes.filter((n) => n.id !== id) }))
  }

  /**
   * 编辑模式下的空卡位数量：
   * 图片不足 7 张时补齐到 7 张（形成两端上翘的弧形卡片带），
   * 已有 7 张及以上则不再追加空卡位（与图 1 的 7/16 状态一致），
   * 继续加图走底部"+ 增加图片"，或点击任意卡片就地替换。
   */
  const emptySlots = preview ? 0 : Math.max(0, Math.min(DOCK_SLOTS, GALLERY_MAX) - about.gallery.length)

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="watermark">PORTFOLIO</div>

      <div className="hero">
        {/* 左侧文案区：m3-rise 进场 + 逐字拆字动画 + 便签板 */}
        <div className="m3-left-cluster">
          <div className="m3-hero-copy">
            <EditableText as="p" className="hero-hello" value={about.hello} disabled={preview}
              onChange={(v) => update({ hello: v })} placeholder="HELLO / 你好" />
            {/* 大标题：中文名（强调色 0.8em）+ 英文标（白色 0.42em）两行拆字动画 */}
            <h1 className="m3-hero-title">
              <SplitText className="m3-hero-name" value={about.name} disabled={preview} step={92}
                onChange={(v) => update({ name: v })} placeholder="我是XXX" />
              <SplitText className="m3-hero-wordmark" value={about.subtitle} disabled={preview} step={76}
                onChange={(v) => update({ subtitle: v })} placeholder="PORTFOLIO" />
            </h1>
            <EditableText as="p" className="m3-hero-role" value={about.title} disabled={preview}
              onChange={(v) => update({ title: v })} placeholder="职业名称" />
            <EditableText as="p" className="hero-bio" value={about.bio} disabled={preview} multiline
              onChange={(v) => update({ bio: v })} placeholder="写一句关于你的简介，让别人快速了解你。" />

            <div className="hero-cta">
              <button className="btn btn-primary" onClick={() => onGoSection('works')}>查看我的作品 ↗</button>
              <button className="btn btn-ghost" onClick={() => onGoSection('contact')}>联系我</button>
            </div>
          </div>

          {/* 便签板：彩色便签卡网格（预览模式下无便签则整板隐藏）
              点"+ 添加便签"是在末尾占位插入一张空便签卡，添加按钮自然排到它后面 */}
          {(about.notes.length > 0 || !preview) && (
            <div className="note-board" aria-label="关于我的便签" ref={noteBoardRef}>
              {about.notes.map((n, i) => (
                <div key={n.id} className={`note-card note-var-${i % 3}`}
                  style={{ animationDelay: n.id === newNoteId ? '0s' : `${(0.34 + i * 0.08).toFixed(2)}s` }}>
                  <EditableText value={n.text} disabled={preview}
                    onChange={(v) => update((a) => ({
                      notes: a.notes.map((x) => (x.id === n.id ? { ...x, text: v } : x))
                    }))}
                    placeholder="个人标签/学历/教育等" />
                  {!preview && <button className="note-del" aria-label="删除便签" onClick={() => removeNote(n.id)}>×</button>}
                </div>
              ))}
              {!preview && <button className="note-add" onClick={addNote}>＋ 添加便签</button>}
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
                <span>点击替换头像</span>
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

      {/* 底部画廊 dock：两端上翘的弧形卡片带（rotate/lift 内联变量驱动） */}
      <div className="gallery-stage">
        <div className="gallery-dock" ref={dockRef}>
          {/* 已上传图片卡：点击替换该张，右上角 ✕ 删除 */}
          {about.gallery.map((g, i) => (
            <div
              key={g.id}
              className={`dock-item card-parent ${justAdded.includes(g.id) ? 'just-added' : ''}`}
              style={{
                '--m3-gallery-rotate': `${DOCK_ROTATES[i % DOCK_SLOTS]}deg`,
                '--m3-gallery-lift': `${DOCK_LIFTS[i % DOCK_SLOTS]}px`,
                animationDelay: `${(0.08 + i * 0.04).toFixed(2)}s`
              }}
              onClick={() => replaceGalleryItem(i)}
              title={preview ? '' : '点击替换这张图片'}
            >
              {/* 图片下方的"＋"占位：图片解码中或加载失败时可见（与原站一致） */}
              <span className="dock-empty" aria-hidden="true">+</span>
              <img src={g.src} alt="画廊图片" />
              {!preview && (
                <button className="g-remove" aria-label="删除图片"
                  onClick={(e) => { e.stopPropagation(); removeGalleryItem(g.id) }}>✕</button>
              )}
            </div>
          ))}
          {/* 空卡位："＋"上传卡（编辑模式补齐到 7 张或尾部追加） */}
          {Array.from({ length: emptySlots }).map((_, k) => {
            const i = about.gallery.length + k
            return (
              <button
                key={`dock-empty-${i}`}
                className="dock-item dock-item-empty"
                style={{
                  '--m3-gallery-rotate': `${DOCK_ROTATES[i % DOCK_SLOTS]}deg`,
                  '--m3-gallery-lift': `${DOCK_LIFTS[i % DOCK_SLOTS]}px`,
                  animationDelay: `${(0.08 + i * 0.04).toFixed(2)}s`
                }}
                onClick={pickGallery}
                disabled={galleryBusy}
                title="点击上传图片"
              >
                <span className="dock-empty">{galleryBusy ? '…' : '+'}</span>
              </button>
            )
          })}
        </div>
        {!preview && (
          <div className="gallery-ctrl">
            <button className="btn btn-primary btn-sm" onClick={pickGallery} disabled={galleryBusy}>
              {galleryBusy ? '处理中…' : '+ 增加图片'}
            </button>
            <button className="link-btn" onClick={clearGallery} disabled={galleryBusy}>清空图片</button>
            <span className="gallery-count">{about.gallery.length}/{GALLERY_MAX}</span>
          </div>
        )}
      </div>

      {/* 隐藏的文件选择器 */}
      <input ref={avatarInput} type="file" accept="image/*" hidden onChange={onAvatarFile} />
      <input ref={galleryInput} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={onGalleryFiles} />
    </div>
  )
}
