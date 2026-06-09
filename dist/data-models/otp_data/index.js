"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpDataTable = void 0;
const model_json_1 = __importDefault(require("./model.json"));
const view_json_1 = __importDefault(require("./view.json"));
exports.otpDataTable = {
    tableName: 'otp_data',
    model: model_json_1.default,
    view: view_json_1.default,
    validateInsert: async (_conn, _row) => { },
    validateUpdate: async (_conn, _row) => { },
    validateDelete: async (_conn, _row) => { },
};
exports.default = exports.otpDataTable;
//# sourceMappingURL=index.js.map