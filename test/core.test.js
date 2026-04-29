const assert = require('node:assert/strict');
const Module = require('node:module');
const test = require('node:test');

const distModules = [
  '../dist/index.js',
  '../dist/core.js',
  '../dist/utils.js',
  '../dist/tables.js',
];

const clearDistCache = () => {
  for (const modulePath of distModules) {
    delete require.cache[require.resolve(modulePath)];
  }
};

const createConnectionStub = ({
  queryResults = [[{ ok: true }]],
  failFirstQuery = false,
} = {}) => {
  const calls = {
    configs: [],
    pools: [],
    connections: [],
    secretCommands: [],
  };
  let queryCount = 0;

  const createConn = () => {
    const conn = {
      beginTransactionCalls: 0,
      commitCalls: 0,
      rollbackCalls: 0,
      releaseCalls: 0,
      destroyCalls: 0,
      queries: [],
      on: () => conn,
      beginTransaction: async () => {
        conn.beginTransactionCalls += 1;
      },
      commit: async () => {
        conn.commitCalls += 1;
      },
      rollback: async () => {
        conn.rollbackCalls += 1;
      },
      release: () => {
        conn.releaseCalls += 1;
      },
      destroy: () => {
        conn.destroyCalls += 1;
      },
      query: async (sql, values) => {
        conn.queries.push({ sql, values });
        queryCount += 1;
        if (failFirstQuery && queryCount === 1) {
          const error = new Error('closed connection');
          error.code = 'PROTOCOL_CONNECTION_LOST';
          error.fatal = true;
          throw error;
        }
        const result = queryResults.shift() ?? [{ ok: true }];
        return [result];
      },
    };
    calls.connections.push(conn);
    return conn;
  };

  const mysqlMock = {
    createPool: (config) => {
      calls.configs.push(config);
      const pool = {
        endCalls: 0,
        getConnectionCalls: 0,
        listeners: {},
        on: (event, listener) => {
          pool.listeners[event] = listener;
          return pool;
        },
        end: async () => {
          pool.endCalls += 1;
        },
        getConnection: async () => {
          pool.getConnectionCalls += 1;
          return createConn();
        },
      };
      calls.pools.push(pool);
      return pool;
    },
  };

  class GetSecretValueCommand {
    constructor(input) {
      this.input = input;
      calls.secretCommands.push(input);
    }
  }

  class SecretsManagerClient {
    async send() {
      return {
        SecretString: JSON.stringify({
          host: 'localhost',
          user: 'tester',
          database: 'blupaws',
        }),
      };
    }
  }

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'mysql2/promise') {
      return mysqlMock;
    }
    if (request === '@aws-sdk/client-secrets-manager') {
      return { GetSecretValueCommand, SecretsManagerClient };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  clearDistCache();
  const api = require('../dist');
  Module._load = originalLoad;

  return { api, calls };
};

const clearPoolEnv = () => {
  delete process.env.BLUPAWS_DB_CONNECTION_LIMIT;
  delete process.env.BLUPAWS_DB_MAX_IDLE;
  delete process.env.BLUPAWS_DB_QUEUE_LIMIT;
  delete process.env.BLUPAWS_DB_LOG_SLOW_QUERY_MS;
};

test.beforeEach(() => {
  clearPoolEnv();
});

test.afterEach(() => {
  clearPoolEnv();
  clearDistCache();
});

test('query acquires and releases a pooled connection', async () => {
  const { api, calls } = createConnectionStub();
  const db = api.createConnection('dev', 'clinic');

  const rows = await db.query('select 1');

  assert.deepEqual(rows, [{ ok: true }]);
  assert.equal(calls.pools.length, 1);
  assert.equal(calls.pools[0].getConnectionCalls, 1);
  assert.equal(calls.connections[0].releaseCalls, 1);
  assert.equal(calls.configs[0].connectionLimit, 10);
  assert.equal(calls.configs[0].maxIdle, 5);
  assert.equal(calls.configs[0].queueLimit, 0);
});

test('query retries once after a fatal connection error', async () => {
  const { api, calls } = createConnectionStub({
    failFirstQuery: true,
    queryResults: [[{ retry: true }]],
  });
  const db = api.createConnection('dev', 'clinic');

  const rows = await db.query('select 1');

  assert.deepEqual(rows, [{ retry: true }]);
  assert.equal(calls.pools.length, 2);
  assert.equal(calls.pools[0].endCalls, 1);
  assert.equal(calls.connections[0].destroyCalls, 1);
  assert.equal(calls.connections[0].releaseCalls, 0);
  assert.equal(calls.connections[1].releaseCalls, 1);
});

test('single-row write helpers use autocommit without implicit transactions', async () => {
  const { api, calls } = createConnectionStub({
    queryResults: [{ insertId: 123 }, { affectedRows: 1 }, { affectedRows: 1 }],
  });
  const db = api.createConnection('dev', 'clinic');

  const insertId = await db.insertRowIntoTable('login', {
    name: 'Test User',
    create_date: new Date('2026-01-01T00:00:00Z'),
    status: true,
    phone: '5551234',
    login_status_id: 1,
    created_by: 1,
    module_id: 2,
    country_code: '+1',
  });

  assert.equal(insertId, 123);
  await db.updateRowTable(
    'login',
    { name: 'Renamed User' },
    { phone: '5551234' },
  );
  await db.deleteRowFromTable('login', { phone: '5551234' });

  assert.equal(calls.connections.length, 3);
  for (const conn of calls.connections) {
    assert.equal(conn.beginTransactionCalls, 0);
    assert.equal(conn.commitCalls, 0);
    assert.equal(conn.rollbackCalls, 0);
    assert.equal(conn.releaseCalls, 1);
  }
  assert.match(calls.connections[0].queries[0].sql, /^INSERT INTO login /);
  assert.equal(
    calls.connections[1].queries[0].sql,
    'UPDATE login SET name = ? WHERE phone = ?',
  );
  assert.equal(
    calls.connections[2].queries[0].sql,
    'DELETE FROM login WHERE phone = ?',
  );
});

test('helpers inside withTransaction use the provided transaction connection', async () => {
  const { api, calls } = createConnectionStub();
  const db = api.createConnection('dev', 'clinic');

  await db.withTransaction(async (conn) => {
    await db.updateRowTable(
      'login',
      { name: 'Updated User' },
      { phone: '5551234' },
      conn,
    );
  });

  assert.equal(calls.pools[0].getConnectionCalls, 1);
  const conn = calls.connections[0];
  assert.equal(conn.beginTransactionCalls, 1);
  assert.equal(conn.commitCalls, 1);
  assert.equal(conn.rollbackCalls, 0);
  assert.equal(conn.releaseCalls, 1);
  assert.equal(conn.queries.length, 1);
  assert.equal(
    conn.queries[0].sql,
    'UPDATE login SET name = ? WHERE phone = ?',
  );
});
