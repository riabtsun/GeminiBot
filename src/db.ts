import mongoose from 'mongoose'
import 'dotenv/config'

const MONGO_URI = process.env.MONGO_URI

if (!MONGO_URI) {
  console.error("Ошибка: Переменная окружения MONGO_URI не установлена.");
  process.exit(1); // Выход из приложения, если нет строки подключения
}

export const connectDB = async () => {

  try {
    await mongoose.connect(MONGO_URI)
    console.log('MongoDB connected successfully')

    mongoose.connection.on('error', (err) => {
      console.error('Ошибка MongoDB после первоначального подключения:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB отключен');
    });
  } catch (error) {
    console.error('Ошибка подключения к MongoDB:', error);
    process.exit(1); // Выход из приложения при ошибке подключения
  }
}

// Обработка закрытия приложения для корректного отключения от БД
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('Соединение MongoDB закрыто из-за завершения приложения');
  process.exit(0);
});