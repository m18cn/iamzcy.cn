import { useState, useEffect, useCallback, useRef } from 'react'
import { createDefaultData } from '../data/defaultData'

/** localStorage 存储键名 */
const STORAGE_KEY = 'portfolio-editor-data'

/**
 * 深度合并默认数据与传入数据（用于修复缺失字段的旧数据）
 * @param {Object} target 目标对象
 * @param {Object} source 来源对象（优先）
 * @returns {Object} 合并后的新对象
 */
function deepMerge(target, source) {
  if (source === null || source === undefined) return target
  if (Array.isArray(target)) return source // 数组直接以 source 为准
  if (typeof target === 'object' && typeof source === 'object') {
    const result = { ...target }
    for (const key of Object.keys(source)) {
      result[key] = key in target ? deepMerge(target[key], source[key]) : source[key]
    }
    return result
  }
  return source
}

/**
 * 从 localStorage 读取已保存的数据，不存在时返回 null
 * @returns {Object|null} 已保存的数据或 null
 */
function loadSavedData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * 作品集数据管理 Hook —— 编辑器核心状态
 * 负责数据初始化、localStorage 自动持久化、以及各类更新操作
 * @returns {Object} { data, updateData, updateSection, resetAll, saveNow }
 */
export function usePortfolio() {
  // 尝试从 localStorage 恢复，否则使用默认数据
  const [data, setData] = useState(() => {
    const saved = loadSavedData()
    return saved ? deepMerge(createDefaultData(), saved) : createDefaultData()
  })

  /** 防抖定时器引用，避免高频写入 localStorage */
  const saveTimer = useRef(null)
  /** 最新数据引用（供立即保存使用，避免闭包拿到过期数据） */
  const dataRef = useRef(data)

  // 同步最新数据到引用
  useEffect(() => {
    dataRef.current = data
  }, [data])

  // 数据变化时自动保存（300ms 防抖）
  useEffect(() => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      } catch (e) {
        console.warn('保存失败（可能超出 localStorage 容量）', e)
      }
    }, 300)
    return () => clearTimeout(saveTimer.current)
  }, [data])

  /**
   * 更新整份数据（传入完整新数据或更新函数）
   * @param {Object|Function} payload 新数据对象或 updater 函数
   */
  const updateData = useCallback((payload) => {
    setData((prev) => (typeof payload === 'function' ? payload(prev) : payload))
  }, [])

  /**
   * 更新某个一级板块的数据
   * @param {string} sectionKey 板块键名，如 'about' / 'contact' / 'theme'
   * @param {Object|Function} patch 板块增量数据或 updater 函数
   */
  const updateSection = useCallback((sectionKey, patch) => {
    setData((prev) => {
      const section = prev[sectionKey]
      const next = typeof patch === 'function' ? patch(section) : { ...section, ...patch }
      return { ...prev, [sectionKey]: next }
    })
  }, [])

  /**
   * 立即保存当前数据到 localStorage（跳过防抖，供"保存"按钮使用）
   * @returns {boolean} 是否保存成功
   */
  const saveNow = useCallback(() => {
    clearTimeout(saveTimer.current)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataRef.current))
      return true
    } catch (e) {
      console.warn('保存失败（可能超出 localStorage 容量）', e)
      return false
    }
  }, [])

  /**
   * 重置为默认数据（清空本地编辑内容）
   */
  const resetAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setData(createDefaultData())
  }, [])

  return { data, updateData, updateSection, resetAll, saveNow }
}
