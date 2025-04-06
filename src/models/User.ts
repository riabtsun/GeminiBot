import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  telegramId: number;
  chatId: number;
  firstName: string;
  lastName: string;
  patronymic?: string;
  // timezone: string;
  morningTime: string;
  eveningTime: string;
  isActive: boolean;
}

const UserSchema: Schema = new Schema(
  {
    telegramId: { type: Number, required: true, unique: true, index: true },
    chatId: { type: Number, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    patronymic: { type: String, required: false, trim: true },
    // timezone: { type: String, required: true },
    morningTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "Неверный формат времени (ЧЧ:ММ)"],
    },
    eveningTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "Неверный формат времени (ЧЧ:ММ)"],
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

export default mongoose.model<IUser>("User", UserSchema);
