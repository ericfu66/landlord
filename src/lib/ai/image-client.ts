export interface ImageGenerationRequest {
  model: string
  prompt: string
  size?: string
  n?: number
  seed?: number
  num_inference_steps?: number
  guidance_scale?: number
  cfg?: number
  image?: string  // For image editing - base64 or URL
  reference_image?: string  // For image editing with reference
}

export interface ImageGenerationResponse {
  images: Array<{
    url: string
    seed?: number
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

const SILICONFLOW_BASE_URL = 'https://api.siliconflow.cn/v1'

export async function generateImage(
  apiKey: string,
  request: ImageGenerationRequest
): Promise<ImageGenerationResponse> {
  const response = await fetch(`${SILICONFLOW_BASE_URL}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: request.model || 'Kwai-Kolors/Kolors',
      prompt: request.prompt,
      size: request.size || '768x1024',
      n: request.n || 1,
      seed: request.seed,
      num_inference_steps: request.num_inference_steps || 20,
      guidance_scale: request.guidance_scale ?? 7.5,
      cfg: request.cfg,
      image: request.image,
      reference_image: request.reference_image
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Image generation error: ${response.status} - ${error}`)
  }

  return response.json()
}

// Generate sticker/emoticon using Kwai-Kolors/Kolors
export async function generateSticker(
  apiKey: string,
  characterInfo: {
    name: string
    age: number
    gender: string
    personality?: string
    appearance?: string
  },
  emotion: string
): Promise<ImageGenerationResponse> {
  const stickerPrompt = `A cute anime chibi sticker of ${characterInfo.name}, ${characterInfo.age} years old ${characterInfo.gender}, ${characterInfo.appearance || 'cute appearance'}, expressing ${emotion} emotion, kawaii style, white background, sticker format, high quality, cute emoticon, 2D illustration, clean line art, vibrant colors, chibi proportions, big expressive eyes, adorable pose, digital art, transparent background preferred, emoji style`

  return generateImage(apiKey, {
    model: 'Kwai-Kolors/Kolors',
    prompt: stickerPrompt,
    size: '512x512',
    n: 1,
    num_inference_steps: 25,
    guidance_scale: 7.5
  })
}

// Generate real-time portrait edit using Qwen-Image-Edit
export async function editPortrait(
  apiKey: string,
  referenceImageUrl: string,
  prompt: string,
  options?: {
    cfg?: number
    numInferenceSteps?: number
  }
): Promise<ImageGenerationResponse> {
  const response = await fetch(`${SILICONFLOW_BASE_URL}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'Qwen/Qwen-Image-Edit-2509',
      prompt: prompt,
      image: referenceImageUrl,
      reference_image: referenceImageUrl,
      cfg: options?.cfg ?? 4.0,
      num_inference_steps: options?.numInferenceSteps ?? 50
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Portrait edit error: ${response.status} - ${error}`)
  }

  return response.json()
}

// Generate portrait variation with emotion using reference image
export async function generatePortraitVariation(
  apiKey: string,
  referenceImageUrl: string,
  characterInfo: {
    name: string
    age: number
    gender: string
    identity: string
    personality?: string
  },
  emotion: string,
  pose?: string
): Promise<ImageGenerationResponse> {
  const prompt = `Anime galgame style portrait of ${characterInfo.name}, ${characterInfo.age} years old ${characterInfo.gender}, ${characterInfo.identity}, ${characterInfo.personality || ''}, showing ${emotion} expression, ${pose || 'standing pose'}, same character as reference, maintain facial features and hairstyle, consistent character design, high quality, detailed, soft lighting, visual novel art style`

  return editPortrait(apiKey, referenceImageUrl, prompt, {
    cfg: 4.0,
    numInferenceSteps: 50
  })
}

// Generate anime galgame style prompt using LLM
export async function generateGalgamePrompt(
  baseUrl: string,
  apiKey: string,
  model: string,
  characterInfo: {
    name: string
    age: number
    gender: string
    identity: string
    tags: string[]
    personality?: string
  }
): Promise<string> {
  const promptTemplate = `你是一位专业的二次元 Galgame 立绘提示词生成专家。

请根据以下角色信息，生成一份用于 AI 图像生成的英文提示词：

角色信息：
- 姓名：${characterInfo.name}
- 年龄：${characterInfo.age}岁
- 性别：${characterInfo.gender}
- 身份：${characterInfo.identity}
- 标签：${characterInfo.tags.join(', ')}
${characterInfo.personality ? `- 性格：${characterInfo.personality}` : ''}

要求：
1. 生成高质量的二次元 Galgame 风格立绘提示词
2. 必须包含：精细的面部特征、符合身份和性格的服饰、适当的背景
3. 画风要求：日系美少女/美少年游戏风格，精细的线稿，柔和的着色
4. 构图：半身像或全身像，角色居中，清晰的面部表情
5. 光照：柔和的自然光或戏剧性的舞台光
6. 质量标签：masterpiece, best quality, highly detailed 等
7. 必须是英文，使用逗号分隔的标签格式
8. 长度控制在 200-500 个字符

只输出提示词本身，不要有任何解释或额外文字。`

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are an expert at generating high-quality anime galgame character portrait prompts.' },
        { role: 'user', content: promptTemplate }
      ],
      temperature: 0.8,
      max_tokens: 800
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Prompt generation error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content?.trim() || ''
}
