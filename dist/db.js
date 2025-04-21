"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
require("dotenv/config");
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error("Ошибка: Переменная окружения MONGO_URI не установлена.");
    process.exit(1);
}
const connectDB = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield mongoose_1.default.connect(MONGO_URI);
        console.log('MongoDB connected successfully');
        mongoose_1.default.connection.on('error', (err) => {
            console.error('Ошибка MongoDB после первоначального подключения:', err);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            console.log('MongoDB отключен');
        });
    }
    catch (error) {
        console.error('Ошибка подключения к MongoDB:', error);
        process.exit(1);
    }
});
exports.connectDB = connectDB;
process.on('SIGINT', () => __awaiter(void 0, void 0, void 0, function* () {
    yield mongoose_1.default.connection.close();
    console.log('Соединение MongoDB закрыто из-за завершения приложения');
    process.exit(0);
}));
