import User from "../../models/User";
import Measurement from "../../models/Measurement";
import { format } from "date-fns";
import { MyContext } from "../../bot";

export const editLastMeasurement = async (ctx: MyContext) => {
  if (!ctx.from || !ctx.chat) return;

  const userId = ctx.from.id;
  console.log(
    `[Callback edit_last_measurement] Нажата кнопка пользователем ${userId}`
  );

  try {
    await ctx.answerCallbackQuery({ text: "Ищу последнее измерение..." });
    ctx.session.expectingMeasurement = true;
    // Удаляем клавиатуру из предыдущего сообщения
    if (ctx?.callbackQuery?.message) {
      try {
        await ctx.editMessageReplyMarkup({ reply_markup: undefined });
      } catch (e) {
        /* Игнорируем ошибку, если не получилось */
      }
    }

    // 1. Найти пользователя, чтобы получить его _id
    const user = await User.findOne({ telegramId: userId });
    if (!user) {
      await ctx.reply("Не удалось найти вашу регистрацию. Попробуйте /start.");
      return;
    }

    // 2. Найти последнее измерение этого пользователя
    const lastMeasurement = await Measurement.findOne({
      userId: user._id,
    }).sort({ timestamp: -1 }); // Сортируем по времени измерения (убывание)

    if (!lastMeasurement) {
      await ctx.reply("🤷 У вас еще нет сохраненных измерений.");
      ctx.session.lastMeasurementId = "";
      return;
    }
    console.log(
      `[Callback edit_last_measurement] Проверка ctx.session перед записью ID для user ${userId}.`
    );

    // Выведем сам объект сессии, если он есть (может быть полезно)
    if (ctx.session) {
      console.log(
        `[Callback edit_last_measurement] Содержимое ctx.session:`,
        ctx.session
      );
    }

    if (typeof ctx.session === "undefined") {
      console.error(
        `[Callback edit_last_measurement] КРИТИЧЕСКАЯ ОШИБКА: ctx.session НЕ ОПРЕДЕЛЕН для user ${userId}!`
      );
      await ctx.reply(
        "Произошла внутренняя ошибка (сессия не найдена).\nПожалуйста, попробуйте использовать команду /start, а затем снова /edit."
      );
      // Прерываем выполнение, чтобы избежать TypeError
      return;
    }
    // Убеждаемся что у измерения есть _id
    if (!lastMeasurement._id) {
      throw new Error("Measurement _id is missing");
    }

    // 3. Сохранить ID измерения в сессию
    ctx.session.lastMeasurementId = lastMeasurement._id.toString();
    console.log(
      `[Callback edit_last_measurement] ID ${ctx.session.lastMeasurementId} установлен в сессию.`
    );
    console.log(
      `[Callback edit_last_measurement] Состояние ctx.session ПЕРЕД conversation.enter:`,
      JSON.stringify(ctx.session)
    );

    // 4. Показать пользователю найденное измерение
    // Форматируем время измерения с учетом часового пояса пользователя
    const measurementTimeInUser = lastMeasurement.timestamp;

    const formattedTime = format(measurementTimeInUser, "dd.MM.yyyy HH:mm");

    await ctx.reply(`Найденное последнее измерение (${formattedTime}):
    Давление: ${lastMeasurement.systolic} / ${lastMeasurement.diastolic}
    Пульс: ${lastMeasurement.pulse}

    Хотите изменить эти значения? Начинаем процесс редактирования...`);

    // До входа в диалог
    console.log(`[Callback edit_last_measurement] Проверка сессии:`, {
      sessionExists: Boolean(ctx.session),
      lastMeasurementId: ctx.session?.lastMeasurementId,
    });

    // Убедитесь, что ID измерения сохранен
    if (!ctx.session.lastMeasurementId) {
      await ctx.reply("Ошибка: ID измерения не сохранен в сессии");
      return;
    }

    // 5. Запустить диалог редактирования
    await ctx.conversation.enter("edit_measurement_conv"); // ID диалога определим на след. шаге
  } catch (error) {
    console.error(
      `[Callback edit_last_measurement] Ошибка для пользователя ${userId}:`,
      error
    );
    await ctx.reply(
      "Произошла ошибка при поиске последнего измерения. Попробуйте позже."
    );
  }
};
