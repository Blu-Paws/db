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
  DataRow,
  Flavor,
  QueryResult,
  QueryValues,
  Stage,
} from './types';
import {
  getAcquireTimeoutMs,
  getPoolConfig,
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

const getSecretId = (stageKey: Stage): string => `${stageKey}/RDB/mysql`;

const getDBDetails = async (stageKey: Stage) => {
  const client = new SecretsManagerClient({
    region: process.env.AWS_REGION || 'us-east-2',
  });
  const response = await client.send(
    new GetSecretValueCommand({
      SecretId: getSecretId(stageKey),
      VersionStage: 'AWSCURRENT',
    }),
  );
  return {
    ...JSON.parse(response.SecretString ?? '{}'),
    ...getPoolConfig(),
  };
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
  const [rows] =
    values === undefined
      ? await executor.query(sql)
      : await executor.query(sql, values as any);
  return rows as QueryResult;
};

const acquireConnection = async (pool: Pool): Promise<PoolConnection> => {
  let timedOut = false;
  let timeout: NodeJS.Timeout | undefined;

  const connectionPromise = pool.getConnection();
  connectionPromise.then((conn) => {
    if (timedOut) {
      conn.release();
    }
  }, () => {});

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
  const whereData = serializeClauseData(model, clauses);
  assertHasFields(data, 'update', tableName);
  assertHasFields(whereData, 'where', tableName);

  const updateStatement = Object.keys(data)
    .map((x) => `${x} = ?`)
    .join(', ');
  const values = Object.values(data);
  const whereStatement = Object.keys(whereData)
    .map((x) => `${x} = ?`)
    .join(' AND ');
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
  await withTransactionForStage(stageKey, run);
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
  return withTransactionForStage(stageKey, run);
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
  const table = getTableDefinition(tableName);
  const whereData = serializeClauseData(table.model, clauses);
  assertHasFields(whereData, 'where', tableName);

  const whereStatement = Object.keys(whereData)
    .map((x) => `${x} = ?`)
    .join(' AND ');
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
  await withTransactionForStage(stageKey, run);
};

export const createConnection = (stageValue: Stage, flavorValue: Flavor) => {
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
