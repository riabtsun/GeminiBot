import { Bot, type Context, session, SessionFlavor } from "grammy";
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

interface SessionData {
  userId?: number;
  username?: string;
  registrationComplete?: boolean;
  lastPressure?: {
    systolic: number;
    diastolic: number;
    pulse: number;
    timestamp: Date;
  };
}

type MyContext = Context &
  SessionFlavor<SessionData> &
  ConversationFlavor<Context>;

type MyConversation = Conversation<MyContext>;

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("Ошибка: Переменная окружения BOT_TOKEN не установлена.");
  process.exit(1);
}

function getSessionKey(ctx: MyContext) {
  return ctx.chat?.id.toString();
}

const bot = new Bot<ConversationFlavor<MyContext>>(BOT_TOKEN);

bot.use(sequentialize(getSessionKey));
bot.use(
  session({
    initial: (): SessionData => ({
      userId: 0,
      username: "",
      registrationComplete: false,
      lastPressure: {
        systolic: 0,
        diastolic: 0,
        pulse: 0,
        timestamp: new Date(),
      },
    }), // Начальное состояние сессии
    storage: new MongoDBAdapter({
      collection: mongoose.connection.collection("sessions"),
    }),
  }),
);

bot.use(conversations());

bot.command("start", async (ctx) => {
  console.log(
    `Получена команда /start от пользователя ${ctx.from?.id} (${ctx.from?.username})`,
  );
  await ctx.reply(
    "Добро пожаловать! Этот бот поможет вам отслеживать давление и пульс. Для начала работы может потребоваться регистрация (позже добавим команду /register).",
  );
  // TODO: Проверить, зарегистрирован ли пользователь, и предложить регистрацию
});

// --- Обработка ошибок ---
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

  // Создаем и запускаем runner
  const runner = run(bot);

  console.log("Бот запущен...");

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
