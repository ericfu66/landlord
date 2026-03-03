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
exports.normalizeCharacter = normalizeCharacter;
exports.createCharacter = createCharacter;
exports.getCharactersByUser = getCharactersByUser;
exports.updateCharacterPortrait = updateCharacterPortrait;
exports.updateCharacterRoom = updateCharacterRoom;
const db_1 = require("@/lib/db");
function normalizeCharacter(raw) {
    try {
        if (!raw.角色档案) {
            return null;
        }
        return raw;
    }
    catch (_a) {
        return null;
    }
}
function createCharacter(userId, template, roomId, worldviewId) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield (0, db_1.getDb)();
        const name = template.角色档案.基本信息.姓名;
        const existing = db.exec(`SELECT name FROM characters WHERE name = '${name.replace(/'/g, "''")}'`);
        if (existing && existing.length > 0 && existing[0].values && existing[0].values.length > 0) {
            return null;
        }
        const rent = Math.floor(Math.random() * 300) + 200;
        const templateJson = JSON.stringify(template).replace(/'/g, "''");
        const roomIdValue = roomId || 'NULL';
        const worldviewIdValue = worldviewId || 'NULL';
        db.run(`INSERT INTO characters (name, user_id, template, favorability, obedience, corruption, rent, mood, room_id, worldview_id)
     VALUES ('${name.replace(/'/g, "''")}', ${userId}, '${templateJson}', 0, 0, 0, ${rent}, '平静', ${roomIdValue}, ${worldviewIdValue})`);
        if (roomId) {
            db.run(`UPDATE rooms SET character_name = '${name.replace(/'/g, "''")}' WHERE id = ${roomId}`);
        }
        (0, db_1.saveDb)();
        return {
            name,
            userId,
            template,
            favorability: 0,
            obedience: 0,
            corruption: 0,
            rent,
            mood: '平静',
            roomId,
            worldviewId
        };
    });
}
function getCharactersByUser(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield (0, db_1.getDb)();
        const result = db.exec(`SELECT name, user_id, template, portrait_url, favorability, obedience, corruption, rent, mood, room_id, worldview_id
     FROM characters WHERE user_id = ${userId}`);
        if (!result || result.length === 0 || !result[0].values) {
            return [];
        }
        return result[0].values.map((row) => ({
            name: row[0],
            userId: row[1],
            template: JSON.parse(row[2]),
            portraitUrl: row[3],
            favorability: row[4],
            obedience: row[5],
            corruption: row[6],
            rent: row[7],
            mood: row[8],
            roomId: row[9],
            worldviewId: row[10]
        }));
    });
}
function updateCharacterPortrait(name, portraitUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield (0, db_1.getDb)();
        db.run(`UPDATE characters SET portrait_url = '${portraitUrl.replace(/'/g, "''")}' WHERE name = '${name.replace(/'/g, "''")}'`);
        (0, db_1.saveDb)();
    });
}
function updateCharacterRoom(name, roomId) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield (0, db_1.getDb)();
        const roomIdValue = roomId === null ? 'NULL' : roomId;
        db.run(`UPDATE characters SET room_id = ${roomIdValue} WHERE name = '${name.replace(/'/g, "''")}'`);
        if (roomId) {
            db.run(`UPDATE rooms SET character_name = '${name.replace(/'/g, "''")}' WHERE id = ${roomId}`);
        }
        else {
            db.run(`UPDATE rooms SET character_name = NULL WHERE character_name = '${name.replace(/'/g, "''")}'`);
        }
        (0, db_1.saveDb)();
    });
}
