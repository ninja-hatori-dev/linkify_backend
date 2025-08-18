// database/db.supabase.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

module.exports = {
  // Keep server.js unchanged
  async init() { return; },
  async createTables() { return; },
  async close() { return; },

  async getCompanyDataByLinkedinUrlanddomain(linkedin_url,domain) {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('linkedin_url', linkedin_url)
      .eq('domain', domain)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    return (Array.isArray(data) ? data[0] : null) || null;
  },

  async updateAccountCompanyAnalysisData(domain, analysisData) {
    const { data, error } = await supabase
      .from('account_companies')
      .update({ analysis_data: analysisData, updated_at: new Date().toISOString() })
      .eq('domain', domain)
      .select('*');
    if (error) throw error;
    // If multiple rows were updated due to non-unique domain, return the most recently updated one
    if (Array.isArray(data)) {
      const sorted = [...data].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      return sorted[0] || null;
    }
    return data || null;
  },

  async getUserById(id) {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async createUser(user) {
    const payload = { ...user, user_data: user.user_data || {} };
    const { data, error } = await supabase.from('users').insert(payload).select('*').single();
    if (error) throw error;
    return data;
  },

  async getUserByGoogleId(googleId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('google_id', googleId)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    return (Array.isArray(data) ? data[0] : null) || null;
  },

  async createAccountCompany(company) {
    const { data, error } = await supabase
      .from('account_companies')
      .insert({ ...company, analysis_data: company.analysis_data || {} })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async getAccountCompanyByUser(user_id) {
    const { data, error } = await supabase
      .from('account_companies')
      .select('*')
      .eq('user_id', user_id)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    return (Array.isArray(data) ? data[0] : null) || null;
  },

  async getAccountCompanyByDomain(domain) {
    const { data, error } = await supabase
      .from('account_companies')
      .select('*')
      .eq('domain', domain)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    return (Array.isArray(data) ? data[0] : null) || null;
  },

  async getAccountCompanyAnalysisDataByDomain(domain) {
    const { data, error } = await supabase
      .from('account_companies')
      .select('*')
      .eq('domain', domain)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    return (Array.isArray(data) ? data[0] : null) || null;
  },

  async getAllCompaniesForUser(user_id) {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getCompanyByDomain(user_id, domain) {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', user_id)
      .eq('domain', domain)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    return (Array.isArray(data) ? data[0] : null) || null;
  },

  async createCompany(company) {
    // Insert all provided fields to preserve current callers
    const { data, error } = await supabase
      .from('companies')
      .insert({ ...company, analysis_data: company.analysis_data ,linkedin_url: company.linkedin_url,user_id: company.user_id })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async createProspect(prospect) {
    const { data, error } = await supabase
      .from('prospects')
      .insert({
        ...prospect,
        user_id: prospect.user_id,
   
        linkedin_url: prospect.linkedin_url,
        profile_data: prospect.profile_data ,
        analysis_data: prospect.analysis_data 
    
      })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async getProspectsByCompany(user_id, company_id) {
    const { data, error } = await supabase
      .from('prospects')
      .select('*')
      .eq('user_id', user_id)
      .eq('company_id', company_id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getProspectByLinkedInUrlanddomain(linkedin_url,domain) {
    const { data, error } = await supabase
      .from('prospects')
      .select('*')
      .eq('domain', domain)
      .eq('linkedin_url', linkedin_url)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async getCompanyByLinkedinUrl(user_id, linkedin_url) {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', user_id)
      .eq('linkedin_url', linkedin_url)
      .single();
    if (error) throw error;
    return data || null;
  },

  async updateCompany(company) {
    const { data, error } = await supabase
      .from('companies')
      .update(company)
      .eq('id', company.id)
      .select('*')
      .single();
    if (error) throw error;
    return data || null;
  }
};