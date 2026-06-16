import jwt from 'jsonwebtoken';
import mysql, {
  Pool,
  Pool as MysqlPool,
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

import type {
  BluPawsPool,
  BPConnection,
  DataRow,
  Flavor,
  GetRowOptions,
  GetRowsOptions,
  GetRowsResult,
  QueryResult,
  QueryValues,
  Stage,
  ViewAssociation,
  ViewAssociationJoin,
  ViewModelField,
} from './types';
import {
  getAcquireTimeoutMs,
  getPoolConfig,
  getSlowQueryLogMs,
  getTableDefinition,
  isFatalError,
  normalizeFlavor,
  normalizeStage,
  serializeClauseData,
  serializeCreateData,
  serializeUpdateData,
  validateTableOperation,
} from './utils';

const pools = new Map<Stage, BluPawsPool>();
const poolPromises = new Map<Stage, Promise<BluPawsPool>>();
const secrets: Record<string, any> = {};

const getElapsedMs = (startedAt: bigint): number =>
  Number(process.hrtime.bigint() - startedAt) / 1_000_000;

const logIfSlow = (
  operation: string,
  elapsedMs: number,
  sql?: string,
): void => {
  const slowQueryLogMs = getSlowQueryLogMs();
  if (slowQueryLogMs == null || elapsedMs < slowQueryLogMs) {
    return;
  }
  const detail = sql == null ? '' : `: ${sql.replace(/\s+/g, ' ').trim()}`;
  console.warn(
    `[blupaws-db] Slow ${operation}: ${elapsedMs.toFixed(1)}ms${detail}`,
  );
};

const getAWSSecret = async (SecretId: string) => {
  if (secrets[SecretId] != null) {
    console.log(`Reading cached secret for secret ID: ${SecretId}`);
    return secrets[SecretId];
  }
  const client = new SecretsManagerClient({
    region: 'us-east-2',
  });
  const response = await client.send(
    new GetSecretValueCommand({
      SecretId,
      VersionStage: 'AWSCURRENT',
    }),
  );
  const json = JSON.parse(response.SecretString ?? '{}');
  secrets[SecretId] = json;
  return json;
};

const getDBDetails = async (stageKey: Stage) => {
  const json = await getAWSSecret(`${stageKey}/RDB/mysql`);
  return {
    ...json,
    ...getPoolConfig(),
  };
};

const getJWTSecret = async (stageKey: Stage, key: string): Promise<string> => {
  const json = await getAWSSecret('private/keys');
  return json[`${key}_${stageKey.toUpperCase()}`] as string;
};

const clearPool = async (stageKey: Stage): Promise<void> => {
  const pool = pools.get(stageKey);
  pools.delete(stageKey);
  poolPromises.delete(stageKey);
  if (pool != null) {
    await pool.end().catch(() => {});
  }
};

const attachListeners = (pool: BluPawsPool, stageKey: Stage): void => {
  if (pool._blupawsListenersAttached) {
    return;
  }
  pool._blupawsListenersAttached = true;
  pool.on('error', (err: unknown) => {
    if (isFatalError(err)) {
      clearPool(stageKey).catch(() => {});
    }
  });
  pool.on('connection', (conn) => {
    conn.on('error', (err: unknown) => {
      if (isFatalError(err)) {
        conn.destroy();
      }
    });
  });
};

const runQuery = async (
  executor: Pick<MysqlPool | PoolConnection, 'query'>,
  sql: string,
  values?: QueryValues,
): Promise<QueryResult> => {
  const startedAt = process.hrtime.bigint();
  try {
    const [rows] =
      values === undefined
        ? await executor.query(sql)
        : await executor.query(sql, values as any);
    return rows as QueryResult;
  } finally {
    logIfSlow('query', getElapsedMs(startedAt), sql);
  }
};

const acquireConnection = async (pool: Pool): Promise<PoolConnection> => {
  const startedAt = process.hrtime.bigint();
  let timedOut = false;
  let timeout: NodeJS.Timeout | undefined;

  const connectionPromise = pool.getConnection();
  connectionPromise.then(
    (conn) => {
      if (timedOut) {
        conn.release();
      }
    },
    () => {},
  );

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      timedOut = true;
      reject(
        new Error('Timed out waiting for a database connection from the pool'),
      );
    }, getAcquireTimeoutMs());
  });

  try {
    return await Promise.race([connectionPromise, timeoutPromise]);
  } finally {
    if (timeout != null) {
      clearTimeout(timeout);
    }
    logIfSlow('connection acquire', getElapsedMs(startedAt));
  }
};

const createPoolForStage = async (stageKey: Stage): Promise<BluPawsPool> => {
  const dbDetails = await getDBDetails(stageKey);
  const pool = mysql.createPool(dbDetails) as BluPawsPool;
  attachListeners(pool, stageKey);
  pools.set(stageKey, pool);
  return pool;
};

const getPoolForStage = async (stageKey: Stage): Promise<Pool> => {
  const existingPool = pools.get(stageKey);
  if (existingPool != null) {
    return existingPool;
  }

  let poolPromise = poolPromises.get(stageKey);
  if (poolPromise == null) {
    poolPromise = createPoolForStage(stageKey).catch((error) => {
      poolPromises.delete(stageKey);
      throw error;
    });
    poolPromises.set(stageKey, poolPromise);
  }

  return poolPromise;
};

const getConnection = async (stageKey: Stage): Promise<PoolConnection> => {
  const pool = await getPoolForStage(stageKey);
  return acquireConnection(pool);
};

const withConnectionForStage = async <T>(
  stageKey: Stage,
  callback: (conn: PoolConnection) => Promise<T>,
): Promise<T> => {
  const conn = await getConnection(stageKey);
  let shouldRelease = true;
  try {
    return await callback(conn);
  } catch (error) {
    if (isFatalError(error)) {
      shouldRelease = false;
      conn.destroy();
      await clearPool(stageKey);
    }
    throw error;
  } finally {
    if (shouldRelease) {
      conn.release();
    }
  }
};

const withTransactionForStage = async <T>(
  stageKey: Stage,
  callback: (conn: PoolConnection) => Promise<T>,
): Promise<T> => {
  return withConnectionForStage(stageKey, async (conn) => {
    await conn.beginTransaction();
    try {
      const result = await callback(conn);
      await conn.commit();
      return result;
    } catch (error) {
      await conn.rollback().catch(() => {});
      throw error;
    }
  });
};

const queryForStage = async <T extends QueryResult = RowDataPacket[]>(
  stageKey: Stage,
  sql: string,
  values?: QueryValues,
  conn?: PoolConnection | null,
): Promise<T> => {
  if (conn != null) {
    return (await runQuery(conn, sql, values)) as T;
  }

  let connFromPool: PoolConnection | undefined;
  try {
    connFromPool = await getConnection(stageKey);
    return (await runQuery(connFromPool, sql, values)) as T;
  } catch (e) {
    if (isFatalError(e)) {
      connFromPool?.destroy();
      connFromPool = undefined;
      await clearPool(stageKey);
      connFromPool = await getConnection(stageKey);
      return (await runQuery(connFromPool, sql, values)) as T;
    }
    throw e;
  } finally {
    connFromPool?.release();
  }
};

const assertHasFields = (data: DataRow, action: string, tableName: string) => {
  if (Object.keys(data).length === 0) {
    throw new Error(`No ${action} fields provided for ${tableName}`);
  }
};

const resolveSelectedFields = (
  tableName: string,
  selectedFieldNames?: string[],
): string[] | undefined => {
  if (selectedFieldNames === undefined) {
    return undefined;
  }
  if (!Array.isArray(selectedFieldNames)) {
    throw new Error(`fields must be an array of strings for ${tableName}`);
  }

  const table = getTableDefinition(tableName);
  return selectedFieldNames.map((fieldName, index) => {
    if (typeof fieldName !== 'string') {
      throw new Error(`fields[${index}] must be a string for ${tableName}`);
    }
    const normalizedFieldName = fieldName.trim();
    if (normalizedFieldName.length === 0) {
      throw new Error(
        `fields[${index}] must be a non-empty string for ${tableName}`,
      );
    }
    const field = table.view[normalizedFieldName];
    if (field == null) {
      throw new Error(
        `Unknown view field ${normalizedFieldName} for ${tableName}`,
      );
    }
    return normalizedFieldName;
  });
};

const resolveViewAssociation = (
  tableName: string,
  fieldName: string,
  field: ViewModelField,
): { association: ViewAssociation; targetSelectField: string } | null => {
  const associationRef = field.association;
  if (associationRef == null) {
    return null;
  }

  const table = getTableDefinition(tableName);
  const association =
    typeof associationRef === 'string'
      ? table.associations?.[associationRef]
      : associationRef;
  if (association == null) {
    throw new Error(
      `Unknown association ${associationRef} for ${tableName}.${fieldName}`,
    );
  }

  return {
    association,
    targetSelectField:
      field.field ?? association.targetSelectField ?? fieldName,
  };
};

const getAssociationJoins = (
  tableName: string,
  fieldName: string,
  association: ViewAssociation,
): ViewAssociationJoin[] => {
  if (association.path != null) {
    if (!Array.isArray(association.path) || association.path.length === 0) {
      throw new Error(
        `Association path is empty for ${tableName}.${fieldName}`,
      );
    }
    return association.path;
  }

  const { tableName: targetTableName, sourceField, targetField } = association;
  if (targetTableName == null || sourceField == null || targetField == null) {
    throw new Error(
      `Association join is incomplete for ${tableName}.${fieldName}`,
    );
  }
  return [
    {
      tableName: targetTableName,
      sourceField,
      sourceAlias: association.sourceAlias,
      targetField,
      targetFilters: association.targetFilters,
      alias: association.alias,
      joinType: association.joinType,
    },
  ];
};

const getViewQueryParts = (
  tableName: string,
  selectedFieldNames?: string[],
): {
  selectStatement: string;
  joinStatement: string;
  joinValues: unknown[];
} => {
  const table = getTableDefinition(tableName);
  const viewFields = Object.entries(table.view);
  const resolvedSelectedFieldNames = resolveSelectedFields(
    tableName,
    selectedFieldNames,
  );
  const fields =
    resolvedSelectedFieldNames == null ||
    resolvedSelectedFieldNames.length === 0
      ? viewFields.filter(([, field]) => field.association == null)
      : resolvedSelectedFieldNames.map((fieldName) => {
          const field = table.view[fieldName] as ViewModelField;
          return [fieldName, field] as [string, ViewModelField];
        });
  if (fields.length === 0) {
    throw new Error(`No view fields provided for ${tableName}`);
  }

  const selectStatements: string[] = [];
  const joins = new Map<string, string>();
  const aliasTableNames = new Map<string, string>([[tableName, tableName]]);
  const joinValues: unknown[] = [];
  for (const [fieldName, field] of fields) {
    const associationData = resolveViewAssociation(tableName, fieldName, field);
    if (associationData == null) {
      if (table.model[fieldName] == null) {
        throw new Error(`Unknown base field ${fieldName} for ${tableName}`);
      }
      selectStatements.push(`${tableName}.${fieldName} AS ${fieldName}`);
      continue;
    }

    const { association, targetSelectField } = associationData;
    const associationJoins = getAssociationJoins(
      tableName,
      fieldName,
      association,
    );
    let targetAlias = tableName;
    let targetTableName = tableName;
    for (const [index, associationJoin] of associationJoins.entries()) {
      const sourceAlias =
        associationJoin.sourceAlias ?? (index === 0 ? tableName : targetAlias);
      const sourceTableName = aliasTableNames.get(sourceAlias);
      if (sourceTableName == null) {
        throw new Error(
          `Unknown source alias ${sourceAlias} for ${tableName}.${fieldName}`,
        );
      }
      const sourceTable = getTableDefinition(sourceTableName);
      const targetTable = getTableDefinition(associationJoin.tableName);
      if (sourceTable.model[associationJoin.sourceField] == null) {
        throw new Error(
          `Unknown source field ${associationJoin.sourceField} for ${tableName}.${fieldName}`,
        );
      }
      if (targetTable.model[associationJoin.targetField] == null) {
        throw new Error(
          `Unknown target field ${associationJoin.targetField} for ${tableName}.${fieldName}`,
        );
      }

      const joinType = associationJoin.joinType ?? 'LEFT';
      if (joinType !== 'LEFT' && joinType !== 'INNER') {
        throw new Error(
          `Unsupported join type ${joinType} for ${tableName}.${fieldName}`,
        );
      }

      const alias =
        associationJoin.alias ??
        `${associationJoin.tableName}_${associationJoin.targetField}`;
      const targetFilterData = serializeClauseData(
        targetTable.model,
        associationJoin.targetFilters ?? {},
      );
      const targetFilterStatement = Object.keys(targetFilterData)
        .map((key) => `${alias}.${key} = ?`)
        .join(' AND ');
      const join = `${joinType} JOIN ${associationJoin.tableName} AS ${alias} ON ${sourceAlias}.${associationJoin.sourceField} = ${alias}.${associationJoin.targetField}${targetFilterStatement.length === 0 ? '' : ` AND ${targetFilterStatement}`}`;
      const existingJoin = joins.get(alias);
      if (existingJoin != null && existingJoin !== join) {
        throw new Error(`Conflicting join alias ${alias} for ${tableName}`);
      }
      if (existingJoin == null) {
        joins.set(alias, join);
        aliasTableNames.set(alias, associationJoin.tableName);
        Object.values(targetFilterData).forEach((value) =>
          joinValues.push(value),
        );
      }
      targetAlias = alias;
      targetTableName = associationJoin.tableName;
    }

    const targetTable = getTableDefinition(targetTableName);
    if (targetTable.model[targetSelectField] == null) {
      throw new Error(
        `Unknown target select field ${targetSelectField} for ${tableName}.${fieldName}`,
      );
    }
    selectStatements.push(
      `${targetAlias}.${targetSelectField} AS ${fieldName}`,
    );
  }

  return {
    selectStatement: selectStatements.join(','),
    joinStatement:
      joins.size === 0 ? '' : ` ${Array.from(joins.values()).join(' ')}`,
    joinValues,
  };
};

const getWhereData = (tableName: string, clauses: DataRow): DataRow => {
  const table = getTableDefinition(tableName);
  const whereData = serializeClauseData(table.model, clauses);
  return whereData;
};

const getReadWhereData = (tableName: string, clauses: DataRow): DataRow => {
  const whereData = getWhereData(tableName, clauses);
  assertHasFields(whereData, 'where', tableName);
  return whereData;
};

const resolveClauses = (clauses?: DataRow): DataRow => clauses ?? {};

const getWhereStatement = (whereData: DataRow, tableName?: string): string =>
  Object.keys(whereData)
    .map((x) => `${tableName == null ? '' : `${tableName}.`}${x} = ?`)
    .join(' AND ');

const normalizePaginationValue = (
  value: number | undefined,
  fallback: number,
  fieldName: string,
): number => {
  if (value === undefined) {
    return fallback;
  }
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }
  return value;
};

const resolveGetRowsArgs = (
  optionsOrConn?: GetRowsOptions | PoolConnection | null,
  conn?: PoolConnection | null,
): { options: GetRowsOptions; conn?: PoolConnection | null } => {
  if (
    optionsOrConn != null &&
    typeof (optionsOrConn as PoolConnection).query === 'function'
  ) {
    return { options: {}, conn: optionsOrConn as PoolConnection };
  }
  return { options: (optionsOrConn ?? {}) as GetRowsOptions, conn };
};

const updateRowTableForStage = async (
  stageKey: Stage,
  conn: PoolConnection | null | undefined,
  tableName: string,
  row: DataRow,
  clauses: DataRow,
): Promise<void> => {
  const table = getTableDefinition(tableName);
  const model = table.model;
  const data = serializeUpdateData(model, row);
  const whereData = getWhereData(tableName, clauses);
  assertHasFields(data, 'update', tableName);

  const updateStatement = Object.keys(data)
    .map((x) => `${x} = ?`)
    .join(', ');
  const values = Object.values(data);
  const whereStatement = getWhereStatement(whereData);
  Object.values(whereData).forEach((x) => values.push(x));
  const sql = `UPDATE ${tableName} SET ${updateStatement} WHERE ${whereStatement}`;
  const run = async (activeConn: PoolConnection) => {
    await validateTableOperation(tableName, 'update', activeConn, data);
    await queryForStage(stageKey, sql, values, activeConn);
  };

  if (conn != null) {
    await run(conn);
    return;
  }
  await withConnectionForStage(stageKey, run);
};

const insertRowIntoTableForStage = async (
  stageKey: Stage,
  conn: PoolConnection | null | undefined,
  tableName: string,
  row: DataRow,
): Promise<number> => {
  const table = getTableDefinition(tableName);
  const model = table.model;
  const data = serializeCreateData(model, row);
  assertHasFields(data, 'insert', tableName);

  const fields = Object.keys(data);
  const values = fields.map((f) => data[f]);
  const sql = `INSERT INTO ${tableName} (${fields.join(',')}) VALUES (${fields
    .map(() => '?')
    .join(',')})`;
  const run = async (activeConn: PoolConnection) => {
    await validateTableOperation(tableName, 'insert', activeConn, data);
    const { insertId } = await queryForStage<ResultSetHeader>(
      stageKey,
      sql,
      values,
      activeConn,
    );
    return insertId;
  };

  if (conn != null) {
    return run(conn);
  }
  return withConnectionForStage(stageKey, run);
};

const insertRowsIntoTableForStage = async (
  stageKey: Stage,
  conn: PoolConnection | null | undefined,
  tableName: string,
  rows: DataRow[],
): Promise<void> => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return;
  }
  const table = getTableDefinition(tableName);
  const model = table.model;
  const datas = rows.map((row) => serializeCreateData(model, row));
  datas.forEach((data) => assertHasFields(data, 'insert', tableName));

  const fields = Object.keys(datas[0]);
  const values = datas.map((row) => fields.map((field) => row[field]));
  const sql = `INSERT INTO ${tableName} (${fields.join(',')}) VALUES ?`;
  const run = async (activeConn: PoolConnection) => {
    for (const row of datas) {
      await validateTableOperation(tableName, 'insert', activeConn, row);
    }
    await queryForStage(stageKey, sql, [values], activeConn);
  };

  if (conn != null) {
    await run(conn);
    return;
  }
  await withTransactionForStage(stageKey, run);
};

const deleteRowFromTableForStage = async (
  stageKey: Stage,
  conn: PoolConnection | null | undefined,
  tableName: string,
  clauses: DataRow,
): Promise<void> => {
  const whereData = getWhereData(tableName, clauses);

  const whereStatement = getWhereStatement(whereData);
  const values = Object.values(whereData);
  const sql = `DELETE FROM ${tableName} WHERE ${whereStatement}`;
  const run = async (activeConn: PoolConnection) => {
    await validateTableOperation(tableName, 'delete', activeConn, whereData);
    await queryForStage(stageKey, sql, values, activeConn);
  };

  if (conn != null) {
    await run(conn);
    return;
  }
  await withConnectionForStage(stageKey, run);
};

const getRowsFromTableForStage = async <T>(
  stageKey: Stage,
  conn: PoolConnection | null | undefined,
  tableName: string,
  options: GetRowsOptions = {},
): Promise<GetRowsResult<T>> => {
  getTableDefinition(tableName);
  const clauses = resolveClauses(options.clauses);
  const { selectStatement, joinStatement, joinValues } = getViewQueryParts(
    tableName,
    options.fields,
  );
  const whereData = getReadWhereData(tableName, clauses);
  const whereStatement = getWhereStatement(whereData, tableName);
  const values = Object.values(whereData);
  const offset = normalizePaginationValue(options.offset, 0, 'offset');
  const limit =
    options.limit === undefined
      ? undefined
      : normalizePaginationValue(options.limit, 0, 'limit');

  if (offset > 0 && limit === undefined) {
    throw new Error('limit is required when offset is provided');
  }

  let sql = `SELECT ${selectStatement} FROM ${tableName}${joinStatement} WHERE ${whereStatement}`;
  const rowValues = [...joinValues, ...values];
  if (limit !== undefined) {
    sql = `${sql} LIMIT ? OFFSET ?`;
    rowValues.push(limit, offset);
  }

  const countSql = `SELECT COUNT(*) AS count FROM ${tableName} WHERE ${whereStatement}`;
  const run = async (activeConn: PoolConnection): Promise<GetRowsResult<T>> => {
    const countRows = await queryForStage<RowDataPacket[]>(
      stageKey,
      countSql,
      values,
      activeConn,
    );
    const rows = await queryForStage<RowDataPacket[]>(
      stageKey,
      sql,
      rowValues,
      activeConn,
    );
    const count = Number((countRows[0] as DataRow | undefined)?.count ?? 0);
    const items = rows as T[];
    return {
      offset,
      limit: limit ?? items.length,
      items,
      count,
    };
  };

  if (conn != null) {
    return run(conn);
  }
  return withConnectionForStage(stageKey, run);
};

const getRowFromTableForStage = async <T>(
  stageKey: Stage,
  conn: PoolConnection | null | undefined,
  tableName: string,
  options: GetRowOptions = {},
): Promise<T | null> => {
  getTableDefinition(tableName);
  const clauses = resolveClauses(options.clauses);
  const { selectStatement, joinStatement, joinValues } = getViewQueryParts(
    tableName,
    options.fields,
  );
  const whereData = getReadWhereData(tableName, clauses);
  const whereStatement = getWhereStatement(whereData, tableName);
  const values = [...joinValues, ...Object.values(whereData)];
  const sql = `SELECT ${selectStatement} FROM ${tableName}${joinStatement} WHERE ${whereStatement} LIMIT 1`;
  const rows = await queryForStage<RowDataPacket[]>(
    stageKey,
    sql,
    values,
    conn,
  );
  return (rows[0] as T | undefined) ?? null;
};

export const createConnection = (
  stageValue: Stage,
  flavorValue: Flavor,
): BPConnection => {
  if (stageValue == null || `${stageValue}`.trim().length === 0) {
    throw new Error('Stage is required');
  }
  if (flavorValue == null || `${flavorValue}`.trim().length === 0) {
    throw new Error('Flavor is required');
  }

  const stageKey = normalizeStage(stageValue);
  normalizeFlavor(flavorValue);

  return {
    query: <T extends QueryResult = RowDataPacket[]>(
      sql: string,
      values?: QueryValues,
      conn?: PoolConnection | null,
    ) => queryForStage<T>(stageKey, sql, values, conn),
    withTransaction: <T>(callback: (conn: PoolConnection) => Promise<T>) =>
      withTransactionForStage(stageKey, callback),
    insertRowIntoTable: (
      tableName: string,
      row: DataRow,
      conn?: PoolConnection | null,
    ) => insertRowIntoTableForStage(stageKey, conn, tableName, row),
    insertRowsIntoTable: (
      tableName: string,
      rows: DataRow[],
      conn?: PoolConnection | null,
    ) => insertRowsIntoTableForStage(stageKey, conn, tableName, rows),
    getRowFromTable: <T>(
      tableName: string,
      options?: GetRowOptions,
      conn?: PoolConnection | null,
    ) => getRowFromTableForStage<T>(stageKey, conn, tableName, options),
    getRowsFromTable: <T>(
      tableName: string,
      optionsOrConn?: GetRowsOptions | PoolConnection | null,
      conn?: PoolConnection | null,
    ) => {
      const args = resolveGetRowsArgs(optionsOrConn, conn);
      return getRowsFromTableForStage<T>(
        stageKey,
        args.conn,
        tableName,
        args.options,
      );
    },
    updateRowTable: (
      tableName: string,
      row: DataRow,
      clauses: DataRow,
      conn?: PoolConnection | null,
    ) => updateRowTableForStage(stageKey, conn, tableName, row, clauses),
    deleteRowFromTable: (
      tableName: string,
      clauses: DataRow,
      conn?: PoolConnection | null,
    ) => deleteRowFromTableForStage(stageKey, conn, tableName, clauses),
  };
};

export const createJWTToken = async (
  stageValue: Stage,
  payload: Record<string, string | number>,
  expiresIn: any,
) => {
  const secret = await getJWTSecret(stageValue, 'JWT_SECRET');
  const token = jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn,
  });
  return token;
};

export const verifyJWTToken = async (stageValue: Stage, token: string) => {
  const secret = await getJWTSecret(stageValue, 'JWT_SECRET');
  const decoded = jwt.verify(token, secret, {
    algorithms: ['HS256'],
  });
  return decoded;
};

export const createRefreshToken = async (
  stageValue: Stage,
  payload: Record<string, string | number>,
  expiresIn: any,
) => {
  const privateKey = await getJWTSecret(stageValue, 'JWT_PRIVATE_KEY');
  const refreshToken = jwt.sign(payload, privateKey.replace(/\\n/g, '\n'), {
    algorithm: 'RS256',
    expiresIn: expiresIn,
  });
  return refreshToken;
};

export const verifyRefreshToken = async (stageValue: Stage, token: string) => {
  const publicKey = await getJWTSecret(stageValue, 'JWT_PUBLIC_KEY');
  const decoded = jwt.verify(token, publicKey.replace(/\\n/g, '\n'), {
    algorithms: ['RS256'],
  });
  return decoded;
};

export const getAuthenticatedUserDetails = async (
  stageValue: Stage,
  headers: Record<string, string>,
) => {
  const { 'x-api-key': blupawsApiKey, Authorization } = headers;
  if (blupawsApiKey == null && Authorization == null) {
    return {
      error: 'Authentication headers are missing',
    };
  }
  try {
    if (blupawsApiKey != null) {
      const [providerKey] = await queryForStage(
        stageValue,
        'select integrator_id, clinic_id, flavor from vw_provider_api_keys where api_key = ?',
        [blupawsApiKey],
      );
      if (providerKey?.clinic_id != null) {
        const [clinic] = await queryForStage(
          stageValue,
          'select * from vw_clinic where clinic_id = ?',
          [providerKey.clinic_id],
        );
        if (clinic != null) {
          return {
            clinic,
            user: {
              login_id: providerKey.integrator_id,
              ...providerKey,
            },
          };
        }
      }
      return {
        error: 'Invalid api key',
      };
    } else if (Authorization != null) {
      const jwtToken = headers.Authorization.substring(7);
      const user = await verifyJWTToken(stageValue, jwtToken);
      return { user };
    }
  } catch (e: any) {
    return {
      error: e.message,
    };
  }
  return {
    error: 'User not found',
  };
};
