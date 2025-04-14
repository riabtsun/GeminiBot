import { MyConversation, MyContext } from "../bot";
import Measurement from "../models/Measurement";
import { botTexts } from "../botTexts";

export const EDIT_MEASUREMENT_CONVERSATION_ID = "edit_measurement_conv";

// --- Функция диалога ---
export async function editMeasurementConversation(
  conversation: MyConversation,
  ctx: MyContext,
) {
  const session = await conversation.external((ctx) => ctx.session);

  console.log("session at start", session);

  const userId = ctx.from?.id;
  // Получаем ID измерения из сессии
  const measurementId = session.lastMeasurementId;

  if (!userId || !measurementId) {
    await ctx.reply(botTexts.measurement.errorId);
    // Очищаем на всякий случай
    session.lastMeasurementId = "";
    return;
  }

  await ctx.reply(botTexts.measurement.newMeasurement);

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
        await ctx.reply("botTexts.measurement.strangeValues");
        // Остаемся в цикле while
      } else {
        // Значения корректны, сохраняем и выходим из цикла
        newSystolic = systolic;
        newDiastolic = diastolic;
        newPulse = pulse;
      }
    } else {
      // Формат неверный
      await ctx.reply(botTexts.measurement.invalidValues, {
        parse_mode: "Markdown",
      });
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
        { new: true }, // Возвращаем обновленный документ
      ),
    );

    if (!updatedMeasurement) {
      await ctx.reply(botTexts.measurement.notFound);
    } else {
      await ctx.reply(
        botTexts.measurement.updatedResults +
          `Нові значення: ${updatedMeasurement.systolic} / ${updatedMeasurement.diastolic}, пульс ${updatedMeasurement.pulse}`,
      );
      console.log(
        `[Conv edit_measurement] Пользователь ${userId} обновил измерение ${measurementId}.`,
      );
    }
  } catch (error) {
    console.error(
      `[Conv edit_measurement] Ошибка обновления измерения ${measurementId} для ${userId}:`,
      error,
    );
    await ctx.reply(botTexts.measurement.savingError);
  } finally {
    // Очищаем ID из сессии независимо от результата
    session.lastMeasurementId = "";
  }
}
