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
exports.editProfileCb = void 0;
const editProfileCb = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    if (!ctx.from)
        return;
    console.log(`[Callback edit_profile] Нажата кнопка пользователем ${ctx.from.id}`);
    yield ctx.answerCallbackQuery({ text: "Начинаем изменение ФИО..." });
    if (ctx.callbackQuery.message) {
        try {
            yield ctx.editMessageReplyMarkup({ reply_markup: undefined });
        }
        catch (e) {
            console.warn(`[Callback edit_profile] Не удалось убрать клавиатуру у сообщения ${ctx.callbackQuery.message.message_id}`, e);
        }
    }
    yield ctx.conversation.enter("edit_profile_conv");
});
exports.editProfileCb = editProfileCb;
