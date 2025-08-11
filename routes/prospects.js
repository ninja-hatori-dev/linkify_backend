const express = require('express');
const { verifyToken } = require('./auth');
const db = require('../database/db');

const router = express.Router();

// Get all prospects for the user
router.get('/', verifyToken, async (req, res) => {
  try {
    const { 
      status, 
      persona_match, 
      score_min, 
      is_ideal_contact,
      limit = 50,
      offset = 0,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    let query = `
      SELECT p.*, c.domain as company_domain, c.analysis_data as company_analysis_data,
             ac.domain as account_company_domain, ac.analysis_data as account_company_analysis_data
      FROM prospects p 
      JOIN companies c ON p.company_id = c.id 
      LEFT JOIN account_companies ac ON p.account_company_id = ac.id
      WHERE p.user_id = ?
    `;
    const params = [req.user.userId];

    // Add filters
    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }
    
    if (persona_match) {
      query += ' AND p.persona_match = ?';
      params.push(persona_match);
    }
    
    if (score_min) {
      query += ' AND p.score >= ?';
      params.push(parseInt(score_min));
    }

    if (is_ideal_contact !== undefined) {
      query += ' AND p.is_ideal_contact = ?';
      params.push(is_ideal_contact === 'true' ? 1 : 0);
    }

    // Add sorting and pagination
    const validSortColumns = ['created_at', 'score', 'updated_at'];
    const validSortOrders = ['ASC', 'DESC'];
    
    const sortColumn = validSortColumns.includes(sort_by) ? `p.${sort_by}` : 'p.created_at';
    const sortOrder = validSortOrders.includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'DESC';
    
    query += ` ORDER BY ${sortColumn} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const prospects = await new Promise((resolve, reject) => {
      db.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else {
          const parsed = rows.map(row => {
            if (row.profile_data) row.profile_data = JSON.parse(row.profile_data);
            if (row.analysis_data) row.analysis_data = JSON.parse(row.analysis_data);
            if (row.company_analysis_data) row.company_analysis_data = JSON.parse(row.company_analysis_data);
            if (row.account_company_analysis_data) row.account_company_analysis_data = JSON.parse(row.account_company_analysis_data);
            return row;
          });
          resolve(parsed);
        }
      });
    });

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM prospects p 
      JOIN companies c ON p.company_id = c.id 
      LEFT JOIN account_companies ac ON p.account_company_id = ac.id
      WHERE p.user_id = ?
    `;
    const countParams = [req.user.userId];

    // Apply same filters to count query
    if (status) {
      countQuery += ' AND p.status = ?';
      countParams.push(status);
    }
    if (persona_match) {
      countQuery += ' AND p.persona_match = ?';
      countParams.push(persona_match);
    }
    if (score_min) {
      countQuery += ' AND p.score >= ?';
      countParams.push(parseInt(score_min));
    }
    if (is_ideal_contact !== undefined) {
      countQuery += ' AND p.is_ideal_contact = ?';
      countParams.push(is_ideal_contact === 'true' ? 1 : 0);
    }

    const totalCount = await new Promise((resolve, reject) => {
      db.db.get(countQuery, countParams, (err, row) => {
        if (err) reject(err);
        else resolve(row.total);
      });
    });

    res.json({ 
      prospects,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < totalCount
      }
    });

  } catch (error) {
    console.error('Get prospects error:', error);
    res.status(500).json({ error: 'Failed to fetch prospects' });
  }
});

// Get specific prospect by LinkedIn URL
router.get('/by-url', verifyToken, async (req, res) => {
  try {
    const { linkedin_url } = req.query;
    
    if (!linkedin_url) {
      return res.status(400).json({ error: 'LinkedIn URL is required' });
    }

    const prospect = await new Promise((resolve, reject) => {
      db.db.get(
        `SELECT p.*, c.domain as company_domain, c.analysis_data as company_analysis_data,
                ac.domain as account_company_domain, ac.analysis_data as account_company_analysis_data
         FROM prospects p 
         JOIN companies c ON p.company_id = c.id 
         LEFT JOIN account_companies ac ON p.account_company_id = ac.id
         WHERE p.user_id = ? AND p.linkedin_url = ?`,
        [req.user.userId, linkedin_url],
        (err, row) => {
          if (err) reject(err);
          else {
            if (row) {
              if (row.profile_data) row.profile_data = JSON.parse(row.profile_data);
              if (row.analysis_data) row.analysis_data = JSON.parse(row.analysis_data);
              if (row.company_data) row.company_data = JSON.parse(row.company_data);
            }
            resolve(row);
          }
        }
      );
    });

    if (!prospect) {
      return res.status(404).json({ error: 'Prospect not found' });
    }

    res.json({ prospect });

  } catch (error) {
    console.error('Get prospect error:', error);
    res.status(500).json({ error: 'Failed to fetch prospect' });
  }
});

// Create prospect from LinkedIn profile data
router.post('/from-linkedin', verifyToken, async (req, res) => {
  try {
    const { linkedinUrl, profileData, companyDomain } = req.body;
    
    if (!linkedinUrl || !profileData || !companyDomain) {
      return res.status(400).json({ error: 'LinkedIn URL, profile data, and company domain are required' });
    }

    // Get user's account company
    let accountCompany = await db.getAccountCompanyByUser(req.user.userId);
    if (!accountCompany) {
      accountCompany = await db.createAccountCompany({
        user_id: req.user.userId,
        domain: req.user.domain,
        analysis_data: {}
      });
    }

    // Get company
    const company = await db.getCompanyByDomain(req.user.userId, companyDomain);
    if (!company) {
      return res.status(404).json({ error: 'Company not found. Please analyze the company first.' });
    }

    // Check if prospect already exists
    const existingProspect = await new Promise((resolve, reject) => {
      db.db.get(
        'SELECT * FROM prospects WHERE user_id = ? AND linkedin_url = ?',
        [req.user.userId, linkedinUrl],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existingProspect) {
      // Update existing prospect
      await new Promise((resolve, reject) => {
        db.db.run(
          'UPDATE prospects SET profile_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [JSON.stringify(profileData), existingProspect.id],
          (err) => err ? reject(err) : resolve()
        );
      });

      return res.json({ 
        prospect: { ...existingProspect, profile_data: profileData },
        message: 'Prospect updated successfully',
        existing: true
      });
    }

    // Create new prospect
    const newProspect = await db.createProspect({
      user_id: req.user.userId,
      account_company_id: accountCompany.id,
      company_id: company.id,
      linkedin_url: linkedinUrl,
      profile_data: profileData,
      status: 'new'
    });

    res.json({ 
      prospect: newProspect,
      message: 'Prospect created successfully',
      existing: false
    });

  } catch (error) {
    console.error('Create prospect error:', error);
    res.status(500).json({ error: 'Failed to create prospect' });
  }
});

// Update prospect status and notes
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, persona_match } = req.body;

    // Verify prospect belongs to user
    const prospect = await new Promise((resolve, reject) => {
      db.db.get(
        'SELECT * FROM prospects WHERE id = ? AND user_id = ?',
        [id, req.user.userId],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!prospect) {
      return res.status(404).json({ error: 'Prospect not found' });
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }

    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (persona_match) {
      updates.push('persona_match = ?');
      params.push(persona_match);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    await new Promise((resolve, reject) => {
      db.db.run(
        `UPDATE prospects SET ${updates.join(', ')} WHERE id = ?`,
        params,
        (err) => err ? reject(err) : resolve()
      );
    });

    res.json({ message: 'Prospect updated successfully' });

  } catch (error) {
    console.error('Update prospect error:', error);
    res.status(500).json({ error: 'Failed to update prospect' });
  }
});

// Delete prospect
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify prospect belongs to user
    const prospect = await new Promise((resolve, reject) => {
      db.db.get(
        'SELECT * FROM prospects WHERE id = ? AND user_id = ?',
        [id, req.user.userId],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!prospect) {
      return res.status(404).json({ error: 'Prospect not found' });
    }

    await new Promise((resolve, reject) => {
      db.db.run(
        'DELETE FROM prospects WHERE id = ?',
        [id],
        (err) => err ? reject(err) : resolve()
      );
    });

    res.json({ message: 'Prospect deleted successfully' });

  } catch (error) {
    console.error('Delete prospect error:', error);
    res.status(500).json({ error: 'Failed to delete prospect' });
  }
});

// Get prospect statistics
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const stats = await new Promise((resolve, reject) => {
      db.db.all(
        `SELECT 
           COUNT(*) as total_prospects,
           SUM(CASE WHEN is_ideal_contact = 1 THEN 1 ELSE 0 END) as ideal_contacts,
           AVG(score) as avg_score,
           COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted,
           COUNT(CASE WHEN status = 'responded' THEN 1 END) as responded,
           persona_match,
           COUNT(*) as persona_count
         FROM prospects 
         WHERE user_id = ?
         GROUP BY persona_match
         
         UNION ALL
         
         SELECT 
           COUNT(*) as total_prospects,
           SUM(CASE WHEN is_ideal_contact = 1 THEN 1 ELSE 0 END) as ideal_contacts,
           AVG(score) as avg_score,
           COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted,
           COUNT(CASE WHEN status = 'responded' THEN 1 END) as responded,
           'TOTAL' as persona_match,
           COUNT(*) as persona_count
         FROM prospects 
         WHERE user_id = ?`,
        [req.user.userId, req.user.userId],
        (err, rows) => err ? reject(err) : resolve(rows)
      );
    });

    const personaStats = stats.filter(row => row.persona_match !== 'TOTAL');
    const totalStats = stats.find(row => row.persona_match === 'TOTAL') || {
      total_prospects: 0,
      ideal_contacts: 0,
      avg_score: 0,
      contacted: 0,
      responded: 0
    };

    res.json({
      total: totalStats,
      by_persona: personaStats,
      conversion_rates: {
        ideal_rate: totalStats.total_prospects > 0 ? 
          Math.round((totalStats.ideal_contacts / totalStats.total_prospects) * 100) : 0,
        contact_rate: totalStats.total_prospects > 0 ? 
          Math.round((totalStats.contacted / totalStats.total_prospects) * 100) : 0,
        response_rate: totalStats.contacted > 0 ? 
          Math.round((totalStats.responded / totalStats.contacted) * 100) : 0
      }
    });

  } catch (error) {
    console.error('Get prospect stats error:', error);
    res.status(500).json({ error: 'Failed to fetch prospect statistics' });
  }
});

module.exports = router;