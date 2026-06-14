const assert = require('node:assert/strict');
const { generateKeyPairSync } = require('node:crypto');
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

const createAuthStub = ({
  queryResults = [],
  secrets = {},
} = {}) => {
  const calls = {
    queries: [],
    secretIds: [],
  };

  const mysqlMock = {
    createPool: () => ({
      on() {
        return this;
      },
      async end() {},
      async getConnection() {
        return {
          on() {
            return this;
          },
          release() {},
          destroy() {},
          async beginTransaction() {},
          async commit() {},
          async rollback() {},
          async query(sql, values) {
            calls.queries.push({ sql, values });
            const result = queryResults.shift() ?? [];
            return [result];
          },
        };
      },
    }),
  };

  class GetSecretValueCommand {
    constructor(input) {
      this.input = input;
      calls.secretIds.push(input.SecretId);
    }
  }

  class SecretsManagerClient {
    async send(command) {
      if (command.input.SecretId === 'private/keys') {
        return {
          SecretString: JSON.stringify(secrets.privateKeys ?? {}),
        };
      }
      return {
        SecretString: JSON.stringify(
          secrets.db ?? {
            host: 'localhost',
            user: 'tester',
            database: 'blupaws',
          },
        ),
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

test.afterEach(() => {
  clearDistCache();
});

test('jwt helpers create and verify HS256 access tokens', async () => {
  const { api, calls } = createAuthStub({
    secrets: {
      privateKeys: {
        JWT_SECRET_DEV: 'test-access-secret',
      },
    },
  });

  const token = await api.createJWTToken('dev', { login_id: 42, role: 'admin' }, '1h');
  const decoded = await api.verifyJWTToken('dev', token);

  assert.equal(decoded.login_id, 42);
  assert.equal(decoded.role, 'admin');
  assert.ok(calls.secretIds.includes('private/keys'));
});

test('refresh token helpers create and verify RS256 tokens', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  const { api } = createAuthStub({
    secrets: {
      privateKeys: {
        JWT_PRIVATE_KEY_DEV: privateKey.export({ type: 'pkcs1', format: 'pem' }).replace(/\n/g, '\\n'),
        JWT_PUBLIC_KEY_DEV: publicKey.export({ type: 'pkcs1', format: 'pem' }).replace(/\n/g, '\\n'),
      },
    },
  });

  const token = await api.createRefreshToken('dev', { login_id: 77 }, '1h');
  const decoded = await api.verifyRefreshToken('dev', token);

  assert.equal(decoded.login_id, 77);
});

test('getAuthenticatedUserDetails requires both api key and authorization header', async () => {
  const { api } = createAuthStub();

  const result = await api.getAuthenticatedUserDetails('dev', {
    Authorization: 'Bearer token-only',
  });

  assert.deepEqual(result, {
    error: 'Authentication headers are missing',
  });
});

test('getAuthenticatedUserDetails resolves clinic user from provider api key flow', async () => {
  const { api, calls } = createAuthStub({
    queryResults: [
      [{ integrator_id: 9, clinic_id: 12, flavor: 'clinic' }],
      [{ clinic_id: 12, clinic_name: 'Blu Paws Vet' }],
    ],
  });

  const result = await api.getAuthenticatedUserDetails('dev', {
    'x-api-key': 'provider-key',
    Authorization: 'Bearer ignored-in-current-logic',
  });

  assert.deepEqual(result, {
    clinic: { clinic_id: 12, clinic_name: 'Blu Paws Vet' },
    user: {
      login_id: 9,
      integrator_id: 9,
      clinic_id: 12,
      flavor: 'clinic',
    },
  });
  assert.match(calls.queries[0].sql, /vw_provider_api_keys/);
  assert.match(calls.queries[1].sql, /vw_clinic/);
});

test('getAuthenticatedUserDetails returns invalid api key when clinic mapping is missing', async () => {
  const { api } = createAuthStub({
    queryResults: [[]],
  });

  const result = await api.getAuthenticatedUserDetails('dev', {
    'x-api-key': 'bad-key',
    Authorization: 'Bearer ignored-in-current-logic',
  });

  assert.deepEqual(result, {
    error: 'Invalid api key',
  });
});
