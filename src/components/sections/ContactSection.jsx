import { useRef } from 'react'
import EditableText from '../EditableText'
import { readFileAsDataURL, compressImage } from '../../utils/image'

/**
 * 板块 05 · 联系我（标题 + 标签 + 电话 + 二维码）
 * @param {Object} props
 * @param {Object} props.contact contact 板块数据
 * @param {Function} props.update (patch: Object) => void 更新 contact 板段
 * @param {boolean} props.preview 是否预览模式
 * @param {Function} props.onToast toast 提示回调
 */
export default function ContactSection({ contact, update, preview, onToast }) {
  const qrInput = useRef(null)

  /** 添加合作标签 */
  const addTag = () => {
    const text = window.prompt('输入标签内容（如：开放合作）')
    if (text?.trim()) {
      update((c) => ({ tags: [...c.tags, text.trim()] }))
    }
  }

  /** 删除指定标签 */
  const removeTag = (i) => {
    update((c) => ({ tags: c.tags.filter((_, idx) => idx !== i) }))
  }

  /** 触发二维码选择 */
  const pickQr = () => {
    if (!preview) qrInput.current?.click()
  }

  /** 处理二维码上传（压缩到 500px，二维码无需高清） */
  const onQrFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const raw = await readFileAsDataURL(file)
    const compressed = await compressImage(raw, 500, 0.82)
    update({ qrCode: compressed })
    onToast('二维码已更新')
    e.target.value = ''
  }

  /** 移除二维码 */
  const removeQr = () => update({ qrCode: null })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div className="watermark">LET'S BUILD</div>

      <p className="kicker">05 / CONTACT</p>
      <p className="talk-label">LET'S TALK</p>

      <div className="contact-grid">
        <div>
          <EditableText as="h2" className="contact-headline" value={contact.headline} disabled={preview}
            onChange={(v) => update({ headline: v })} placeholder="下一段经历，也许可以一起创造。" />
          <EditableText as="p" className="contact-desc" value={contact.desc} disabled={preview} multiline
            onChange={(v) => update({ desc: v })} placeholder="联系说明文字" />

          {/* 合作标签 */}
          <div className="contact-tags">
            {contact.tags.map((tag, i) => (
              <span key={`${tag}-${i}`} className="tag-chip">
                {tag}
                {!preview && <button className="t-del" onClick={() => removeTag(i)}>✕</button>}
              </span>
            ))}
            {!preview && <button className="tag-add" onClick={addTag}>+ 添加标签</button>}
          </div>

          {/* 电话 */}
          <p className="phone-label">PHONE</p>
          <EditableText as="p" className="phone-num" value={contact.phone} disabled={preview}
            onChange={(v) => update({ phone: v })} placeholder="XXX XXXX XXXX" />
        </div>

        {/* 二维码卡片 */}
        <div className="qr-box card-parent" onClick={pickQr}>
          <div className="qr-inner">
            {contact.qrCode ? (
              <img src={contact.qrCode} alt="联系二维码" />
            ) : (
              <>
                <span style={{ fontSize: 28, fontWeight: 300 }}>+</span>
                <span>添加联系二维码</span>
              </>
            )}
          </div>
          <p className="qr-tip">扫码联系我</p>
          {!preview && contact.qrCode && (
            <button className="card-del" style={{ opacity: 1 }} onClick={(e) => { e.stopPropagation(); removeQr() }} title="移除二维码">✕</button>
          )}
        </div>
      </div>

      <input ref={qrInput} type="file" accept="image/*" hidden onChange={onQrFile} />
    </div>
  )
}
