import mysql, { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { DataRow, Flavor, QueryResult, QueryValues, Stage } from './types';
export declare const createConnection: (stageValue: Stage, flavorValue: Flavor) => {
    query: <T extends QueryResult = mysql.RowDataPacket[]>(sql: string, values?: QueryValues, conn?: PoolConnection | null) => Promise<T>;
    withTransaction: <T>(callback: (conn: PoolConnection) => Promise<T>) => Promise<T>;
    insertRowIntoTable: (tableName: string, row: DataRow, conn?: PoolConnection | null) => Promise<number>;
    insertRowsIntoTable: (tableName: string, rows: DataRow[], conn?: PoolConnection | null) => Promise<void>;
    updateRowTable: (tableName: string, row: DataRow, clauses: DataRow, conn?: PoolConnection | null) => Promise<void>;
    deleteRowFromTable: (tableName: string, clauses: DataRow, conn?: PoolConnection | null) => Promise<void>;
};
