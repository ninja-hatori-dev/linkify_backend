const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
  }

  init() {
    return new Promise((resolve, reject) => {
      const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../database.sqlite');
      
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
          return;
        }
        console.log('Connected to SQLite database');
        this.createTables().then(resolve).catch(reject);
      });
    });
  }

  createTables() {
    return new Promise((resolve, reject) => {
      const tables = [
        // Users table
        `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          google_id TEXT UNIQUE,
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          avatar_url TEXT,
          company_domain TEXT,
          user_data JSON, -- Store additional user info as JSON
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // Account companies table - stores user's own company info
        `CREATE TABLE IF NOT EXISTS account_companies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER UNIQUE,
          domain TEXT UNIQUE,
          analysis_data JSON, -- Store analysis results as JSON
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )`,

        // Companies table - stores prospect companies only
        `CREATE TABLE IF NOT EXISTS companies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_company_id INTEGER,
          user_id INTEGER,
          domain TEXT UNIQUE,
          linkedin_url TEXT UNIQUE,
          rapidapi_data JSON, -- Store rapidapi data as JSON,
          analysis_data JSON, -- Store analysis results as JSON
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (account_company_id) REFERENCES account_companies (id),
          FOREIGN KEY (user_id) REFERENCES users (id),
          UNIQUE(user_id, domain)
        )`,

        // Prospects table - stores individual LinkedIn profile data
        `CREATE TABLE IF NOT EXISTS prospects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          account_company_id INTEGER,
          company_id INTEGER,
          linkedin_url TEXT UNIQUE,
          rapidapi_data JSON, -- Store rapidapi data as JSON,
          analysis_data JSON, -- Store analysis results as JSON (LLM analysis)
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (account_company_id) REFERENCES account_companies (id),
          FOREIGN KEY (company_id) REFERENCES companies (id),
          UNIQUE(user_id, linkedin_url)
        )`,

        // Analysis sessions - track LLM API calls and usage
        `CREATE TABLE IF NOT EXISTS analysis_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          session_type TEXT, -- 'company_analysis', 'prospect_scoring'
          input_data JSON, -- Store input data sent to LLM
          output_data JSON, -- Store LLM response
          api_usage JSON, -- Store API usage metrics
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )`
      ];

      let completed = 0;
      const total = tables.length;

      tables.forEach((tableSQL, index) => {
        this.db.run(tableSQL, (err) => {
          if (err) {
            console.error(`Error creating table ${index}:`, err);
            reject(err);
            return;
          }
          
          completed++;
          if (completed === total) {
            console.log('All database tables created successfully');
            resolve();
          }
        });
      });
    });
  }







  //async function to get the company data by linkedin url
async getCompanyDataByLinkedinUrl(linkedin_url) {
  return new Promise((resolve, reject) => {
    this.db.get('SELECT * FROM companies WHERE linkedin_url = ?', [linkedin_url], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

//async function to update the analysis data for an account company
async updateAccountCompanyAnalysisData(domain, analysisData) {
  console.log('Updating account company analysis data for domain:', domain);
  console.log('Analysis data:', analysisData);
  return new Promise((resolve, reject) => {
    try {
      this.db.run('UPDATE account_companies SET analysis_data = ?, updated_at = CURRENT_TIMESTAMP WHERE domain = ?', [JSON.stringify(analysisData), domain], (err) => {
        if (err) {
          console.error('Error updating account company analysis data:', err);
          reject(err);
        } else {
          console.log('Account company analysis data updated successfully');
          // Return the updated record
          this.db.get('SELECT * FROM account_companies WHERE domain = ?', [domain], (err, row) => {
            if (err) {
              console.error('Error fetching updated account company:', err);
              reject(err);
            } else {
              if (row && row.analysis_data) {
                row.analysis_data = JSON.parse(row.analysis_data);
              }
              console.log('Updated account company:', row);
              resolve(row);
            }
          });
        }
      });
    } catch (error) {
      console.error('Error updating account company analysis data:', error);
      reject(error);
    }
  }); 
}
  // Helper methods for JSON operations
  async getUserById(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else {
          if (row && row.user_data) {
            row.user_data = JSON.parse(row.user_data);
          }
          resolve(row);
        }
      });
    });
  }

  async createUser(userData) {
    return new Promise((resolve, reject) => {
      const { google_id, email, name, avatar_url, company_domain, user_data } = userData;
      const sql = `INSERT INTO users (google_id, email, name, avatar_url, company_domain, user_data)
                   VALUES (?, ?, ?, ?, ?, ?)`;
      
      console.log('Executing SQL:', sql);
      console.log('With parameters:', [google_id, email, name, avatar_url, company_domain, JSON.stringify(user_data || {})]);
      
      this.db.run(sql, [
        google_id, 
        email, 
        name, 
        avatar_url, 
        company_domain, 
        JSON.stringify(user_data || {})
      ], function(err) {
        if (err) {
          console.error('Error in createUser:', err);
          reject(err);
        } else {
          console.log('User created successfully with ID:', this.lastID);
          resolve({ id: this.lastID, ...userData });
        }
      });
    });
  }

  async createAccountCompany(companyData) {
    return new Promise((resolve, reject) => {
      const { user_id, domain, analysis_data } = companyData;
      const sql = `INSERT INTO account_companies (user_id, domain, analysis_data)
                   VALUES (?, ?, ?)`;
      
      console.log('Executing createAccountCompany SQL:', sql);
      console.log('With parameters:', [user_id, domain, JSON.stringify(analysis_data || {})]);
      
      this.db.run(sql, [
        user_id,
        domain,
        JSON.stringify(analysis_data || {})
      ], function(err) {
        if (err) {
          console.error('Error in createAccountCompany:', err);
          reject(err);
        } else {
          console.log('Account company created successfully with ID:', this.lastID);
          resolve({ id: this.lastID, ...companyData });
        }
      });
    });
  }

  async createCompany(companyData) {
    return new Promise((resolve, reject) => {
        const { user_id, linkedin_url, analysis_data } = companyData;
      const sql = `INSERT INTO companies (user_id, linkedin_url, analysis_data)
                   VALUES (?, ?, ?)`;
      
      console.log('Executing createCompany SQL:', sql);
      console.log('With parameters:', [user_id, linkedin_url, analysis_data ]);
      
      this.db.run(sql, [
        user_id,  
        linkedin_url,
analysis_data

      ], function(err) {
        if (err) {
          console.error('Error in createCompany:', err);
          reject(err);
        } else {
          console.log('Company created successfully with ID:', this.lastID);
          resolve({ id: this.lastID, ...companyData });
        }
      });
    });
  }

  async createProspect(prospectData) {
    return new Promise((resolve, reject) => {
      const { 
        user_id, 
        company_id, 
        linkedin_url, 
        analysis_data,
        rapidapi_data
      } = prospectData;
      
      const sql = `INSERT INTO prospects (
        user_id, company_id, linkedin_url, analysis_data, rapidapi_data
      ) VALUES (?, ?, ?, ?, ?)`;
      
      console.log('Executing createProspect SQL:', sql);
      console.log('With parameters:', [user_id, company_id, linkedin_url, JSON.stringify(analysis_data || {}), JSON.stringify(rapidapi_data || {})]);
      
      this.db.run(sql, [  
        user_id,
        company_id,
        linkedin_url,
        JSON.stringify(analysis_data || {}),
        JSON.stringify(rapidapi_data || {})
      ], function(err) {
        if (err) {
          console.error('Error in createProspect:', err);
          reject(err);
        } else {
          console.log('Prospect created successfully with ID:', this.lastID);
          resolve({ id: this.lastID, ...prospectData });
        }
      });
    });
  }

  async getAccountCompanyByUser(user_id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM account_companies WHERE user_id = ?', 
        [user_id], 
        (err, row) => {
          if (err) reject(err);
          else {
            if (row && row.analysis_data) {
              row.analysis_data = JSON.parse(row.analysis_data);
            }
            resolve(row);
          }
        }
      );
    });
  }

  async getCompanyByDomain(user_id, domain) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM companies WHERE user_id = ? AND domain = ?', 
        [user_id, domain], 
        (err, row) => {
          if (err) reject(err);
          else {
            if (row && row.analysis_data) {
              row.analysis_data = JSON.parse(row.analysis_data);
            }
            resolve(row);
          }
        }
      );
    });
  }

  async getAllCompaniesForUser(user_id) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM companies WHERE user_id = ? ORDER BY created_at DESC',
        [user_id],
        (err, rows) => {
          if (err) reject(err);
          else {
            const parsed = rows.map(row => {
              if (row.analysis_data) row.analysis_data = JSON.parse(row.analysis_data);
              return row;
            });
            resolve(parsed);
          }
        }
      );
    });
  }

  async getProspectsByCompany(user_id, company_id) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM prospects WHERE user_id = ? AND company_id = ? ORDER BY created_at DESC',
        [user_id, company_id],
        (err, rows) => {
          if (err) reject(err);
          else {
            // Parse JSON fields for each row
            const parsed = rows.map(row => {
                  // if (row.profile_data) row.profile_data = JSON.parse(row.profile_data);
              if (row.analysis_data) row.analysis_data = JSON.parse(row.analysis_data);
              return row;
            });
            resolve(parsed);
          }
        }
      );
    });
  }

  async getAccountCompanyByDomain(domain) {
    console.log('Getting account company by domain:', domain);
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM account_companies WHERE domain = ?',
        [domain],
        (err, row) => {
          if (err) reject(err); 
          else {
            if (row && row.analysis_data) {
              row.analysis_data = JSON.parse(row.analysis_data);
            }
            resolve(row);
          }
        }
      );
    });
  }

  async getAccountCompanyAnalysisDataByDomain(domain) {
    console.log('Getting analysis data by domain:', domain);
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM account_companies WHERE domain = ?',
        [domain],
        (err, row) => {
          if (err) reject(err); 
          else {
            if (row && row.analysis_data) {
              row.analysis_data = JSON.parse(row.analysis_data);
            }
            resolve(row);
          }
        }
      );
    });
  }

  async getProspectByLinkedInUrl(user_id, linkedin_url) {
    console.log('Getting prospect by LinkedIn URL:', linkedin_url);
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM prospects WHERE user_id = ? AND linkedin_url = ?',
        [user_id, linkedin_url],
        (err, row) => {
          if (err) reject(err); 
          else {
            if (row && row.analysis_data) {
              row.analysis_data = JSON.parse(row.analysis_data);
            }
            if (row && row.profile_data) {
              row.profile_data = JSON.parse(row.profile_data);
            }
            resolve(row);
          }
        }
      );
    });
  }

  close() { 
    if (this.db) {
      this.db.close((err) => {
        if (err) console.error('Error closing database:', err);
        else console.log('Database connection closed');
      });
    }
  }
}

module.exports = new Database();