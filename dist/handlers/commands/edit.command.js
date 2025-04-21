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
exports.editCommand = void 0;
const User_1 = __importDefault(require("../../models/User"));
const grammy_1 = require("grammy");
const botTexts_1 = require("../../botTexts");
const editCommand = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = ctx.from) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId)
        return;
    console.log(`[Command /edit] Получена команда от ${userId}`);
    try {
        const user = yield User_1.default.findOne({ telegramId: userId });
        if (!user) {
            yield ctx.reply(botTexts_1.botTexts.editCommand.notRegistered);
            return;
        }
        const editKeyboard = new grammy_1.InlineKeyboard()
            .text("👤 Змінити ПІБ", "edit_profile")
            .row()
            .text("⏰ Змінити час", "edit_schedule")
            .row()
            .text("📊 Змінити останнє вимірювання", "edit_last_measurement");
        yield ctx.reply("🎛️ Що ви хочете змінити?", {
            reply_markup: editKeyboard,
        });
    }
    catch (error) {
        console.error(`[Command /edit] Ошибка при обработке команды для ${userId}:`, error);
        yield ctx.reply(botTexts_1.botTexts.editCommand.dataError);
    }
});
exports.editCommand = editCommand;
