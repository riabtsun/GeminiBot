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
exports.enterMeasurementCb = void 0;
const botTexts_1 = require("../../botTexts");
const enterMeasurementCb = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    if (!ctx.chat || !ctx.from)
        return;
    ctx.session.expectingMeasurement = true;
    console.log(`[Callback] Пользователь ${ctx.from.id} нажал кнопку ввода. Установлен флаг ожидания.`);
    yield ctx.answerCallbackQuery();
    if (ctx.callbackQuery.message) {
        try {
            yield ctx.editMessageReplyMarkup({ reply_markup: undefined });
        }
        catch (e) {
            console.warn(`[Callback] Не удалось убрать клавиатуру у сообщения ${ctx.callbackQuery.message.message_id}`, e);
        }
    }
    yield ctx.reply(botTexts_1.botTexts.enterMeasurement);
});
exports.enterMeasurementCb = enterMeasurementCb;
