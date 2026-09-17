import EditableText from './EditableText'

/** 导航板块定义（键名与数据模型对应） */
export const SECTIONS = [
  { key: 'about', label: '关于我' },
  { key: 'experiences', label: '工作经历' },
  { key: 'works', label: '个人作品' },
  { key: 'advantages', label: '个人优势' },
  { key: 'contact', label: '联系我' }
]

/**
 * 顶部胶囊导航栏 —— 居中固定，激活项荧光绿高亮
 * @param {Object} props
 * @param {string} props.current 当前激活板块键名
 * @param {Function} props.onSelect 切换板块回调 (key: string) => void
 * @param {Function} props.onExit 退出（重置）回调
 */
export default function NavBar({ current, onSelect, onExit }) {
  return (
    <>
      <div className="nav-wrap">
        <nav className="nav-pill">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              className={`nav-item ${current === s.key ? 'active' : ''}`}
              onClick={() => onSelect(s.key)}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </div>
      <button className="nav-exit" onClick={onExit} title="退出并重置编辑内容">退出</button>
    </>
  )
}
