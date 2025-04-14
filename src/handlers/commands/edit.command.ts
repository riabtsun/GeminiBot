import User from "../../models/User";
import { CommandContext, InlineKeyboard } from "grammy";
import { MyContext } from "../../bot";
import { botTexts } from "../../botTexts";

export const editCommand = async (ctx: CommandContext<MyContext>) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  console.log(`[Command /edit] Получена команда от ${userId}`);

  try {
    const user = await User.findOne({ telegramId: userId });
    if (!user) {
      await ctx.reply(botTexts.editCommand.notRegistered);
      return;
    }
    const editKeyboard = new InlineKeyboard()
      .text("👤 Змінити ПІБ", "edit_profile")
      .row() // .row() переносит на след. строку
      .text("⏰ Змінити час", "edit_schedule")
      .row()
      .text("📊 Змінити останнє вимірювання", "edit_last_measurement");
    // TODO: Добавить кнопку "Отмена" или "Назад" ?

    await ctx.reply("🎛️ Що ви хочете змінити?", {
      reply_markup: editKeyboard,
    });
  } catch (error) {
    console.error(
      `[Command /edit] Ошибка при обработке команды для ${userId}:`,
      error,
    );
    await ctx.reply(botTexts.editCommand.dataError);
  }
};
