const express = require('express');
const { verifyToken } = require('./auth');
const db = require('../database/db');

const router = express.Router();

// Get user dashboard data
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    // Get user's companies
    const companies = await new Promise((resolve, reject) => {
      db.db.all(
        'SELECT * FROM companies WHERE user_id = ? ORDER BY created_at DESC',
        [req.user.userId],
        (err, rows) => {
          if (err) reject(err);
          else {
            const parsed = rows.map(row => {
              if (row.company_data) row.company_data = JSON.parse(row.company_data);
              if (row.personas_data) row.personas_data = JSON.parse(row.personas_data);
              if (row.analysis_data) row.analysis_data = JSON.parse(row.analysis_data);
              return row;
            });
            resolve(parsed);
          }
        }
      );
    });

    // Get total prospects count
    const totalProspects = await new Promise((resolve, reject) => {
      db.db.get(
        'SELECT COUNT(*) as count FROM prospects WHERE user_id = ?',
        [req.user.userId],
        (err, row) => err ? reject(err) : resolve(row.count)
      );
    });

    // Get ideal contacts count
    const idealContacts = await new Promise((resolve, reject) => {
      db.db.get(
        'SELECT COUNT(*) as count FROM prospects WHERE user_id = ? AND is_ideal_contact = 1',
        [req.user.userId],
        (err, row) => err ? reject(err) : resolve(row.count)
      );
    });

    // Get recent prospects
    const recentProspects = await new Promise((resolve, reject) => {
      db.db.all(
        `SELECT p.*, c.domain as company_domain 
         FROM prospects p 
         JOIN companies c ON p.company_id = c.id 
         WHERE p.user_id = ? 
         ORDER BY p.created_at DESC 
         LIMIT 10`,
        [req.user.userId],
        (err, rows) => {
          if (err) reject(err);
          else {
            const parsed = rows.map(row => {
              if (row.profile_data) row.profile_data = JSON.parse(row.profile_data);
              if (row.analysis_data) row.analysis_data = JSON.parse(row.analysis_data);
              return row;
            });
            resolve(parsed);
          }
        }
      );
    });

    // Get API usage stats
    const apiUsage = await new Promise((resolve, reject) => {
      db.db.all(
        `SELECT session_type, COUNT(*) as count, DATE(created_at) as date
         FROM analysis_sessions 
         WHERE user_id = ? AND created_at >= DATE('now', '-30 days')
         GROUP BY session_type, DATE(created_at)
         ORDER BY created_at DESC`,
        [req.user.userId],
        (err, rows) => err ? reject(err) : resolve(rows)
      );
    });

    res.json({
      stats: {
        totalCompanies: companies.length,
        totalProspects: totalProspects,
        idealContacts: idealContacts,
        conversionRate: totalProspects > 0 ? Math.round((idealContacts / totalProspects) * 100) : 0
      },
      companies: companies,
      recentProspects: recentProspects,
      apiUsage: apiUsage
    });

  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Update user preferences
router.put('/preferences', verifyToken, async (req, res) => {
  try {
    const { preferences } = req.body;
    
    // Get current user data
    const user = await db.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update preferences in user_data JSON
    const updatedUserData = {
      ...user.user_data,
      preferences: {
        ...user.user_data?.preferences,
        ...preferences
      }
    };

    await new Promise((resolve, reject) => {
      db.db.run(
        'UPDATE users SET user_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [JSON.stringify(updatedUserData), req.user.userId],
        (err) => err ? reject(err) : resolve()
      );
    });

    res.json({ message: 'Preferences updated successfully' });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Get user activity log
router.get('/activity', verifyToken, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const activities = await new Promise((resolve, reject) => {
      db.db.all(
        `SELECT 
           'analysis' as type,
           session_type as action,
           created_at,
           input_data,
           id
         FROM analysis_sessions 
         WHERE user_id = ?
         
         UNION ALL
         
         SELECT 
           'prospect' as type,
           'created' as action,
           created_at,
           json_object('linkedin_url', linkedin_url, 'score', score) as input_data,
           id
         FROM prospects 
         WHERE user_id = ?
         
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [req.user.userId, req.user.userId, parseInt(limit), parseInt(offset)],
        (err, rows) => {
          if (err) reject(err);
          else {
            const parsed = rows.map(row => {
              if (row.input_data) {
                try {
                  row.input_data = JSON.parse(row.input_data);
                } catch (e) {
                  // Keep as string if parsing fails
                }
              }
              return row;
            });
            resolve(parsed);
          }
        }
      );
    });

    res.json({ activities });

  } catch (error) {
    console.error('Activity log error:', error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});


router.get('/verify', verifyToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.userId);
    res.json({ 
      valid: true, 
      verified: true,
      user: user 
    });
  } catch (error) {
    console.error('Verify auth error:', error);
    res.status(500).json({ error: 'Failed to verify auth' });
  }
});
module.exports = router;