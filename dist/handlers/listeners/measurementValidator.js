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
exports.measurementValidator = void 0;
const User_1 = __importDefault(require("../../models/User"));
const Measurement_1 = __importDefault(require("../../models/Measurement"));
const bot_1 = require("../../bot");
const botTexts_1 = require("../../botTexts");
const measurementValidator = (ctx, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    if ((_b = (_a = ctx === null || ctx === void 0 ? void 0 : ctx.message) === null || _a === void 0 ? void 0 : _a.text) === null || _b === void 0 ? void 0 : _b.startsWith("/")) {
        console.log(`[Text Handler] Сообщение является командой "${ctx.message.text}", сбрасываем флаг ожидания (если был) и передаем дальше.`);
        ctx.session.expectingMeasurement = false;
        return yield next();
    }
    if (!ctx.session.expectingMeasurement) {
        console.log(`[Text Handler] Флаг ожидания не установлен для ${(_c = ctx.from) === null || _c === void 0 ? void 0 : _c.id}, передаем дальше.`);
        return yield next();
    }
    console.log(`[Text Handler] Ожидается ввод от ${(_d = ctx.from) === null || _d === void 0 ? void 0 : _d.id}. Проверяем сообщение: "${(_e = ctx === null || ctx === void 0 ? void 0 : ctx.message) === null || _e === void 0 ? void 0 : _e.text}"`);
    const match = (_g = (_f = ctx === null || ctx === void 0 ? void 0 : ctx.message) === null || _f === void 0 ? void 0 : _f.text) === null || _g === void 0 ? void 0 : _g.match(bot_1.measurementRegex);
    if (match) {
        console.log(`[Text Handler] Формат совпал для ${(_h = ctx.from) === null || _h === void 0 ? void 0 : _h.id}.`);
        try {
            const systolic = parseInt(match[1], 10);
            const diastolic = parseInt(match[2], 10);
            const pulse = parseInt(match[3], 10);
            if (systolic < 50 ||
                systolic > 300 ||
                diastolic < 30 ||
                diastolic > 200 ||
                pulse < 30 ||
                pulse > 250) {
                yield ctx.reply(botTexts_1.botTexts.measurementValidator.invalidValues);
                console.warn(`[Text Handler] Невалидные значения от ${(_j = ctx.from) === null || _j === void 0 ? void 0 : _j.id}: ${systolic}/${diastolic} ${pulse}`);
                return;
            }
            const user = yield User_1.default.findOne({ telegramId: (_k = ctx.from) === null || _k === void 0 ? void 0 : _k.id });
            if (!user) {
                yield ctx.reply(botTexts_1.botTexts.measurementValidator.registrationError);
                ctx.session.expectingMeasurement = false;
                return;
            }
            const newMeasurement = yield Measurement_1.default.create({
                userId: user._id,
                timestamp: new Date(),
                systolic,
                diastolic,
                pulse,
            });
            console.log(`[Text Handler] Сохранено измерение ${newMeasurement._id} для пользователя ${(_l = ctx.from) === null || _l === void 0 ? void 0 : _l.id}`);
            yield ctx.reply(`✅ Тиск ${systolic}/${diastolic} і пульс ${pulse} збережено. Дякую!`);
            ctx.session.expectingMeasurement = false;
        }
        catch (error) {
            console.error(`[Text Handler] Ошибка при сохранении измерения от ${(_m = ctx.from) === null || _m === void 0 ? void 0 : _m.id}:`, error);
            yield ctx.reply(botTexts_1.botTexts.measurementValidator.savingError);
            ctx.session.expectingMeasurement = false;
        }
    }
    else {
        console.log(`[Text Handler] Неверный формат от ${(_o = ctx.from) === null || _o === void 0 ? void 0 : _o.id}: "${(_p = ctx === null || ctx === void 0 ? void 0 : ctx.message) === null || _p === void 0 ? void 0 : _p.text}"`);
        yield ctx.reply(botTexts_1.botTexts.measurementValidator.invalidFormat, { parse_mode: "Markdown" });
    }
});
exports.measurementValidator = measurementValidator;
