import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { downloadFromWorkshop } from '@/lib/services/workshop-service'
import { getCharactersByUser, createCharacter } from '@/lib/services/recruit-service'
import { getDb, saveDb, safeInt, safeSqlString } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const body = await request.json()
    const { itemId } = body
    
    if (!itemId) {
      return NextResponse.json({ error: '缺少项目ID' }, { status: 400 })
    }
    
    const result = await downloadFromWorkshop(itemId, session.userId)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }
    
    // 处理下载的内容
    const { type, data } = result.item
    
    if (type === 'character') {
      // 检查是否已存在同名角色
      const existingChars = await getCharactersByUser(session.userId)
      const template = data.template
      const originalName = template.角色档案.基本信息.姓名
      
      // 生成新名称（添加副本标记）
      let newName = originalName
      let counter = 1
      while (existingChars.some(c => c.name === newName)) {
        newName = `${originalName}_副本${counter}`
        counter++
      }
      
      // 修改模板中的姓名
      template.角色档案.基本信息.姓名 = newName
      
      // 查找空房间
      const db = await getDb()
      const safeUserId = safeInt(session.userId)
      const roomResult = db.exec(
        `SELECT id FROM rooms WHERE user_id = ${safeUserId} AND character_name IS NULL LIMIT 1`
      )
      
      const roomId = (roomResult && roomResult.length > 0 && roomResult[0].values) 
        ? roomResult[0].values[0][0] as number 
        : undefined
      
      // 创建角色（变量已初始化为0）
      const character = await createCharacter(session.userId, template, roomId)
      
      if (!character) {
        return NextResponse.json({ error: '创建角色失败' }, { status: 500 })
      }
      
      // 设置头像
      if (data.portraitUrl) {
        db.run(
          `UPDATE characters SET portrait_url = '${safeSqlString(data.portraitUrl)}' WHERE name = '${safeSqlString(newName)}'`
        )
        saveDb()
      }
      
      return NextResponse.json({ 
        success: true, 
        type: 'character',
        character: {
          name: character.name,
          favorability: character.favorability,
          obedience: character.obedience,
          corruption: character.corruption,
          rent: character.rent,
          mood: character.mood
        }
      })
    } else if (type === 'worldview') {
      // 导入世界观
      const db = await getDb()
      const safeUserId = safeInt(session.userId)
      const nameEscaped = safeSqlString(data.description)
      const contentEscaped = safeSqlString(data.content)
      
      db.run(
        `INSERT INTO worldviews (user_id, name, description, content, is_ai_generated) 
         VALUES (${safeUserId}, '导入的世界观', '${nameEscaped}', '${contentEscaped}', ${data.isAiGenerated ? 1 : 0})`
      )
      saveDb()
      
      const result = db.exec(`SELECT id FROM worldviews WHERE user_id = ${safeUserId} ORDER BY id DESC LIMIT 1`)
      const worldviewId = result[0].values[0][0] as number
      
      return NextResponse.json({ 
        success: true, 
        type: 'worldview',
        worldviewId
      })
    }
    
    return NextResponse.json({ error: '未知的项目类型' }, { status: 400 })
  } catch (error) {
    console.error('Download from workshop error:', error)
    return NextResponse.json({ error: '从工坊下载失败' }, { status: 500 })
  }
}
