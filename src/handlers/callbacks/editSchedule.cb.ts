import { EDIT_SCHEDULE_CONVERSATION_ID } from "../../controllers/editSchedule";
import { CallbackQueryContext } from "grammy";
import { MyContext } from "../../bot";

export const editScheduleCb = async (ctx: CallbackQueryContext<MyContext>) => {
  if (!ctx.from || !ctx.chat) return;
  console.log(
    `[Callback edit_schedule] Нажата кнопка пользователем ${ctx.from.id}`
  );
  await ctx.answerCallbackQuery({ text: "Начинаем изменение времени..." });

  // Удаляем клавиатуру из предыдущего сообщения
  if (ctx.callbackQuery.message) {
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    } catch (e) {
      console.warn(
        `[Callback edit_schedule] Не удалось убрать клавиатуру у сообщения ${ctx.callbackQuery.message.message_id}`,
        e
      );
    }
  }

  // Запускаем диалог изменения расписания
  await ctx.conversation.enter(EDIT_SCHEDULE_CONVERSATION_ID);
};
