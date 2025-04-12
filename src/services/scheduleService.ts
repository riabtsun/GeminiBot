import cron from "node-cron";
import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "../bot";
import User, { IUser } from "../models/User";
import { subMinutes, parse, format } from "date-fns"; // Для работы со временем

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
        `Найдено ${activeUsers.length} активных пользователей для планирования.`
      );
      activeUsers.forEach((user) => {
        console.log(
          `[CRON] Планирование для ${user.telegramId} (${user.firstName})`
        );
        // Проверяем валидность данных перед планированием
        if (this.validateUserData(user)) {
          this.scheduleUserTasks(user);
        } else {
          console.warn(
            `Пользователь ${user.telegramId} ${user.firstName} имеет невалидные данные времени или таймзоны. Задачи не запланированы.`
          );
          // Можно добавить логику для уведомления пользователя или администратора
        }
      });
      console.log("Инициализация расписаний завершена.");
    } catch (error) {
      console.error("Ошибка при инициализации расписаний:", error);
    }
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
        `Пользователь ${user.telegramId} неактивен. Задачи не планируются.`
      );
      return;
    }

    try {
      const measurementKeyboard = new InlineKeyboard().text(
        "✍️ Ввести результат",
        "enter_measurement"
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
          `🔔 Напоминание: Скоро (через 60 мин) нужно измерить давление (${user.morningTime}).`,
          user.chatId
        );

        tasks.morningReminder2 = this.createCronJob(
          `${format(reminder2Time, "m")} ${format(reminder2Time, "H")} * * *`,
          // timezone,
          `❗️ Напоминание: Скоро (через 30 мин) нужно измерить давление (${user.morningTime}).`,
          user.chatId
        );

        tasks.morningPrompt = this.createCronJob(
          `${morningTime.minute} ${morningTime.hour} * * *`,
          `⏰ Пора измерить утреннее давление и пульс! Жду ваши результаты (например: 120/80 75).`,
          user.chatId,
          measurementKeyboard
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
          `🔔 Напоминание: Скоро (через 60 мин) нужно измерить давление (${user.eveningTime}).`,
          user.chatId
        );

        tasks.eveningReminder2 = this.createCronJob(
          `${format(reminder2Time, "m")} ${format(reminder2Time, "H")} * * *`,
          // timezone,
          `❗️ Напоминание: Скоро (через 30 мин) нужно измерить давление (${user.eveningTime}).`,
          user.chatId
        );

        tasks.eveningPrompt = this.createCronJob(
          `${eveningTime.minute} ${eveningTime.hour} * * *`,
          // timezone,
          `⏰ Пора измерить вечернее давление и пульс! Жду ваши результаты (например: 120/80 75).`,
          user.chatId,
          measurementKeyboard
        );
      }

      this.scheduledTasks.set(user.telegramId, tasks);
      console.log(
        `Задачи для пользователя ${user.telegramId} ${user.firstName} успешно запланированы.`
      );
    } catch (error) {
      console.error(
        `Ошибка планирования задач для пользователя ${user.telegramId}:`,
        error
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
    keyboard?: InlineKeyboard
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
              error.message
            );
            // TODO: Добавить логику обработки ошибок (например, деактивация пользователя после N неудач)
            if (error.description?.includes("bot was blocked by the user")) {
              console.warn(
                `[CRON] Пользователь ${chatId} заблокировал бота. Рекомендуется пометить его как неактивного.`
              );
              // await User.findOneAndUpdate({ chatId }, { isActive: false });
              // this.removeUserTasks(telegramId); // Нужен telegramId здесь
            }
          }
        },
        {
          scheduled: true,
          // timezone: timezone, // Указываем таймзону пользователя!
        }
      );
      return task;
    } catch (error) {
      console.error(`[CRON] Ошибка создания задачи (${cronPattern}):`, error);
      return undefined;
    }
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
    timeString: string
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
      0
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
