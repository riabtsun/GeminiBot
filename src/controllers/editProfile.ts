import { type Conversation } from "@grammyjs/conversations";
import { type MyContext } from "../bot";
import User from "../models/User";
import { InlineKeyboard } from "grammy";

type MyConversation = Conversation<MyContext, MyContext>;

export const EDIT_PROFILE_CONVERSATION_ID = "edit_profile_conv";

async function askForText(
  conversation: MyConversation,
  ctx: MyContext,
  prompt: string
): Promise<string> {
  await ctx.reply(prompt);
  const responseCtx = await conversation.waitFor("message:text");
  const text = responseCtx.message.text.trim();
  if (!text) {
    await ctx.reply("Ввод не может быть пустым. Попробуйте еще раз.");
    // Рекурсивно вызываем себя же, чтобы переспросить
    return await askForText(conversation, ctx, prompt);
  }
  return text;
}

// --- Функция диалога для изменения ФИО ---
export async function editProfileConversation(
  conversation: MyConversation,
  ctx: MyContext
) {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply("Не удалось определить ваш ID. Изменение невозможно.");
    return;
  }

  await ctx.reply("📝 Начинаем изменение ФИО.");

  // --- Имя ---
  const newFirstName = await askForText(
    conversation,
    ctx,
    "Введите новое имя:"
  );

  // --- Фамилия ---
  const newLastName = await askForText(
    conversation,
    ctx,
    "Введите новую фамилию:"
  );

  // --- Отчество (опционально) ---
  const skipPatronymicKeyboard = new InlineKeyboard().text(
    "Оставить пустым",
    "skip_patronymic_edit"
  );
  await ctx.reply('Введите новое отчество (или нажмите "Оставить пустым"):', {
    reply_markup: skipPatronymicKeyboard,
  });

  let newPatronymic: string | undefined = undefined; // Важно для $unset
  const patronymicAnswer = await conversation.waitFor([
    "message:text",
    "callback_query:data",
  ]);

  if (patronymicAnswer.message?.text) {
    newPatronymic = patronymicAnswer.message.text.trim();
    await patronymicAnswer.reply("Отчество сохранено.", {
      reply_markup: { remove_keyboard: true },
    });
  } else if (patronymicAnswer.callbackQuery?.data === "skip_patronymic_edit") {
    newPatronymic = undefined; // Убеждаемся, что оно undefined
    await patronymicAnswer.answerCallbackQuery({
      text: "Отчество будет удалено/оставлено пустым.",
    });
    await ctx.api.editMessageReplyMarkup(
      patronymicAnswer.chatId!,
      patronymicAnswer.callbackQuery.message?.message_id!
    );
  } else {
    await ctx.reply("Неожиданный ответ. Изменение ФИО прервано.");
    await ctx.api.answerCallbackQuery(patronymicAnswer.callbackQuery!.id);
    return;
  }

  // --- Обновление в базе данных ---
  try {
    // Используем $set для установки новых значений и $unset для удаления отчества, если оно не введено
    const updateData: any = {
      $set: {
        firstName: newFirstName,
        lastName: newLastName,
      },
    };
    if (newPatronymic) {
      updateData.$set.patronymic = newPatronymic;
    } else {
      updateData.$unset = { patronymic: "" }; // Удаляем поле patronymic из документа
    }

    const updatedUser = await conversation.external(() =>
      User.findOneAndUpdate(
        { telegramId: userId }, // Находим пользователя по ID
        updateData,
        { new: true } // Возвращаем обновленный документ (хотя здесь он не обязателен)
      )
    );

    if (!updatedUser) {
      // Это странно, если пользователь дошел до сюда, но обработаем
      await ctx.reply(
        "Не удалось найти вашу запись для обновления. Попробуйте /start."
      );
      return;
    }

    await ctx.reply(`✅ Ваши ФИО успешно обновлены!
                    Новое имя: ${updatedUser.firstName}
                    Новая фамилия: ${updatedUser.lastName}
                    ${
                      updatedUser.patronymic
                        ? "Новое отчество: " + updatedUser.patronymic
                        : "Отчество: (не указано)"
                    }`);

    console.log(
      `[Conv edit_profile] Пользователь ${userId} успешно обновил ФИО.`
    );
  } catch (error) {
    console.error(
      `[Conv edit_profile] Ошибка обновления ФИО для ${userId}:`,
      error
    );
    await ctx.reply(
      "❌ Произошла ошибка при сохранении новых данных. Попробуйте снова позже."
    );
  }
  return;
}
