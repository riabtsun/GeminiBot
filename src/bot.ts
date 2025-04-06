import {
  Bot,
  type Context,
  session,
  SessionFlavor,
  InlineKeyboard,
} from "grammy";
import { run, sequentialize } from "@grammyjs/runner";
import {
  conversations,
  createConversation,
  type Conversation,
  type ConversationFlavor,
} from "@grammyjs/conversations";
import { MongoDBAdapter } from "@grammyjs/storage-mongodb";
import mongoose from "mongoose";
import "dotenv/config";
import { connectDB } from "./db";
import User from "./models/User";
import Measurement from "./models/Measurement";
import {
  registrationConversation,
  REGISTRATION_CONVERSATION_ID,
} from "./controllers/registration";
import {
  EDIT_PROFILE_CONVERSATION_ID,
  editProfileConversation,
} from "./controllers/editProfile";
import { ScheduleService } from "./services/scheduleService";

interface SessionData {
  expectingMeasurement?: boolean;
  // userId?: number;
  // username?: string;
  // registrationComplete?: boolean;
  // lastPressure?: {
  //   systolic: number;
  //   diastolic: number;
  //   pulse: number;
  //   timestamp: Date;
  // };
}

export interface BotContext extends Context {
  session: SessionData;
}
export type MyContext = BotContext & ConversationFlavor<BotContext>;
// <<<--- Экспортируем тип контекста
export type MyConversation = Conversation<MyContext>;

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("Ошибка: Переменная окружения BOT_TOKEN не установлена.");
  process.exit(1);
}

function getSessionKey(ctx: MyContext) {
  return ctx.chat?.id.toString();
}

const bot = new Bot<MyContext>(BOT_TOKEN);
bot.use(conversations());
const scheduleService = new ScheduleService(bot);

bot.use(sequentialize(getSessionKey));
bot.use(
  session({
    initial: (): SessionData => ({
      expectingMeasurement: false,
      // userId: 0,
      // username: "",
      // registrationComplete: false,
      // lastPressure: {
      //   systolic: 0,
      //   diastolic: 0,
      //   pulse: 0,
      //   timestamp: new Date(),
      // },
    }), // Начальное состояние сессии
    storage: new MongoDBAdapter({
      collection: mongoose.connection.collection("sessions"),
    }),
  })
);

// <<<--- Регистрируем conversation ---
bot.use(
  createConversation(registrationConversation, REGISTRATION_CONVERSATION_ID)
);
bot.use(
  createConversation(editProfileConversation, EDIT_PROFILE_CONVERSATION_ID)
);

bot.command("start", async (ctx) => {
  console.log(
    `Получена команда /start от пользователя ${ctx.from?.id} (${ctx.from?.username})`
  );
  try {
    const user = await User.findOne({ telegramId: ctx.from?.id });
    if (user) {
      await ctx.reply(
        `С возвращением, ${user.firstName}! Я готов к работе.\n\nВы можете использовать команду /help, чтобы увидеть список доступных действий.`
      );
      // TODO: Добавить команду /help
    } else {
      const inlineKeyboard = new InlineKeyboard().text(
        "✍️ Зарегистрироваться",
        "/register"
      ); // Кнопка для удобства

      await ctx.reply(
        "Добро пожаловать! 👋\n\n" +
          "Этот бот поможет вам отслеживать артериальное давление и пульс.\n\n" +
          "Чтобы начать, вам нужно зарегистрироваться. Нажмите кнопку ниже или используйте команду /register.",
        { reply_markup: inlineKeyboard }
      );
    }
  } catch (error) {
    console.error("Ошибка при проверке пользователя в /start:", error);
    await ctx.reply(
      "Произошла ошибка при проверке вашего статуса. Попробуйте позже."
    );
  }
});

// Команда /register - запуск диалога регистрации
bot.command("register", async (ctx) => {
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
});

bot.command("edit", async (ctx) => {
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
});

// <<<--- НОВЫЙ ОБРАБОТЧИК: для кнопки "Изменить ФИО" --->>>
bot.callbackQuery("edit_profile", async (ctx) => {
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
});
// <<<--- Обработчик для ввода измерений ---
// Слушаем текстовые сообщения, которые похожи на формат "число/число число"
const measurementRegex =
  /^\s*(\d{1,3})\s*[/\\.,\s]\s*(\d{1,3})\s+(\d{1,3})\s*$/;

bot.callbackQuery("enter_measurement", async (ctx) => {
  if (!ctx.chat || !ctx.from) return; // Проверка наличия chat и from

  ctx.session.expectingMeasurement = true; // Устанавливаем флаг ожидания в сессии
  console.log(
    `[Callback] Пользователь ${ctx.from.id} нажал кнопку ввода. Установлен флаг ожидания.`
  );

  await ctx.answerCallbackQuery(); // Убираем "часики" с кнопки

  // Редактируем исходное сообщение, убирая кнопку (опционально, но улучшает UX)
  if (ctx.callbackQuery.message) {
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    } catch (e) {
      console.warn(
        `[Callback] Не удалось убрать клавиатуру у сообщения ${ctx.callbackQuery.message.message_id}`,
        e
      );
    }
  }

  await ctx.reply(
    "Пожалуйста, введите результат в формате Давление/Давление Пульс (например: 120/80 75)"
  );
});

bot.on("message:text", async (ctx, next) => {
  // Сначала проверяем, не является ли сообщение командой
  if (ctx.message.text.startsWith("/")) {
    console.log(
      `[Text Handler] Сообщение является командой "${ctx.message.text}", сбрасываем флаг ожидания (если был) и передаем дальше.`
    );
    ctx.session.expectingMeasurement = false; // Сбрасываем флаг на всякий случай
    return await next(); // Передаем управление обработчикам команд
  }

  // Проверяем, ожидаем ли мы ввода измерения от этого пользователя
  if (!ctx.session.expectingMeasurement) {
    console.log(
      `[Text Handler] Флаг ожидания не установлен для ${ctx.from?.id}, передаем дальше.`
    );
    return await next(); // Если не ожидаем, передаем управление дальше (если есть другие обработчики)
  }

  // --- Если мы ожидаем ввод ---
  console.log(
    `[Text Handler] Ожидается ввод от ${ctx.from?.id}. Проверяем сообщение: "${ctx.message.text}"`
  );

  const match = ctx.message.text.match(measurementRegex);

  if (match) {
    // --- Формат совпал ---
    console.log(`[Text Handler] Формат совпал для ${ctx.from?.id}.`);
    try {
      const systolic = parseInt(match[1], 10);
      const diastolic = parseInt(match[2], 10);
      const pulse = parseInt(match[3], 10);

      // Валидация значений
      if (
        systolic < 50 ||
        systolic > 300 ||
        diastolic < 30 ||
        diastolic > 200 ||
        pulse < 30 ||
        pulse > 250
      ) {
        await ctx.reply(
          "😬 Кажется, введенные значения выходят за разумные пределы. Пожалуйста, проверьте и попробуйте снова (например: 120/80 75)."
        );
        console.warn(
          `[Text Handler] Невалидные значения от ${ctx.from?.id}: ${systolic}/${diastolic} ${pulse}`
        );
        // НЕ сбрасываем флаг, ждем корректного ввода
        return;
      }

      // Находим пользователя (нужен _id для сохранения)
      const user = await User.findOne({ telegramId: ctx.from?.id });
      if (!user) {
        // Этого не должно произойти, если флаг установлен, но проверим
        await ctx.reply(
          "Произошла ошибка: не могу найти вашу регистрацию. Пожалуйста, попробуйте /start."
        );
        ctx.session.expectingMeasurement = false; // Сбрасываем флаг
        return;
      }

      // Сохраняем измерение
      const newMeasurement = await Measurement.create({
        userId: user._id,
        timestamp: new Date(),
        systolic,
        diastolic,
        pulse,
      });

      console.log(
        `[Text Handler] Сохранено измерение ${newMeasurement._id} для пользователя ${ctx.from?.id}`
      );
      await ctx.reply(
        `✅ Давление ${systolic}/${diastolic} и пульс ${pulse} сохранены. Спасибо!`
      );
      ctx.session.expectingMeasurement = false; // <<<--- СБРАСЫВАЕМ ФЛАГ ожидания
    } catch (error) {
      console.error(
        `[Text Handler] Ошибка при сохранении измерения от ${ctx.from?.id}:`,
        error
      );
      await ctx.reply(
        "Не удалось сохранить измерение. Попробуйте еще раз или обратитесь к администратору."
      );
      // Сбрасывать ли флаг при ошибке сохранения - спорно. Пока оставим, чтобы не зацикливаться.
      ctx.session.expectingMeasurement = false;
    }
  } else {
    // --- Формат НЕ совпал ---
    console.log(
      `[Text Handler] Неверный формат от ${ctx.from?.id}: "${ctx.message.text}"`
    );
    await ctx.reply(
      "❗️ Неверный формат.\n" +
        "Пожалуйста, введите данные в формате **Давление/Давление Пульс** (числа через `/` или пробел, затем пробел и пульс).\n" +
        "Например: `120/80 75`",
      { parse_mode: "Markdown" } // Используем Markdown для выделения
    );
    // НЕ сбрасываем флаг, продолжаем ожидать корректного ввода
  }
});

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Ошибка при обработке обновления ${ctx.update.update_id}:`);
  console.error(err.error); // Логируем саму ошибку

  // Отправляем сообщение пользователю об ошибке (опционально)
  // ctx.reply("Произошла ошибка. Попробуйте позже.").catch(e => console.error("Не удалось отправить сообщение об ошибке:", e));
});

// --- Запуск бота ---

const startBot = async () => {
  // Сначала подключаемся к БД
  await connectDB();

  // <<<--- Инициализируем расписания ПОСЛЕ подключения к БД ---
  // Передаем экземпляр бота в сервис планировщика
  await scheduleService.initializeSchedules();

  // Создаем и запускаем runner
  const runner = run(bot);

  console.log("Бот запущен и готов принимать сообщения...");

  // Обработка остановки runner'а
  const stopRunner = () => {
    if (runner.isRunning()) {
      runner.stop();
      console.log("Бот остановлен.");
    }
  };

  process.once("SIGINT", stopRunner); // Остановка по Ctrl+C
  process.once("SIGTERM", stopRunner); // Остановка сигналом завершения
};

startBot().catch((err) => {
  console.error("Критическая ошибка при запуске бота:", err);
  process.exit(1);
});
