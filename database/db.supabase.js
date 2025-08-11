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

  async getCompanyDataByLinkedinUrl(linkedin_url) {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('linkedin_url', linkedin_url)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async updateAccountCompanyAnalysisData(domain, analysisData) {
    const { data, error } = await supabase
      .from('account_companies')
      .update({ analysis_data: analysisData, updated_at: new Date().toISOString() })
      .eq('domain', domain)
      .select('*')
      .single();
    if (error) throw error;
    return data;
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
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
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
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async getAccountCompanyByDomain(domain) {
    const { data, error } = await supabase
      .from('account_companies')
      .select('*')
      .eq('domain', domain)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async getAccountCompanyAnalysisDataByDomain(domain) {
    const { data, error } = await supabase
      .from('account_companies')
      .select('*')
      .eq('domain', domain)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
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
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async createCompany(company) {
    // Insert all provided fields to preserve current callers
    const { data, error } = await supabase
      .from('companies')
      .insert({ ...company, analysis_data: company.analysis_data || {}, rapidapi_data: company.rapidapi_data || {} })
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
        analysis_data: prospect.analysis_data || {},
        rapidapi_data: prospect.rapidapi_data || {}
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

  async getProspectByLinkedInUrl(user_id, linkedin_url) {
    const { data, error } = await supabase
      .from('prospects')
      .select('*')
      .eq('user_id', user_id)
      .eq('linkedin_url', linkedin_url)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }
};