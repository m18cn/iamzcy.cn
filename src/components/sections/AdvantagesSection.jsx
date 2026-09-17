import EditableText from '../EditableText'

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
 * 板块 04 · 个人优势（三列卡片网格）
 * @param {Object} props
 * @param {Array} props.advantages 优势卡片列表
 * @param {Function} props.update (updater: Function) => void 以函数形式更新数组
 * @param {boolean} props.preview 是否预览模式
 * @param {Function} props.onGoSection 板块跳转回调
 */
export default function AdvantagesSection({ advantages, update, preview, onGoSection }) {
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
      <p className="kicker">04 / WHAT I DO BEST</p>
      <h2 className="sec-title">Advantages / 个人优势</h2>
      <p className="sec-sub"></p>

      <div className="adv-grid">
        {advantages.map((adv) => (
          <div key={adv.id} className="adv-card card-parent">
            {!preview && <button className="card-del" onClick={() => removeAdv(adv.id)} title="删除优势">✕</button>}
            <EditableText as="span" className="adv-tag" value={adv.tag} disabled={preview}
              onChange={(v) => patchAdv(adv.id, 'tag', v)} placeholder="01 / CORE" />
            <EditableText as="h3" className="adv-title" value={adv.title} disabled={preview} multiline
              onChange={(v) => patchAdv(adv.id, 'title', v)} placeholder="优势名称" />
            <EditableText as="p" className="adv-desc" value={adv.desc} disabled={preview} multiline
              onChange={(v) => patchAdv(adv.id, 'desc', v)} placeholder="描述 / 不填写" />
            {adv.icon === 'star' ? <StarIcon /> : <ArcIcon />}
          </div>
        ))}
      </div>

      {!preview && (
        <div className="adv-footer">
          <button className="btn btn-subtle" onClick={addAdv}>+ 添加优势</button>
          <button className="btn btn-primary" onClick={() => onGoSection('about')}>返回首页 ↗</button>
          <button className="btn btn-ghost" onClick={() => onGoSection('contact')}>联系我</button>
        </div>
      )}
    </div>
  )
}
