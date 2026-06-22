"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthenticatedUserDetails = exports.verifyRefreshToken = exports.createRefreshToken = exports.verifyJWTToken = exports.createJWTToken = exports.createConnection = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const promise_1 = __importDefault(require("mysql2/promise"));
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const utils_1 = require("./utils");
const pools = new Map();
const poolPromises = new Map();
const secrets = {};
const getElapsedMs = (startedAt) => Number(process.hrtime.bigint() - startedAt) / 1_000_000;
const logIfSlow = (operation, elapsedMs, sql) => {
    const slowQueryLogMs = (0, utils_1.getSlowQueryLogMs)();
    if (slowQueryLogMs == null || elapsedMs < slowQueryLogMs) {
        return;
    }
    const detail = sql == null ? '' : `: ${sql.replace(/\s+/g, ' ').trim()}`;
    console.warn(`[blupaws-db] Slow ${operation}: ${elapsedMs.toFixed(1)}ms${detail}`);
};
const getAWSSecret = async (SecretId) => {
    if (secrets[SecretId] != null) {
        console.log(`Reading cached secret for secret ID: ${SecretId}`);
        return secrets[SecretId];
    }
    const client = new client_secrets_manager_1.SecretsManagerClient({
        region: 'us-east-2',
    });
    const response = await client.send(new client_secrets_manager_1.GetSecretValueCommand({
        SecretId,
        VersionStage: 'AWSCURRENT',
    }));
    const json = JSON.parse(response.SecretString ?? '{}');
    secrets[SecretId] = json;
    return json;
};
const getDBDetails = async (stageKey) => {
    const json = await getAWSSecret(`${stageKey}/RDB/mysql`);
    return {
        ...json,
        ...(0, utils_1.getPoolConfig)(),
    };
};
const getJWTSecret = async (stageKey, key) => {
    const json = await getAWSSecret('private/keys');
    return json[`${key}_${stageKey.toUpperCase()}`];
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
const resolveSelectedFields = (tableName, selectedFieldNames) => {
    if (selectedFieldNames === undefined) {
        return undefined;
    }
    if (!Array.isArray(selectedFieldNames)) {
        throw new Error(`fields must be an array of strings for ${tableName}`);
    }
    const table = (0, utils_1.getTableDefinition)(tableName);
    return selectedFieldNames.map((fieldName, index) => {
        if (typeof fieldName !== 'string') {
            throw new Error(`fields[${index}] must be a string for ${tableName}`);
        }
        const normalizedFieldName = fieldName.trim();
        if (normalizedFieldName.length === 0) {
            throw new Error(`fields[${index}] must be a non-empty string for ${tableName}`);
        }
        const field = table.view[normalizedFieldName];
        if (field == null) {
            throw new Error(`Unknown view field ${normalizedFieldName} for ${tableName}`);
        }
        return normalizedFieldName;
    });
};
const resolveViewAssociation = (tableName, fieldName, field) => {
    const associationRef = field.association;
    if (associationRef == null) {
        return null;
    }
    const table = (0, utils_1.getTableDefinition)(tableName);
    const association = typeof associationRef === 'string'
        ? table.associations?.[associationRef]
        : associationRef;
    if (association == null) {
        throw new Error(`Unknown association ${associationRef} for ${tableName}.${fieldName}`);
    }
    return {
        association,
        targetSelectField: field.field ?? association.targetSelectField ?? fieldName,
    };
};
const getAssociationJoins = (tableName, fieldName, association) => {
    if (association.path != null) {
        if (!Array.isArray(association.path) || association.path.length === 0) {
            throw new Error(`Association path is empty for ${tableName}.${fieldName}`);
        }
        return association.path;
    }
    const { tableName: targetTableName, sourceField, targetField } = association;
    if (targetTableName == null || sourceField == null || targetField == null) {
        throw new Error(`Association join is incomplete for ${tableName}.${fieldName}`);
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
const createJoinResolutionState = (tableName) => ({
    joins: new Map(),
    aliasTableNames: new Map([[tableName, tableName]]),
    joinValues: [],
});
const getJoinStatement = (state) => state.joins.size === 0 ? '' : ` ${Array.from(state.joins.values()).join(' ')}`;
const ensureAssociationJoins = (tableName, fieldName, association, state) => {
    const associationJoins = getAssociationJoins(tableName, fieldName, association);
    let targetAlias = tableName;
    let targetTableName = tableName;
    for (const [index, associationJoin] of associationJoins.entries()) {
        const sourceAlias = associationJoin.sourceAlias ?? (index === 0 ? tableName : targetAlias);
        const sourceTableName = state.aliasTableNames.get(sourceAlias);
        if (sourceTableName == null) {
            throw new Error(`Unknown source alias ${sourceAlias} for ${tableName}.${fieldName}`);
        }
        const sourceTable = (0, utils_1.getTableDefinition)(sourceTableName);
        const targetTable = (0, utils_1.getTableDefinition)(associationJoin.tableName);
        if (sourceTable.model[associationJoin.sourceField] == null) {
            throw new Error(`Unknown source field ${associationJoin.sourceField} for ${tableName}.${fieldName}`);
        }
        if (targetTable.model[associationJoin.targetField] == null) {
            throw new Error(`Unknown target field ${associationJoin.targetField} for ${tableName}.${fieldName}`);
        }
        const joinType = associationJoin.joinType ?? 'LEFT';
        if (joinType !== 'LEFT' && joinType !== 'INNER') {
            throw new Error(`Unsupported join type ${joinType} for ${tableName}.${fieldName}`);
        }
        const alias = associationJoin.alias ??
            `${associationJoin.tableName}_${associationJoin.targetField}`;
        const targetFilterData = (0, utils_1.serializeClauseData)(targetTable.model, associationJoin.targetFilters ?? {});
        const targetFilterStatement = Object.keys(targetFilterData)
            .map((key) => `${alias}.${key} = ?`)
            .join(' AND ');
        const join = `${joinType} JOIN ${associationJoin.tableName} AS ${alias} ON ${sourceAlias}.${associationJoin.sourceField} = ${alias}.${associationJoin.targetField}${targetFilterStatement.length === 0 ? '' : ` AND ${targetFilterStatement}`}`;
        const existingJoin = state.joins.get(alias);
        if (existingJoin != null && existingJoin !== join) {
            throw new Error(`Conflicting join alias ${alias} for ${tableName}`);
        }
        if (existingJoin == null) {
            state.joins.set(alias, join);
            state.aliasTableNames.set(alias, associationJoin.tableName);
            Object.values(targetFilterData).forEach((value) => state.joinValues.push(value));
        }
        targetAlias = alias;
        targetTableName = associationJoin.tableName;
    }
    return { targetAlias, targetTableName };
};
const resolveViewFieldReference = (tableName, fieldName, state) => {
    const table = (0, utils_1.getTableDefinition)(tableName);
    const field = table.view[fieldName];
    if (field == null) {
        throw new Error(`Unknown view field ${fieldName} for ${tableName}`);
    }
    const associationData = resolveViewAssociation(tableName, fieldName, field);
    if (associationData == null) {
        if (table.model[fieldName] == null) {
            throw new Error(`Unknown base field ${fieldName} for ${tableName}`);
        }
        return {
            expression: `${tableName}.${fieldName}`,
            field,
        };
    }
    const { association, targetSelectField } = associationData;
    const { targetAlias, targetTableName } = ensureAssociationJoins(tableName, fieldName, association, state);
    const targetTable = (0, utils_1.getTableDefinition)(targetTableName);
    if (targetTable.model[targetSelectField] == null) {
        throw new Error(`Unknown target select field ${targetSelectField} for ${tableName}.${fieldName}`);
    }
    return {
        expression: `${targetAlias}.${targetSelectField}`,
        field,
    };
};
const getViewQueryParts = (tableName, selectedFieldNames, state = createJoinResolutionState(tableName)) => {
    const table = (0, utils_1.getTableDefinition)(tableName);
    const viewFields = Object.entries(table.view);
    const resolvedSelectedFieldNames = resolveSelectedFields(tableName, selectedFieldNames);
    const fields = resolvedSelectedFieldNames == null ||
        resolvedSelectedFieldNames.length === 0
        ? viewFields.filter(([, field]) => field.association == null)
        : resolvedSelectedFieldNames.map((fieldName) => {
            const field = table.view[fieldName];
            return [fieldName, field];
        });
    if (fields.length === 0) {
        throw new Error(`No view fields provided for ${tableName}`);
    }
    const selectStatements = [];
    for (const [fieldName, field] of fields) {
        if (field.association == null) {
            if (table.model[fieldName] == null) {
                throw new Error(`Unknown base field ${fieldName} for ${tableName}`);
            }
            selectStatements.push(`${tableName}.${fieldName} AS ${fieldName}`);
            continue;
        }
        const { expression } = resolveViewFieldReference(tableName, fieldName, state);
        selectStatements.push(`${expression} AS ${fieldName}`);
    }
    return {
        selectStatement: selectStatements.join(','),
        joinStatement: getJoinStatement(state),
        joinValues: state.joinValues,
    };
};
const getWhereData = (tableName, clauses) => {
    const table = (0, utils_1.getTableDefinition)(tableName);
    const whereData = (0, utils_1.serializeClauseData)(table.model, clauses);
    return whereData;
};
const getWhereStatement = (whereData, tableName) => Object.keys(whereData)
    .map((x) => `${tableName == null ? '' : `${tableName}.`}${x} = ?`)
    .join(' AND ');
const getFilterValueError = (tableName, filter, message) => new Error(`Invalid filter for ${tableName}.${filter.field}: ${message}`);
const getReadFilterData = (tableName, state, filters) => {
    if (filters == null) {
        return { statement: '', values: [] };
    }
    if (!Array.isArray(filters)) {
        throw new Error(`filters must be an array for ${tableName}`);
    }
    const statements = [];
    const values = [];
    for (const [index, filter] of filters.entries()) {
        if (filter == null || typeof filter !== 'object' || Array.isArray(filter)) {
            throw new Error(`filters[${index}] must be an object for ${tableName}`);
        }
        if (typeof filter.field !== 'string' || filter.field.trim().length === 0) {
            throw new Error(`filters[${index}].field must be a non-empty string for ${tableName}`);
        }
        const fieldName = filter.field.trim();
        const { expression } = resolveViewFieldReference(tableName, fieldName, state);
        const operator = filter.operator;
        switch (operator) {
            case '=':
            case '!=':
            case '>':
            case '>=':
            case '<':
            case '<=':
            case 'like': {
                if (filter.value === undefined) {
                    throw getFilterValueError(tableName, filter, 'value is required');
                }
                if (operator === 'like') {
                    statements.push(`LOWER(${expression}) LIKE LOWER(?)`);
                }
                else {
                    statements.push(`${expression} ${operator} ?`);
                }
                values.push(filter.value);
                break;
            }
            case 'in':
            case 'not_in': {
                if (!Array.isArray(filter.value) || filter.value.length === 0) {
                    throw getFilterValueError(tableName, filter, 'value must be a non-empty array');
                }
                const placeholders = filter.value.map(() => '?').join(', ');
                statements.push(`${expression} ${operator === 'in' ? 'IN' : 'NOT IN'} (${placeholders})`);
                values.push(...filter.value);
                break;
            }
            case 'is_null':
            case 'is_not_null': {
                if (filter.value !== undefined) {
                    throw getFilterValueError(tableName, filter, 'value must be omitted');
                }
                statements.push(`${expression} ${operator === 'is_null' ? 'IS NULL' : 'IS NOT NULL'}`);
                break;
            }
            default:
                throw new Error(`Unsupported filter operator ${String(operator)} for ${tableName}.${fieldName}`);
        }
    }
    return {
        statement: statements.join(' AND '),
        values,
    };
};
const getReadQueryData = (tableName, query) => {
    if (query == null) {
        return { statement: '', values: [] };
    }
    if (typeof query !== 'object' || Array.isArray(query)) {
        throw new Error(`query must be an object for ${tableName}`);
    }
    if (typeof query.sql !== 'string' || query.sql.trim().length === 0) {
        throw new Error(`query.sql must be a non-empty string for ${tableName}`);
    }
    if (query.values != null && !Array.isArray(query.values)) {
        throw new Error(`query.values must be an array for ${tableName}`);
    }
    return {
        statement: `(${query.sql.trim()})`,
        values: query.values ?? [],
    };
};
const buildReadWhereData = (tableName, options, state) => {
    const filterData = getReadFilterData(tableName, state, options.filters);
    const queryData = getReadQueryData(tableName, options.query);
    const statements = [filterData.statement, queryData.statement].filter((statement) => statement.length > 0);
    if (statements.length === 0) {
        throw new Error(`No where fields provided for ${tableName}`);
    }
    return {
        statement: statements.join(' AND '),
        values: [...filterData.values, ...queryData.values],
    };
};
const getReadOrderData = (tableName, options, state) => {
    if (options.orderBy == null) {
        return '';
    }
    if (typeof options.orderBy !== 'string' ||
        options.orderBy.trim().length === 0) {
        throw new Error(`orderBy must be a non-empty string for ${tableName}`);
    }
    const orderByValue = options.orderBy.trim();
    const orderByParts = orderByValue.split(/\s+/);
    let fieldName = orderByValue;
    let inlineDirection;
    if (orderByParts.length === 2) {
        const candidateDirection = orderByParts[1].toLowerCase();
        if (candidateDirection === 'asc' || candidateDirection === 'desc') {
            fieldName = orderByParts[0];
            inlineDirection = candidateDirection;
        }
    }
    else if (orderByParts.length > 2) {
        throw new Error(`Invalid orderBy value ${orderByValue} for ${tableName}`);
    }
    const table = (0, utils_1.getTableDefinition)(tableName);
    const viewField = table.view[fieldName];
    if (viewField == null) {
        throw new Error(`Unknown orderBy field ${fieldName} for ${tableName}`);
    }
    const { expression } = resolveViewFieldReference(tableName, fieldName, state);
    const direction = options.orderDirection?.toLowerCase() ?? inlineDirection ?? 'asc';
    if (direction !== 'asc' && direction !== 'desc') {
        throw new Error(`orderDirection must be "asc" or "desc" for ${tableName}`);
    }
    return ` ORDER BY ${expression} ${direction.toUpperCase()}`;
};
const normalizePaginationValue = (value, fallback, fieldName) => {
    if (value === undefined) {
        return fallback;
    }
    if (!Number.isInteger(value) || value < 0) {
        throw new Error(`${fieldName} must be a non-negative integer`);
    }
    return value;
};
const resolveGetRowsArgs = (optionsOrConn, conn) => {
    if (optionsOrConn != null &&
        typeof optionsOrConn.query === 'function') {
        return { options: {}, conn: optionsOrConn };
    }
    return { options: (optionsOrConn ?? {}), conn };
};
const updateRowTableForStage = async (stageKey, conn, tableName, row, clauses) => {
    const table = (0, utils_1.getTableDefinition)(tableName);
    const model = table.model;
    const data = (0, utils_1.serializeUpdateData)(model, row);
    const whereData = getWhereData(tableName, clauses);
    assertHasFields(data, 'update', tableName);
    const updateStatement = Object.keys(data)
        .map((x) => `${x} = ?`)
        .join(', ');
    const values = Object.values(data);
    const whereStatement = getWhereStatement(whereData);
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
    const whereData = getWhereData(tableName, clauses);
    const whereStatement = getWhereStatement(whereData);
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
const getRowsFromTableForStage = async (stageKey, conn, tableName, options = {}) => {
    (0, utils_1.getTableDefinition)(tableName);
    const joinState = createJoinResolutionState(tableName);
    const { selectStatement, joinValues } = getViewQueryParts(tableName, options.fields, joinState);
    const where = buildReadWhereData(tableName, options, joinState);
    const orderStatement = getReadOrderData(tableName, options, joinState);
    const joinStatement = getJoinStatement(joinState);
    const offset = normalizePaginationValue(options.offset, 0, 'offset');
    const limit = options.limit === undefined
        ? undefined
        : normalizePaginationValue(options.limit, 0, 'limit');
    if (offset > 0 && limit === undefined) {
        throw new Error('limit is required when offset is provided');
    }
    let sql = `SELECT ${selectStatement} FROM ${tableName}${joinStatement} WHERE ${where.statement}${orderStatement}`;
    const rowValues = [...joinValues, ...where.values];
    if (limit !== undefined) {
        sql = `${sql} LIMIT ? OFFSET ?`;
        rowValues.push(limit, offset);
    }
    const countSql = `SELECT COUNT(*) AS count FROM ${tableName}${joinStatement} WHERE ${where.statement}`;
    const run = async (activeConn) => {
        const countRows = await queryForStage(stageKey, countSql, [...joinValues, ...where.values], activeConn);
        const rows = await queryForStage(stageKey, sql, rowValues, activeConn);
        const count = Number(countRows[0]?.count ?? 0);
        const items = rows;
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
const getRowFromTableForStage = async (stageKey, conn, tableName, options = {}) => {
    (0, utils_1.getTableDefinition)(tableName);
    const joinState = createJoinResolutionState(tableName);
    const { selectStatement, joinValues } = getViewQueryParts(tableName, options.fields, joinState);
    const where = buildReadWhereData(tableName, options, joinState);
    const joinStatement = getJoinStatement(joinState);
    const values = [...joinValues, ...where.values];
    const sql = `SELECT ${selectStatement} FROM ${tableName}${joinStatement} WHERE ${where.statement} LIMIT 1`;
    const rows = await queryForStage(stageKey, sql, values, conn);
    return rows[0] ?? null;
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
        getRowFromTable: (tableName, options, conn) => getRowFromTableForStage(stageKey, conn, tableName, options),
        getRowsFromTable: (tableName, optionsOrConn, conn) => {
            const args = resolveGetRowsArgs(optionsOrConn, conn);
            return getRowsFromTableForStage(stageKey, args.conn, tableName, args.options);
        },
        updateRowTable: (tableName, row, clauses, conn) => updateRowTableForStage(stageKey, conn, tableName, row, clauses),
        deleteRowFromTable: (tableName, clauses, conn) => deleteRowFromTableForStage(stageKey, conn, tableName, clauses),
    };
};
exports.createConnection = createConnection;
const createJWTToken = async (stageValue, payload, expiresIn) => {
    const secret = await getJWTSecret(stageValue, 'JWT_SECRET');
    const token = jsonwebtoken_1.default.sign(payload, secret, {
        algorithm: 'HS256',
        expiresIn,
    });
    return token;
};
exports.createJWTToken = createJWTToken;
const verifyJWTToken = async (stageValue, token) => {
    const secret = await getJWTSecret(stageValue, 'JWT_SECRET');
    const decoded = jsonwebtoken_1.default.verify(token, secret, {
        algorithms: ['HS256'],
    });
    return decoded;
};
exports.verifyJWTToken = verifyJWTToken;
const createRefreshToken = async (stageValue, payload, expiresIn) => {
    const privateKey = await getJWTSecret(stageValue, 'JWT_PRIVATE_KEY');
    const refreshToken = jsonwebtoken_1.default.sign(payload, privateKey.replace(/\\n/g, '\n'), {
        algorithm: 'RS256',
        expiresIn: expiresIn,
    });
    return refreshToken;
};
exports.createRefreshToken = createRefreshToken;
const verifyRefreshToken = async (stageValue, token) => {
    const publicKey = await getJWTSecret(stageValue, 'JWT_PUBLIC_KEY');
    const decoded = jsonwebtoken_1.default.verify(token, publicKey.replace(/\\n/g, '\n'), {
        algorithms: ['RS256'],
    });
    return decoded;
};
exports.verifyRefreshToken = verifyRefreshToken;
const getAuthenticatedUserDetails = async (stageValue, headers) => {
    const { 'x-api-key': blupawsApiKey, Authorization } = headers;
    if (blupawsApiKey == null && Authorization == null) {
        return {
            error: 'Authentication headers are missing',
        };
    }
    try {
        if (blupawsApiKey != null) {
            const [providerKey] = await queryForStage(stageValue, 'select integrator_id, clinic_id, flavor from vw_provider_api_keys where api_key = ?', [blupawsApiKey]);
            if (providerKey?.clinic_id != null) {
                const [clinic] = await queryForStage(stageValue, 'select * from vw_clinic where clinic_id = ?', [providerKey.clinic_id]);
                if (clinic != null) {
                    return {
                        clinic: clinic,
                        integrator_id: providerKey.integrator_id,
                        flavor: providerKey.flavor,
                    };
                }
            }
            return {
                error: 'Invalid api key',
            };
        }
        else if (Authorization != null) {
            const jwtToken = headers.Authorization.substring(7);
            const user = await (0, exports.verifyJWTToken)(stageValue, jwtToken);
            return { user };
        }
    }
    catch (e) {
        return {
            error: e.message,
        };
    }
    return {
        error: 'User not found',
    };
};
exports.getAuthenticatedUserDetails = getAuthenticatedUserDetails;
//# sourceMappingURL=core.js.map