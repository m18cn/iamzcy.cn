/** 预设主题色色板（顺序与原站一致：绿 / 橙 / 红 / 粉 / 紫 / 蓝 / 青 / 黄） */
const PRESET_COLORS = [
  { name: '荧光绿', value: '#C8FF00' },
  { name: '活力橙', value: '#FF9A3D' },
  { name: '珊瑚红', value: '#FF5A5A' },
  { name: '樱花粉', value: '#FF6BB5' },
  { name: '星光紫', value: '#B78CFF' },
  { name: '冰川蓝', value: '#7DB8FF' },
  { name: '苏打青', value: '#4DF3FF' },
  { name: '柠檬黄', value: '#FFD84D' }
]

/**
 * 主题色弹出式选择面板 —— 点击"色彩"按钮展开，再次点击收起
 * 收起时隐藏且不可交互，展开时带向上弹出动画
 * @param {Object} props
 * @param {string} props.accent 当前强调色
 * @param {Function} props.onPick 选择颜色回调 (color: string) => void
 * @param {boolean} props.open 面板是否展开
 */
export default function ColorPanel({ accent, onPick, open }) {
  return (
    <div className={`theme-pop ${open ? 'open' : ''}`} role="group" aria-label="选择主题色">
      <span className="tp-label">选择主题色</span>
      <div className="tp-dots">
        {PRESET_COLORS.map((c) => (
          <button
            key={c.value}
            title={c.name}
            className={`theme-dot ${accent.toLowerCase() === c.value.toLowerCase() ? 'active' : ''}`}
            style={{ background: c.value }}
            onClick={() => onPick(c.value)}
          />
        ))}
      </div>
    </div>
  )
}
