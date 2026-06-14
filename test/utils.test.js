const assert = require('node:assert/strict');
const test = require('node:test');

const utils = require('../dist/utils.js');
const tables = require('../dist/tables.js');

const clearEnv = () => {
  delete process.env.BLUPAWS_DB_CONNECTION_LIMIT;
  delete process.env.BLUPAWS_DB_MAX_IDLE;
  delete process.env.BLUPAWS_DB_QUEUE_LIMIT;
  delete process.env.BLUPAWS_DB_IDLE_TIMEOUT_MS;
  delete process.env.BLUPAWS_DB_CONNECT_TIMEOUT_MS;
  delete process.env.BLUPAWS_DB_ACQUIRE_TIMEOUT_MS;
  delete process.env.BLUPAWS_DB_LOG_SLOW_QUERY_MS;
};

test.beforeEach(() => {
  clearEnv();
});

test.afterEach(() => {
  clearEnv();
  delete tables.tableDefinitions.__test_utils;
});

test('normalize helpers trim and lowercase input', () => {
  assert.equal(utils.normalizeStage(' Dev '), 'dev');
  assert.equal(utils.normalizeFlavor(' Clinic '), 'clinic');
});

test('pool config uses defaults and caps max idle to connection limit', () => {
  process.env.BLUPAWS_DB_CONNECTION_LIMIT = '3';
  process.env.BLUPAWS_DB_MAX_IDLE = '9';
  process.env.BLUPAWS_DB_QUEUE_LIMIT = '7';
  process.env.BLUPAWS_DB_IDLE_TIMEOUT_MS = '45000';
  process.env.BLUPAWS_DB_CONNECT_TIMEOUT_MS = '12000';

  const config = utils.getPoolConfig();

  assert.equal(config.connectionLimit, 3);
  assert.equal(config.maxIdle, 3);
  assert.equal(config.queueLimit, 7);
  assert.equal(config.idleTimeout, 45000);
  assert.equal(config.connectTimeout, 12000);
  assert.equal(config.waitForConnections, true);
  assert.equal(config.enableKeepAlive, true);
});

test('acquire timeout and slow query log parsing reject invalid values', () => {
  process.env.BLUPAWS_DB_ACQUIRE_TIMEOUT_MS = '1234';
  process.env.BLUPAWS_DB_LOG_SLOW_QUERY_MS = '2000';
  assert.equal(utils.getAcquireTimeoutMs(), 1234);
  assert.equal(utils.getSlowQueryLogMs(), 2000);

  process.env.BLUPAWS_DB_ACQUIRE_TIMEOUT_MS = '-1';
  process.env.BLUPAWS_DB_LOG_SLOW_QUERY_MS = 'abc';
  assert.equal(utils.getAcquireTimeoutMs(), 8000);
  assert.equal(utils.getSlowQueryLogMs(), null);
});

test('fatal mysql error detection matches connection-kill cases', () => {
  assert.equal(utils.isFatalError({ fatal: true }), true);
  assert.equal(utils.isFatalError({ code: 'ECONNRESET' }), true);
  assert.equal(utils.isFatalError({ message: 'closed connection by peer' }), true);
  assert.ok(!utils.isFatalError({ code: 'ER_PARSE_ERROR' }));
});

test('table lookup helpers resolve known tables and reject unknown ones', () => {
  const pets = utils.getTableDefinition('pets');

  assert.equal(pets.tableName, 'pets');
  assert.equal(utils.getDataModel('login').phone.type, 'string');
  assert.throws(
    () => utils.getTableDefinition('missing_table'),
    /Unknown table missing_table/,
  );
});

test('serializeCreateData enforces required fields and trims strings', () => {
  const model = {
    name: { type: 'string', createable: true, required: true },
    age: { type: 'number', createable: true, required: false },
    ignored: { type: 'string', createable: false, required: false },
  };

  assert.deepEqual(
    utils.serializeCreateData(model, { name: '  Milo  ', age: 4 }),
    { name: 'Milo', age: 4 },
  );
  assert.throws(
    () => utils.serializeCreateData(model, { age: 4 }),
    /Missing attribute name/,
  );
  assert.throws(
    () => utils.serializeCreateData(model, { name: 'Milo', ignored: 'x' }),
    /Unsupported attribute ignored/,
  );
});

test('serializeUpdateData supports nullable optional fields and rejects bad types', () => {
  const model = {
    nickname: { type: 'string', updateable: true, required: false },
    status: { type: 'number', updateable: true, required: true },
    created_by: { type: 'number', updateable: false, required: false },
  };

  assert.deepEqual(
    utils.serializeUpdateData(model, { nickname: null, status: 1 }),
    { nickname: null, status: 1 },
  );
  assert.deepEqual(
    utils.serializeUpdateData(model, { nickname: '  Buddy  ' }),
    { nickname: 'Buddy' },
  );
  assert.throws(
    () => utils.serializeUpdateData(model, { created_by: 2 }),
    /Unsupported attribute created_by/,
  );
  assert.throws(
    () => utils.serializeUpdateData(model, { status: 'open' }),
    /Type of status must be number/,
  );
});

test('serializeClauseData validates supplied keys and data row shape', () => {
  const model = {
    login_id: { type: 'number', required: false },
    phone: { type: 'string', required: false },
  };

  assert.deepEqual(
    utils.serializeClauseData(model, { login_id: 12, phone: ' 555 ' }),
    { login_id: 12, phone: '555' },
  );
  assert.throws(
    () => utils.serializeClauseData(model, { missing: 1 }),
    /Unsupported attribute missing/,
  );
  assert.throws(
    () => utils.serializeClauseData(model, []),
    /Row must be an object/,
  );
});

test('validateTableOperation dispatches to the matching validator', async () => {
  const calls = [];
  tables.tableDefinitions.__test_utils = {
    tableName: '__test_utils',
    model: {},
    view: {},
    validateInsert: async (_conn, row) => {
      calls.push(['insert', row]);
    },
    validateUpdate: async (_conn, row) => {
      calls.push(['update', row]);
    },
    validateDelete: async (_conn, row) => {
      calls.push(['delete', row]);
      return false;
    },
  };

  await utils.validateTableOperation('__test_utils', 'insert', null, { id: 1 });
  await utils.validateTableOperation('__test_utils', 'update', null, { id: 2 });
  await assert.rejects(
    () => utils.validateTableOperation('__test_utils', 'delete', null, { id: 3 }),
    /delete validation failed for __test_utils/,
  );

  assert.deepEqual(calls, [
    ['insert', { id: 1 }],
    ['update', { id: 2 }],
    ['delete', { id: 3 }],
  ]);
});
