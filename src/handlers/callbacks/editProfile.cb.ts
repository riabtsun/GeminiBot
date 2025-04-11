import { CallbackQueryContext } from "grammy";
import { MyContext } from "../../bot";

export const editProfileCb = async (ctx: CallbackQueryContext<MyContext>) => {
  if (!ctx.from) return;
  console.log(
    `[Callback edit_profile] Нажата кнопка пользователем ${ctx.from.id}`
  );
  await ctx.answerCallbackQuery({ text: "Начинаем изменение ФИО..." }); // Ответ на нажатие кнопки

  // Удаляем клавиатуру из предыдущего сообщения
  if (ctx.callbackQuery.message) {
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    } catch (e) {
      console.warn(
        `[Callback edit_profile] Не удалось убрать клавиатуру у сообщения ${ctx.callbackQuery.message.message_id}`,
        e
      );
    }
  }

  // Запускаем соответствующий диалог (conversation)
  // Идентификатор 'edit_profile_conv' мы определим на следующем шаге
  await ctx.conversation.enter("edit_profile_conv");
};
