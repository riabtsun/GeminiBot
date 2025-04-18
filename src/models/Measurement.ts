// src/models/Measurement.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IMeasurement extends Document {
  userId: Types.ObjectId; // Ссылка на документ пользователя
  timestamp: Date; // Точное время измерения
  systolic: number; // Верхнее давление
  diastolic: number; // Нижнее давление
  pulse: number; // Пульс
  // createdAt и updatedAt добавляются автоматически (timestamps: true)
}

const MeasurementSchema: Schema = new Schema<IMeasurement>(
  {
    userId: {
      type: Schema.Types.ObjectId, // Тип для ссылки на другой документ
      ref: "User", // Ссылка на модель 'User'
      required: true,
      index: true, // Индекс для быстрого поиска измерений пользователя
    },
    timestamp: {
      type: Date,
      required: true,
      index: true, // Индекс для сортировки и выборки по дате
    },
    systolic: {
      type: Number,
      required: true,
      min: [20, "Систолическое давление слишком низкое"],
      max: [300, "Систолическое давление слишком высокое"],
    },
    diastolic: {
      type: Number,
      required: true,
      min: [10, "Диастолическое давление слишком низкое"],
      max: [200, "Диастолическое давление слишком высокое"],
    },
    pulse: {
      type: Number,
      required: true,
      min: [20, "Пульс слишком низкий"],
      max: [250, "Пульс слишком высокий"],
    },
  },
  {
    timestamps: true,
    collection: "measurements",
  }
);

export default mongoose.model<IMeasurement>("Measurement", MeasurementSchema);
