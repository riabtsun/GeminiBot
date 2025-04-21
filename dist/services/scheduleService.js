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
exports.ScheduleService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const grammy_1 = require("grammy");
const User_1 = __importDefault(require("../models/User"));
const date_fns_1 = require("date-fns");
const uk_1 = require("date-fns/locale/uk");
const date_fns_2 = require("date-fns");
const Measurement_1 = __importDefault(require("../models/Measurement"));
const pdfService_1 = require("./pdfService");
class ScheduleService {
    constructor(botInstance) {
        this.scheduledTasks = new Map();
        this.bot = botInstance;
        console.log("Сервис планировщика инициализирован.");
    }
    initializeSchedules() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Инициализация расписаний пользователей...");
            try {
                const activeUsers = yield User_1.default.find({ isActive: true });
                console.log(`Найдено ${activeUsers.length} активных пользователей для планирования.`);
                activeUsers.forEach((user) => {
                    console.log(`[CRON] Планирование для ${user.telegramId} (${user.firstName})`);
                    if (this.validateUserData(user)) {
                        this.scheduleUserTasks(user);
                    }
                    else {
                        console.warn(`Пользователь ${user.telegramId} ${user.firstName} имеет невалидные данные времени или таймзоны. Задачи не запланированы.`);
                    }
                });
                this.scheduleUpdateTask();
                console.log("Инициализация расписаний завершена.");
            }
            catch (error) {
                console.error("Ошибка при инициализации расписаний:", error);
            }
            node_cron_1.default.schedule("0 3 1 * *", () => __awaiter(this, void 0, void 0, function* () {
                console.log("[CRON Monthly] Запуск задачи ежемесячного отчета и очистки...");
                const reportDate = new Date();
                const previousMonthDate = (0, date_fns_1.subMonths)(reportDate, 1);
                const startPrevMonthUTC = (0, date_fns_2.startOfMonth)(previousMonthDate);
                const endPrevMonthUTC = (0, date_fns_2.endOfMonth)(previousMonthDate);
                const prevMonthName = (0, date_fns_1.format)(previousMonthDate, "LLLL", { locale: uk_1.uk });
                const prevYear = (0, date_fns_1.format)(previousMonthDate, "yyyy");
                const reportTitle = `Отчет измерений за ${prevMonthName} ${prevYear}`;
                const filename = `report_${(0, date_fns_1.format)(previousMonthDate, "yyyy-MM")}.pdf`;
                console.log(`[CRON Monthly] Подготовка отчета за период: ${(0, date_fns_1.format)(startPrevMonthUTC, "dd.MM.yyyy")} - ${(0, date_fns_1.format)(endPrevMonthUTC, "dd.MM.yyyy")}`);
                try {
                    const activeUsers = yield User_1.default.find({ isActive: true });
                    console.log(`[CRON Monthly] Найдено ${activeUsers.length} активных пользователей.`);
                    for (const user of activeUsers) {
                        console.log(`[CRON Monthly] Обработка пользователя <span class="math-inline">\{user\.telegramId\} \(</span>{user.firstName})`);
                        try {
                            const measurements = yield Measurement_1.default.find({
                                userId: user._id,
                                timestamp: {
                                    $gte: startPrevMonthUTC,
                                    $lte: endPrevMonthUTC,
                                },
                            }).sort({ timestamp: "asc" });
                            if (measurements && measurements.length > 0) {
                                console.log(`[CRON Monthly] Найдено ${measurements.length} измерений для user ${user.telegramId}. Генерация PDF...`);
                                const pdfBuffer = yield pdfService_1.pdfService.generateMeasurementsPDF(user, measurements, reportTitle);
                                console.log(`[CRON Monthly] Отправка отчета user ${user.telegramId}...`);
                                yield this.bot.api.sendDocument(user.chatId, new grammy_1.InputFile(pdfBuffer, filename), {
                                    caption: reportTitle,
                                });
                                console.log(`[CRON Monthly] Отчет успешно отправлен user ${user.telegramId}.`);
                            }
                            else {
                                console.log(`[CRON Monthly] Нет данных для отчета user ${user.telegramId} за прошлый месяц.`);
                            }
                        }
                        catch (userError) {
                            console.error(`[CRON Monthly] Ошибка при обработке/отправке отчета для user ${user.telegramId}:`, userError.message || userError);
                        }
                        yield new Promise((resolve) => setTimeout(resolve, 50));
                    }
                    const cutoffDate = startPrevMonthUTC;
                    console.log(`[CRON Monthly] Удаление измерений старше ${(0, date_fns_1.format)(cutoffDate, "dd.MM.yyyy HH:mm:ss")}...`);
                    try {
                        const deleteResult = yield Measurement_1.default.deleteMany({
                            timestamp: { $lt: cutoffDate },
                        });
                        console.log(`[CRON Monthly] Успешно удалено ${deleteResult.deletedCount} старых измерений.`);
                    }
                    catch (deleteError) {
                        console.error("[CRON Monthly] Ошибка при удалении старых измерений:", deleteError);
                    }
                }
                catch (error) {
                    console.error("[CRON Monthly] Глобальная ошибка в задаче ежемесячного отчета:", error);
                }
                console.log("[CRON Monthly] Задача ежемесячного отчета и очистки завершена.");
            }), {
                timezone: "UTC",
            });
            console.log("[CRON Monthly] Задача ежемесячного отчета и очистки запланирована.");
        });
    }
    removeUserTasks(telegramId) {
        const userTasks = this.scheduledTasks.get(telegramId);
        if (userTasks) {
            Object.values(userTasks).forEach((task) => task === null || task === void 0 ? void 0 : task.stop());
            this.scheduledTasks.delete(telegramId);
            console.log(`Задачи для пользователя ${telegramId} удалены.`);
        }
    }
    scheduleUserTasks(user) {
        this.removeUserTasks(user.telegramId);
        if (!user.isActive || !this.validateUserData(user)) {
            console.log(`Пользователь ${user.telegramId} неактивен. Задачи не планируются.`);
            return;
        }
        try {
            const measurementKeyboard = new grammy_1.InlineKeyboard().text("✍️ Ввести результат", "enter_measurement");
            const morningTime = this.parseTime(user.morningTime);
            const tasks = {};
            if (morningTime) {
                const reminder1Time = (0, date_fns_1.subMinutes)(morningTime.date, 60);
                const reminder2Time = (0, date_fns_1.subMinutes)(morningTime.date, 30);
                tasks.morningReminder1 = this.createCronJob(`${(0, date_fns_1.format)(reminder1Time, "m")} ${(0, date_fns_1.format)(reminder1Time, "H")} * * *`, `🔔 Нагадування: Скоро (через 60 хв) потрібно заміряти тиск (${user.morningTime}).`, user.chatId);
                tasks.morningReminder2 = this.createCronJob(`${(0, date_fns_1.format)(reminder2Time, "m")} ${(0, date_fns_1.format)(reminder2Time, "H")} * * *`, `❗️ Нагадування: Скоро (через 30 хв) потрібно заміряти тиск (${user.morningTime}).`, user.chatId);
                tasks.morningPrompt = this.createCronJob(`${morningTime.minute} ${morningTime.hour} * * *`, `⏰ Пора заміряти ранкові тиск і пульс! Чекаю ваші результати (наприклад: 120/80 75).`, user.chatId, measurementKeyboard);
            }
            const eveningTime = this.parseTime(user.eveningTime);
            if (eveningTime) {
                const reminder1Time = (0, date_fns_1.subMinutes)(eveningTime.date, 60);
                const reminder2Time = (0, date_fns_1.subMinutes)(eveningTime.date, 30);
                tasks.eveningReminder1 = this.createCronJob(`${(0, date_fns_1.format)(reminder1Time, "m")} ${(0, date_fns_1.format)(reminder1Time, "H")} * * *`, `🔔 Нагадування: Скоро (через 60 хв) потрібно заміряти тиск (${user.eveningTime}).`, user.chatId);
                tasks.eveningReminder2 = this.createCronJob(`${(0, date_fns_1.format)(reminder2Time, "m")} ${(0, date_fns_1.format)(reminder2Time, "H")} * * *`, `❗️ Нагадування: Скоро (через 30 хв) потрібно заміряти тиск (${user.eveningTime}).`, user.chatId);
                tasks.eveningPrompt = this.createCronJob(`${eveningTime.minute} ${eveningTime.hour} * * *`, `⏰ Пора заміряти вечерній тиск и пульс! Чекаю ваші результати (например: 120/80 75).`, user.chatId, measurementKeyboard);
            }
            this.scheduledTasks.set(user.telegramId, tasks);
            console.log(`Задачи для пользователя ${user.telegramId} ${user.firstName} успешно запланированы.`);
        }
        catch (error) {
            console.error(`Ошибка планирования задач для пользователя ${user.telegramId}:`, error);
            this.removeUserTasks(user.telegramId);
        }
    }
    createCronJob(cronPattern, message, chatId, keyboard) {
        try {
            const task = node_cron_1.default.schedule(cronPattern, () => __awaiter(this, void 0, void 0, function* () {
                var _a;
                console.log(`[CRON] Отправка сообщения в чат ${chatId}: ${message}`);
                try {
                    yield this.bot.api.sendMessage(chatId, message, {
                        parse_mode: "Markdown",
                        reply_markup: keyboard,
                    });
                }
                catch (error) {
                    console.error(`[CRON] Ошибка отправки сообщения в чат ${chatId}:`, error.message);
                    if ((_a = error.description) === null || _a === void 0 ? void 0 : _a.includes("bot was blocked by the user")) {
                        console.warn(`[CRON] Пользователь ${chatId} заблокировал бота. Рекомендуется пометить его как неактивного.`);
                    }
                }
            }), {
                scheduled: true,
            });
            return task;
        }
        catch (error) {
            console.error(`[CRON] Ошибка создания задачи (${cronPattern}):`, error);
            return undefined;
        }
    }
    scheduleUpdateTask() {
        node_cron_1.default.schedule("* * * * *", () => __awaiter(this, void 0, void 0, function* () {
            console.log("[CRON] Запуск периодического обновления расписаний...");
            try {
                const activeUsers = yield User_1.default.find({ isActive: true });
                const currentUserIds = Array.from(this.scheduledTasks.keys());
                activeUsers.forEach((user) => {
                    if (this.validateUserData(user)) {
                        this.scheduleUserTasks(user);
                    }
                });
                currentUserIds.forEach((userId) => {
                    if (!activeUsers.some((user) => user.telegramId === userId)) {
                        this.removeUserTasks(userId);
                    }
                });
            }
            catch (error) {
                console.error("[CRON] Ошибка при обновлении расписаний:", error);
            }
        }));
    }
    validateUserData(user) {
        return (this.validateTimeFormat(user.morningTime) &&
            this.validateTimeFormat(user.eveningTime));
    }
    parseTime(timeString) {
        const match = timeString.match(/^(\d{2}):(\d{2})$/);
        if (!match)
            return null;
        const hour = parseInt(match[1], 10);
        const minute = parseInt(match[2], 10);
        const now = new Date();
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
        return { hour, minute, date };
    }
    validateTimeFormat(time) {
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
    }
}
exports.ScheduleService = ScheduleService;
