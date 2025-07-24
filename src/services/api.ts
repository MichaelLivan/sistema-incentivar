// ✅ CONFIGURAÇÃO CORRIGIDA E MELHORADA DA URL DA API
const API_BASE_URL = (() => {
  // Em produção (Railway), usar a URL do próprio serviço
  if (import.meta.env.PROD) {
    // Se VITE_API_URL estiver definido, usar ele, senão usar URL relativa
    return import.meta.env.VITE_API_URL || '/api';
  }
  // Em desenvolvimento, usar localhost na porta correta do backend (3001)
  return 'http://localhost:3001/api';
})();

console.log('🌐 [API] URL configurada:', API_BASE_URL);
console.log('🔍 [API] Modo:', import.meta.env.PROD ? 'PRODUÇÃO' : 'DESENVOLVIMENTO');
console.log('🔍 [API] VITE_API_URL:', import.meta.env.VITE_API_URL || 'Não definida');

class ApiService {
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      console.log('🔑 [API] Token incluído no header');
    } else {
      console.log('⚠️ [API] Nenhum token encontrado');
    }
    
    return headers;
  }

  private async handleResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');
    let responseData;

    console.log(`📊 [API] Resposta recebida - Status: ${response.status}, Content-Type: ${contentType}`);

    try {
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
        console.log('📄 [API] Dados da resposta:', responseData);
      } else {
        const text = await response.text();
        console.log('📄 [API] Resposta em texto:', text);
        responseData = { message: text || `Erro ${response.status}: ${response.statusText}` };
      }
    } catch (parseError) {
      console.error('❌ [API] Erro ao parsear resposta:', parseError);
      responseData = { message: `Erro ${response.status}: ${response.statusText}` };
    }

    if (!response.ok) {
      console.error('❌ [API] Erro na resposta:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        data: responseData
      });
      
      // ✅ CORREÇÃO: Melhor tratamento de erros específicos
      let errorMessage = responseData.message || responseData.error || 'Erro na requisição';
      
      if (response.status === 401) {
        errorMessage = 'Credencial Inválida - Verifique email e senha';
      } else if (response.status === 403) {
        errorMessage = 'Acesso negado - Permissão insuficiente';
      } else if (response.status === 404) {
        errorMessage = 'Recurso não encontrado - Verifique se o backend está rodando';
      } else if (response.status === 409) {
        errorMessage = responseData.message || 'Conflito de dados';
      } else if (response.status >= 500) {
        errorMessage = 'Erro interno do servidor - Contate o suporte';
      }
      
      throw new Error(errorMessage);
    }

    return responseData;
  }

  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    let url = `${API_BASE_URL}${endpoint}`;
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }
    console.log('🌐 [API] URL construída:', url);
    return url;
  }

  // ✅ FUNÇÃO NOVA: Testar conectividade com o backend
  async testConnection(): Promise<{ success: boolean; url: string; error?: string }> {
    const urlsToTest = [
      `${API_BASE_URL}/health`,
      `${API_BASE_URL}/auth/health`,
      'http://localhost:3001/api/health',
      'http://localhost:3001/api/auth/health'
    ];

    for (const url of urlsToTest) {
      try {
        console.log(`🔍 [API] Testando URL: ${url}`);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (response.ok || response.status === 404) {
          console.log(`✅ [API] Servidor encontrado em: ${url}`);
          return { success: true, url };
        }
        
      } catch (error) {
        console.log(`❌ [API] Falha em ${url}:`, error);
        continue;
      }
    }
    
    return { 
      success: false, 
      url: API_BASE_URL,
      error: 'Não foi possível conectar ao servidor. Verifique se o backend está rodando na porta 3001.'
    };
  }

  // ===== AUTENTICAÇÃO =====
  async login(email: string, password: string): Promise<{ user: any; token: string }> {
    console.log('🔄 [API] Iniciando login para:', email);
    
    // ✅ Primeiro testar conectividade
    const connectionTest = await this.testConnection();
    if (!connectionTest.success) {
      console.error('❌ [API] Servidor não acessível:', connectionTest.error);
      throw new Error(connectionTest.error || 'Servidor não está acessível');
    }
    
    const url = `${API_BASE_URL}/auth/login`;
    console.log('🌐 [API] URL de login:', url);
    
    try {
      console.log('📤 [API] Enviando requisição de login...');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email: email.trim(), password })
      });
      
      console.log('📊 [API] Status da resposta login:', response.status);
      console.log('📊 [API] Headers da resposta:', Object.fromEntries(response.headers.entries()));
      
      const data = await this.handleResponse(response);
      
      // ✅ Validação aprimorada da resposta
      if (!data) {
        throw new Error('Resposta vazia do servidor');
      }
      
      if (!data.user) {
        throw new Error('Dados do usuário não recebidos');
      }
      
      if (!data.token) {
        throw new Error('Token de autenticação não recebido');
      }
      
      console.log('✅ [API] Login bem-sucedido:', {
        user: data.user.name,
        email: data.user.email,
        type: data.user.type,
        tokenReceived: !!data.token
      });
      
      return data;
      
    } catch (error) {
      console.error('❌ [API] Erro no login:', error);
      
      // ✅ Tratamento melhorado de erros de rede
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          throw new Error('Não foi possível conectar ao servidor. Verifique se o backend está rodando na porta 3001.');
        } else if (error.message.includes('ERR_CONNECTION_REFUSED')) {
          throw new Error('Conexão recusada. O servidor backend não está respondendo na porta 3001.');
        } else if (error.message.includes('timeout') || error.name === 'AbortError') {
          throw new Error('Timeout na conexão. Verifique sua internet ou se o servidor está lento.');
        }
      }
      
      throw error;
    }
  }

  async verifyToken(): Promise<{ valid: boolean; user?: any }> {
    try {
      console.log('🔄 [API] Verificando token...');
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('⚠️ [API] Nenhum token para verificar');
        return { valid: false };
      }
      
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        console.log(`⚠️ [API] Token inválido: ${response.status}`);
        return { valid: false };
      }
      
      const userData = await this.handleResponse(response);
      console.log('✅ [API] Token válido para:', userData.user?.email);
      return { valid: true, user: userData.user || userData };
      
    } catch (error) {
      console.log('⚠️ [API] Erro na verificação do token:', error);
      return { valid: false };
    }
  }

  async logout(): Promise<void> {
    try {
      console.log('🔄 [API] Fazendo logout...');
      
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });
      
      console.log('✅ [API] Logout realizado');
    } catch (error) {
      console.warn('⚠️ [API] Erro no logout (ignorando):', error);
      // Ignorar erros de logout
    }
  }

  async changePassword(passwordData: { currentPassword: string; newPassword: string }): Promise<any> {
    console.log('🔐 [API] Alterando senha...');
    
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(passwordData)
    });
    
    return this.handleResponse(response);
  }

  // ===== USUÁRIOS =====
  async getUsers(filters?: { sector?: string; type?: string }): Promise<any[]> {
    console.log('🔄 [API] Carregando usuários:', filters);
    
    const url = new URL(`${API_BASE_URL}/users`);
    if (filters?.sector) {
      url.searchParams.append('sector', filters.sector);
    }
    if (filters?.type) {
      url.searchParams.append('type', filters.type);
    }
    
    console.log('🌐 [API] URL usuários:', url.toString());
    
    const response = await fetch(url.toString(), {
      headers: this.getAuthHeaders()
    });
    
    const users = await this.handleResponse(response);
    console.log('✅ [API] Usuários carregados:', users.length);
    
    return users;
  }

  async createUser(userData: {
    name: string;
    email: string;
    type: string;
    sector?: string;
    hourly_rate?: number;
    password?: string;
  }): Promise<any> {
    console.log('📤 [API] Criando usuário:', { ...userData, password: '***' });
    
    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(userData)
      });
      
      console.log('📊 [API] Status criação usuário:', response.status);
      
      const result = await this.handleResponse(response);
      console.log('✅ [API] Usuário criado com sucesso:', result);
      
      return result;
      
    } catch (error) {
      console.error('❌ [API] Erro ao criar usuário:', error);
      throw error;
    }
  }

  async updateUser(id: string, userData: any): Promise<any> {
    console.log('📝 [API] Atualizando usuário:', id, userData);
    
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    
    const result = await this.handleResponse(response);
    console.log('✅ [API] Usuário atualizado:', result);
    
    return result;
  }

  async deleteUser(id: string): Promise<{ success: boolean }> {
    console.log('🗑️ [API] Deletando usuário:', id);
    
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    
    const result = await this.handleResponse(response);
    console.log('✅ [API] Usuário deletado:', result);
    
    return result;
  }

  // ===== ATs =====
  async getATs(): Promise<any[]> {
    console.log('🔄 [API] Carregando ATs...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/users?type=at`, {
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        console.error('❌ [API] Erro ao carregar ATs:', response.status);
        return [];
      }
      
      const users = await this.handleResponse(response);
      const ats = users.filter((user: any) => user.type && user.type.startsWith('at-'));
      
      console.log('✅ [API] ATs carregados:', ats.length);
      return ats;
      
    } catch (error) {
      console.error('❌ [API] Erro ao carregar ATs:', error);
      return [];
    }
  }

  // ===== PACIENTES =====
  async getPatients(filters?: { sector?: string; at_id?: string }): Promise<any[]> {
    console.log('🔄 [API] Carregando pacientes:', filters);
    
    const url = new URL(`${API_BASE_URL}/patients`);
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          url.searchParams.append(key, value);
        }
      });
    }
    
    const response = await fetch(url.toString(), {
      headers: this.getAuthHeaders()
    });
    
    const patients = await this.handleResponse(response);
    console.log('✅ [API] Pacientes carregados:', patients.length);
    
    return patients;
  }

  async getPatientsForSubstitution(): Promise<any[]> {
    console.log('🔄 [API] Carregando pacientes para substituição...');
    
    const response = await fetch(`${API_BASE_URL}/patients?for_substitution=true`, {
      headers: this.getAuthHeaders()
    });
    
    const patients = await this.handleResponse(response);
    console.log('✅ [API] Pacientes para substituição carregados:', patients.length);
    
    return patients;
  }

  async createPatient(patientData: any): Promise<any> {
    console.log('📤 [API] Criando paciente:', patientData);
    
    const response = await fetch(`${API_BASE_URL}/patients`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(patientData)
    });
    
    const result = await this.handleResponse(response);
    console.log('✅ [API] Paciente criado:', result);
    
    return result;
  }

  async updatePatient(id: string, patientData: any): Promise<any> {
    console.log('📝 [API] Atualizando paciente:', id, patientData);
    
    const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(patientData)
    });
    
    const result = await this.handleResponse(response);
    console.log('✅ [API] Paciente atualizado:', result);
    
    return result;
  }

  async deletePatient(id: string): Promise<{ success: boolean }> {
    console.log('🗑️ [API] Deletando paciente:', id);
    
    const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    
    const result = await this.handleResponse(response);
    console.log('✅ [API] Paciente deletado:', result);
    
    return result;
  }

  // ===== SESSÕES =====
  async getSessions(filters?: { 
    month?: number; 
    year?: number; 
    patient_id?: string;
    at_id?: string;
  }): Promise<any[]> {
    console.log('🔄 [API] Carregando sessões:', filters);
    
    const stringFilters: Record<string, string> | undefined = filters
      ? Object.fromEntries(
          Object.entries(filters)
            .filter(([_, value]) => value !== undefined && value !== null)
            .map(([key, value]) => [key, String(value)])
        )
      : undefined;
    
    const url = this.buildUrl('/sessions', stringFilters);
    
    const response = await fetch(url, {
      headers: this.getAuthHeaders()
    });
    
    const sessions = await this.handleResponse(response);
    console.log('✅ [API] Sessões carregadas:', sessions.length);
    
    return sessions;
  }

  async createSession(sessionData: {
    patient_id: string;
    start_time: string;
    end_time: string;
    date: string;
    observations?: string;
    is_substitution?: boolean;
  }): Promise<any> {
    console.log('📤 [API] Criando sessão:', sessionData);
    
    const response = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(sessionData)
    });
    
    const result = await this.handleResponse(response);
    console.log('✅ [API] Sessão criada:', result);
    
    return result;
  }

  async updateSession(id: string, sessionData: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/sessions/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(sessionData)
    });
    
    return this.handleResponse(response);
  }

  async confirmSession(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/sessions/${id}/confirm`, {
      method: 'PATCH',
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  async approveSession(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/sessions/${id}/approve`, {
      method: 'PATCH',
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  async launchSession(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/sessions/${id}/launch`, {
      method: 'PATCH',
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  async deleteSession(id: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/sessions/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  // ===== SUPERVISÕES =====
  async getSupervisions(filters?: { 
    month?: number; 
    year?: number; 
    at_id?: string 
  }): Promise<any[]> {
    console.log('🔄 [API] Carregando supervisões:', filters);
    
    const stringFilters: Record<string, string> | undefined = filters
      ? Object.fromEntries(
          Object.entries(filters)
            .filter(([_, value]) => value !== undefined && value !== null)
            .map(([key, value]) => [key, String(value)])
        )
      : undefined;
    
    const url = this.buildUrl('/supervisions', stringFilters);
    
    const response = await fetch(url, {
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  async createSupervision(supervisionData: any): Promise<any> {
    console.log('📤 [API] Criando supervisão:', supervisionData);
    
    const response = await fetch(`${API_BASE_URL}/supervisions`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(supervisionData)
    });
    
    return this.handleResponse(response);
  }

  async deleteSupervision(id: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/supervisions/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  // ===== CONFIGURAÇÕES =====
  async saveSupervisionRates(rates: { aba: number; denver: number; grupo: number; escolar: number }): Promise<any> {
    console.log('💾 [API] Salvando taxas de supervisão:', rates);
    
    const response = await fetch(`${API_BASE_URL}/settings/supervision-rates`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(rates)
    });
    
    return this.handleResponse(response);
  }

  async getSupervisionRates(): Promise<{ aba: number; denver: number; grupo: number; escolar: number }> {
    console.log('🔄 [API] Carregando taxas de supervisão...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/settings/supervision-rates`, {
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        return { aba: 35, denver: 35, grupo: 35, escolar: 35 };
      }
      
      const rates = await this.handleResponse(response);
      console.log('✅ [API] Taxas de supervisão carregadas:', rates);
      
      return rates;
    } catch (error) {
      console.error('❌ [API] Erro ao carregar taxas de supervisão:', error);
      return { aba: 35, denver: 35, grupo: 35, escolar: 35 };
    }
  }

  // ===== UTILITÁRIOS =====
  async checkEmailNotRegistered(email: string): Promise<boolean> {
    try {
      console.log('🔍 [API] Verificando disponibilidade do email:', email);
      
      const encodedEmail = encodeURIComponent(email);
      const response = await fetch(`${API_BASE_URL}/users/email/${encodedEmail}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        console.error('❌ [API] Erro ao verificar email:', response.status);
        return false;
      }
      
      const result = await this.handleResponse(response);
      const isAvailable = result?.isAvailable || false;
      
      console.log('✅ [API] Email disponível:', isAvailable);
      return isAvailable;
      
    } catch (error) {
      console.error('❌ [API] Erro ao verificar email:', error);
      return false;
    }
  }
}

export const apiService = new ApiService();