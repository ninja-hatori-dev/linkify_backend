const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Deleting all data from the database\n');

  async function deleteAllData() {
    // db.run('DELETE FROM users');
    // db.run('DELETE FROM account_companies');
        db.run('DELETE FROM companies where id = 50');
    // db.run('DELETE FROM prospects');
    // db.run('DELETE FROM analysis_sessions');
  }

  deleteAllData();  

  console.log('✅ All data deleted from the database');
  db.close();
  console.log('✅ Database connection closed');