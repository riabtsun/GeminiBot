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
exports.EDIT_MEASUREMENT_CONVERSATION_ID = void 0;
exports.editMeasurementConversation = editMeasurementConversation;
const Measurement_1 = __importDefault(require("../models/Measurement"));
const botTexts_1 = require("../botTexts");
exports.EDIT_MEASUREMENT_CONVERSATION_ID = "edit_measurement_conv";
function editMeasurementConversation(conversation, ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const session = yield conversation.external((ctx) => ctx.session);
        console.log("session at start", session);
        const userId = (_a = ctx.from) === null || _a === void 0 ? void 0 : _a.id;
        const measurementId = session.lastMeasurementId;
        if (!userId || !measurementId) {
            yield ctx.reply(botTexts_1.botTexts.measurement.errorId);
            session.lastMeasurementId = "";
            return;
        }
        yield ctx.reply(botTexts_1.botTexts.measurement.newMeasurement);
        let newSystolic;
        let newDiastolic;
        let newPulse;
        while (newSystolic === undefined) {
            const responseCtx = yield conversation.waitFor("message:text");
            const inputText = responseCtx.message.text.trim();
            const measurementRegex = /^\s*(\d{1,3})\s*[/\\.,\s]\s*(\d{1,3})\s+(\d{1,3})\s*$/;
            const match = inputText.match(measurementRegex);
            if (match) {
                const systolic = parseInt(match[1], 10);
                const diastolic = parseInt(match[2], 10);
                const pulse = parseInt(match[3], 10);
                if (systolic < 50 ||
                    systolic > 300 ||
                    diastolic < 30 ||
                    diastolic > 200 ||
                    pulse < 30 ||
                    pulse > 250) {
                    yield ctx.reply("botTexts.measurement.strangeValues");
                }
                else {
                    newSystolic = systolic;
                    newDiastolic = diastolic;
                    newPulse = pulse;
                }
            }
            else {
                yield ctx.reply(botTexts_1.botTexts.measurement.invalidValues, {
                    parse_mode: "Markdown",
                });
            }
        }
        try {
            const updatedMeasurement = yield conversation.external(() => Measurement_1.default.findByIdAndUpdate(measurementId, {
                $set: {
                    systolic: newSystolic,
                    diastolic: newDiastolic,
                    pulse: newPulse,
                },
            }, { new: true }));
            if (!updatedMeasurement) {
                yield ctx.reply(botTexts_1.botTexts.measurement.notFound);
            }
            else {
                yield ctx.reply(botTexts_1.botTexts.measurement.updatedResults +
                    `Нові значення: ${updatedMeasurement.systolic} / ${updatedMeasurement.diastolic}, пульс ${updatedMeasurement.pulse}`);
                console.log(`[Conv edit_measurement] Пользователь ${userId} обновил измерение ${measurementId}.`);
            }
        }
        catch (error) {
            console.error(`[Conv edit_measurement] Ошибка обновления измерения ${measurementId} для ${userId}:`, error);
            yield ctx.reply(botTexts_1.botTexts.measurement.savingError);
        }
        finally {
            session.lastMeasurementId = "";
        }
    });
}
