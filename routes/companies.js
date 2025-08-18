const express = require('express');
const { verifyToken } = require('./auth');
const db = require('../database/db.supabase');

const router = express.Router();

// Get all prospect companies for the user
router.get('/', verifyToken, async (req, res) => {
  try {
    const companies = await db.getAllCompaniesForUser(req.user.userId);
    res.json({ companies });

  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Get user's own company (for account analysis)
router.get('/account', verifyToken, async (req, res) => {
  try {
    let company = await db.getAccountCompanyByUser(req.user.userId);

    // If no company found, create one for the user's domain
    if (!company) {
      company = await db.createAccountCompany({
        user_id: req.user.userId,
        domain: req.user.domain,
        analysis_data: {
          domain: req.user.domain,
          discovered_from: 'user_email',
          needs_analysis: true,
          created_at: new Date().toISOString()
        }
      });
    }

    res.json({ company });

  } catch (error) {
    console.error('Get account company error:', error);
    res.status(500).json({ error: 'Failed to fetch account company' });
  }
});


// Update company personas with people search results
router.post('/update_personas', verifyToken, async (req, res) => {
  try {
    console.log("updating presona route")
    const { company_linkedin_url, people_data ,domain} = req.body;
    
    if (!company_linkedin_url || !people_data) {
      return res.status(400).json({ error: 'Company LinkedIn URL and people data are required' });
    }
    
    console.log('Updating personas for company:', company_linkedin_url);
    console.log('People data received:', people_data);
    
    // Find company by LinkedIn URL
    const company = await db.getCompanyDataByLinkedinUrlanddomain(company_linkedin_url.split('?')[0],domain);
    console.log('company', company);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }


    const updatedCompany = await db.updateCompany({
      id: company.id,
      persona: people_data
    });

    console.log('updatedCompany', updatedCompany);

    //Get the account company data
    const accountCompany = await db.getAccountCompanyByDomain(domain);
    console.log('accountCompany', accountCompany);
    
    // res.json({ 
    //   message: 'Personas updated successfully',
    //   company_name: updatedCompany.company_name,
    //   personas: updatedCompany.personas,
    //   company_linkedin_url: updatedCompany.linkedin_url
    // });
    return res.json({company: {
      linkedin_url: company_linkedin_url.split('?')[0],
      analysis_data: accountCompany.analysis_data,  
      account_company_data: accountCompany,
      persona: updatedCompany.persona
    }})
        
  } catch (error) {
    console.error('Update personas error:', error);
    res.status(500).json({ error: 'Failed to update personas' });
  }
});


// Get prospect companies only (for prospecting) - now same as root endpoint
router.get('/prospects', verifyToken, async (req, res) => {
  try {
    const companies = await db.getAllCompaniesForUser(req.user.userId);
    res.json({ companies });

  } catch (error) {
    console.error('Get prospect companies error:', error);
    res.status(500).json({ error: 'Failed to fetch prospect companies' });
  }
});

// Get specific company by domain
router.get('/:domain', verifyToken, async (req, res) => {
  try {
    const { domain } = req.params;
    const company = await db.getCompanyByDomain(req.user.userId, domain);
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json({ company });

  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

// Create or update company from LinkedIn page data
router.post('/from-linkedin', verifyToken, async (req, res) => {
  try {
    const { linkedinUrl, domData } = req.body;
    
    if (!linkedinUrl || !domData) {
      return res.status(400).json({ error: 'LinkedIn URL and DOM data are required' });
    }

    // Extract company domain from LinkedIn URL or DOM data
    let domain = null;
    
    // Try to extract from website links in DOM data
    if (domData.website) {
      try {
        const url = new URL(domData.website);
        domain = url.hostname.replace('www.', '');
      } catch (e) {
        // Invalid URL, continue
      }
    }
    
    // Fallback: extract company name and use as identifier
    if (!domain && domData.company_name) {
      domain = domData.company_name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
    }

    if (!domain) {
      return res.status(400).json({ error: 'Could not determine company domain' });
    }

    // Check if company already exists
    let company = await db.getCompanyByDomain(req.user.userId, domain);
    
    const companyData = {
      linkedin_url: linkedinUrl,
      scraped_at: new Date().toISOString(),
      dom_data: domData,
      company_name: domData.company_name,
      description: domData.description,
      industry: domData.industry,
      size: domData.size,
      location: domData.location,
      website: domData.website,
      specialties: domData.specialties,
      follower_count: domData.follower_count
    };

    if (company) {
      // Update existing company
      await new Promise((resolve, reject) => {
        db.db.run(
          `UPDATE companies SET 
           linkedin_url = ?, analysis_data = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [linkedinUrl, JSON.stringify(companyData), company.id],
          (err) => err ? reject(err) : resolve()
        );
      });
      
      company.analysis_data = companyData;
    } else {
      // Get user's account company to reference
      let accountCompany = await db.getAccountCompanyByUser(req.user.userId);
      if (!accountCompany) {
        accountCompany = await db.createAccountCompany({
          user_id: req.user.userId,
          domain: req.user.domain,
          analysis_data: {}
        });
      }

      // Create new prospect company
      company = await db.createCompany({
        account_company_id: accountCompany.id,
        user_id: req.user.userId,
        domain: domain,
        linkedin_url: linkedinUrl,
        analysis_data: companyData
      });
    }

    res.json({ 
      company,
      message: 'Company data saved successfully'
    });

  } catch (error) {
    console.error('Save LinkedIn company error:', error);
    res.status(500).json({ error: 'Failed to save company data' });
  }
});

// Update company notes
router.put('/:domain/notes', verifyToken, async (req, res) => {
  try {
    const { domain } = req.params;
    const { notes } = req.body;
    
    const company = await db.getCompanyByDomain(req.user.userId, domain);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Update analysis_data with notes
    const updatedAnalysisData = {
      ...company.analysis_data,
      notes: notes,
      notes_updated_at: new Date().toISOString()
    };

    await new Promise((resolve, reject) => {
      db.db.run(
        'UPDATE companies SET analysis_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [JSON.stringify(updatedAnalysisData), company.id],
        (err) => err ? reject(err) : resolve()
      );
    });

    res.json({ message: 'Notes updated successfully' });

  } catch (error) {
    console.error('Update company notes error:', error);
    res.status(500).json({ error: 'Failed to update notes' });
  }
});

// Delete company
router.delete('/:domain', verifyToken, async (req, res) => {
  try {
    const { domain } = req.params;
    
    const company = await db.getCompanyByDomain(req.user.userId, domain);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Delete all prospects for this company first
    await new Promise((resolve, reject) => {
      db.db.run(
        'DELETE FROM prospects WHERE user_id = ? AND company_id = ?',
        [req.user.userId, company.id],
        (err) => err ? reject(err) : resolve()
      );
    });

    // Delete the company
    await new Promise((resolve, reject) => {
      db.db.run(
        'DELETE FROM companies WHERE id = ?',
        [company.id],
        (err) => err ? reject(err) : resolve()
      );
    });

    res.json({ message: 'Company deleted successfully' });

  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

// Get company prospects
router.get('/:domain/prospects', verifyToken, async (req, res) => {
  try {
    const { domain } = req.params;
    const { status, persona_match, score_min } = req.query;
    
    const company = await db.getCompanyByDomain(req.user.userId, domain);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    let query = `
      SELECT * FROM prospects 
      WHERE user_id = ? AND company_id = ?
    `;
    const params = [req.user.userId, company.id];

    // Add filters
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (persona_match) {
      query += ' AND persona_match = ?';
      params.push(persona_match);
    }
    
    if (score_min) {
      query += ' AND score >= ?';
      params.push(parseInt(score_min));
    }

    query += ' ORDER BY score DESC, created_at DESC';

    const prospects = await new Promise((resolve, reject) => {
      db.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else {
          const parsed = rows.map(row => {
            if (row.profile_data) row.profile_data = JSON.parse(row.profile_data);
            if (row.analysis_data) row.analysis_data = JSON.parse(row.analysis_data);
            return row;
          });
          resolve(parsed);
        }
      });
    });

    res.json({ prospects });

  } catch (error) {
    console.error('Get company prospects error:', error);
    res.status(500).json({ error: 'Failed to fetch company prospects' });
  }
});

module.exports = router;