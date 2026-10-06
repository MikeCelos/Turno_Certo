// Turno Certo · Cliente Supabase para Autenticação e Sincronização Cloud

// DICA: Podes colar o URL e Chave do teu projeto Supabase aqui diretamente,
// ou introduzi-los no painel de Definições da aplicação.
const DEFAULT_SUPABASE_URL = 'https://xkzgzpffdzvubhdplvjo.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_yRek61qxhB9dGU7FCVcarw_G0-EQ6Qi';

const SUPABASE_STORAGE_URL_KEY = 'tc_supabase_url';
const SUPABASE_STORAGE_KEY_KEY = 'tc_supabase_key';

let supabaseClient = null;

function getSupabaseConfig() {
  try {
    let url = (localStorage.getItem(SUPABASE_STORAGE_URL_KEY) || '').trim();
    let key = (localStorage.getItem(SUPABASE_STORAGE_KEY_KEY) || '').trim();
    if (!url) url = DEFAULT_SUPABASE_URL || '';
    if (!key) key = DEFAULT_SUPABASE_ANON_KEY || '';
    return { url, key };
  } catch (_) {
    return { url: DEFAULT_SUPABASE_URL || '', key: DEFAULT_SUPABASE_ANON_KEY || '' };
  }
}

function saveSupabaseConfig(url, key) {
  try {
    localStorage.setItem(SUPABASE_STORAGE_URL_KEY, (url || '').trim());
    localStorage.setItem(SUPABASE_STORAGE_KEY_KEY, (key || '').trim());
  } catch (_) {}
  initSupabaseClient();
}

function initSupabaseClient() {
  const { url, key } = getSupabaseConfig();
  if (url && key && window.supabase && typeof window.supabase.createClient === 'function') {
    try {
      supabaseClient = window.supabase.createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        }
      });
      return supabaseClient;
    } catch (e) {
      console.warn('Erro ao inicializar Supabase:', e);
      supabaseClient = null;
    }
  }
  return null;
}

// Inicializar na carga
initSupabaseClient();

window.TurnoCertoAuth = {
  isConfigured() {
    if (!supabaseClient) initSupabaseClient();
    const { url, key } = getSupabaseConfig();
    return Boolean(url && key && supabaseClient);
  },

  getConfig() {
    return getSupabaseConfig();
  },

  setConfig(url, key) {
    saveSupabaseConfig(url, key);
  },

  getClient() {
    if (!supabaseClient) initSupabaseClient();
    return supabaseClient;
  },

  async getUser() {
    const client = this.getClient();
    if (!client) return null;
    try {
      const { data: { user }, error } = await client.auth.getUser();
      if (error) return null;
      return user;
    } catch (_) {
      return null;
    }
  },

  async signIn(email, password) {
    const client = this.getClient();
    if (!client) throw new Error('Configuração do Supabase não definida. Configura o URL e a Chave nas Definições.');
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  },

  async signUp(email, password) {
    const client = this.getClient();
    if (!client) throw new Error('Configuração do Supabase não definida. Configura o URL e a Chave nas Definições.');
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw error;
    return data.user;
  },

  async signOut() {
    const client = this.getClient();
    if (client) {
      await client.auth.signOut();
    }
  },

  async resetPassword(email) {
    const client = this.getClient();
    if (!client) throw new Error('Configuração do Supabase não definida. Configura o URL e a Chave nas Definições.');
    const redirectTo = window.location.origin + '/#reset-password';
    const { data, error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    return data;
  },

  async updatePassword(newPassword) {
    const client = this.getClient();
    if (!client) throw new Error('Configuração do Supabase não definida. Configura o URL e a Chave nas Definições.');
    const { data, error } = await client.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return data.user;
  },

  onAuthStateChange(callback) {
    const client = this.getClient();
    if (client && client.auth) {
      client.auth.onAuthStateChange((event, session) => {
        callback(event, session ? session.user : null);
      });
    }
  },

  // Sincronização na nuvem de dados (Configurações e Folha Mensal)
  async syncUpload(payload) {
    const client = this.getClient();
    if (!client) return false;
    const user = await this.getUser();
    if (!user) return false;

    try {
      // Guarda em tabela 'user_data' caso a tabela exista no Supabase
      const { error } = await client
        .from('user_data')
        .upsert({
          user_id: user.id,
          payload: payload,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) {
        console.warn('Nota: Sincronização cloud table opcional não configurada ou tabela inexistente:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Erro ao sincronizar:', e);
      return false;
    }
  },

  async syncDownload() {
    const client = this.getClient();
    if (!client) return null;
    const user = await this.getUser();
    if (!user) return null;

    try {
      const { data, error } = await client
        .from('user_data')
        .select('payload')
        .eq('user_id', user.id)
        .single();

      if (error || !data) return null;
      return data.payload;
    } catch (_) {
      return null;
    }
  }
};
