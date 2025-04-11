import User from "../../models/User";
import { REGISTRATION_CONVERSATION_ID } from "../../controllers/registration";
import { MyContext } from "../../bot";

export const registerCommand = async (ctx: MyContext) => {
  console.log(
    `Получена команда /register от пользователя ${ctx.from?.id} (${ctx.from?.username})`
  );
  try {
    const user = await User.findOne({ telegramId: ctx.from?.id });
    if (user) {
      await ctx.reply(`Вы уже зарегистрированы, ${user.firstName}!`);
    } else {
      // Запускаем диалог регистрации
      await ctx.conversation.enter(REGISTRATION_CONVERSATION_ID);
    }
  } catch (error) {
    console.error("Ошибка при обработке /register:", error);
    await ctx.reply("Произошла ошибка. Попробуйте позже.");
  }
};
