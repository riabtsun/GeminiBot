import { CallbackQueryContext } from "grammy";
import { MyContext } from "../../bot";
import { botTexts } from "../../botTexts";

export const enterMeasurementCb = async (
  ctx: CallbackQueryContext<MyContext>,
) => {
  if (!ctx.chat || !ctx.from) return; // Проверка наличия chat и from

  ctx.session.expectingMeasurement = true; // Устанавливаем флаг ожидания в сессии
  console.log(
    `[Callback] Пользователь ${ctx.from.id} нажал кнопку ввода. Установлен флаг ожидания.`,
  );

  await ctx.answerCallbackQuery(); // Убираем "часики" с кнопки

  // Редактируем исходное сообщение, убирая кнопку (опционально, но улучшает UX)
  if (ctx.callbackQuery.message) {
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    } catch (e) {
      console.warn(
        `[Callback] Не удалось убрать клавиатуру у сообщения ${ctx.callbackQuery.message.message_id}`,
        e,
      );
    }
  }

  await ctx.reply(botTexts.enterMeasurement);
};
