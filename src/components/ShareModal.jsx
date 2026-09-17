import { useState } from 'react'
import {
  copyToClipboard, publishShare, getPublishToken, setPublishToken, detectRepo
} from '../utils/share'

/**
 * 分享链接弹窗 —— 提供两种分享方式
 * 1. 短链接（推荐）：内容发布到仓库的 public/shares/<id>.json，链接只带短 ID，
 *    形如 https://<站点>/#/s/ab12cd34，适合发微信/群里。需要一次性填写 GitHub Token
 *    （只存在本机浏览器，不会写进链接，也不会随内容提交）。
 * 2. 完整链接：把内容（含图片）压缩进地址栏 hash，免配置但很长。
 *
 * @param {Object} props
 * @param {string} props.url 完整分享链接
 * @param {Object} props.data 完整作品集数据（发布短链接用）
 * @param {Function} props.onClose 关闭弹窗回调
 * @param {Function} props.onToast 外部 toast 提示回调
 */
export default function ShareModal({ url, data, onClose, onToast }) {
  const [copied, setCopied] = useState(false)
  const [shortCopied, setShortCopied] = useState(false)
  const [token, setToken] = useState(() => getPublishToken())
  const [shortUrl, setShortUrl] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  /** 仓库是否可发布（非 GitHub Pages 环境给出提示） */
  const repo = detectRepo()

  /** 复制指定文本并给出反馈 */
  const copy = async (text, mark) => {
    const ok = await copyToClipboard(text)
    if (ok) {
      mark(true)
      setTimeout(() => mark(false), 2000)
      onToast('链接已复制，发送给朋友即可观看')
    } else {
      onToast('复制失败，请手动选中复制')
    }
  }

  /** 保存 Token 到本机浏览器 */
  const saveToken = () => {
    setPublishToken(token.trim())
    setToken(token.trim())
    onToast(token.trim() ? 'Token 已保存在本机浏览器' : '已清除 Token')
  }

  /** 发布内容并生成短链接 */
  const handlePublish = async () => {
    if (publishing) return
    setError('')
    setPublishing(true)
    try {
      setPublishToken(token.trim())
      const res = await publishShare(data, token.trim())
      setShortUrl(res.url)
      onToast('短链接已生成')
    } catch (e) {
      setError(e?.message || '生成短链接失败')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">分享预览链接</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* ---------- 短链接 ---------- */}
        <div className="share-block">
          <span className="share-label">短链接（推荐）</span>

          {!repo ? (
            <p className="share-tip">当前不是 GitHub Pages 站点，短链接需要部署到 GitHub Pages 后使用。</p>
          ) : (
            <>
              <p className="share-tip">
                把内容发布到仓库 <code>{repo.owner}/{repo.repo}</code>，链接只保留一个短 ID。
                Token 仅保存在本机浏览器。
                <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
                  {' '}去创建 Token（权限选 Contents: Read and write）→
                </a>
              </p>

              <div className="share-token-row">
                <input
                  className="share-token-input"
                  type="password"
                  value={token}
                  placeholder="粘贴 GitHub Token（github_pat_... 或 ghp_...）"
                  onChange={(e) => setToken(e.target.value)}
                  spellCheck={false}
                />
                <button className="btn btn-subtle" onClick={saveToken}>保存</button>
              </div>

              {error && <p className="share-err">{error}</p>}

              <div className="share-actions">
                <button className="btn btn-primary" onClick={handlePublish} disabled={publishing || !token.trim()}>
                  {publishing ? '发布中…' : shortUrl ? '重新生成短链接' : '生成短链接'}
                </button>
                {shortUrl && (
                  <button className="btn btn-subtle" onClick={() => copy(shortUrl, setShortCopied)}>
                    {shortCopied ? '已复制 ✓' : '复制短链接'}
                  </button>
                )}
              </div>

              {shortUrl && (
                <div className="share-url-box">
                  <div className="share-url short">{shortUrl}</div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ---------- 完整链接 ---------- */}
        <div className="share-block">
          <span className="share-label">完整链接（免配置）</span>
          <p className="share-tip">
            内容（含图片）全部压缩进链接，图片越多链接越长：当前 {url.length.toLocaleString()} 字符。
          </p>
          <div className="share-url-box">
            <div className="share-url">{url}</div>
            <button
              className="btn btn-primary"
              style={{ padding: '10px 20px', flexShrink: 0 }}
              onClick={() => copy(url, setCopied)}
            >
              {copied ? '已复制 ✓' : '复制链接'}
            </button>
          </div>
          <p className="share-tip">链接已做精简压缩：未修改的内容不会写入链接，无需登录，任何人打开即可直接观看。</p>
        </div>
      </div>
    </div>
  )
}
