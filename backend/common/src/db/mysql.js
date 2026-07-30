const mysql = require('mysql2/promise');
const env = require('../config/env');

let pool;

function getMysqlPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: env.mysql.host,
      port: env.mysql.port,
      user: env.mysql.user,
      password: env.mysql.password,
      database: env.mysql.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      namedPlaceholders: true,
      dateStrings: true,
      decimalNumbers: true
    });
  }

  return pool;
}

async function execute(sql, params = []) {
  const [rows] = await getMysqlPool().execute(sql, params);
  return rows;
}

async function withTransaction(handler) {
  const connection = await getMysqlPool().getConnection();

  try {
    await connection.beginTransaction();
    const result = await handler(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  getMysqlPool,
  execute,
  withTransaction
};
