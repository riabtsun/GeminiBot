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
exports.REGISTRATION_CONVERSATION_ID = void 0;
exports.registrationConversation = registrationConversation;
const User_1 = __importDefault(require("../models/User"));
const grammy_1 = require("grammy");
const botTexts_1 = require("../botTexts");
exports.REGISTRATION_CONVERSATION_ID = "registration";
function registrationConversation(conversation, ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const existingUser = yield conversation.external(() => { var _a; return User_1.default.findOne({ telegramId: (_a = ctx.from) === null || _a === void 0 ? void 0 : _a.id }); });
        if (existingUser) {
            yield ctx.reply(botTexts_1.botTexts.registration.alreadyRegistered);
            return;
        }
        yield ctx.reply(botTexts_1.botTexts.registration.start);
        yield ctx.reply(botTexts_1.botTexts.registration.enterName);
        const firstNameCtx = yield conversation.waitFor("message:text");
        const firstName = firstNameCtx.message.text.trim();
        if (!firstName) {
            yield ctx.reply(botTexts_1.botTexts.registration.emptyName);
            return;
        }
        yield ctx.reply(botTexts_1.botTexts.registration.enterLastName);
        const lastNameCtx = yield conversation.waitFor("message:text");
        const lastName = lastNameCtx.message.text.trim();
        if (!lastName) {
            yield ctx.reply(botTexts_1.botTexts.registration.enterLastName);
            return;
        }
        const skipPatronymicKeyboard = new grammy_1.InlineKeyboard().text("Пропустити", "skip_patronymic");
        yield ctx.reply(botTexts_1.botTexts.registration.enterPatronymic, {
            reply_markup: skipPatronymicKeyboard,
        });
        let patronymic = undefined;
        const patronymicAnswer = yield conversation.waitFor([
            "message:text",
            "callback_query:data",
        ]);
        if ((_a = patronymicAnswer.message) === null || _a === void 0 ? void 0 : _a.text) {
            patronymic = patronymicAnswer.message.text.trim();
            yield patronymicAnswer.reply("По батькові збережено.", {
                reply_markup: { remove_keyboard: true },
            });
        }
        else if (((_b = patronymicAnswer.callbackQuery) === null || _b === void 0 ? void 0 : _b.data) === "skip_patronymic") {
            yield patronymicAnswer.answerCallbackQuery({
                text: "По батькові пропущено.",
            });
            yield ctx.api.editMessageReplyMarkup(patronymicAnswer.chatId, (_c = patronymicAnswer.callbackQuery.message) === null || _c === void 0 ? void 0 : _c.message_id);
        }
        else {
            yield ctx.reply(botTexts_1.botTexts.registration.invalidAnswer);
            yield patronymicAnswer.answerCallbackQuery();
            return;
        }
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        yield ctx.reply("5. Введите желаемое время для *утреннего* измерения (в формате ЧЧ:ММ, например, `08:00`):");
        let morningTime = undefined;
        while (!morningTime) {
            const morningTimeCtx = yield conversation.waitFor("message:text");
            const timeInput = morningTimeCtx.message.text.trim();
            if (timeRegex.test(timeInput)) {
                morningTime = timeInput;
            }
            else {
                yield ctx.reply("Неверный формат времени. Введите время в формате ЧЧ:ММ (например, `08:00`):");
            }
        }
        yield ctx.reply("6. Введите желаемое время для *вечернего* измерения (в формате ЧЧ:ММ, например, `20:30`):");
        let eveningTime = undefined;
        while (!eveningTime) {
            const eveningTimeCtx = yield conversation.waitFor("message:text");
            const timeInput = eveningTimeCtx.message.text.trim();
            if (timeRegex.test(timeInput)) {
                eveningTime = timeInput;
            }
            else {
                yield ctx.reply("Неверный формат времени. Введите время в формате ЧЧ:ММ (например, `20:30`):");
            }
        }
        try {
            yield conversation.external(() => {
                var _a, _b;
                return User_1.default.create({
                    telegramId: (_a = ctx.from) === null || _a === void 0 ? void 0 : _a.id,
                    chatId: (_b = ctx.chat) === null || _b === void 0 ? void 0 : _b.id,
                    firstName,
                    lastName,
                    patronymic,
                    morningTime,
                    eveningTime,
                    isActive: true,
                });
            });
            yield ctx.reply(`🎉 Регистрация успешно завершена!
        Имя: ${firstName} \n
        Фамилия: ${lastName} \n
        ${patronymic ? "Отчество :" + patronymic : ""} \n
        Утреннее измерение: ${morningTime} \n
        Вечернее измерение: ${eveningTime} \n
        Я буду напоминать вам об измерениях за 60 и 30 минут до указанного времени и присылать запрос в назначенное время.`);
        }
        catch (error) {
            console.error("Ошибка при создании пользователя:", error);
            yield ctx.reply("Произошла ошибка при сохранении данных. Попробуйте зарегистрироваться позже. /register");
        }
    });
}
