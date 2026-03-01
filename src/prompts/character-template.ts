export const CHARACTER_TEMPLATE_PROMPT = `你是一个角色生成助手。请根据用户的需求生成一个详细的角色档案。

角色档案必须遵循"绝对零度"和"白描"原则：
- 不使用模糊词（如"美丽"、"帅气"、"善良"等）
- 不使用形容词堆砌
- 用具体行为展现性格
- 用语料展现说话方式

请以JSON格式返回角色档案，格式如下：
{
  "角色档案": {
    "基本信息": {
      "姓名": "string",
      "年龄": "number",
      "性别": "string",
      "身份": "string",
      "标签": ["string", "string"]
    },
    "外貌特征": {
      "整体印象": "string",
      "发型": "string",
      "面部": "string",
      "身材": "string",
      "穿着打扮": "string"
    },
    "性格特点": {
      "核心特质": "string",
      "表现形式": "string",
      "对用户的表现": "string"
    },
    "背景设定": {
      "家庭背景": "string",
      "经济状况": "string",
      "成长经历": "string",
      "社交关系": "string"
    },
    "语言特征": {
      "音色": "string",
      "说话习惯": "string",
      "口头禅": "string"
    },
    "关系设定": {
      "与用户的关系": "string",
      "相识过程": "string",
      "互动方式": "string"
    }
  },
  "来源类型": "modern | crossover",
  "穿越说明": "string (if crossover)"
}`

export const GENERATE_CHARACTER_TOOL = {
  type: 'function' as const,
  function: {
    name: 'generate_character',
    description: '生成角色JSON模板',
    parameters: {
      type: 'object',
      properties: {
        角色档案: {
          type: 'object',
          properties: {
            基本信息: {
              type: 'object',
              properties: {
                姓名: { type: 'string' },
                年龄: { type: 'number' },
                性别: { type: 'string' },
                身份: { type: 'string' },
                标签: { type: 'array', items: { type: 'string' } }
              },
              required: ['姓名', '年龄', '性别', '身份', '标签']
            },
            外貌特征: {
              type: 'object',
              properties: {
                整体印象: { type: 'string' },
                发型: { type: 'string' },
                面部: { type: 'string' },
                身材: { type: 'string' },
                穿着打扮: { type: 'string' }
              },
              required: ['整体印象', '发型', '面部', '身材', '穿着打扮']
            },
            性格特点: {
              type: 'object',
              properties: {
                核心特质: { type: 'string' },
                表现形式: { type: 'string' },
                对用户的表现: { type: 'string' }
              },
              required: ['核心特质', '表现形式', '对用户的表现']
            },
            背景设定: {
              type: 'object',
              properties: {
                家庭背景: { type: 'string' },
                经济状况: { type: 'string' },
                成长经历: { type: 'string' },
                社交关系: { type: 'string' }
              },
              required: ['家庭背景', '经济状况', '成长经历', '社交关系']
            },
            语言特征: {
              type: 'object',
              properties: {
                音色: { type: 'string' },
                说话习惯: { type: 'string' },
                口头禅: { type: 'string' }
              },
              required: ['音色', '说话习惯', '口头禅']
            },
            关系设定: {
              type: 'object',
              properties: {
                与用户的关系: { type: 'string' },
                相识过程: { type: 'string' },
                互动方式: { type: 'string' }
              },
              required: ['与用户的关系', '相识过程', '互动方式']
            }
          },
          required: ['基本信息', '外貌特征', '性格特点', '背景设定', '语言特征', '关系设定']
        },
        来源类型: { type: 'string', enum: ['modern', 'crossover'] },
        穿越说明: { type: 'string' }
      },
      required: ['角色档案', '来源类型']
    }
  }
}