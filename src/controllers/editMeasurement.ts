import { MyConversation, MyContext } from "../bot";
import Measurement from "../models/Measurement";

export const EDIT_MEASUREMENT_CONVERSATION_ID = "edit_measurement_conv";

// --- Функция диалога ---
export async function editMeasurementConversation(
  conversation: MyConversation,
  ctx: MyContext
) {
  const session = await conversation.external((ctx) => ctx.session);

  console.log("session at start", session);

  const userId = ctx.from?.id;
  // Получаем ID измерения из сессии
  const measurementId = session.lastMeasurementId;

  if (!userId || !measurementId) {
    await ctx.reply(
      "Произошла ошибка: не найден ID редактируемого измерения. Пожалуйста, начните сначала с команды /edit."
    );
    // Очищаем на всякий случай
    session.lastMeasurementId = "";
    return;
  }

  await ctx.reply(
    "📊 Введите новые значения для последнего измерения в формате Давление/Давление Пульс (например: 120/80 75)"
  );

  let newSystolic: number | undefined;
  let newDiastolic: number | undefined;
  let newPulse: number | undefined;

  // Цикл для повторного запроса при неверном формате или значениях
  while (newSystolic === undefined) {
    // Проверка всего контекста

    const responseCtx = await conversation.waitFor("message:text");
    const inputText = responseCtx.message.text.trim();

    // Проверка формата
    const measurementRegex =
      /^\s*(\d{1,3})\s*[/\\.,\s]\s*(\d{1,3})\s+(\d{1,3})\s*$/;
    const match = inputText.match(measurementRegex);

    if (match) {
      const systolic = parseInt(match[1], 10);
      const diastolic = parseInt(match[2], 10);
      const pulse = parseInt(match[3], 10);

      // Валидация значений
      if (
        systolic < 50 ||
        systolic > 300 ||
        diastolic < 30 ||
        diastolic > 200 ||
        pulse < 30 ||
        pulse > 250
      ) {
        await ctx.reply(
          "😬 Значения выходят за разумные пределы. Пожалуйста, проверьте и введите снова (например: 120/80 75):"
        );
        // Остаемся в цикле while
      } else {
        // Значения корректны, сохраняем и выходим из цикла
        newSystolic = systolic;
        newDiastolic = diastolic;
        newPulse = pulse;
      }
    } else {
      // Формат неверный
      await ctx.reply(
        "❗️ Неверный формат.\n" +
          "Пожалуйста, введите данные в формате **Давление/Давление Пульс** (например: `120/80 75`):",
        { parse_mode: "Markdown" }
      );
      // Остаемся в цикле while
    }
  }

  // --- Обновление в базе данных ---
  try {
    const updatedMeasurement = await conversation.external(() =>
      Measurement.findByIdAndUpdate(
        measurementId,
        {
          $set: {
            systolic: newSystolic,
            diastolic: newDiastolic, // Убедимся что newDiastolic и newPulse определены (они будут определены если вышли из цикла)
            pulse: newPulse,
          },
        },
        { new: true } // Возвращаем обновленный документ
      )
    );

    if (!updatedMeasurement) {
      await ctx.reply(
        "❌ Не удалось найти измерение для обновления. Возможно, оно было удалено. Начните с /edit."
      );
    } else {
      await ctx.reply(`✅ Последнее измерение успешно обновлено!
Новые значения: ${updatedMeasurement.systolic} / ${updatedMeasurement.diastolic}, пульс ${updatedMeasurement.pulse}`);
      console.log(
        `[Conv edit_measurement] Пользователь ${userId} обновил измерение ${measurementId}.`
      );
    }
  } catch (error) {
    console.error(
      `[Conv edit_measurement] Ошибка обновления измерения ${measurementId} для ${userId}:`,
      error
    );
    await ctx.reply(
      "❌ Произошла ошибка при сохранении новых данных измерения. Попробуйте снова позже."
    );
  } finally {
    // Очищаем ID из сессии независимо от результата
    session.lastMeasurementId = "";
  }
}
