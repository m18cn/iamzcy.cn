/**
 * 默认作品集数据模型
 * 定义编辑器各板块的初始占位内容，结构与 localStorage 及分享链接中的数据保持一致
 */

/** 生成唯一 ID 的简易工具函数 */
const uid = () => Math.random().toString(36).slice(2, 9)

/**
 * 创建一份全新的默认作品集数据
 * @returns {Object} 作品集完整数据对象
 */
export function createDefaultData() {
  return {
    /** 版本号，用于未来数据结构升级迁移 */
    version: 1,
    /** 关于我板块（Hero） */
    about: {
      hello: 'HELLO / 你好',
      name: '我是XXX',
      subtitle: 'PORTFOLIO',
      title: '职业名称',
      bio: '写一句关于你的简介，让别人快速了解你。',
      avatar: null,            // 头像图片 base64
      avatarShape: 'circle',   // 头像形状：circle 圆形 / rounded 圆角胶囊
      nowBadge: { text: '开放合作 / 作品交流', visible: true }, // NOW 浮动卡片
      gallery: [],             // 底部横向画廊图片数组 [{id, src}]
      notes: [                 // 便签（个人标签）数组 [{id, text}]，空文本显示占位提示
        { id: uid(), text: '' },
        { id: uid(), text: '' }
      ]
    },
    /** 工作经历板块 */
    experiences: [
      {
        id: uid(),
        company: '公司 / 项目名称',
        position: '职位名称',
        period: '开始 — 至今',
        description: '介绍这段经历的工作内容与成果'
      },
      {
        id: uid(),
        company: '公司 / 项目名称',
        position: '职位名称',
        period: '开始 — 至今',
        description: '介绍这段经历的工作内容与成果'
      }
    ],
    /** 个人作品板块（多个作品板块，每个为一张 bento 卡片） */
    works: [
      { id: uid(), title: '作品 / 案例标题', desc: '一句简短的作品介绍', images: [], videos: [] },
      { id: uid(), title: '作品 / 案例标题', desc: '一句简短的作品介绍', images: [], videos: [] },
      { id: uid(), title: '作品 / 案例标题', desc: '一句简短的作品介绍', images: [], videos: [] }
    ],
    /** 个人优势板块 */
    advantages: [
      {
        id: uid(),
        tag: '01 / CORE',
        title: '审美好、创意强、执行力高',
        desc: '描述 / 不填写',
        icon: 'arc'
      },
      {
        id: uid(),
        tag: '02 / CORE',
        title: '深耕xx行业 3年',
        desc: '1、擅长xxxxx\n2、具备xxxx',
        icon: 'star'
      },
      {
        id: uid(),
        tag: '03 / CORE',
        title: '优势名称',
        desc: '描述 / 不填写',
        icon: 'arc'
      }
    ],
    /** 联系我板块 */
    contact: {
      headline: '下一段经历，也许可以一起创造。',
      desc: '欢迎通过二维码或电话联系我，聊聊新的项目、工作机会与创意想法。',
      tags: ['开放合作', '作品交流', '简历咨询'],
      phone: 'XXX XXXX XXXX',
      qrCode: null            // 联系二维码 base64
    },
    /** 主题配置 */
    theme: {
      accent: '#C8FF00'       // 强调色（荧光青柠绿，可通过"色彩"按钮切换）
    }
  }
}
