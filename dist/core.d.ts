import jwt from 'jsonwebtoken';
import mysql, { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { DataRow, Flavor, GetRowsOptions, GetRowsResult, QueryResult, QueryValues, Stage } from './types';
export declare const createConnection: (stageValue: Stage, flavorValue: Flavor) => {
    query: <T extends QueryResult = mysql.RowDataPacket[]>(sql: string, values?: QueryValues, conn?: PoolConnection | null) => Promise<T>;
    withTransaction: <T>(callback: (conn: PoolConnection) => Promise<T>) => Promise<T>;
    insertRowIntoTable: (tableName: string, row: DataRow, conn?: PoolConnection | null) => Promise<number>;
    insertRowsIntoTable: (tableName: string, rows: DataRow[], conn?: PoolConnection | null) => Promise<void>;
    getRowFromTable: (tableName: string, clauses: DataRow, conn?: PoolConnection | null) => Promise<DataRow | null>;
    getRowsFromTable: (tableName: string, clauses: DataRow, optionsOrConn?: GetRowsOptions | PoolConnection | null, conn?: PoolConnection | null) => Promise<GetRowsResult>;
    updateRowTable: (tableName: string, row: DataRow, clauses: DataRow, conn?: PoolConnection | null) => Promise<void>;
    deleteRowFromTable: (tableName: string, clauses: DataRow, conn?: PoolConnection | null) => Promise<void>;
};
export declare const createJWTToken: (stageValue: Stage, payload: Record<string, string | number>, expiresIn: any) => Promise<string>;
export declare const verifyJWTToken: (stageValue: Stage, token: string) => Promise<string | jwt.JwtPayload>;
export declare const createRefreshToken: (stageValue: Stage, payload: Record<string, string | number>, expiresIn: any) => Promise<string>;
export declare const verifyRefreshToken: (stageValue: Stage, token: string) => Promise<string | jwt.JwtPayload>;
export declare const getAuthenticatedUserDetails: (stageValue: Stage, headers: Record<string, string>) => Promise<{
    clinic: mysql.RowDataPacket;
    user: {
        constructor: {
            name: "RowDataPacket";
        };
        login_id: any;
    };
    error?: undefined;
} | {
    user: string | jwt.JwtPayload;
    clinic?: undefined;
    error?: undefined;
} | {
    error: any;
    clinic?: undefined;
    user?: undefined;
}>;
