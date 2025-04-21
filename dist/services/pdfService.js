"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pdfService = exports.PdfService = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const date_fns_1 = require("date-fns");
const FONT_PATH = path_1.default.join(__dirname, "..", "assets", "fonts", "DejaVuSans.ttf");
const FONT_NAME = "DejaVuSans";
const PAGE_MARGIN = 50;
const TABLE_TOP_Y = 150;
const ROW_HEIGHT = 20;
const COL_WIDTHS = [100, 60, 70, 70, 70];
const HEADERS = ["Дата", "Час", "Систолічний", "Діастолічний", "Пульс"];
if (!fs_1.default.existsSync(FONT_PATH)) {
    console.warn(`!!! ВНИМАНИЕ: Файл шрифта не найден по пути: ${FONT_PATH}`);
    console.warn("Кириллица в PDF может отображаться некорректно. Убедитесь, что шрифт существует и путь указан верно.");
}
class PdfService {
    generateMeasurementsPDF(user, measurements, title) {
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({
                size: "A4",
                margins: {
                    top: PAGE_MARGIN,
                    bottom: PAGE_MARGIN,
                    left: PAGE_MARGIN,
                    right: PAGE_MARGIN,
                },
                bufferPages: true,
            });
            const buffers = [];
            doc.on("data", buffers.push.bind(buffers));
            doc.on("end", () => {
                resolve(Buffer.concat(buffers));
            });
            doc.on("error", reject);
            try {
                if (fs_1.default.existsSync(FONT_PATH)) {
                    doc.registerFont(FONT_NAME, FONT_PATH);
                    doc.font(FONT_NAME);
                }
                else {
                    doc.font("Helvetica");
                }
                doc.fontSize(18).text(title, { align: "center" });
                doc.moveDown();
                doc
                    .fontSize(12)
                    .text(`Користувач: ${user.lastName} ${user.firstName} ${user.patronymic || ""}`);
                const generationTime = (0, date_fns_1.format)(new Date(), "dd.MM.yyyy HH:mm:ss");
                doc.text(`Звіт згенеровано: ${generationTime}`);
                doc.moveDown(2);
                let currentY = TABLE_TOP_Y;
                this.drawTableHeader(doc, currentY);
                currentY += ROW_HEIGHT;
                for (const measurement of measurements) {
                    if (currentY + ROW_HEIGHT > doc.page.height - PAGE_MARGIN) {
                        doc.addPage();
                        currentY = PAGE_MARGIN;
                        this.drawTableHeader(doc, currentY);
                        currentY += ROW_HEIGHT;
                    }
                    this.drawTableRow(doc, currentY, measurement);
                    currentY += ROW_HEIGHT;
                }
                doc.end();
            }
            catch (error) {
                console.error("Ошибка во время генерации PDF:", error);
                reject(error);
            }
        });
    }
    drawTableHeader(doc, y) {
        let currentX = PAGE_MARGIN;
        doc.fontSize(10).font(FONT_NAME + "-Bold");
        HEADERS.forEach((header, i) => {
            doc.text(header, currentX, y, { width: COL_WIDTHS[i], align: "center" });
            currentX += COL_WIDTHS[i];
        });
        doc
            .moveTo(PAGE_MARGIN, y + ROW_HEIGHT - 5)
            .lineTo(doc.page.width - PAGE_MARGIN, y + ROW_HEIGHT - 5)
            .lineWidth(1)
            .stroke();
        doc.font(FONT_NAME).fontSize(10);
    }
    drawTableRow(doc, y, measurement) {
        let currentX = PAGE_MARGIN;
        const zonedTimestamp = measurement.timestamp;
        const dateStr = (0, date_fns_1.format)(zonedTimestamp, "dd.MM.yyyy");
        const timeStr = (0, date_fns_1.format)(zonedTimestamp, "HH:mm");
        const rowData = [
            dateStr,
            timeStr,
            measurement.systolic.toString(),
            measurement.diastolic.toString(),
            measurement.pulse.toString(),
        ];
        rowData.forEach((cell, i) => {
            doc.text(cell, currentX, y, { width: COL_WIDTHS[i], align: "center" });
            currentX += COL_WIDTHS[i];
        });
        doc
            .moveTo(PAGE_MARGIN, y + ROW_HEIGHT - 5)
            .lineTo(doc.page.width - PAGE_MARGIN, y + ROW_HEIGHT - 5)
            .lineWidth(0.5)
            .strokeColor("#cccccc")
            .stroke()
            .strokeColor("#000000");
    }
}
exports.PdfService = PdfService;
exports.pdfService = new PdfService();
