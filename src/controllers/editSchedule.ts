import { Conversation } from "@grammyjs/conversations";
import { MyContext } from "../bot";
import User, { IUser } from "../models/User";
import { botTexts } from "../botTexts";

type MyConversation = Conversation<MyContext, MyContext>;

export const EDIT_SCHEDULE_CONVERSATION_ID = "edit_schedule_conv";

async function askForTime(
  conversation: MyConversation,
  ctx: MyContext,
  prompt: string,
  currentTime: string,
): Promise<string> {
  await ctx.reply(
    `${prompt}\nПоточне значення: \`${currentTime}\`\nВведіть новий час время в форматі ГГ:ХХ (например, 08:00):`,
    { parse_mode: "Markdown" },
  );
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  while (true) {
    const responseCtx = await conversation.waitFor("message:text");
    const timeInput = responseCtx.message.text.trim();
    if (timeRegex.test(timeInput)) {
      return timeInput;
    } else {
      await ctx.reply(botTexts.editSchedule.invalidFormat);
    }
  }
}

// --- Функция диалога для изменения времени ---
export async function editScheduleConversation(
  conversation: MyConversation,
  ctx: MyContext,
): Promise<IUser | null> {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply(botTexts.editSchedule.idError);
    return null;
  }

  try {
    // Получаем текущие настройки пользователя
    const currentUser = await conversation.external(() =>
      User.findOne({ telegramId: userId }),
    );
    if (!currentUser) {
      await ctx.reply(botTexts.editSchedule.incorrectUser);
      return null;
    }

    await ctx.reply(botTexts.editSchedule.startChangingTime);

    // --- Новое утреннее время ---
    const newMorningTime = await askForTime(
      conversation,
      ctx,
      "Введіть новий *ранковий* час:",
      currentUser.morningTime,
    );

    // --- Новое вечернее время ---
    const newEveningTime = await askForTime(
      conversation,
      ctx,
      "Введіть новий *вечірній* час:",
      currentUser.eveningTime,
    );

    // --- Новый часовой пояс ---
    // const newTimezone = await askForTimezone(conversation, ctx, currentUser.timezone);

    // --- Обновление в базе данных ---
    const updatedUser = await conversation.external(() =>
      User.findOneAndUpdate(
        { telegramId: userId },
        {
          $set: {
            morningTime: newMorningTime,
            eveningTime: newEveningTime,
            // timezone: newTimezone,
          },
        },
        { new: true }, // Важно получить обновленный документ
      ),
    );

    if (!updatedUser) {
      await ctx.reply(botTexts.editSchedule.updateDbError);
      return null;
    }

    await ctx.reply(`✅ Розклад успішно оновлено!
Новий ранковий час: ${updatedUser.morningTime}
Новий вечірній час: ${updatedUser.eveningTime}

Нагадування і запити будуть надходити по новому графіку.`);

    console.log(
      `[Conv edit_schedule] Пользователь ${userId} успешно обновил расписание.`,
    );
    return updatedUser;
  } catch (error) {
    console.error(
      `[Conv edit_schedule] Ошибка обновления расписания для ${userId}:`,
      error,
    );
    await ctx.reply(botTexts.editSchedule.updateScheduleError);
    return null; // <<<--- Возвращаем null при ошибке
  }
}
