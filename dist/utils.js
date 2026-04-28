"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeClauseData = exports.serializeCreateData = exports.serializeUpdateData = exports.validateTableOperation = exports.getDataModel = exports.getTableDefinition = exports.getAcquireTimeoutMs = exports.getPoolConfig = exports.normalizeFlavor = exports.normalizeStage = void 0;
exports.isFatalError = isFatalError;
const tables_1 = require("./tables");
const DEFAULT_CONNECTION_LIMIT = 3;
const DEFAULT_MAX_IDLE = 1;
const DEFAULT_QUEUE_LIMIT = 25;
const DEFAULT_IDLE_TIMEOUT_MS = 30_000;
const DEFAULT_CONNECT_TIMEOUT_MS = 10_000;
const DEFAULT_ACQUIRE_TIMEOUT_MS = 8_000;
const getPositiveInt = (value, fallback) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};
const normalizeStage = (value) => `${value}`.trim().toLowerCase();
exports.normalizeStage = normalizeStage;
const normalizeFlavor = (value) => `${value}`.trim().toLowerCase();
exports.normalizeFlavor = normalizeFlavor;
const getPoolConfig = () => {
    const connectionLimit = getPositiveInt(process.env.BLUPAWS_DB_CONNECTION_LIMIT, DEFAULT_CONNECTION_LIMIT);
    const maxIdle = Math.min(getPositiveInt(process.env.BLUPAWS_DB_MAX_IDLE, DEFAULT_MAX_IDLE), connectionLimit);
    return {
        waitForConnections: true,
        connectionLimit,
        maxIdle,
        idleTimeout: getPositiveInt(process.env.BLUPAWS_DB_IDLE_TIMEOUT_MS, DEFAULT_IDLE_TIMEOUT_MS),
        queueLimit: getPositiveInt(process.env.BLUPAWS_DB_QUEUE_LIMIT, DEFAULT_QUEUE_LIMIT),
        connectTimeout: getPositiveInt(process.env.BLUPAWS_DB_CONNECT_TIMEOUT_MS, DEFAULT_CONNECT_TIMEOUT_MS),
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        charset: 'utf8mb4_0900_ai_ci',
    };
};
exports.getPoolConfig = getPoolConfig;
const getAcquireTimeoutMs = () => getPositiveInt(process.env.BLUPAWS_DB_ACQUIRE_TIMEOUT_MS, DEFAULT_ACQUIRE_TIMEOUT_MS);
exports.getAcquireTimeoutMs = getAcquireTimeoutMs;
function isFatalError(err) {
    const error = err;
    return (error?.fatal ||
        error?.code === 'PROTOCOL_CONNECTION_LOST' ||
        error?.code === 'ECONNRESET' ||
        error?.code === 'EPIPE' ||
        error?.message?.includes('closed connection'));
}
const getTableDefinition = (tableName) => {
    const definition = tables_1.tableDefinitions[tableName];
    if (definition == null) {
        throw new Error(`Unknown table ${tableName}`);
    }
    return definition;
};
exports.getTableDefinition = getTableDefinition;
const getDataModel = (tableName) => (0, exports.getTableDefinition)(tableName).model;
exports.getDataModel = getDataModel;
const validateTableOperation = async (tableName, operation, conn, row) => {
    const definition = (0, exports.getTableDefinition)(tableName);
    const validatorsByOperation = {
        insert: definition.validateInsert,
        update: definition.validateUpdate,
        delete: definition.validateDelete,
    };
    const validator = validatorsByOperation[operation];
    const result = await validator(conn, row);
    if (result === false) {
        throw new Error(`${operation} validation failed for ${tableName}`);
    }
};
exports.validateTableOperation = validateTableOperation;
const validators = {
    string: (value, key) => {
        if (typeof value !== 'string') {
            throw new Error(`Type of ${key} must be string`);
        }
        return value.trim();
    },
    number: (value, key) => {
        if (typeof value !== 'number' || Number.isNaN(value)) {
            throw new Error(`Type of ${key} must be number`);
        }
        return value;
    },
    boolean: (value, key) => {
        if (typeof value !== 'boolean') {
            throw new Error(`Type of ${key} must be boolean`);
        }
        return value ? 1 : 0;
    },
    datetime: (value, key) => {
        if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
            throw new Error(`Type of ${key} must be a valid Date`);
        }
        return value;
    },
};
const assertDataRow = (row) => {
    if (row == null || typeof row !== 'object' || Array.isArray(row)) {
        throw new Error('Row must be an object');
    }
};
const serializeUpdateData = (model, row) => {
    assertDataRow(row);
    const data = {};
    for (const key of Object.keys(model)) {
        const value = row[key];
        const { updateable, type, required } = model[key];
        if (value === undefined || `${value}`.trim().length === 0) {
            continue;
        }
        if (!updateable) {
            throw new Error(`Unsupported attribute ${key}`);
        }
        if (value == null) {
            if (required) {
                throw new Error(`Attribute ${key} can not be null`);
            }
            data[key] = null;
            continue;
        }
        const validator = validators[type];
        if (!validator) {
            throw new Error(`Unknown type '${type}' for attribute ${key}`);
        }
        data[key] = validator(value, key);
    }
    return data;
};
exports.serializeUpdateData = serializeUpdateData;
const serializeCreateData = (model, row) => {
    assertDataRow(row);
    const data = {};
    for (const key of Object.keys(model)) {
        const value = row[key];
        const { createable, required, type } = model[key];
        if (value == null || `${value}`.trim().length === 0) {
            if (required) {
                throw new Error(`Missing attribute ${key}`);
            }
            continue;
        }
        if (!createable) {
            throw new Error(`Unsupported attribute ${key}`);
        }
        const validator = validators[type];
        if (!validator) {
            throw new Error(`Unknown type '${type}' for attribute ${key}`);
        }
        data[key] = validator(value, key);
    }
    return data;
};
exports.serializeCreateData = serializeCreateData;
const serializeClauseData = (model, row) => {
    assertDataRow(row);
    const data = {};
    for (const key of Object.keys(row)) {
        const value = row[key];
        const field = model[key];
        if (field == null) {
            throw new Error(`Unsupported attribute ${key}`);
        }
        if (value == null || `${value}`.trim().length === 0) {
            throw new Error(`Missing attribute ${key}`);
        }
        const validator = validators[field.type];
        if (!validator) {
            throw new Error(`Unknown type '${field.type}' for attribute ${key}`);
        }
        data[key] = validator(value, key);
    }
    return data;
};
exports.serializeClauseData = serializeClauseData;
//# sourceMappingURL=utils.js.map