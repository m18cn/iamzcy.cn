/**
 * 右下角浮动操作栏：预览 / 色彩 / 导出网页（与原站一致的三胶囊布局）
 * "色彩"按钮点击展开/收起色板；编辑内容自动保存，无需显式保存按钮
 * @param {Object} props
 * @param {Function} props.onPreview 点击"预览"回调
 * @param {Function} props.onToggleColor 点击"色彩"回调（切换色板展开状态）
 * @param {Function} props.onExport 点击"导出网页"回调
 * @param {boolean} props.colorOpen 色板当前是否展开（控制色彩按钮激活态）
 */
export default function ActionBar({ onPreview, onToggleColor, onExport, colorOpen }) {
  return (
    <div className="action-bar">
      <button className="action-btn" onClick={onPreview}>预览</button>
      <button
        className={`action-btn ${colorOpen ? 'active' : ''}`}
        onClick={onToggleColor}
        aria-expanded={colorOpen}
      >
        色彩
      </button>
      <button className="action-btn primary" onClick={onExport}>导出网页</button>
    </div>
  )
}
