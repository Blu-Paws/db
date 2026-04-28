"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerPriceCoatComplexityTable = void 0;
const model_json_1 = __importDefault(require("./model.json"));
exports.providerPriceCoatComplexityTable = {
    tableName: 'provider_price_coat_complexity',
    model: model_json_1.default,
    validateInsert: async (_conn, _row) => { },
    validateUpdate: async (_conn, _row) => { },
    validateDelete: async (_conn, _row) => { },
};
exports.default = exports.providerPriceCoatComplexityTable;
//# sourceMappingURL=index.js.map