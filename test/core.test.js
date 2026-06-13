const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
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

test('view models omit write and constraint metadata', () => {
  const bannedKeys = [
    'primary',
    'autoincrement',
    'required',
    'updateable',
    'createable',
  ];
  const dataModelsRoot = path.resolve(__dirname, '..', 'dist', 'data-models');

  for (const entry of fs.readdirSync(dataModelsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const viewPath = path.join(dataModelsRoot, entry.name, 'view.json');
    if (!fs.existsSync(viewPath)) {
      continue;
    }
    const view = JSON.parse(fs.readFileSync(viewPath, 'utf8'));
    for (const [fieldName, metadata] of Object.entries(view)) {
      for (const key of bannedKeys) {
        assert.equal(
          Object.prototype.hasOwnProperty.call(metadata, key),
          false,
          `${entry.name}.${fieldName} should not include ${key}`,
        );
      }
    }
  }
});

test('data models do not define view associations', () => {
  const dataModelsRoot = path.resolve(__dirname, '..', 'dist', 'data-models');

  for (const entry of fs.readdirSync(dataModelsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const modelPath = path.join(dataModelsRoot, entry.name, 'model.json');
    if (!fs.existsSync(modelPath)) {
      continue;
    }
    const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
    for (const [fieldName, metadata] of Object.entries(model)) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(metadata, 'association'),
        false,
        `${entry.name}.${fieldName} should not include association`,
      );
    }
  }
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
    status: 1,
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

test('read helpers select table view fields with validated clauses', async () => {
  const loginSelect =
    'login.login_id AS login_id,login.email AS email,login.name AS name,login.password AS password,login.create_date AS create_date,login.status AS status,login.phone AS phone,login.force_change_password AS force_change_password,login.login_status_id AS login_status_id,login.created_by AS created_by,login.module_id AS module_id,login.country_code AS country_code';
  const { api, calls } = createConnectionStub({
    queryResults: [
      [{ login_id: 123, phone: '5551234' }],
      [{ count: 2 }],
      [
        { login_id: 123, phone: '5551234' },
        { login_id: 456, phone: '5555678' },
      ],
    ],
  });
  const db = api.createConnection('dev', 'clinic');

  const row = await db.getRowFromTable('login', { phone: '5551234' });
  const rows = await db.getRowsFromTable(
    'login',
    { login_status_id: 1 },
    { offset: 10, limit: 25 },
  );

  assert.deepEqual(row, { login_id: 123, phone: '5551234' });
  assert.deepEqual(rows, {
    offset: 10,
    limit: 25,
    items: [
      { login_id: 123, phone: '5551234' },
      { login_id: 456, phone: '5555678' },
    ],
    count: 2,
  });
  assert.equal(calls.connections.length, 2);
  assert.equal(
    calls.connections[0].queries[0].sql,
    `SELECT ${loginSelect} FROM login WHERE login.phone = ? LIMIT 1`,
  );
  assert.equal(calls.connections[0].queries[0].sql.includes('JOIN'), false);
  assert.deepEqual(calls.connections[0].queries[0].values, ['5551234']);
  assert.equal(
    calls.connections[1].queries[0].sql,
    'SELECT COUNT(*) AS count FROM login WHERE login.login_status_id = ?',
  );
  assert.deepEqual(calls.connections[1].queries[0].values, [1]);
  assert.equal(
    calls.connections[1].queries[1].sql,
    `SELECT ${loginSelect} FROM login WHERE login.login_status_id = ? LIMIT ? OFFSET ?`,
  );
  assert.equal(calls.connections[1].queries[1].sql.includes('JOIN'), false);
  assert.deepEqual(calls.connections[1].queries[1].values, [1, 25, 10]);
});

test('pet reads build the vw_pets join graph and apply default view filters', async () => {
  const { api, calls } = createConnectionStub({
    queryResults: [
      [{ pet_id: 123, pet_status: 16, status_name: 'Active' }],
    ],
  });
  const db = api.createConnection('dev', 'clinic');

  const row = await db.getRowFromTable('pets', { pet_id: 123 });

  assert.deepEqual(row, {
    pet_id: 123,
    pet_status: 16,
    status_name: 'Active',
  });
  assert.equal(calls.connections.length, 1);
  const sql = calls.connections[0].queries[0].sql;
  assert.match(
    sql,
    /mstr_status_ref\.status_name AS status_name/,
  );
  assert.match(
    sql,
    /LEFT JOIN pet_vitals AS pet_vitals_current ON pets\.pet_id = pet_vitals_current\.pet_id AND pet_vitals_current\.status = \?/,
  );
  assert.match(
    sql,
    /INNER JOIN mstr_status AS mstr_status_ref ON pets\.pet_status = mstr_status_ref\.status_id AND mstr_status_ref\.module_id = \?/,
  );
  assert.match(
    sql,
    /INNER JOIN login AS pet_owner_login ON pets\.login_id = pet_owner_login\.login_id/,
  );
  assert.match(
    sql,
    /LEFT JOIN mstr_coat AS mstr_coat_ref ON pet_vitals_current\.coat_id = mstr_coat_ref\.coat_id/,
  );
  assert.match(
    sql,
    /LEFT JOIN images AS pet_owner_image ON pets\.login_id = pet_owner_image\.key_value AND pet_owner_image\.status = \? AND pet_owner_image\.module_id = \?/,
  );
  assert.match(
    sql,
    /LEFT JOIN images AS pet_image ON pets\.pet_id = pet_image\.key_value AND pet_image\.status = \? AND pet_image\.module_id = \?/,
  );
  assert.equal(sql.includes('pet_owner_login.password'), false);
  assert.equal(
    sql.endsWith(
      'WHERE pets.status = ? AND pets.pet_status = ? AND pets.pet_id = ? LIMIT 1',
    ),
    true,
  );
  assert.deepEqual(
    calls.connections[0].queries[0].values,
    [1, 6, 1, 3, 1, 6, 1, 16, 123],
  );
});

test('getRowsFromTable supports transaction connection as the third argument', async () => {
  const loginSelect =
    'login.login_id AS login_id,login.email AS email,login.name AS name,login.password AS password,login.create_date AS create_date,login.status AS status,login.phone AS phone,login.force_change_password AS force_change_password,login.login_status_id AS login_status_id,login.created_by AS created_by,login.module_id AS module_id,login.country_code AS country_code';
  const { api, calls } = createConnectionStub({
    queryResults: [
      [{ count: 1 }],
      [{ login_id: 123, phone: '5551234' }],
    ],
  });
  const db = api.createConnection('dev', 'clinic');

  await db.withTransaction(async (conn) => {
    const rows = await db.getRowsFromTable(
      'login',
      { login_status_id: 1 },
      conn,
    );

    assert.deepEqual(rows, {
      offset: 0,
      limit: 1,
      items: [{ login_id: 123, phone: '5551234' }],
      count: 1,
    });
  });

  assert.equal(calls.connections.length, 1);
  assert.equal(calls.connections[0].queries.length, 2);
  assert.equal(
    calls.connections[0].queries[0].sql,
    'SELECT COUNT(*) AS count FROM login WHERE login.login_status_id = ?',
  );
  assert.equal(
    calls.connections[0].queries[1].sql,
    `SELECT ${loginSelect} FROM login WHERE login.login_status_id = ?`,
  );
});

test('getRowFromTable returns null when no row matches', async () => {
  const { api } = createConnectionStub({
    queryResults: [[]],
  });
  const db = api.createConnection('dev', 'clinic');

  const row = await db.getRowFromTable('login', { phone: '5551234' });

  assert.equal(row, null);
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
