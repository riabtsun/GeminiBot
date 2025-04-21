import PDFDocument from "pdfkit";
import fs from "fs"; // Для регистрации шрифта из файла
import path from "path"; // Для построения путей
import { IUser } from "../models/User";
import { IMeasurement } from "../models/Measurement";
import { format } from "date-fns";

// --- Настройки PDF ---
const FONT_PATH = path.join(__dirname, "..", "assets", "fonts"); // Путь к шрифту ОТНОСИТЕЛЬНО СКОМПИЛИРОВАННОГО ФАЙЛА в dist (!) или абсолютный путь
const FONT_NAME = "DejaVuSans"; // Имя для регистрации шрифта
const PAGE_MARGIN = 50;
const TABLE_TOP_Y = 150; // Начальная позиция таблицы по Y
const ROW_HEIGHT = 20;
const COL_WIDTHS = [100, 60, 80, 80, 70]; // Ширина колонок: Дата, Время, Сист, Диа, Пульс
const HEADERS = ["Дата", "Час", "Систолічний", "Діастолічний", "Пульс"];

if (!fs.existsSync(FONT_PATH)) {
  console.warn(`!!! ВНИМАНИЕ: Файл шрифта не найден по пути: ${FONT_PATH}`);
  console.warn(
    "Кириллица в PDF может отображаться некорректно. Убедитесь, что шрифт существует и путь указан верно.",
  );
  // Можно добавить логику использования стандартного шрифта как fallback, но кириллица будет потеряна
}

export class PdfService {
  /**
   * Генерирует PDF отчет с измерениями.
   * @param user - Данные пользователя (для имени и таймзоны)
   * @param measurements - Массив измерений для отчета
   * @param title - Заголовок отчета (напр., "Отчет за Апрель 2025")
   * @returns Buffer с данными PDF
   */
  public generateMeasurementsPDF(
    user: IUser,
    measurements: IMeasurement[],
    title: string,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: "A4",
        margins: {
          top: PAGE_MARGIN,
          bottom: PAGE_MARGIN,
          left: PAGE_MARGIN,
          right: PAGE_MARGIN,
        },
        font: path.join(FONT_PATH, "DejaVuSans.ttf"),
        bufferPages: true, // Важно для получения буфера в конце
        // autoFirstPage: false // Если мы хотим полностью контролировать первую страницу
      });

      const buffers: Buffer[] = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on("error", reject);

      try {
        // --- Регистрация и установка шрифта ---
        // Делаем это внутри, чтобы избежать ошибок, если файл не найден при старте
        if (fs.existsSync(FONT_PATH)) {
          doc.registerFont(FONT_NAME, FONT_PATH);
          doc.font(FONT_NAME);
        } else {
          // Используем стандартный шрифт, если наш не найден (кириллица будет ??)
          doc.font("Helvetica");
        }

        // --- Первая страница и Заголовок ---
        // doc.addPage(); // Если autoFirstPage: false
        doc.fontSize(18).text(title, { align: "center" });
        doc.moveDown();
        doc
          .fontSize(12)
          .text(
            `Користувач: ${user.lastName} ${user.firstName} ${
              user.patronymic || ""
            }`,
          );
        const generationTime = format(new Date(), "dd.MM.yyyy HH:mm:ss");
        doc.text(`Звіт згенеровано: ${generationTime}`);
        doc.moveDown(2);

        // --- Таблица ---
        let currentY = TABLE_TOP_Y;
        this.drawTableHeader(doc, currentY);
        currentY += ROW_HEIGHT;

        for (const measurement of measurements) {
          // Проверка на необходимость новой страницы
          if (currentY + ROW_HEIGHT > doc.page.height - PAGE_MARGIN) {
            doc.addPage();
            currentY = PAGE_MARGIN; // Начинаем сверху на новой странице
            this.drawTableHeader(doc, currentY);
            currentY += ROW_HEIGHT;
          }

          this.drawTableRow(doc, currentY, measurement);
          currentY += ROW_HEIGHT;
        }

        doc.end(); // Завершаем документ -> сработает событие 'end'
      } catch (error) {
        console.error("Ошибка во время генерации PDF:", error);
        reject(error); // Отклоняем промис
      }
    });
  }

  // --- Вспомогательные методы для рисования таблицы ---

  private drawTableHeader(doc: PDFKit.PDFDocument, y: number) {
    let currentX = PAGE_MARGIN;
    doc.fontSize(10).font(path.join(FONT_PATH, "DejaVuSans-Bold.ttf")); // Используем жирный шрифт для заголовков

    HEADERS.forEach((header, i) => {
      doc.text(header, currentX, y, { width: COL_WIDTHS[i], align: "center" });
      currentX += COL_WIDTHS[i];
    });

    doc
      .moveTo(PAGE_MARGIN, y + ROW_HEIGHT - 5) // Линия под заголовком
      .lineTo(doc.page.width - PAGE_MARGIN, y + ROW_HEIGHT - 5)
      .lineWidth(1)
      .stroke();
    doc.font(FONT_NAME).fontSize(10); // Возвращаем обычный шрифт и размер
  }

  private drawTableRow(
    doc: PDFKit.PDFDocument,
    y: number,
    measurement: IMeasurement,
  ) {
    let currentX = PAGE_MARGIN;

    // Форматируем дату и время в таймзоне пользователя
    const zonedTimestamp = measurement.timestamp;
    const dateStr = format(zonedTimestamp, "dd.MM.yyyy");
    const timeStr = format(zonedTimestamp, "HH:mm");

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
      .moveTo(PAGE_MARGIN, y + ROW_HEIGHT - 5) // Тонкая линия под строкой
      .lineTo(doc.page.width - PAGE_MARGIN, y + ROW_HEIGHT - 5)
      .lineWidth(0.5)
      .strokeColor("#cccccc") // Светло-серая
      .stroke()
      .strokeColor("#000000"); // Возвращаем черный цвет обводки
  }
}

// Экспортируем экземпляр сервиса для удобства использования
export const pdfService = new PdfService();
