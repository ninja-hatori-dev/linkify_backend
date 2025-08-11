const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Linkify Database Viewer\n');

// Function to view table data
function viewTable(tableName) {
  return new Promise((resolve, reject) => {
    console.log(`\n📋 Table: ${tableName}`);
    console.log('='.repeat(50));
    
    db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
      if (err) {
        console.error(`❌ Error reading ${tableName}:`, err.message);
        reject(err);
        return;
      }
      
      if (rows.length === 0) {
        console.log(`No data found in ${tableName}`);
      } else {
        console.log(`Found ${rows.length} records:`);
        rows.forEach((row, index) => {
          console.log(`\n--- Record ${index + 1} ---`);
          Object.keys(row).forEach(key => {
            let value = row[key];
            if (typeof value === 'string' && value.startsWith('{')) {
              try {
                value = JSON.parse(value);
                value = JSON.stringify(value, null, 2);
              } catch (e) {
                // Not JSON, keep as is
              }
            }
            
            // Truncate to first 10 characters
            if (typeof value === 'string' && value.length > 10) {
              value = value.substring(0, 50) + '...';
            }
            
            console.log(`${key}: ${value}`);
          });
        });
      }
      resolve();
    });
  });
}

// Function to get table count
function getTableCount(tableName) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
      if (err) reject(err);
      else resolve(row.count);
    });
  });
}

// Main function
async function viewDatabase() {
  try {
    // Get counts for all tables
    const tables = ['users', 'account_companies', 'companies', 'prospects', 'analysis_sessions'];
    
    console.log('📊 Database Summary:');
    console.log('='.repeat(30));
    
    for (const table of tables) {
      const count = await getTableCount(table);
      console.log(`${table}: ${count} records`);
    }
    
    // View data for each table
    for (const table of tables) {
      await viewTable(table);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    db.close();
    console.log('\n✅ Database connection closed');
  }
}

//delete all data from the database


// Run the viewer
viewDatabase(); 

//delete all data from the database
