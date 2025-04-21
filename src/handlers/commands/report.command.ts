import { startOfMonth, endOfMonth, format } from "date-fns";
import { uk } from "date-fns/locale/uk";
import { InputFile } from "grammy";
import Measurement from "../../models/Measurement";
import User from "../../models/User";
import { pdfService } from "../../services/pdfService";
import { MyContext } from "../../bot";

export const generateReport = async (ctx: MyContext) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  console.log(`[Command /report] Запрос отчета от ${userId}`);
  await ctx.replyWithChatAction("upload_document"); // Показываем "отправляет документ"

  try {
    // 1. Найти пользователя
    const user = await User.findOne({ telegramId: userId });
    if (!user) {
      await ctx.reply("Ви не зареєстровані. Використайте /register.");
      return;
    }

    // 2. Определить границы текущего месяца (в UTC)
    const now = new Date();
    const startCurrentMonthUTC = startOfMonth(now); // Начало текущего месяца в UTC
    const endCurrentMonthUTC = endOfMonth(now); // Конец текущего месяца в UTC

    // 3. Найти измерения за текущий месяц
    const measurements = await Measurement.find({
      userId: user._id,
      timestamp: {
        $gte: startCurrentMonthUTC,
        $lte: endCurrentMonthUTC,
      },
    }).sort({ timestamp: "asc" }); // Сортируем по возрастанию времени

    if (!measurements || measurements.length === 0) {
      await ctx.reply("🤷 За поточний місяць ще немає даних для звіту.");
      return;
    }

    console.log(
      `[Command /report] Найдено ${measurements.length} измерений для user ${userId} за текущий месяц.`,
    );

    // 4. Сгенерировать PDF
    // Формируем заголовок и имя файла
    const monthName = format(now, "LLLL", { locale: uk }); // Название месяца по-русски
    const year = format(now, "yyyy");
    const reportTitle = `Звіт вимірювань за ${monthName} ${year}`;
    const filename = `report_${format(now, "yyyy-MM")}.pdf`;

    await ctx.replyWithChatAction("upload_document"); // Показываем статус еще раз

    const pdfBuffer = await pdfService.generateMeasurementsPDF(
      user,
      measurements,
      reportTitle,
    );

    // 5. Отправить PDF
    await ctx.replyWithDocument(new InputFile(pdfBuffer, filename), {
      caption: reportTitle, // Подпись к документу
    });
    console.log(`[Command /report] Отчет успешно отправлен user ${userId}`);
  } catch (error) {
    console.error(
      `[Command /report] Ошибка при генерации/отправке отчета для ${userId}:`,
      error,
    );
    await ctx.reply(
      "❌ Произошла ошибка при создании отчета. Попробуйте позже.",
    );
  }
};
