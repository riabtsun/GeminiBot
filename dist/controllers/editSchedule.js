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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EDIT_SCHEDULE_CONVERSATION_ID = void 0;
exports.editScheduleConversation = editScheduleConversation;
const User_1 = __importDefault(require("../models/User"));
const botTexts_1 = require("../botTexts");
exports.EDIT_SCHEDULE_CONVERSATION_ID = "edit_schedule_conv";
function askForTime(conversation, ctx, prompt, currentTime) {
    return __awaiter(this, void 0, void 0, function* () {
        yield ctx.reply(`${prompt}\nПоточне значення: \`${currentTime}\`\nВведіть новий час время в форматі ГГ:ХХ (например, 08:00):`, { parse_mode: "Markdown" });
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        while (true) {
            const responseCtx = yield conversation.waitFor("message:text");
            const timeInput = responseCtx.message.text.trim();
            if (timeRegex.test(timeInput)) {
                return timeInput;
            }
            else {
                yield ctx.reply(botTexts_1.botTexts.editSchedule.invalidFormat);
            }
        }
    });
}
function editScheduleConversation(conversation, ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const userId = (_a = ctx.from) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            yield ctx.reply(botTexts_1.botTexts.editSchedule.idError);
            return null;
        }
        try {
            const currentUser = yield conversation.external(() => User_1.default.findOne({ telegramId: userId }));
            if (!currentUser) {
                yield ctx.reply(botTexts_1.botTexts.editSchedule.incorrectUser);
                return null;
            }
            yield ctx.reply(botTexts_1.botTexts.editSchedule.startChangingTime);
            const newMorningTime = yield askForTime(conversation, ctx, "Введіть новий *ранковий* час:", currentUser.morningTime);
            const newEveningTime = yield askForTime(conversation, ctx, "Введіть новий *вечірній* час:", currentUser.eveningTime);
            const updatedUser = yield conversation.external(() => User_1.default.findOneAndUpdate({ telegramId: userId }, {
                $set: {
                    morningTime: newMorningTime,
                    eveningTime: newEveningTime,
                },
            }, { new: true }));
            if (!updatedUser) {
                yield ctx.reply(botTexts_1.botTexts.editSchedule.updateDbError);
                return null;
            }
            yield ctx.reply(`✅ Розклад успішно оновлено!
Новий ранковий час: ${updatedUser.morningTime}
Новий вечірній час: ${updatedUser.eveningTime}

Нагадування і запити будуть надходити по новому графіку.`);
            console.log(`[Conv edit_schedule] Пользователь ${userId} успешно обновил расписание.`);
            return updatedUser;
        }
        catch (error) {
            console.error(`[Conv edit_schedule] Ошибка обновления расписания для ${userId}:`, error);
            yield ctx.reply(botTexts_1.botTexts.editSchedule.updateScheduleError);
            return null;
        }
    });
}
