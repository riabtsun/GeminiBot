import User from "../../models/User";
import Measurement from "../../models/Measurement";
import { NextFunction } from "grammy";
import { measurementRegex, MyContext } from "../../bot";
import { botTexts } from "../../botTexts";

export const measurementValidator = async (
  ctx: MyContext,
  next: NextFunction,
) => {
  // Сначала проверяем, не является ли сообщение командой
  if (ctx?.message?.text?.startsWith("/")) {
    console.log(
      `[Text Handler] Сообщение является командой "${ctx.message.text}", сбрасываем флаг ожидания (если был) и передаем дальше.`,
    );
    ctx.session.expectingMeasurement = false; // Сбрасываем флаг на всякий случай
    return await next(); // Передаем управление обработчикам команд
  }

  // Проверяем, ожидаем ли мы ввода измерения от этого пользователя
  if (!ctx.session.expectingMeasurement) {
    console.log(
      `[Text Handler] Флаг ожидания не установлен для ${ctx.from?.id}, передаем дальше.`,
    );
    return await next(); // Если не ожидаем, передаем управление дальше (если есть другие обработчики)
  }

  // --- Если мы ожидаем ввод ---
  console.log(
    `[Text Handler] Ожидается ввод от ${ctx.from?.id}. Проверяем сообщение: "${ctx?.message?.text}"`,
  );

  const match = ctx?.message?.text?.match(measurementRegex);

  if (match) {
    // --- Формат совпал ---
    console.log(`[Text Handler] Формат совпал для ${ctx.from?.id}.`);
    try {
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
        await ctx.reply(botTexts.measurementValidator.invalidValues);
        console.warn(
          `[Text Handler] Невалидные значения от ${ctx.from?.id}: ${systolic}/${diastolic} ${pulse}`,
        );
        // НЕ сбрасываем флаг, ждем корректного ввода
        return;
      }

      // Находим пользователя (нужен _id для сохранения)
      const user = await User.findOne({ telegramId: ctx.from?.id });
      if (!user) {
        // Этого не должно произойти, если флаг установлен, но проверим
        await ctx.reply(botTexts.measurementValidator.registrationError);
        ctx.session.expectingMeasurement = false; // Сбрасываем флаг
        return;
      }

      // Сохраняем измерение
      const newMeasurement = await Measurement.create({
        userId: user._id,
        timestamp: new Date(),
        systolic,
        diastolic,
        pulse,
      });

      console.log(
        `[Text Handler] Сохранено измерение ${newMeasurement._id} для пользователя ${ctx.from?.id}`,
      );
      await ctx.reply(
        `✅ Тиск ${systolic}/${diastolic} і пульс ${pulse} збережено. Дякую!`,
      );
      ctx.session.expectingMeasurement = false; // <<<--- СБРАСЫВАЕМ ФЛАГ ожидания
    } catch (error) {
      console.error(
        `[Text Handler] Ошибка при сохранении измерения от ${ctx.from?.id}:`,
        error,
      );
      await ctx.reply(botTexts.measurementValidator.savingError);
      // Сбрасывать ли флаг при ошибке сохранения - спорно. Пока оставим, чтобы не зацикливаться.
      ctx.session.expectingMeasurement = false;
    }
  } else {
    // --- Формат НЕ совпал ---
    console.log(
      `[Text Handler] Неверный формат от ${ctx.from?.id}: "${ctx?.message?.text}"`,
    );
    await ctx.reply(
      botTexts.measurementValidator.invalidFormat,
      { parse_mode: "Markdown" }, // Используем Markdown для выделения
    );
    // НЕ сбрасываем флаг, продолжаем ожидать корректного ввода
  }
};
