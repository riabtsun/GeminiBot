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
exports.editLastMeasurement = void 0;
const User_1 = __importDefault(require("../../models/User"));
const Measurement_1 = __importDefault(require("../../models/Measurement"));
const date_fns_1 = require("date-fns");
const botTexts_1 = require("../../botTexts");
const editLastMeasurement = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    if (!ctx.from || !ctx.chat)
        return;
    const userId = ctx.from.id;
    console.log(`[Callback edit_last_measurement] Нажата кнопка пользователем ${userId}`);
    try {
        yield ctx.answerCallbackQuery({
            text: botTexts_1.botTexts.editLastMeasurement.search,
        });
        if ((_a = ctx === null || ctx === void 0 ? void 0 : ctx.callbackQuery) === null || _a === void 0 ? void 0 : _a.message) {
            try {
                yield ctx.editMessageReplyMarkup({ reply_markup: undefined });
            }
            catch (e) {
            }
        }
        const user = yield User_1.default.findOne({ telegramId: userId });
        if (!user) {
            yield ctx.reply(botTexts_1.botTexts.editLastMeasurement.registrationError);
            return;
        }
        const lastMeasurement = yield Measurement_1.default.findOne({
            userId: user._id,
        }).sort({ timestamp: -1 });
        if (!lastMeasurement) {
            yield ctx.reply(botTexts_1.botTexts.editLastMeasurement.emptyMeasurement);
            ctx.session.lastMeasurementId = "";
            return;
        }
        console.log(`[Callback edit_last_measurement] Проверка ctx.session перед записью ID для user ${userId}.`);
        if (ctx.session) {
            console.log(`[Callback edit_last_measurement] Содержимое ctx.session:`, ctx.session);
        }
        if (typeof ctx.session === "undefined") {
            console.error(`[Callback edit_last_measurement] КРИТИЧЕСКАЯ ОШИБКА: ctx.session НЕ ОПРЕДЕЛЕН для user ${userId}!`);
            yield ctx.reply(botTexts_1.botTexts.editLastMeasurement.sessionError);
            return;
        }
        if (!lastMeasurement._id) {
            throw new Error("Measurement _id is missing");
        }
        ctx.session.lastMeasurementId = lastMeasurement._id.toString();
        console.log(`[Callback edit_last_measurement] ID ${ctx.session.lastMeasurementId} установлен в сессию.`);
        console.log(`[Callback edit_last_measurement] Состояние ctx.session ПЕРЕД conversation.enter:`, JSON.stringify(ctx.session));
        const measurementTimeInUser = lastMeasurement.timestamp;
        const formattedTime = (0, date_fns_1.format)(measurementTimeInUser, "dd.MM.yyyy HH:mm");
        yield ctx.reply(`Знайдено останнє вимірювання (${formattedTime}):
    Тиск: ${lastMeasurement.systolic} / ${lastMeasurement.diastolic}
    Пульс: ${lastMeasurement.pulse}

    Хочете змінити ці значення? Починаємо процес редагування...`);
        console.log(`[Callback edit_last_measurement] Проверка сессии:`, {
            sessionExists: Boolean(ctx.session),
            lastMeasurementId: (_b = ctx.session) === null || _b === void 0 ? void 0 : _b.lastMeasurementId,
        });
        if (!ctx.session.lastMeasurementId) {
            yield ctx.reply(botTexts_1.botTexts.editLastMeasurement.measurementIdError);
            return;
        }
        yield ctx.conversation.enter("edit_measurement_conv");
    }
    catch (error) {
        console.error(`[Callback edit_last_measurement] Ошибка для пользователя ${userId}:`, error);
        yield ctx.reply(botTexts_1.botTexts.editLastMeasurement.searchError);
    }
});
exports.editLastMeasurement = editLastMeasurement;
