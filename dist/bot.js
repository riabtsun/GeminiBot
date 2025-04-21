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
exports.measurementRegex = void 0;
const grammy_1 = require("grammy");
const runner_1 = require("@grammyjs/runner");
const conversations_1 = require("@grammyjs/conversations");
const storage_mongodb_1 = require("@grammyjs/storage-mongodb");
const mongoose_1 = __importDefault(require("mongoose"));
require("dotenv/config");
const db_1 = require("./db");
const registration_1 = require("./controllers/registration");
const editProfile_1 = require("./controllers/editProfile");
const scheduleService_1 = require("./services/scheduleService");
const editSchedule_1 = require("./controllers/editSchedule");
const editMeasurement_1 = require("./controllers/editMeasurement");
const start_command_1 = require("./handlers/commands/start.command");
const register_command_1 = require("./handlers/commands/register.command");
const edit_command_1 = require("./handlers/commands/edit.command");
const editProfile_cb_1 = require("./handlers/callbacks/editProfile.cb");
const editSchedule_cb_1 = require("./handlers/callbacks/editSchedule.cb");
const enterMeasurement_cb_1 = require("./handlers/callbacks/enterMeasurement.cb");
const measurementValidator_1 = require("./handlers/listeners/measurementValidator");
const editLastMeasurement_1 = require("./handlers/callbacks/editLastMeasurement");
const report_command_1 = require("./handlers/commands/report.command");
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error("Ошибка: Переменная окружения BOT_TOKEN не установлена.");
    process.exit(1);
}
function getSessionKey(ctx) {
    var _a;
    return (_a = ctx.chat) === null || _a === void 0 ? void 0 : _a.id.toString();
}
const bot = new grammy_1.Bot(BOT_TOKEN);
const scheduleService = new scheduleService_1.ScheduleService(bot);
bot.use((0, grammy_1.session)({
    initial: () => ({
        expectingMeasurement: false,
        lastMeasurementId: "",
    }),
    storage: new storage_mongodb_1.MongoDBAdapter({
        collection: mongoose_1.default.connection.collection("sessions"),
    }),
}));
bot.use((0, conversations_1.conversations)());
bot.use((0, runner_1.sequentialize)(getSessionKey));
bot.use((ctx, next) => {
    ctx.scheduleService = scheduleService;
    return next();
});
bot.use((0, conversations_1.createConversation)(registration_1.registrationConversation, registration_1.REGISTRATION_CONVERSATION_ID));
bot.use((0, conversations_1.createConversation)(editProfile_1.editProfileConversation, editProfile_1.EDIT_PROFILE_CONVERSATION_ID));
bot.use((0, conversations_1.createConversation)(editSchedule_1.editScheduleConversation, editSchedule_1.EDIT_SCHEDULE_CONVERSATION_ID));
bot.use((0, conversations_1.createConversation)(editMeasurement_1.editMeasurementConversation, editMeasurement_1.EDIT_MEASUREMENT_CONVERSATION_ID));
bot.command("start", start_command_1.startCommand);
bot.command("register", register_command_1.registerCommand);
bot.command("edit", edit_command_1.editCommand);
bot.command("report", report_command_1.generateReport);
bot.callbackQuery("edit_profile", editProfile_cb_1.editProfileCb);
bot.callbackQuery("edit_schedule", editSchedule_cb_1.editScheduleCb);
bot.callbackQuery("register", register_command_1.registerCommand);
bot.callbackQuery("edit_last_measurement", editLastMeasurement_1.editLastMeasurement);
exports.measurementRegex = /^\s*(\d{1,3})\s*[/\\.,\s]\s*(\d{1,3})\s+(\d{1,3})\s*$/;
bot.callbackQuery("enter_measurement", enterMeasurement_cb_1.enterMeasurementCb);
bot.on("message:text", measurementValidator_1.measurementValidator);
bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Ошибка при обработке обновления ${ctx.update.update_id}:`);
    console.error(err.error);
});
const startBot = () => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, db_1.connectDB)();
    yield scheduleService.initializeSchedules();
    const runner = (0, runner_1.run)(bot);
    console.log("Бот запущен и готов принимать сообщения...");
    const stopRunner = () => {
        if (runner.isRunning()) {
            runner.stop();
            console.log("Бот остановлен.");
        }
    };
    process.once("SIGINT", stopRunner);
    process.once("SIGTERM", stopRunner);
});
startBot().catch((err) => {
    console.error("Критическая ошибка при запуске бота:", err);
    process.exit(1);
});
