import EditableText from './EditableText'

/**
 * 板块标题区 —— 小标 + 主标题 + 副标题，三行都可点击编辑
 * 与其它正文使用同一套 EditableText，交互保持一致
 *
 * @param {Object} props
 * @param {{kicker: string, title: string, sub: string}} props.meta 标题文案数据
 * @param {Function} props.onChange (patch: Object) => void 更新标题文案
 * @param {boolean} props.preview 是否预览模式（不可编辑）
 * @param {{kicker?: string, title?: string, sub?: string}} [props.placeholders] 空值占位文案
 */
export default function SectionHeading({ meta = {}, onChange, preview, placeholders = {} }) {
  return (
    <>
      <EditableText as="p" className="kicker" value={meta.kicker} disabled={preview}
        onChange={(v) => onChange({ kicker: v })} placeholder={placeholders.kicker || '01 / SECTION'} />
      <EditableText as="h2" className="sec-title" value={meta.title} disabled={preview}
        onChange={(v) => onChange({ title: v })} placeholder={placeholders.title || '板块标题'} />
      <EditableText as="p" className="sec-sub" value={meta.sub} disabled={preview}
        onChange={(v) => onChange({ sub: v })} placeholder={placeholders.sub || '一句副标题'} />
    </>
  )
}
