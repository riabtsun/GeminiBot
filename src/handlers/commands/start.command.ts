import User from "../../models/User";
import { CommandContext, InlineKeyboard } from "grammy";

import { MyContext } from "../../bot";
import { botTexts } from "../../botTexts";

export const startCommand = async (ctx: CommandContext<MyContext>) => {
  console.log(
    `Получена команда /start от пользователя ${ctx.from?.id} (${ctx.from?.username})`,
  );
  try {
    const user = await User.findOne({ telegramId: ctx.from?.id });
    if (user) {
      await ctx.reply(
        `З поверненням, ${user.firstName}! Я готовий до роботи.\n\n Ви можете використати команду /help, щоб побачити список доступних дій.`,
      );
      // TODO: Добавить команду /help
    } else {
      const inlineKeyboard = new InlineKeyboard().text(
        "✍️ Зареєструватись",
        "/register",
      ); // Кнопка для удобства

      await ctx.reply(botTexts.startCommand.welcomeText, {
        reply_markup: inlineKeyboard,
      });
    }
  } catch (error) {
    console.error("Ошибка при проверке пользователя в /start:", error);
    await ctx.reply(botTexts.startCommand.statusError);
  }
};
