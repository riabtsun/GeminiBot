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
exports.generateReport = void 0;
const date_fns_1 = require("date-fns");
const uk_1 = require("date-fns/locale/uk");
const grammy_1 = require("grammy");
const Measurement_1 = __importDefault(require("../../models/Measurement"));
const User_1 = __importDefault(require("../../models/User"));
const pdfService_1 = require("../../services/pdfService");
const generateReport = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = ctx.from) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId)
        return;
    console.log(`[Command /report] Запрос отчета от ${userId}`);
    yield ctx.replyWithChatAction("upload_document");
    try {
        const user = yield User_1.default.findOne({ telegramId: userId });
        if (!user) {
            yield ctx.reply("Ви не зареєстровані. Використайте /register.");
            return;
        }
        const now = new Date();
        const startCurrentMonthUTC = (0, date_fns_1.startOfMonth)(now);
        const endCurrentMonthUTC = (0, date_fns_1.endOfMonth)(now);
        const measurements = yield Measurement_1.default.find({
            userId: user._id,
            timestamp: {
                $gte: startCurrentMonthUTC,
                $lte: endCurrentMonthUTC,
            },
        }).sort({ timestamp: "asc" });
        if (!measurements || measurements.length === 0) {
            yield ctx.reply("🤷 За поточний місяць ще немає даних для звіту.");
            return;
        }
        console.log(`[Command /report] Найдено ${measurements.length} измерений для user ${userId} за текущий месяц.`);
        const monthName = (0, date_fns_1.format)(now, "LLLL", { locale: uk_1.uk });
        const year = (0, date_fns_1.format)(now, "yyyy");
        const reportTitle = `Отчет измерений за ${monthName} ${year}`;
        const filename = `report_${(0, date_fns_1.format)(now, "yyyy-MM")}.pdf`;
        yield ctx.replyWithChatAction("upload_document");
        const pdfBuffer = yield pdfService_1.pdfService.generateMeasurementsPDF(user, measurements, reportTitle);
        yield ctx.replyWithDocument(new grammy_1.InputFile(pdfBuffer, filename), {
            caption: reportTitle,
        });
        console.log(`[Command /report] Отчет успешно отправлен user ${userId}`);
    }
    catch (error) {
        console.error(`[Command /report] Ошибка при генерации/отправке отчета для ${userId}:`, error);
        yield ctx.reply("❌ Произошла ошибка при создании отчета. Попробуйте позже.");
    }
});
exports.generateReport = generateReport;
