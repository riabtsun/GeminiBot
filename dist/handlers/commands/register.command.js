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
exports.registerCommand = void 0;
const User_1 = __importDefault(require("../../models/User"));
const registration_1 = require("../../controllers/registration");
const registerCommand = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    console.log(`Получена команда /register от пользователя ${(_a = ctx.from) === null || _a === void 0 ? void 0 : _a.id} (${(_b = ctx.from) === null || _b === void 0 ? void 0 : _b.username})`);
    try {
        const user = yield User_1.default.findOne({ telegramId: (_c = ctx.from) === null || _c === void 0 ? void 0 : _c.id });
        if (user) {
            yield ctx.reply(`Ви вже зареєстровані, ${user.firstName}!`);
        }
        else {
            yield ctx.conversation.enter(registration_1.REGISTRATION_CONVERSATION_ID);
        }
    }
    catch (error) {
        console.error("Ошибка при обработке /register:", error);
        yield ctx.reply("Виникла помилка. Спробуйте пізніше.");
    }
});
exports.registerCommand = registerCommand;
