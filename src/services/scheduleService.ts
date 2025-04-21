import cron from "node-cron";
import { Bot, InlineKeyboard, InputFile } from "grammy";
import { MyContext } from "../bot";
import User, { IUser } from "../models/User";
import { subMinutes, parse, format, subMonths } from "date-fns";
import { uk } from "date-fns/locale/uk"; // Локаль для русского языка
import { endOfMonth, startOfMonth } from "date-fns";
import Measurement from "../models/Measurement";
import { pdfService } from "./pdfService"; // Для работы со временем

// Интерфейс для хранения запланированных задач пользователя
interface UserTasks {
  morningReminder1?: cron.ScheduledTask;
  morningReminder2?: cron.ScheduledTask;
  morningPrompt?: cron.ScheduledTask;
  eveningReminder1?: cron.ScheduledTask;
  eveningReminder2?: cron.ScheduledTask;
  eveningPrompt?: cron.ScheduledTask;
}

export class ScheduleService {
  private bot: Bot<MyContext>;
  // Хранилище для активных cron-задач, ключ - telegramId
  scheduledTasks: Map<number, UserTasks> = new Map();

  constructor(botInstance: Bot<MyContext>) {
    this.bot = botInstance;
    console.log("Сервис планировщика инициализирован.");
  }

  /**
   * Загружает всех активных пользователей и планирует для них задачи при старте бота.
   */
  public async initializeSchedules() {
    console.log("Инициализация расписаний пользователей...");
    try {
      const activeUsers = await User.find({ isActive: true });
      console.log(
        `Найдено ${activeUsers.length} активных пользователей для планирования.`,
      );
      activeUsers.forEach((user) => {
        console.log(
          `[CRON] Планирование для ${user.telegramId} (${user.firstName})`,
        );
        // Проверяем валидность данных перед планированием
        if (this.validateUserData(user)) {
          this.scheduleUserTasks(user);
        } else {
          console.warn(
            `Пользователь ${user.telegramId} ${user.firstName} имеет невалидные данные времени или таймзоны. Задачи не запланированы.`,
          );
          // Можно добавить логику для уведомления пользователя или администратора
        }
      });
      // Запускаем периодическое обновление
      this.scheduleUpdateTask();
      console.log("Инициализация расписаний завершена.");
    } catch (error) {
      console.error("Ошибка при инициализации расписаний:", error);
    }
    cron.schedule(
      "0 3 1 * *",
      async () => {
        console.log(
          "[CRON Monthly] Запуск задачи ежемесячного отчета и очистки...",
        );
        const reportDate = new Date(); // Дата запуска задачи

        // 1. Определить границы ПРЕДЫДУЩЕГО месяца (в UTC)
        const previousMonthDate = subMonths(reportDate, 1); // Дата в пределах предыдущего месяца
        const startPrevMonthUTC = startOfMonth(previousMonthDate);
        const endPrevMonthUTC = endOfMonth(previousMonthDate);

        // 2. Подготовить заголовок и имя файла для отчета
        const prevMonthName = format(previousMonthDate, "LLLL", { locale: uk });
        const prevYear = format(previousMonthDate, "yyyy");
        const reportTitle = `Звіт вимірювань за ${prevMonthName} ${prevYear}`;
        const filename = `report_${format(previousMonthDate, "yyyy-MM")}.pdf`;
        console.log(
          `[CRON Monthly] Подготовка отчета за период: ${format(
            startPrevMonthUTC,
            "dd.MM.yyyy",
          )} - ${format(endPrevMonthUTC, "dd.MM.yyyy")}`,
        );
        try {
          // 3. Найти всех активных пользователей
          const activeUsers = await User.find({ isActive: true });
          console.log(
            `[CRON Monthly] Найдено ${activeUsers.length} активных пользователей.`,
          );

          // 4. Обработать каждого пользователя
          for (const user of activeUsers) {
            console.log(
              `[CRON Monthly] Обработка пользователя <span class="math-inline">\{user\.telegramId\} \(</span>{user.firstName})`,
            );
            try {
              const measurements = await Measurement.find({
                userId: user._id,
                timestamp: {
                  $gte: startPrevMonthUTC,
                  $lte: endPrevMonthUTC,
                },
              }).sort({ timestamp: "asc" });

              if (measurements && measurements.length > 0) {
                console.log(
                  `[CRON Monthly] Найдено ${measurements.length} измерений для user ${user.telegramId}. Генерация PDF...`,
                );
                const pdfBuffer = await pdfService.generateMeasurementsPDF(
                  user,
                  measurements,
                  reportTitle,
                );

                console.log(
                  `[CRON Monthly] Отправка отчета user ${user.telegramId}...`,
                );
                await this.bot.api.sendDocument(
                  user.chatId,
                  new InputFile(pdfBuffer, filename),
                  {
                    caption: reportTitle,
                  },
                );
                console.log(
                  `[CRON Monthly] Отчет успешно отправлен user ${user.telegramId}.`,
                );
              } else {
                console.log(
                  `[CRON Monthly] Нет данных для отчета user ${user.telegramId} за прошлый месяц.`,
                );
                // Можно отправить сообщение пользователю об отсутствии данных, но это может быть спамом
              }
            } catch (userError: any) {
              console.error(
                `[CRON Monthly] Ошибка при обработке/отправке отчета для user ${user.telegramId}:`,
                userError.message || userError,
              );
              // Продолжаем обработку других пользователей
            }
            // Небольшая пауза, чтобы не перегружать API Telegram (опционально)
            await new Promise((resolve) => setTimeout(resolve, 50)); // 50ms пауза
          } // end for loop
          // 5. Очистка старых данных (старше начала предыдущего месяца)
          const cutoffDate = startPrevMonthUTC; // Удаляем все ДО начала месяца, за который сгенерировали отчет
          console.log(
            `[CRON Monthly] Удаление измерений старше ${format(
              cutoffDate,
              "dd.MM.yyyy HH:mm:ss",
            )}...`,
          );
          try {
            const deleteResult = await Measurement.deleteMany({
              timestamp: { $lt: cutoffDate },
            });
            console.log(
              `[CRON Monthly] Успешно удалено ${deleteResult.deletedCount} старых измерений.`,
            );
          } catch (deleteError) {
            console.error(
              "[CRON Monthly] Ошибка при удалении старых измерений:",
              deleteError,
            );
          }
        } catch (error) {
          console.error(
            "[CRON Monthly] Глобальная ошибка в задаче ежемесячного отчета:",
            error,
          );
        }
        console.log(
          "[CRON Monthly] Задача ежемесячного отчета и очистки завершена.",
        );
      },
      {
        timezone: "UTC", // Запускаем задачу по UTC, чтобы избежать проблем с летним/зимним временем для самой задачи
      },
    );
    console.log(
      "[CRON Monthly] Задача ежемесячного отчета и очистки запланирована.",
    );
  }

  /**
   * Удаляет все задачи для конкретного пользователя.
   * @param telegramId - ID пользователя Telegram
   */
  public removeUserTasks(telegramId: number) {
    const userTasks = this.scheduledTasks.get(telegramId);

    if (userTasks) {
      Object.values(userTasks).forEach((task) => task?.stop());
      this.scheduledTasks.delete(telegramId);
      console.log(`Задачи для пользователя ${telegramId} удалены.`);
    }
  }

  /**
   * Планирует все задачи (напоминания, запросы) для одного пользователя.
   * Вызывается при инициализации и при обновлении настроек пользователя.
   * @param user - Документ пользователя из Mongoose
   */
  public scheduleUserTasks(user: IUser) {
    // Сначала удаляем старые задачи, если они были
    this.removeUserTasks(user.telegramId);

    if (!user.isActive || !this.validateUserData(user)) {
      console.log(
        `Пользователь ${user.telegramId} неактивен. Задачи не планируются.`,
      );
      return;
    }

    try {
      const measurementKeyboard = new InlineKeyboard().text(
        "✍️ Ввести результат",
        "enter_measurement",
      ); // Кнопка для ввода

      // --- Утренние задачи ---
      const morningTime = this.parseTime(user.morningTime); // 'HH:MM' -> { hour: H, minute: M }

      // const timezone = user.timezone; // Берем таймзону пользователя

      const tasks: UserTasks = {};
      if (morningTime) {
        const reminder1Time = subMinutes(morningTime.date, 60);
        const reminder2Time = subMinutes(morningTime.date, 30);

        // Напоминания остаются без кнопки

        tasks.morningReminder1 = this.createCronJob(
          `${format(reminder1Time, "m")} ${format(reminder1Time, "H")} * * *`,
          // timezone,
          `🔔 Нагадування: Скоро (через 60 хв) потрібно заміряти тиск (${user.morningTime}).`,
          user.chatId,
        );

        tasks.morningReminder2 = this.createCronJob(
          `${format(reminder2Time, "m")} ${format(reminder2Time, "H")} * * *`,
          // timezone,
          `❗️ Нагадування: Скоро (через 30 хв) потрібно заміряти тиск (${user.morningTime}).`,
          user.chatId,
        );

        tasks.morningPrompt = this.createCronJob(
          `${morningTime.minute} ${morningTime.hour} * * *`,
          `⏰ Пора заміряти ранкові тиск і пульс! Чекаю ваші результати (наприклад: 120/80 75).`,
          user.chatId,
          measurementKeyboard,
        );
      }

      // --- Вечерние задачи ---
      const eveningTime = this.parseTime(user.eveningTime);
      if (eveningTime) {
        const reminder1Time = subMinutes(eveningTime.date, 60);
        const reminder2Time = subMinutes(eveningTime.date, 30);

        tasks.eveningReminder1 = this.createCronJob(
          `${format(reminder1Time, "m")} ${format(reminder1Time, "H")} * * *`,
          // timezone,
          `🔔 Нагадування: Скоро (через 60 хв) потрібно заміряти тиск (${user.eveningTime}).`,
          user.chatId,
        );

        tasks.eveningReminder2 = this.createCronJob(
          `${format(reminder2Time, "m")} ${format(reminder2Time, "H")} * * *`,
          // timezone,
          `❗️ Нагадування: Скоро (через 30 хв) потрібно заміряти тиск (${user.eveningTime}).`,
          user.chatId,
        );

        tasks.eveningPrompt = this.createCronJob(
          `${eveningTime.minute} ${eveningTime.hour} * * *`,
          // timezone,
          `⏰ Пора заміряти вечерній тиск и пульс! Чекаю ваші результати (например: 120/80 75).`,
          user.chatId,
          measurementKeyboard,
        );
      }

      this.scheduledTasks.set(user.telegramId, tasks);
      console.log(
        `Задачи для пользователя ${user.telegramId} ${user.firstName} успешно запланированы.`,
      );
    } catch (error) {
      console.error(
        `Ошибка планирования задач для пользователя ${user.telegramId}:`,
        error,
      );
      // Удаляем частично созданные задачи, если возникла ошибка
      this.removeUserTasks(user.telegramId);
    }
  }

  // --- Вспомогательные методы ---

  /**
   * Создает и запускает cron-задачу для отправки сообщения.
   */
  private createCronJob(
    cronPattern: string,
    // timezone: string,
    message: string,
    chatId: number,
    keyboard?: InlineKeyboard,
  ): cron.ScheduledTask | undefined {
    try {
      const task = cron.schedule(
        cronPattern,
        async () => {
          console.log(`[CRON] Отправка сообщения в чат ${chatId}: ${message}`);
          try {
            await this.bot.api.sendMessage(chatId, message, {
              parse_mode: "Markdown",
              reply_markup: keyboard, // Используется здесь
            });
          } catch (error: any) {
            console.error(
              `[CRON] Ошибка отправки сообщения в чат ${chatId}:`,
              error.message,
            );
            // TODO: Добавить логику обработки ошибок (например, деактивация пользователя после N неудач)
            if (error.description?.includes("bot was blocked by the user")) {
              console.warn(
                `[CRON] Пользователь ${chatId} заблокировал бота. Рекомендуется пометить его как неактивного.`,
              );
              // await User.findOneAndUpdate({ chatId }, { isActive: false });
              // this.removeUserTasks(telegramId); // Нужен telegramId здесь
            }
          }
        },
        {
          scheduled: true,
          // timezone: timezone, // Указываем таймзону пользователя!
        },
      );
      return task;
    } catch (error) {
      console.error(`[CRON] Ошибка создания задачи (${cronPattern}):`, error);
      return undefined;
    }
  }

  private scheduleUpdateTask() {
    cron.schedule("* * * * *", async () => {
      console.log("[CRON] Запуск периодического обновления расписаний...");
      try {
        const activeUsers = await User.find({ isActive: true });

        // Получаем текущие запланированные задачи
        const currentUserIds = Array.from(this.scheduledTasks.keys());

        // Обновляем или добавляем задачи для активных пользователей
        activeUsers.forEach((user) => {
          if (this.validateUserData(user)) {
            this.scheduleUserTasks(user);
          }
        });

        // Удаляем задачи для неактивных пользователей
        currentUserIds.forEach((userId) => {
          if (!activeUsers.some((user) => user.telegramId === userId)) {
            this.removeUserTasks(userId);
          }
        });
      } catch (error) {
        console.error("[CRON] Ошибка при обновлении расписаний:", error);
      }
    });
  }

  /**
   * Проверяет валидность данных пользователя для планирования.
   */
  private validateUserData(user: IUser): boolean {
    return (
      this.validateTimeFormat(user.morningTime) &&
      this.validateTimeFormat(user.eveningTime)
      // this.validateTimezone(user.timezone)
    );
  }

  /**
   * Парсит время 'HH:MM' и возвращает объект с часами, минутами и объектом Date.
   */
  private parseTime(
    timeString: string,
  ): { hour: number; minute: number; date: Date } | null {
    const match = timeString.match(/^(\d{2}):(\d{2})$/);
    if (!match) return null;

    const hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);

    // Создаем объект Date с текущей датой, но нужным временем
    const now = new Date();
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      minute,
      0,
    );
    return { hour, minute, date };
  }

  /**
   * Проверяет строку времени на формат HH:MM.
   */
  private validateTimeFormat(time: string): boolean {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
  }

  /**
   * Проверяет валидность таймзоны.
   */
  // private validateTimezone(tz: string): boolean {
  //   try {
  //     Intl.DateTimeFormat(undefined, { timeZone: tz });
  //     return true;
  //   } catch (e) {
  //     console.warn(`[Validation] Невалидная таймзона: ${tz}`);
  //     return false;
  //   }
  // }
}
