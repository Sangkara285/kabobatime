import mysql from 'mysql2/promise';

const g = globalThis;
export function pool() {
  if (!g.__kabobaPool) {
    g.__kabobaPool = mysql.createPool({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'kaboba_time',
      waitForConnections: true,
      connectionLimit: 8,
      charset: 'utf8mb4',
      afterCreate: (connection) => connection.query("SET time_zone = '+07:00'"),
    });
  }
  return g.__kabobaPool;
}
