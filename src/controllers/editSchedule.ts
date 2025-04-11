import { Conversation } from "@grammyjs/conversations";
import { MyContext } from "../bot";
import User, { IUser } from "../models/User";

type MyConversation = Conversation<MyContext, MyContext>;

export const EDIT_SCHEDULE_CONVERSATION_ID = "edit_schedule_conv";

async function askForTime(
  conversation: MyConversation,
  ctx: MyContext,
  prompt: string,
  currentTime: string
): Promise<string> {
  await ctx.reply(
    `${prompt}\nТекущее значение: \`${currentTime}\`\nВведите новое время в формате ЧЧ:ММ (например, 08:00):`,
    { parse_mode: "Markdown" }
  );
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  while (true) {
    const responseCtx = await conversation.waitFor("message:text");
    const timeInput = responseCtx.message.text.trim();
    if (timeRegex.test(timeInput)) {
      return timeInput;
    } else {
      await ctx.reply(
        "❗️ Неверный формат времени. Введите время в формате ЧЧ:ММ (например, 08:00):"
      );
    }
  }
}

// --- Функция диалога для изменения времени ---
export async function editScheduleConversation(
  conversation: MyConversation,
  ctx: MyContext
): Promise<IUser | null> {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply("Не удалось определить ваш ID. Изменение невозможно.");
    return null;
  }

  try {
    // Получаем текущие настройки пользователя
    const currentUser = await conversation.external(() =>
      User.findOne({ telegramId: userId })
    );
    if (!currentUser) {
      await ctx.reply("Не удалось найти вашу регистрацию. Попробуйте /start.");
      return null;
    }

    await ctx.reply("⏱️ Начинаем изменение времени измерений");

    // --- Новое утреннее время ---
    const newMorningTime = await askForTime(
      conversation,
      ctx,
      "Введите новое *утреннее* время:",
      currentUser.morningTime
    );

    // --- Новое вечернее время ---
    const newEveningTime = await askForTime(
      conversation,
      ctx,
      "Введите новое *вечернее* время:",
      currentUser.eveningTime
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
        { new: true } // Важно получить обновленный документ
      )
    );

    if (!updatedUser) {
      await ctx.reply(
        "❌ Не удалось обновить ваши данные в базе. Попробуйте позже."
      );
      return null;
    }

    await ctx.reply(`✅ Расписание успешно обновлено!
Новое утреннее время: ${updatedUser.morningTime}
Новое вечернее время: ${updatedUser.eveningTime}

Напоминания и запросы будут приходить по новому графику.`);

    console.log(
      `[Conv edit_schedule] Пользователь ${userId} успешно обновил расписание.`
    );
    return updatedUser;
  } catch (error) {
    console.error(
      `[Conv edit_schedule] Ошибка обновления расписания для ${userId}:`,
      error
    );
    await ctx.reply(
      "❌ Произошла ошибка при обновлении расписания. Попробуйте снова позже."
    );
    return null; // <<<--- Возвращаем null при ошибке
  }
}
