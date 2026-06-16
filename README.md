# @blupaws/connection

Shared MySQL connection, pooling, transaction, and table-validation helpers for
BluPaws Lambda handlers.

## Usage

Create one connection context at the beginning of each Lambda invocation. Both
`stage` and `flavor` are required.

```js
const { createConnection } = require('@blupaws/connection');

exports.handler = async (event) => {
  const db = createConnection(
    event.requestContext.stage,
    event.headers?.['x-blupaws-flavor'],
  );

  return db.query('select 1');
};
```

The database secret is resolved from:

```txt
${stage}/RDB/mysql
```

There is no fallback stage. If the stage is missing, flavor is missing, or the
stage secret does not exist, the package throws.

## Context API

`createConnection(stage, flavor)` returns a small `db` object:

- `db.query(sql, values?, conn?)`
- `db.withTransaction(callback)`
- `db.insertRowIntoTable(tableName, row, conn?)`
- `db.insertRowsIntoTable(tableName, rows, conn?)`
- `db.getRowFromTable(tableName, options?, conn?)`
- `db.getRowsFromTable(tableName, options?, conn?)`
- `db.updateRowTable(tableName, row, clauses, conn?)`
- `db.deleteRowFromTable(tableName, clauses, conn?)`

`stage` and `flavor` are kept internal and are not exposed on the returned
object.

## Queries

Use `db.query(...)` for normal reads and simple statements.

```js
const pets = await db.query(
  'select * from pets where login_id = ?',
  [loginId],
);
```

Use the table read helpers when the query should select the fields from the
table's `view.json` and validate `WHERE` clauses against its model.

```js
const pet = await db.getRowFromTable('pets', {
  clauses: { status: 1, pet_status: 16, pet_id: petId },
  fields: ['pet_id', 'pet_name', 'status_name'],
});
const pets = await db.getRowsFromTable('pets', {
  clauses: { status: 1, pet_status: 16, login_id: loginId },
  filters: [
    { field: 'pet_name', operator: 'like', value: '%milo%' }
  ],
  offset: 0,
  limit: 25,
});
```

`getRowFromTable(...)` adds `LIMIT 1` and returns `null` when no row matches.
Both read helpers validate `clauses` against `model.json`. When `fields` is not
provided or is an empty array, the query selects only direct base-table fields
from `view.json` and does not add association joins. When `fields` is provided,
each field must be a string that matches a key from `view.json`; association
joins are added only for the selected associated fields.
Structured `filters` are optional and currently apply only to base-table
columns. Supported operators are `=`, `!=`, `>`, `>=`, `<`, `<=`, `like`,
`in`, `not_in`, `is_null`, and `is_not_null`. `like` is case-insensitive and
is built as `LOWER(column) LIKE LOWER(?)`.
`getRowsFromTable(...)` returns paged metadata and rows in `items`:

```js
{
  offset: 0,
  limit: 25,
  items: [],
  count: 0,
}
```

## Writes

Table write helpers automatically run in a transaction when no connection is
passed.

```js
const petId = await db.insertRowIntoTable('pets', payload);

await db.updateRowTable(
  'pets',
  { pet_name: 'Milo' },
  { pet_id: petId },
);
```

For multi-step writes that must commit or roll back together, use
`db.withTransaction(...)` and pass the transaction connection into each helper.

```js
await db.withTransaction(async (conn) => {
  const petId = await db.insertRowIntoTable('pets', pet, conn);

  await db.insertRowIntoTable(
    'pet_history',
    { ...history, pet_id: petId },
    conn,
  );
});
```

If the callback throws, the transaction is rolled back and the connection is
released.

## Pool Tuning

Defaults are tuned for the current Lambda handlers. Environment variables remain
the source of truth when a handler needs tighter or looser limits.

- `BLUPAWS_DB_CONNECTION_LIMIT` defaults to `10`
- `BLUPAWS_DB_MAX_IDLE` defaults to `5`
- `BLUPAWS_DB_QUEUE_LIMIT` defaults to `0`
- `BLUPAWS_DB_IDLE_TIMEOUT_MS` defaults to `30000`
- `BLUPAWS_DB_CONNECT_TIMEOUT_MS` defaults to `10000`
- `BLUPAWS_DB_ACQUIRE_TIMEOUT_MS` defaults to `8000`
- `BLUPAWS_DB_LOG_SLOW_QUERY_MS` is disabled by default. Set it to a positive
  integer to log slow query execution and connection-acquire timings.

## Data Models

Shared table models live in `src/data-models`. Each table has its own folder:

```txt
src/data-models/<table_name>/model.json
src/data-models/<table_name>/view.json
src/data-models/<table_name>/associations.json
src/data-models/<table_name>/index.ts
```

`model.json` is the `DataModel`: it contains the field metadata used for type
checks and create/update support. `view.json` is the `ViewModel`: it contains
the fields selected by `getRowFromTable(...)` and `getRowsFromTable(...)`; it is
read-only projection metadata and does not include create/update or constraint
flags. It should not include `__meta` or default filters; callers must pass the
correct read filters in `clauses`. `associations.json` is optional and contains
named table relationships used by associated view fields. `index.ts` contains
the internal table definition, an exported table type, and three internal
validator hooks:

- `validateInsert(conn, row)`
- `validateUpdate(conn, row)`
- `validateDelete(conn, row)`

The validator hooks are currently no-ops. Add table-specific rules there later.
If a validator throws or returns `false`, the write helper rejects the operation
before mutating the table.

Only view fields can define an `association` to select one field from another
table. Prefer named associations from `associations.json`; inline association
objects are still supported for compatibility. When the output field name does
not match the target table column, set `field` to the real column name:

```json
{
  "pet_owner_name": {
    "type": "string",
    "association": "pet_owner",
    "field": "name"
  },
  "status_name": {
    "type": "string",
    "association": "pet_status"
  }
}
```

The read helpers add joins only when selected associated fields need them.
Associations can define a single join or a small `path` array for cases that
need an intermediate table.

The initial model set was generated from all handler-local data models under
the `aws` workspace. Conflicting definitions were merged permissively so the
first migration does not break existing handlers. See `MODEL_CONFLICTS.md` for
the files and fields that need review.
