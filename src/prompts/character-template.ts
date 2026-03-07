export const CHARACTER_TEMPLATE_PROMPT = `你是一个角色生成助手。请根据用户的需求生成一个详细的角色档案。

角色档案必须遵循"绝对零度"和"白描"原则：
- 不使用模糊词（如"美丽"、"帅气"、"善良"等）
- 不使用形容词堆砌
- 用具体行为展现性格
- 用语料展现说话方式

【姓名创新规范 - 严格禁止】
- 禁止使用常见大众名：如"子轩、梓涵、浩然、欣怡、俊杰、婷婷"等
- 禁止使用过度文艺套路名：如"沐辰、若曦、倾城、若离、子墨"等
- 禁止使用网红爆款名：如"一诺、星辰、语嫣、北辰"等
- 禁止单字名过于简单：如"明、芳、强、丽"等

【姓名创新要求】
- 名字要有独特性和记忆点
- 可结合角色身份、背景、性格创造有意义的名字
- 可使用不常见但好读的字组合
- 可考虑复姓、少数民族姓氏、或带有特定文化背景的名字
- 名字要符合角色性别和时代背景，同时保持新意

【重要 - JSON格式要求】
- 所有字符串值必须使用英文双引号包裹
- 如果字符串内部需要包含引号（如引用话语），必须使用中文引号（""）或单引号（'），禁止使用英文双引号
- 示例: "口头禅": "\"再来一次。\"" 或 "口头禅": "'再来一次。'"

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

export interface SpecialVariableData {
  变量名: string
  变量说明: string
  初始值: number
  最小值: number
  最大值: number
  分阶段人设: StagePersonality[]
}

export interface StagePersonality {
  阶段范围: string  // 例如: "0-20"
  阶段名称: string  // 例如: "正常状态"
  人格表现: string  // 该阶段的人格特征描述
}

export const SPECIAL_VARIABLE_PROMPT = `你是一个角色深度设定助手。请根据角色的基本设定，为其生成一个独特的特殊状态变量（整型）以及对应的分阶段人设。

【任务说明】
1. 分析角色的性格特点、背景故事，确定一个最能代表角色特殊状态的变量名称
2. 变量必须是整型，有明确的最小值和最大值（范围0-100）
3. 根据变量值的不同阶段，生成对应的人格表现变化
4. 分阶段人设应该体现角色随着变量值变化而产生的性格/行为变化

【变量命名示例】
- 病娇角色：黑化值、依存度、独占欲
- 懒散角色：干劲值、活力值、积极性
- 冷酷角色：软化度、信任值、 thawing（融化）值
- 傲娇角色：坦诚度、撒娇值、真心度
- 神秘角色：解密度、真实度、觉醒值

【分阶段人设要求】
- 分为5个阶段：0-20、20-40、40-60、60-80、80-100
- 每个阶段描述角色在该变量值范围内的人格表现
- 阶段之间应该有明显的递进关系
- 人格表现要具体，体现角色的说话方式、行为特点、对房东的态度变化

【重要 - JSON格式要求】
- 所有字符串值必须使用英文双引号包裹
- 如果字符串内部需要包含引号（如引用话语），必须使用中文引号（""）或单引号（'），禁止使用英文双引号
- 示例: "人格表现": "她会说\"你好\"" 或 "人格表现": "她会说'你好'"

请以JSON格式返回，格式如下：
{
  "变量名": "string",
  "变量说明": "string",
  "初始值": number,
  "最小值": 0,
  "最大值": 100,
  "分阶段人设": [
    {
      "阶段范围": "0-20",
      "阶段名称": "string",
      "人格表现": "string"
    },
    {
      "阶段范围": "20-40",
      "阶段名称": "string", 
      "人格表现": "string"
    },
    {
      "阶段范围": "40-60",
      "阶段名称": "string",
      "人格表现": "string"
    },
    {
      "阶段范围": "60-80",
      "阶段名称": "string",
      "人格表现": "string"
    },
    {
      "阶段范围": "80-100",
      "阶段名称": "string",
      "人格表现": "string"
    }
  ]
}`

export const GENERATE_SPECIAL_VAR_TOOL = {
  type: 'function' as const,
  function: {
    name: 'generate_special_variable',
    description: '生成角色的特殊变量和分阶段人设',
    parameters: {
      type: 'object',
      properties: {
        变量名: { type: 'string', description: '特殊变量的名称' },
        变量说明: { type: 'string', description: '变量的含义说明' },
        初始值: { type: 'integer', description: '变量的初始值(0-100)', minimum: 0, maximum: 100 },
        最小值: { type: 'integer', description: '变量最小值', minimum: 0, maximum: 0 },
        最大值: { type: 'integer', description: '变量最大值', minimum: 100, maximum: 100 },
        分阶段人设: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              阶段范围: { type: 'string', description: '数值范围，如"0-20"' },
              阶段名称: { type: 'string', description: '该阶段的名称' },
              人格表现: { type: 'string', description: '该阶段的人格表现描述' }
            },
            required: ['阶段范围', '阶段名称', '人格表现']
          },
          minItems: 5,
          maxItems: 5
        }
      },
      required: ['变量名', '变量说明', '初始值', '最小值', '最大值', '分阶段人设']
    }
  }
}

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