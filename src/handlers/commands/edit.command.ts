import User from "../../models/User";
import { CommandContext, InlineKeyboard } from "grammy";
import { MyContext } from "../../bot";

export const editCommand = async (ctx: CommandContext<MyContext>) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  console.log(`[Command /edit] Получена команда от ${userId}`);

  try {
    const user = await User.findOne({ telegramId: userId });
    if (!user) {
      await ctx.reply(
        "Вы еще  не зарегистрированы. Пожалуйста, используйте /register."
      );
      return;
    }
    const editKeyboard = new InlineKeyboard()
      .text("👤 Изменить ФИО", "edit_profile")
      .row() // .row() переносит на след. строку
      .text("⏰ Изменить время и пояс", "edit_schedule")
      .row()
      .text("📊 Изменить последнее измерение", "edit_last_measurement");
    // TODO: Добавить кнопку "Отмена" или "Назад" ?

    await ctx.reply("🎛️ Что вы хотите изменить?", {
      reply_markup: editKeyboard,
    });
  } catch (error) {
    console.error(
      `[Command /edit] Ошибка при обработке команды для ${userId}:`,
      error
    );
    await ctx.reply(
      "Произошла ошибка при получении ваших данных. Попробуйте позже."
    );
  }
};
