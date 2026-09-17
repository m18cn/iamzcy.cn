/** 预设强调色色板 */
const PRESET_COLORS = [
  { name: '荧光绿', value: '#C8FF00' },
  { name: '青色', value: '#4DF3FF' },
  { name: '橙色', value: '#FF9A3D' },
  { name: '粉色', value: '#FF6BB5' },
  { name: '紫色', value: '#B78CFF' },
  { name: '金黄', value: '#FFD84D' },
  { name: '薄荷', value: '#6BFFB8' },
  { name: '冰蓝', value: '#7DB8FF' }
]

/**
 * 色彩主题面板弹窗 —— 切换全局强调色
 * @param {Object} props
 * @param {string} props.accent 当前强调色
 * @param {Function} props.onPick 选择颜色回调 (color: string) => void
 * @param {Function} props.onClose 关闭弹窗回调
 */
export default function ColorPanel({ accent, onPick, onClose }) {
  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">主题色彩</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="swatch-grid">
          {PRESET_COLORS.map((c) => (
            <button
              key={c.value}
              title={c.name}
              className={`swatch ${accent.toLowerCase() === c.value.toLowerCase() ? 'active' : ''}`}
              style={{ background: c.value }}
              onClick={() => onPick(c.value)}
            />
          ))}
          {/* 自定义取色器 */}
          <label className="swatch swatch-custom" title="自定义颜色">
            <span style={{ fontSize: 20 }}>+</span>
            <span>自定义</span>
            <input
              type="color"
              value={accent}
              onChange={(e) => onPick(e.target.value)}
            />
          </label>
        </div>
      </div>
    </div>
  )
}
