"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCharacterDiaries = getCharacterDiaries;
exports.getDiaryByDate = getDiaryByDate;
exports.createDiaryEntry = createDiaryEntry;
exports.generateDiaryWithAI = generateDiaryWithAI;
exports.deleteOldestDiaries = deleteOldestDiaries;
exports.getRecentDiariesAsMemory = getRecentDiariesAsMemory;
const db_1 = require("@/lib/db");
const client_1 = require("@/lib/ai/client");
const recruit_service_1 = require("./recruit-service");
function escapeSql(str) {
    return str.replace(/'/g, "''");
}
function getCharacterDiaries(characterName_1, userId_1) {
    return __awaiter(this, arguments, void 0, function* (characterName, userId, limit = 10) {
        const db = yield (0, db_1.getDb)();
        const result = db.exec(`SELECT id, character_name, user_id, date, content, mood, is_peeked, created_at 
     FROM character_diaries 
     WHERE character_name = '${escapeSql(characterName)}' AND user_id = ${userId}
     ORDER BY date DESC, created_at DESC
     LIMIT ${limit}`);
        if (!result || result.length === 0 || !result[0].values) {
            return [];
        }
        return result[0].values.map((row) => ({
            id: row[0],
            characterName: row[1],
            userId: row[2],
            date: row[3],
            content: row[4],
            mood: row[5],
            isPeeked: row[6] === 1,
            createdAt: row[7]
        }));
    });
}
function getDiaryByDate(characterName, userId, date) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield (0, db_1.getDb)();
        const result = db.exec(`SELECT id, character_name, user_id, date, content, mood, is_peeked, created_at 
     FROM character_diaries 
     WHERE character_name = '${escapeSql(characterName)}' AND user_id = ${userId} AND date = '${escapeSql(date)}'
     LIMIT 1`);
        if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
            return null;
        }
        const row = result[0].values[0];
        return {
            id: row[0],
            characterName: row[1],
            userId: row[2],
            date: row[3],
            content: row[4],
            mood: row[5],
            isPeeked: row[6] === 1,
            createdAt: row[7]
        };
    });
}
function createDiaryEntry(characterName_1, userId_1, content_1, mood_1, date_1) {
    return __awaiter(this, arguments, void 0, function* (characterName, userId, content, mood, date, isPeeked = false) {
        const db = yield (0, db_1.getDb)();
        const contentEscaped = escapeSql(content);
        const moodEscaped = escapeSql(mood);
        const dateEscaped = escapeSql(date);
        db.run(`INSERT INTO character_diaries (character_name, user_id, date, content, mood, is_peeked) 
     VALUES ('${escapeSql(characterName)}', ${userId}, '${dateEscaped}', '${contentEscaped}', '${moodEscaped}', ${isPeeked ? 1 : 0})`);
        (0, db_1.saveDb)();
        const result = db.exec(`SELECT id FROM character_diaries WHERE character_name = '${escapeSql(characterName)}' AND user_id = ${userId} ORDER BY id DESC LIMIT 1`);
        const id = result[0].values[0][0];
        return {
            id,
            characterName,
            userId,
            date,
            content,
            mood,
            isPeeked,
            createdAt: new Date().toISOString()
        };
    });
}
function generateDiaryWithAI(characterName_1, userId_1, apiConfig_1, date_1) {
    return __awaiter(this, arguments, void 0, function* (characterName, userId, apiConfig, date, isPeeked = false) {
        var _a, _b;
        // 获取角色数据
        const characters = yield (0, recruit_service_1.getCharactersByUser)(userId);
        const character = characters.find(c => c.name === characterName);
        if (!character)
            return null;
        // 获取最近的聊天记录作为上下文
        const db = yield (0, db_1.getDb)();
        const chatResult = db.exec(`SELECT content FROM chat_messages 
     WHERE character_name = '${escapeSql(characterName)}' 
     ORDER BY created_at DESC LIMIT 5`);
        const recentChats = chatResult && chatResult.length > 0 && chatResult[0].values
            ? chatResult[0].values.map((row) => row[0]).reverse()
            : [];
        const prompt = `作为${character.template.角色档案.基本信息.姓名}，请写一篇${date}的日记。

角色设定：
${JSON.stringify(character.template, null, 2)}

当前状态：
- 好感度：${character.favorability}
- 顺从度：${character.obedience}
- 心情：${character.mood}

${recentChats.length > 0 ? `最近与房东的互动：\n${recentChats.join('\n')}` : '最近没有特别的互动。'}

${isPeeked ? '注意：这是被偷看的日记，角色并不知道房东会读到。请写得更加私密和真实，包含角色不想让别人知道的真实想法。' : '注意：这是向房东展示的日记。'}

请以第一人称写一篇日记，包含：
1. 当天的心情（用一个词或简短短语描述，如"开心"、"焦虑"、"平静"等）
2. 日记内容（200-400字，描述当天的感受、想法、对房东的看法等）

请以JSON格式返回：
{
  "mood": "心情词",
  "content": "日记内容"
}`;
        try {
            const response = yield (0, client_1.createChatCompletion)(apiConfig, {
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.8
            });
            const content = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '';
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch)
                return null;
            const data = JSON.parse(jsonMatch[0]);
            return createDiaryEntry(characterName, userId, data.content, data.mood, date, isPeeked);
        }
        catch (error) {
            console.error('Generate diary error:', error);
            return null;
        }
    });
}
function deleteOldestDiaries(characterName_1, userId_1) {
    return __awaiter(this, arguments, void 0, function* (characterName, userId, keepCount = 5) {
        const db = yield (0, db_1.getDb)();
        // 获取需要删除的日记ID
        const result = db.exec(`SELECT id FROM character_diaries 
     WHERE character_name = '${escapeSql(characterName)}' AND user_id = ${userId}
     ORDER BY created_at DESC`);
        if (!result || result.length === 0 || !result[0].values) {
            return;
        }
        const allIds = result[0].values.map((row) => row[0]);
        if (allIds.length <= keepCount) {
            return;
        }
        // 删除超出保留数量的旧日记
        const idsToDelete = allIds.slice(keepCount);
        if (idsToDelete.length > 0) {
            db.run(`DELETE FROM character_diaries WHERE id IN (${idsToDelete.join(',')})`);
            (0, db_1.saveDb)();
        }
    });
}
// 获取最近5篇日记作为记忆内容
function getRecentDiariesAsMemory(characterName, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const diaries = yield getCharacterDiaries(characterName, userId, 5);
        if (diaries.length === 0) {
            return '暂无日记记录';
        }
        return diaries.map(d => `[${d.date}] 心情：${d.mood}\n${d.content}`).join('\n\n');
    });
}
