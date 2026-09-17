import { useEffect, useRef } from 'react'

/**
 * 可编辑文本组件 —— 点击即编辑，失焦提交
 * 采用非受控 contentEditable，避免输入时光标跳动；
 * 仅当外部 value 与 DOM 内容不一致时（如切换数据源）才同步 DOM
 *
 * @param {Object} props
 * @param {string} props.value 当前文本值
 * @param {Function} props.onChange 提交回调 (nextValue: string) => void
 * @param {string} [props.className] 附加类名
 * @param {string} [props.as] 渲染的标签名，默认 'div'
 * @param {string} [props.placeholder] 内容为空时的占位提示
 * @param {boolean} [props.disabled] 是否禁用编辑（预览模式）
 * @param {boolean} [props.multiline] 是否允许换行（Enter 提交或 Shift+Enter 换行）
 */
export default function EditableText({ value, onChange, className = '', as: Tag = 'div', placeholder = '点击输入', disabled = false, multiline = false }) {
  const ref = useRef(null)

  // 外部值变化时同步到 DOM（跳过正在编辑导致的相同内容）
  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) {
      ref.current.innerText = value ?? ''
    }
  }, [value])

  /** 失焦时提交内容 */
  const commit = () => {
    const next = ref.current?.innerText?.replace(/\u00a0/g, ' ') ?? ''
    if (next !== value) onChange(next)
  }

  /** 键盘处理：单行 Enter 直接提交，Esc 还原 */
  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (ref.current) ref.current.innerText = value ?? ''
      ref.current?.blur()
    }
    if (!multiline && e.key === 'Enter') {
      e.preventDefault()
      ref.current?.blur()
    }
  }

  return (
    <Tag
      ref={ref}
      className={`editable ${className}`}
      contentEditable={!disabled}
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onBlur={commit}
      onKeyDown={onKeyDown}
      spellCheck={false}
    />
  )
}
