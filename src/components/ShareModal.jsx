import { useState } from 'react'
import { copyToClipboard } from '../utils/share'

/**
 * 分享链接弹窗 —— 展示可发送给他人的预览链接
 * @param {Object} props
 * @param {string} props.url 分享链接
 * @param {Function} props.onClose 关闭弹窗回调
 * @param {Function} props.onToast 外部 toast 提示回调 (msg: string) => void
 */
export default function ShareModal({ url, onClose, onToast }) {
  const [copied, setCopied] = useState(false)

  /** 复制链接到剪贴板并反馈 */
  const handleCopy = async () => {
    const ok = await copyToClipboard(url)
    if (ok) {
      setCopied(true)
      onToast('链接已复制，发送给朋友即可观看')
      setTimeout(() => setCopied(false), 2200)
    } else {
      onToast('复制失败，请手动选中复制')
    }
  }

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">分享预览链接</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="share-url-box">
          <div className="share-url">{url}</div>
          <button className="btn btn-primary" style={{ padding: '10px 20px', flexShrink: 0 }} onClick={handleCopy}>
            {copied ? '已复制 ✓' : '复制链接'}
          </button>
        </div>
        <p className="share-tip">
          链接中已包含你的全部作品内容（文字与图片），无需登录，任何人打开即可直接观看。
          <br />若图片较多导致链接过长，建议同时使用"导出网页"发送完整文件。
        </p>
      </div>
    </div>
  )
}
