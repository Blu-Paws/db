"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRefreshToken = exports.verityJWTToken = exports.createJWTToken = exports.createConnection = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const promise_1 = __importDefault(require("mysql2/promise"));
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const utils_1 = require("./utils");
const pools = new Map();
const poolPromises = new Map();
const getElapsedMs = (startedAt) => Number(process.hrtime.bigint() - startedAt) / 1_000_000;
const logIfSlow = (operation, elapsedMs, sql) => {
    const slowQueryLogMs = (0, utils_1.getSlowQueryLogMs)();
    if (slowQueryLogMs == null || elapsedMs < slowQueryLogMs) {
        return;
    }
    const detail = sql == null ? '' : `: ${sql.replace(/\s+/g, ' ').trim()}`;
    console.warn(`[blupaws-db] Slow ${operation}: ${elapsedMs.toFixed(1)}ms${detail}`);
};
const getSecretId = (stageKey) => `${stageKey}/RDB/mysql`;
const getJWTSecretKey = async (stageKey) => {
    const client = new client_secrets_manager_1.SecretsManagerClient({
        region: process.env.AWS_REGION || 'us-east-2',
    });
    const response = await client.send(new client_secrets_manager_1.GetSecretValueCommand({
        SecretId: 'private/keys',
        VersionStage: 'AWSCURRENT',
    }));
    const json = JSON.parse(response.SecretString ?? '{}');
    return json[`JWT_SECRET_${stageKey.toUpperCase()}`];
};
const getDBDetails = async (stageKey) => {
    const client = new client_secrets_manager_1.SecretsManagerClient({
        region: process.env.AWS_REGION || 'us-east-2',
    });
    const response = await client.send(new client_secrets_manager_1.GetSecretValueCommand({
        SecretId: getSecretId(stageKey),
        VersionStage: 'AWSCURRENT',
    }));
    return {
        ...JSON.parse(response.SecretString ?? '{}'),
        ...(0, utils_1.getPoolConfig)(),
    };
};
const clearPool = async (stageKey) => {
    const pool = pools.get(stageKey);
    pools.delete(stageKey);
    poolPromises.delete(stageKey);
    if (pool != null) {
        await pool.end().catch(() => { });
    }
};
const attachListeners = (pool, stageKey) => {
    if (pool._blupawsListenersAttached) {
        return;
    }
    pool._blupawsListenersAttached = true;
    pool.on('error', (err) => {
        if ((0, utils_1.isFatalError)(err)) {
            clearPool(stageKey).catch(() => { });
        }
    });
    pool.on('connection', (conn) => {
        conn.on('error', (err) => {
            if ((0, utils_1.isFatalError)(err)) {
                conn.destroy();
            }
        });
    });
};
const runQuery = async (executor, sql, values) => {
    const startedAt = process.hrtime.bigint();
    try {
        const [rows] = values === undefined
            ? await executor.query(sql)
            : await executor.query(sql, values);
        return rows;
    }
    finally {
        logIfSlow('query', getElapsedMs(startedAt), sql);
    }
};
const acquireConnection = async (pool) => {
    const startedAt = process.hrtime.bigint();
    let timedOut = false;
    let timeout;
    const connectionPromise = pool.getConnection();
    connectionPromise.then((conn) => {
        if (timedOut) {
            conn.release();
        }
    }, () => { });
    const timeoutPromise = new Promise((_, reject) => {
        timeout = setTimeout(() => {
            timedOut = true;
            reject(new Error('Timed out waiting for a database connection from the pool'));
        }, (0, utils_1.getAcquireTimeoutMs)());
    });
    try {
        return await Promise.race([connectionPromise, timeoutPromise]);
    }
    finally {
        if (timeout != null) {
            clearTimeout(timeout);
        }
        logIfSlow('connection acquire', getElapsedMs(startedAt));
    }
};
const createPoolForStage = async (stageKey) => {
    const dbDetails = await getDBDetails(stageKey);
    const pool = promise_1.default.createPool(dbDetails);
    attachListeners(pool, stageKey);
    pools.set(stageKey, pool);
    return pool;
};
const getPoolForStage = async (stageKey) => {
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
const getConnection = async (stageKey) => {
    const pool = await getPoolForStage(stageKey);
    return acquireConnection(pool);
};
const withConnectionForStage = async (stageKey, callback) => {
    const conn = await getConnection(stageKey);
    let shouldRelease = true;
    try {
        return await callback(conn);
    }
    catch (error) {
        if ((0, utils_1.isFatalError)(error)) {
            shouldRelease = false;
            conn.destroy();
            await clearPool(stageKey);
        }
        throw error;
    }
    finally {
        if (shouldRelease) {
            conn.release();
        }
    }
};
const withTransactionForStage = async (stageKey, callback) => {
    return withConnectionForStage(stageKey, async (conn) => {
        await conn.beginTransaction();
        try {
            const result = await callback(conn);
            await conn.commit();
            return result;
        }
        catch (error) {
            await conn.rollback().catch(() => { });
            throw error;
        }
    });
};
const queryForStage = async (stageKey, sql, values, conn) => {
    if (conn != null) {
        return (await runQuery(conn, sql, values));
    }
    let connFromPool;
    try {
        connFromPool = await getConnection(stageKey);
        return (await runQuery(connFromPool, sql, values));
    }
    catch (e) {
        if ((0, utils_1.isFatalError)(e)) {
            connFromPool?.destroy();
            connFromPool = undefined;
            await clearPool(stageKey);
            connFromPool = await getConnection(stageKey);
            return (await runQuery(connFromPool, sql, values));
        }
        throw e;
    }
    finally {
        connFromPool?.release();
    }
};
const assertHasFields = (data, action, tableName) => {
    if (Object.keys(data).length === 0) {
        throw new Error(`No ${action} fields provided for ${tableName}`);
    }
};
const updateRowTableForStage = async (stageKey, conn, tableName, row, clauses) => {
    const table = (0, utils_1.getTableDefinition)(tableName);
    const model = table.model;
    const data = (0, utils_1.serializeUpdateData)(model, row);
    const whereData = (0, utils_1.serializeClauseData)(model, clauses);
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
    const run = async (activeConn) => {
        await (0, utils_1.validateTableOperation)(tableName, 'update', activeConn, data);
        await queryForStage(stageKey, sql, values, activeConn);
    };
    if (conn != null) {
        await run(conn);
        return;
    }
    await withConnectionForStage(stageKey, run);
};
const insertRowIntoTableForStage = async (stageKey, conn, tableName, row) => {
    const table = (0, utils_1.getTableDefinition)(tableName);
    const model = table.model;
    const data = (0, utils_1.serializeCreateData)(model, row);
    assertHasFields(data, 'insert', tableName);
    const fields = Object.keys(data);
    const values = fields.map((f) => data[f]);
    const sql = `INSERT INTO ${tableName} (${fields.join(',')}) VALUES (${fields
        .map(() => '?')
        .join(',')})`;
    const run = async (activeConn) => {
        await (0, utils_1.validateTableOperation)(tableName, 'insert', activeConn, data);
        const { insertId } = await queryForStage(stageKey, sql, values, activeConn);
        return insertId;
    };
    if (conn != null) {
        return run(conn);
    }
    return withConnectionForStage(stageKey, run);
};
const insertRowsIntoTableForStage = async (stageKey, conn, tableName, rows) => {
    if (!Array.isArray(rows) || rows.length === 0) {
        return;
    }
    const table = (0, utils_1.getTableDefinition)(tableName);
    const model = table.model;
    const datas = rows.map((row) => (0, utils_1.serializeCreateData)(model, row));
    datas.forEach((data) => assertHasFields(data, 'insert', tableName));
    const fields = Object.keys(datas[0]);
    const values = datas.map((row) => fields.map((field) => row[field]));
    const sql = `INSERT INTO ${tableName} (${fields.join(',')}) VALUES ?`;
    const run = async (activeConn) => {
        for (const row of datas) {
            await (0, utils_1.validateTableOperation)(tableName, 'insert', activeConn, row);
        }
        await queryForStage(stageKey, sql, [values], activeConn);
    };
    if (conn != null) {
        await run(conn);
        return;
    }
    await withTransactionForStage(stageKey, run);
};
const deleteRowFromTableForStage = async (stageKey, conn, tableName, clauses) => {
    const table = (0, utils_1.getTableDefinition)(tableName);
    const whereData = (0, utils_1.serializeClauseData)(table.model, clauses);
    assertHasFields(whereData, 'where', tableName);
    const whereStatement = Object.keys(whereData)
        .map((x) => `${x} = ?`)
        .join(' AND ');
    const values = Object.values(whereData);
    const sql = `DELETE FROM ${tableName} WHERE ${whereStatement}`;
    const run = async (activeConn) => {
        await (0, utils_1.validateTableOperation)(tableName, 'delete', activeConn, whereData);
        await queryForStage(stageKey, sql, values, activeConn);
    };
    if (conn != null) {
        await run(conn);
        return;
    }
    await withConnectionForStage(stageKey, run);
};
const createConnection = (stageValue, flavorValue) => {
    if (stageValue == null || `${stageValue}`.trim().length === 0) {
        throw new Error('Stage is required');
    }
    if (flavorValue == null || `${flavorValue}`.trim().length === 0) {
        throw new Error('Flavor is required');
    }
    const stageKey = (0, utils_1.normalizeStage)(stageValue);
    (0, utils_1.normalizeFlavor)(flavorValue);
    return {
        query: (sql, values, conn) => queryForStage(stageKey, sql, values, conn),
        withTransaction: (callback) => withTransactionForStage(stageKey, callback),
        insertRowIntoTable: (tableName, row, conn) => insertRowIntoTableForStage(stageKey, conn, tableName, row),
        insertRowsIntoTable: (tableName, rows, conn) => insertRowsIntoTableForStage(stageKey, conn, tableName, rows),
        updateRowTable: (tableName, row, clauses, conn) => updateRowTableForStage(stageKey, conn, tableName, row, clauses),
        deleteRowFromTable: (tableName, clauses, conn) => deleteRowFromTableForStage(stageKey, conn, tableName, clauses),
    };
};
exports.createConnection = createConnection;
const createJWTToken = async (stageValue, payload, expiresIn) => {
    const secret = await getJWTSecretKey(stageValue);
    const token = jsonwebtoken_1.default.sign(payload, secret, { expiresIn });
    return token;
};
exports.createJWTToken = createJWTToken;
const verityJWTToken = async (stageValue, token) => {
    const jwtSecret = await getJWTSecretKey(stageValue);
    const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
    return decoded;
};
exports.verityJWTToken = verityJWTToken;
const createRefreshToken = async (stageValue, loginId, expiresIn) => {
    const jwtSecret = await getJWTSecretKey(stageValue);
    const refreshToken = jsonwebtoken_1.default.sign({ loginId }, jwtSecret, {
        algorithm: 'RS256',
        expiresIn: expiresIn,
    });
    return refreshToken;
};
exports.createRefreshToken = createRefreshToken;
//# sourceMappingURL=core.js.map