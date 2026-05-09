import type { PoolConnection } from 'mysql2/promise';

import type {
  DataModel,
  DataRow,
  FatalMysqlError,
  ModelFieldType,
  Stage,
  TableDefinition,
  TableOperation,
} from './types';
import { tableDefinitions } from './tables';

const DEFAULT_CONNECTION_LIMIT = 10;
const DEFAULT_MAX_IDLE = 5;
const DEFAULT_QUEUE_LIMIT = 0;
const DEFAULT_IDLE_TIMEOUT_MS = 30_000;
const DEFAULT_CONNECT_TIMEOUT_MS = 10_000;
const DEFAULT_ACQUIRE_TIMEOUT_MS = 8_000;

const getPositiveInt = (
  value: string | undefined,
  fallback: number,
): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const getNonNegativeInt = (
  value: string | undefined,
  fallback: number,
): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

export const normalizeStage = (value: unknown): Stage =>
  `${value}`.trim().toLowerCase();

export const normalizeFlavor = (value: unknown): string =>
  `${value}`.trim().toLowerCase();

export const getPoolConfig = () => {
  const connectionLimit = getPositiveInt(
    process.env.BLUPAWS_DB_CONNECTION_LIMIT,
    DEFAULT_CONNECTION_LIMIT,
  );
  const maxIdle = Math.min(
    getPositiveInt(process.env.BLUPAWS_DB_MAX_IDLE, DEFAULT_MAX_IDLE),
    connectionLimit,
  );

  return {
    waitForConnections: true,
    connectionLimit,
    maxIdle,
    idleTimeout: getPositiveInt(
      process.env.BLUPAWS_DB_IDLE_TIMEOUT_MS,
      DEFAULT_IDLE_TIMEOUT_MS,
    ),
    queueLimit: getNonNegativeInt(
      process.env.BLUPAWS_DB_QUEUE_LIMIT,
      DEFAULT_QUEUE_LIMIT,
    ),
    connectTimeout: getPositiveInt(
      process.env.BLUPAWS_DB_CONNECT_TIMEOUT_MS,
      DEFAULT_CONNECT_TIMEOUT_MS,
    ),
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    charset: 'utf8mb4_0900_ai_ci',
  };
};

export const getAcquireTimeoutMs = (): number =>
  getPositiveInt(
    process.env.BLUPAWS_DB_ACQUIRE_TIMEOUT_MS,
    DEFAULT_ACQUIRE_TIMEOUT_MS,
  );

export const getSlowQueryLogMs = (): number | null => {
  const value = process.env.BLUPAWS_DB_LOG_SLOW_QUERY_MS;
  if (value == null || value.trim().length === 0) {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export function isFatalError(err: unknown): err is FatalMysqlError {
  const error = err as FatalMysqlError;
  return (
    error?.fatal ||
    error?.code === 'PROTOCOL_CONNECTION_LOST' ||
    error?.code === 'ECONNRESET' ||
    error?.code === 'EPIPE' ||
    error?.message?.includes('closed connection')
  );
}

export const getTableDefinition = (tableName: string): TableDefinition => {
  const definition = (tableDefinitions as Record<string, TableDefinition>)[
    tableName
  ];
  if (definition == null) {
    throw new Error(`Unknown table ${tableName}`);
  }
  return definition;
};

export const getDataModel = (tableName: string): DataModel =>
  getTableDefinition(tableName).model;

export const validateTableOperation = async (
  tableName: string,
  operation: TableOperation,
  conn: PoolConnection,
  row: DataRow,
): Promise<void> => {
  const definition = getTableDefinition(tableName);
  const validatorsByOperation = {
    insert: definition.validateInsert,
    update: definition.validateUpdate,
    delete: definition.validateDelete,
  } satisfies Record<TableOperation, typeof definition.validateInsert>;
  const validator = validatorsByOperation[operation];
  const result = await validator(conn, row);
  if (result === false) {
    throw new Error(`${operation} validation failed for ${tableName}`);
  }
};

const validators = {
  string: (value: unknown, key: string) => {
    if (typeof value !== 'string') {
      throw new Error(`Type of ${key} must be string`);
    }
    return value.trim();
  },
  number: (value: unknown, key: string) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new Error(`Type of ${key} must be number`);
    }
    return value;
  },
  datetime: (value: unknown, key: string) => {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      throw new Error(`Type of ${key} must be a valid Date`);
    }
    return value;
  },
} satisfies Record<ModelFieldType, (value: unknown, key: string) => unknown>;

const assertDataRow = (row: DataRow): void => {
  if (row == null || typeof row !== 'object' || Array.isArray(row)) {
    throw new Error('Row must be an object');
  }
};

export const serializeUpdateData = (
  model: DataModel,
  row: DataRow,
): DataRow => {
  assertDataRow(row);
  const data: DataRow = {};
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

export const serializeCreateData = (
  model: DataModel,
  row: DataRow,
): DataRow => {
  assertDataRow(row);
  const data: DataRow = {};
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

export const serializeClauseData = (
  model: DataModel,
  row: DataRow,
): DataRow => {
  assertDataRow(row);
  const data: DataRow = {};
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
