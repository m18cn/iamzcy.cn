/**
 * 右下角浮动操作栏：预览 / 保存 / 导出网页
 * @param {Object} props
 * @param {Function} props.onPreview 点击"预览"回调
 * @param {Function} props.onSave 点击"保存"回调（立即写入 localStorage）
 * @param {Function} props.onExport 点击"导出网页"回调
 */
export default function ActionBar({ onPreview, onSave, onExport }) {
  return (
    <div className="action-bar">
      <button className="action-btn" onClick={onPreview}>预览</button>
      <button className="action-btn primary" onClick={onSave}>保存</button>
      <button className="action-btn primary" onClick={onExport}>导出网页</button>
    </div>
  )
}
