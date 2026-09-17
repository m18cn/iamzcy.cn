import { useCallback, useEffect, useRef } from 'react'
import EditableText from '../EditableText'
import SectionHeading from '../SectionHeading'

/** 卡片跟随鼠标倾斜的最大角度（度），越大越夸张 */
const TILT_MAX = 11

/** 弧线图标（SVG 装饰） */
function ArcIcon() {
  return (
    <svg className="adv-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 40 A 32 32 0 0 1 40 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="8" cy="40" r="3.5" fill="currentColor" />
      <circle cx="40" cy="8" r="3.5" fill="currentColor" />
    </svg>
  )
}

/** 星形图标（SVG 装饰） */
function StarIcon() {
  return (
    <svg className="adv-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 6 L28.5 18.5 L42 19.5 L31.5 28 L35 41 L24 33.5 L13 41 L16.5 28 L6 19.5 L19.5 18.5 Z"
        stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * 是否允许跟随鼠标倾斜：
 * 只在带指针的桌面设备上开启，且尊重系统"减少动效"偏好
 */
function canTilt() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * 单张优势卡片
 * 1. 鼠标悬停：整卡转为强调色实底（文字/图标反色）
 * 2. 鼠标移动：按光标在卡片内的位置换算旋转角度，卡片像被"推着"改变朝向
 *
 * @param {Object} props
 * @param {Object} props.adv 优势数据 { id, tag, title, desc, icon }
 * @param {boolean} props.preview 是否预览模式（不可编辑）
 * @param {Function} props.onPatch (id, field, value) => void 更新字段
 * @param {Function} props.onRemove (id) => void 删除卡片
 */
function AdvantageCard({ adv, preview, onPatch, onRemove }) {
  const cardRef = useRef(null)
  /** 待执行的动画帧句柄（连续 mousemove 只渲染最后一帧） */
  const frameRef = useRef(0)

  // 卸载时清掉未执行的动画帧，避免操作已移除的节点
  useEffect(() => () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
  }, [])

  /** 鼠标移动：光标越靠边，卡片朝该方向转得越多（角度写入 CSS 变量） */
  const handleMove = useCallback((e) => {
    const el = cardRef.current
    if (!el || !canTilt()) return
    const rect = el.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const px = (e.clientX - rect.left) / rect.width    // 0 ~ 1（左右）
    const py = (e.clientY - rect.top) / rect.height    // 0 ~ 1（上下）
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => {
      el.style.setProperty('--tilt-y', `${((px - 0.5) * 2 * TILT_MAX).toFixed(2)}deg`)
      el.style.setProperty('--tilt-x', `${(-(py - 0.5) * 2 * TILT_MAX).toFixed(2)}deg`)
    })
  }, [])

  /** 鼠标移出：角度归零，由 CSS transition 平滑回弹 */
  const handleLeave = useCallback(() => {
    const el = cardRef.current
    if (!el) return
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    el.style.setProperty('--tilt-x', '0deg')
    el.style.setProperty('--tilt-y', '0deg')
  }, [])

  return (
    <div
      ref={cardRef}
      className="adv-card card-parent"
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {!preview && <button className="card-del" onClick={() => onRemove(adv.id)} title="删除优势">✕</button>}
      <EditableText as="span" className="adv-tag" value={adv.tag} disabled={preview}
        onChange={(v) => onPatch(adv.id, 'tag', v)} placeholder="01 / CORE" />
      <EditableText as="h3" className="adv-title" value={adv.title} disabled={preview} multiline
        onChange={(v) => onPatch(adv.id, 'title', v)} placeholder="优势名称" />
      <EditableText as="p" className="adv-desc" value={adv.desc} disabled={preview} multiline
        onChange={(v) => onPatch(adv.id, 'desc', v)} placeholder="描述 / 不填写" />
      {adv.icon === 'star' ? <StarIcon /> : <ArcIcon />}
    </div>
  )
}

/**
 * 板块 04 · 个人优势（三列卡片网格，卡片随鼠标改变朝向）
 * @param {Object} props
 * @param {Array} props.advantages 优势卡片列表
 * @param {Function} props.update (updater: Function) => void 以函数形式更新数组
 * @param {Object} props.meta 板块标题文案（可编辑）
 * @param {Function} props.onMetaChange (patch: Object) => void 更新标题文案
 * @param {boolean} props.preview 是否预览模式
 * @param {Function} props.onGoSection 板块跳转回调
 */
export default function AdvantagesSection({ advantages, update, meta, onMetaChange, preview, onGoSection }) {
  /** 更新指定优势卡片字段 */
  const patchAdv = (id, field, value) => {
    update((list) => list.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
  }

  /** 追加一张优势卡片（图标在弧线/星形间轮换） */
  const addAdv = () => {
    update((list) => [...list, {
      id: Math.random().toString(36).slice(2, 9),
      tag: `${String(list.length + 1).padStart(2, '0')} / CORE`,
      title: '优势名称',
      desc: '描述 / 不填写',
      icon: list.length % 2 === 0 ? 'arc' : 'star'
    }])
  }

  /** 删除指定优势卡片 */
  const removeAdv = (id) => {
    update((list) => list.filter((a) => a.id !== id))
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <SectionHeading meta={meta} onChange={onMetaChange} preview={preview}
        placeholders={{ kicker: '04 / WHAT I DO BEST', title: 'Advantages / 个人优势', sub: '把擅长的事，讲清楚' }} />

      <div className="adv-grid">
        {advantages.map((adv) => (
          <AdvantageCard
            key={adv.id}
            adv={adv}
            preview={preview}
            onPatch={patchAdv}
            onRemove={removeAdv}
          />
        ))}
      </div>

      {/* 底部操作区：预览/分享模式下按钮由 CSS 隐藏（但保留高度），
          保证编辑页与预览页每屏版式位置一致 */}
      <div className="adv-footer">
        <button className="btn btn-subtle" onClick={addAdv}>+ 添加优势</button>
        <button className="btn btn-primary" onClick={() => onGoSection('about')}>返回首页 ↗</button>
        <button className="btn btn-ghost" onClick={() => onGoSection('contact')}>联系我</button>
      </div>
    </div>
  )
}
