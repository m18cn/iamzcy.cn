import { useState } from 'react'
import {
  copyToClipboard, publishShare, getPublishToken, setPublishToken,
  getShareRepo, setShareRepo, buildShortUrl, parseShareId
} from '../utils/share'

/** 时间戳 → 「2026-09-18 02:40」 */
function formatTime(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/**
 * 分享地址弹窗 —— 只提供短链接一种方式
 *
 * 短链接把内容发布到仓库的 public/shares/<id>.json，链接里只带一个短 ID，
 * 地址固定不变：第一次点「生成短链接」，之后内容有改动点「更新内容」覆盖同一
 * 个文件即可，已经发出去的链接不用换。观看者不需要登录或 Token。
 *
 * @param {Object} props
 * @param {Object} props.data 完整作品集数据（发布用）
 * @param {{id?: string, updatedAt?: number}} props.share 当前分享信息
 * @param {Function} props.onShareChange (patch) => void 更新分享信息（写回作品集数据）
 * @param {Function} props.onClose 关闭弹窗回调
 * @param {Function} props.onToast 外部 toast 提示回调
 */
export default function ShareModal({ data, share, onShareChange, onClose, onToast }) {
  const [copied, setCopied] = useState(false)
  const [token, setToken] = useState(() => getPublishToken())
  const [repoInput, setRepoInput] = useState('')
  const [adoptInput, setAdoptInput] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')

  /** 当前使用的仓库（自定义域名下手动填的那份 localStorage 覆盖值） */
  const repo = getShareRepo()
  const shareId = share?.id || ''
  const shortUrl = shareId ? buildShortUrl(shareId) : ''

  /** 复制指定文本并给出反馈 */
  const copy = async (text, mark) => {
    const ok = await copyToClipboard(text)
    if (ok) {
      mark(true)
      setTimeout(() => mark(false), 2000)
      onToast('地址已复制，发给谁都能打开')
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

  /** 保存仓库（站点不在 github.io 域名下时需要） */
  const saveRepo = () => {
    const parsed = setShareRepo(repoInput)
    if (parsed) {
      onToast(`仓库已保存：${parsed.owner}/${parsed.repo}`)
      setRepoInput(`${parsed.owner}/${parsed.repo}`)
    } else {
      onToast('请填写 owner/repo 形式，例如 m18cn/iamzcy.cn')
    }
  }

  /**
   * 沿用一个之前生成过的地址
   * 之前用旧版本生成的链接，粘进来就能继续用：以后"更新内容"直接覆盖它，
   * 已经发出去的链接从此长期有效、内容始终最新
   */
  const adoptExisting = () => {
    const id = parseShareId(adoptInput)
    if (!id) {
      onToast('没识别出地址里的短 ID，请粘贴完整分享链接')
      return
    }
    onShareChange({ id, updatedAt: 0 })
    onToast('已沿用该地址，点「更新内容」把当前内容发布上去')
  }

  /**
   * 生成 / 更新短链接
   * 已有 id 时是覆盖更新：地址不变，内容变成当前编辑的最新版本
   */
  const handlePublish = async () => {
    if (publishing) return
    setError('')
    setPublishing(true)
    try {
      setPublishToken(token.trim())
      const res = await publishShare(data, token.trim(), shareId)
      onShareChange({ id: res.id, updatedAt: Date.now() })
      if (res.updated) {
        onToast('内容已更新，地址不变')
      } else {
        // 第一次生成：顺手复制，省一步操作
        const ok = await copyToClipboard(res.url)
        onToast(ok ? '短链接已生成并复制' : '短链接已生成')
      }
    } catch (e) {
      setError(e?.message || '发布失败，请稍后重试')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">分享地址</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* ---------- 固定短地址 ---------- */}
        <div className="share-block">
          <span className="share-label">短链接（地址永久不变）</span>

          {shortUrl ? (
            <>
              <div className="share-url-box">
                <div className="share-url short">{shortUrl}</div>
                <button
                  className="btn btn-primary"
                  style={{ padding: '10px 20px', flexShrink: 0 }}
                  onClick={() => copy(shortUrl, setCopied)}
                >
                  {copied ? '已复制 ✓' : '复制链接'}
                </button>
              </div>
              <p className="share-tip">
                最近更新：{formatTime(share?.updatedAt)}　·　任何人、任何设备打开这条地址都不需要登录，
                内容改动后点下面的「更新内容」，链接不变，别人刷新就是最新的。
              </p>
            </>
          ) : (
            <>
              <p className="share-tip">
                还没有分享地址。填好下方 Token 后点「生成短链接」，会得到一条很短的固定地址；
                以后内容有改动，再点「更新内容」即可，地址保持不变、已经发出去的链接照常有效。
              </p>
              <div className="share-token-row">
                <input
                  className="share-token-input"
                  value={adoptInput}
                  placeholder="已有旧地址？粘贴进来沿用（可选）"
                  onChange={(e) => setAdoptInput(e.target.value)}
                  spellCheck={false}
                />
                <button className="btn btn-subtle" onClick={adoptExisting}>沿用</button>
              </div>
              <p className="share-tip">
                之前用旧方式生成过的链接可以继续用：把那条地址粘进来点「沿用」，
                以后更新内容就是覆盖它本身。
              </p>
            </>
          )}
        </div>

        {/* ---------- 发布配置 ---------- */}
        <div className="share-block">
          <span className="share-label">发布设置（只存在本机浏览器）</span>

          {(!repo || !repo.auto) && (
            <div className="share-token-row">
              <input
                className="share-token-input"
                value={repoInput}
                placeholder="仓库 owner/repo，例如 m18cn/iamzcy.cn"
                onChange={(e) => setRepoInput(e.target.value)}
                spellCheck={false}
              />
              <button className="btn btn-subtle" onClick={saveRepo}>保存</button>
            </div>
          )}

          <div className="share-token-row">
            <input
              className="share-token-input"
              type="password"
              value={token}
              placeholder="GitHub Token（github_pat_... 或 ghp_...）"
              onChange={(e) => setToken(e.target.value)}
              spellCheck={false}
            />
            <button className="btn btn-subtle" onClick={saveToken}>保存</button>
          </div>

          {repo ? (
            <p className="share-tip">
              内容会提交到仓库 <code>{repo.owner}/{repo.repo}</code> 的 public/shares 目录，
              Token 只存在本机浏览器，不会写进链接、也不会提交。
            </p>
          ) : (
            <p className="share-tip">
              当前站点不是 GitHub Pages 域名，无法自动识别仓库：请在上面填写
              owner/repo（例如 m18cn/iamzcy.cn）后再生成。
            </p>
          )}

          <p className="share-tip">
            新建 Token 三步：① Repository access 选「Only select repositories」并勾上{' '}
            <code>{repo ? `${repo.owner}/${repo.repo}` : '你的仓库'}</code>
            （选「Public repositories」只有只读权限，发布不了）；
            ② 继续往下滚到 <b>Repository permissions</b>，把 <b>Contents</b> 设为{' '}
            <b>Read and write</b>（不在 Account permissions 那个下拉里）；
            ③ 生成后粘到上面输入框点「保存」。
          </p>

          {error && <p className="share-err">{error}</p>}

          <div className="share-actions">
            <button
              className="btn btn-primary"
              onClick={handlePublish}
              disabled={publishing || !token.trim()}
            >
              {publishing ? '发布中…' : shortUrl ? '更新内容' : '生成短链接'}
            </button>
            <a
              className="share-link-out"
              href="https://github.com/settings/personal-access-tokens/new"
              target="_blank"
              rel="noreferrer"
            >
              去创建 Token（权限选 Contents: Read and write）→
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
