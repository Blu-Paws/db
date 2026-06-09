"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.petHistoryTable = void 0;
const model_json_1 = __importDefault(require("./model.json"));
const view_json_1 = __importDefault(require("./view.json"));
exports.petHistoryTable = {
    tableName: 'pet_history',
    model: model_json_1.default,
    view: view_json_1.default,
    validateInsert: async (_conn, _row) => { },
    validateUpdate: async (_conn, _row) => { },
    validateDelete: async (_conn, _row) => { },
};
exports.default = exports.petHistoryTable;
//# sourceMappingURL=index.js.map