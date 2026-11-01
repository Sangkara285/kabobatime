import mysql from 'mysql2/promise';

const g = globalThis;
export function pool() {
  if (!g.__kabobaPool) {
    const p = mysql.createPool({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'kaboba_time',
      waitForConnections: true,
      connectionLimit: 8,
      charset: 'utf8mb4',
    });
    p.on('connection', (connection) => connection.query("SET time_zone = '+07:00'"));
    g.__kabobaPool = p;
  }
  return g.__kabobaPool;
}
