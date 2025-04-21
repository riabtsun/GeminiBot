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
exports.EDIT_PROFILE_CONVERSATION_ID = void 0;
exports.editProfileConversation = editProfileConversation;
const User_1 = __importDefault(require("../models/User"));
const grammy_1 = require("grammy");
const botTexts_1 = require("../botTexts");
exports.EDIT_PROFILE_CONVERSATION_ID = "edit_profile_conv";
function askForText(conversation, ctx, prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        yield ctx.reply(prompt);
        const responseCtx = yield conversation.waitFor("message:text");
        const text = responseCtx.message.text.trim();
        if (!text) {
            yield ctx.reply(botTexts_1.botTexts.editProfile.emptyInput);
            return yield askForText(conversation, ctx, prompt);
        }
        return text;
    });
}
function editProfileConversation(conversation, ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        const userId = (_a = ctx.from) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            yield ctx.reply(botTexts_1.botTexts.editProfile.idError);
            return;
        }
        yield ctx.reply(botTexts_1.botTexts.editProfile.nameChange);
        const newFirstName = yield askForText(conversation, ctx, "Введіть нове ім'я:");
        const newLastName = yield askForText(conversation, ctx, "Введіть нове призвіще:");
        const skipPatronymicKeyboard = new grammy_1.InlineKeyboard().text("залишити порожнім", "skip_patronymic_edit");
        yield ctx.reply('Введите новое отчество (или нажмите "Оставить пустым"):', {
            reply_markup: skipPatronymicKeyboard,
        });
        let newPatronymic = undefined;
        const patronymicAnswer = yield conversation.waitFor([
            "message:text",
            "callback_query:data",
        ]);
        if ((_b = patronymicAnswer.message) === null || _b === void 0 ? void 0 : _b.text) {
            newPatronymic = patronymicAnswer.message.text.trim();
            yield patronymicAnswer.reply("По батькові збережено.", {
                reply_markup: { remove_keyboard: true },
            });
        }
        else if (((_c = patronymicAnswer.callbackQuery) === null || _c === void 0 ? void 0 : _c.data) === "skip_patronymic_edit") {
            newPatronymic = undefined;
            yield patronymicAnswer.answerCallbackQuery({
                text: "По батькові буде видалено/залишено порожнім.",
            });
            yield ctx.api.editMessageReplyMarkup(patronymicAnswer.chatId, (_d = patronymicAnswer.callbackQuery.message) === null || _d === void 0 ? void 0 : _d.message_id);
        }
        else {
            yield ctx.reply("Неочікувана відповідь. Зміну ПІБ прервано.");
            yield ctx.api.answerCallbackQuery(patronymicAnswer.callbackQuery.id);
            return;
        }
        try {
            const updateData = {
                $set: {
                    firstName: newFirstName,
                    lastName: newLastName,
                },
            };
            if (newPatronymic) {
                updateData.$set.patronymic = newPatronymic;
            }
            else {
                updateData.$unset = { patronymic: "" };
            }
            const updatedUser = yield conversation.external(() => User_1.default.findOneAndUpdate({ telegramId: userId }, updateData, { new: true }));
            if (!updatedUser) {
                yield ctx.reply("Не удалось найти вашу запись для обновления. Попробуйте /start.");
                return;
            }
            yield ctx.reply(`✅ Ваші ПІБ успішно оновлено!
                    Нове ім'я: ${updatedUser.firstName}
                    Нове призвіще: ${updatedUser.lastName}
                    ${updatedUser.patronymic
                ? "Нове по батькові: " + updatedUser.patronymic
                : "По батькові: (не вказано)"}`);
            console.log(`[Conv edit_profile] Пользователь ${userId} успешно обновил ФИО.`);
        }
        catch (error) {
            console.error(`[Conv edit_profile] Ошибка обновления ФИО для ${userId}:`, error);
            yield ctx.reply(botTexts_1.botTexts.editProfile.idError);
        }
        return;
    });
}
