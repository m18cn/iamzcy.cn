import EditableText from '../EditableText'
import SectionHeading from '../SectionHeading'

/** 经历卡片字段默认占位文本 */
const EMPTY_EXP = {
  company: '公司 / 项目名称',
  position: '职位名称',
  period: '开始 — 至今',
  description: '介绍这段经历的工作内容与成果'
}

/**
 * 板块 02 · 工作经历（垂直时间线，左右交替卡片）
 * @param {Object} props
 * @param {Array} props.experiences 经历列表数据
 * @param {Function} props.update (updater: Function) => void 以函数形式更新数组
 * @param {Object} props.meta 板块标题文案（可编辑）
 * @param {Function} props.onMetaChange (patch: Object) => void 更新标题文案
 * @param {boolean} props.preview 是否预览模式
 */
export default function ExperienceSection({ experiences, update, meta, onMetaChange, preview }) {
  /** 更新指定经历的某个字段 */
  const patchExp = (id, field, value) => {
    update((list) => list.map((e) => (e.id === id ? { ...e, [field]: value } : e)))
  }

  /** 追加一段新经历 */
  const addExp = () => {
    update((list) => [...list, { id: Math.random().toString(36).slice(2, 9), ...EMPTY_EXP }])
  }

  /** 删除指定经历 */
  const removeExp = (id) => {
    update((list) => list.filter((e) => e.id !== id))
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <SectionHeading meta={meta} onChange={onMetaChange} preview={preview}
        placeholders={{ kicker: '02 / THE JOURNEY', title: 'Work Experience', sub: '个人经历 / 每一段经历都在形成现在的我' }} />

      <div className="timeline">
        {experiences.map((exp, i) => (
          <div key={exp.id} className={`exp-row ${i % 2 === 0 ? 'left' : 'right'}`}>
            {/* 中央数字节点 */}
            <div className="exp-node">{i + 1}</div>
            {/* 时间标签（位于节点另一侧） */}
            <EditableText className="exp-period" value={exp.period} disabled={preview}
              onChange={(v) => patchExp(exp.id, 'period', v)} placeholder="开始 — 至今" />
            {/* 经历卡片 */}
            <div className="exp-card card-parent">
              <EditableText as="h3" className="exp-company" value={exp.company} disabled={preview}
                onChange={(v) => patchExp(exp.id, 'company', v)} placeholder={EMPTY_EXP.company} />
              <EditableText as="p" className="exp-position" value={exp.position} disabled={preview}
                onChange={(v) => patchExp(exp.id, 'position', v)} placeholder={EMPTY_EXP.position} />
              <EditableText as="p" className="exp-desc" value={exp.description} disabled={preview} multiline
                onChange={(v) => patchExp(exp.id, 'description', v)} placeholder={EMPTY_EXP.description} />
              {/* 底部左侧删除文字链接（编辑模式） */}
              {!preview && <button className="exp-del" onClick={() => removeExp(exp.id)}>删除</button>}
            </div>
          </div>
        ))}
      </div>

      {/* 底部操作区：预览/分享模式下由 CSS 隐藏，但保留同样的高度，
          保证编辑页与预览页每屏版式位置一致 */}
      <div className="exp-footer">
        <button className="btn btn-subtle" onClick={addExp}>+ 添加经历</button>
        <span className="exp-count">已添加 {experiences.length} 段经历</span>
      </div>
    </div>
  )
}
