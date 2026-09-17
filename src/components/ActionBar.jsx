/**
 * 右下角浮动操作栏 —— 三个按钮共用一个胶囊容器（预览/编辑 · 色彩 · 生成地址）
 * - 编辑模式：[预览] [色彩] [生成地址]
 * - 预览模式：[编辑] [色彩] [生成地址]（首个按钮切回编辑）
 * 编辑内容自动保存，无需显式保存按钮
 *
 * @param {Object} props
 * @param {boolean} props.preview 当前是否预览模式（决定首个按钮是"预览"还是"编辑"）
 * @param {Function} props.onToggleMode 点击首个按钮回调（进入预览 / 返回编辑）
 * @param {Function} props.onToggleColor 点击"色彩"回调（切换色板展开状态）
 * @param {boolean} props.colorOpen 色板当前是否展开（控制色彩按钮激活态）
 * @param {Function} props.onShare 点击"生成地址"回调（打开分享链接弹窗）
 */
export default function ActionBar({ preview, onToggleMode, onToggleColor, colorOpen, onShare }) {
  return (
    <div className="action-bar" role="group" aria-label="编辑操作">
      <button className="action-btn plain" onClick={onToggleMode}>
        {preview ? '编辑' : '预览'}
      </button>
      <button
        className={`action-btn toggle ${colorOpen ? 'active' : ''}`}
        onClick={onToggleColor}
        aria-expanded={colorOpen}
      >
        色彩
      </button>
      <button className="action-btn primary" onClick={onShare}>生成地址</button>
    </div>
  )
}
