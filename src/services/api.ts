// VERSÃO COMPLETAMENTE CORRIGIDA DO apiService
// Remove duplicações, implementa todas as funções necessárias, melhora tratamento de erros

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = this.getApiUrl();
    console.log('🌐 [API] URL configurada:', this.baseURL);
  }

  private getApiUrl(): string {
    // Verificar se estamos em produção ou desenvolvimento
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // Desenvolvimento local
        const url = 'http://localhost:3001/api';
        try {
          new URL(url); // Validate URL
          return url;
        } catch {
          return `${window.location.origin}/api`;
        }
      } else {
        // Produção - usar URL relativa
        return `${window.location.origin}/api`;
      }
    }
    
    // Fallback
    const fallbackUrl = import.meta.env.VITE_API_URL || '/api';
    if (fallbackUrl.startsWith('http://') || fallbackUrl.startsWith('https://')) {
      return fallbackUrl;
    }
    return `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'}${fallbackUrl}`;
  }

  private getFullUrl(path: string): string {
    // If baseURL is already absolute, use it directly
    if (this.baseURL.startsWith('http://') || this.baseURL.startsWith('https://')) {
      return `${this.baseURL}${path}`;
    }
    
    // If baseURL is relative, resolve against window.location.origin
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${this.baseURL}${path}`;
    }
    
    // Fallback for server-side rendering
    return `${this.baseURL}${path}`;
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    return headers;
  }

  // FUNÇÃO MELHORADA DE TRATAMENTO DE ERRO
  private async handleResponse(response: Response, context = ''): Promise<any> {
    const contentType = response.headers.get('content-type');
    let responseData: any;

    console.log(`📊 [API${context}] Status: ${response.status}, Content-Type: ${contentType}`);

    try {
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        const text = await response.text();
        responseData = { message: text || `HTTP ${response.status}` };
      }
    } catch (parseError) {
      console.error(`❌ [API${context}] Erro ao parsear resposta:`, parseError);
      responseData = { 
        message: `Erro ao processar resposta do servidor (${response.status})`,
        originalError: parseError instanceof Error ? parseError.message : String(parseError)
      };
    }

    if (!response.ok) {
      console.error(`❌ [API${context}] Erro HTTP:`, {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        data: responseData
      });
      
      // Mensagens de erro mais específicas
      let errorMessage: string;
      
      switch (response.status) {
        case 400:
          errorMessage = responseData.message || 'Dados inválidos enviados';
          break;
        case 401:
          errorMessage = 'Sessão expirada. Faça login novamente';
          localStorage.removeItem('authToken'); // Limpar token inválido
          break;
        case 403:
          errorMessage = 'Você não tem permissão para esta ação';
          break;
        case 404:
          errorMessage = 'Recurso não encontrado. Verifique se o servidor está rodando';
          break;
        case 409:
          errorMessage = responseData.message || 'Conflito de dados (possivelmente email já cadastrado)';
          break;
        case 422:
          errorMessage = responseData.message || 'Dados com formato inválido';
          break;
        case 500:
          errorMessage = 'Erro interno do servidor. Contate o suporte';
          break;
        case 502:
        case 503:
        case 504:
          errorMessage = 'Servidor temporariamente indisponível. Tente novamente em alguns minutos';
          break;
        default:
          errorMessage = responseData.message || `Erro HTTP ${response.status}: ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }

    console.log(`✅ [API${context}] Sucesso:`, responseData);
    return responseData;
  }

  // TESTE BÁSICO DE CONECTIVIDADE - FUNÇÃO ÚNICA E CORRIGIDA
  async testBasicConnectivity(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000); // Reduzido para 3s
      
      // Testar endpoint de health primeiro
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      // Qualquer resposta do servidor (mesmo 401/403) indica que está rodando
      return response.status < 500;
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('❌ [API] Timeout na conexão com o servidor');
          throw new Error('Timeout na conexão com o servidor');
        }
        
        if (error.message.includes('Failed to fetch') || 
            error.message.includes('ERR_CONNECTION_REFUSED') ||
            error.message.includes('ECONNREFUSED')) {
          console.error('❌ [API] Servidor não está acessível');
          throw new Error('Servidor não está acessível. Verifique se o backend está rodando na porta 3001');
        }
      }
      
      console.error('❌ [API] Erro de conectividade:', error);
      throw error;
    }
  }

  // AUTENTICAÇÃO
  async login(email: string, password: string): Promise<any> {
    console.log('🔐 [API] Fazendo login:', email);
    
    try {
      if (!email?.trim()) {
        throw new Error('Email é obrigatório');
      }
      
      if (!password?.trim()) {
        throw new Error('Senha é obrigatória');
      }
      
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const result = await this.handleResponse(response, ' LOGIN');
      
      // Armazenar token se o login foi bem-sucedido
      if (result.token) {
        localStorage.setItem('authToken', result.token);
        console.log('✅ [API] Token armazenado com sucesso');
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ [API] Erro no login:', error);
      
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        throw new Error('Não foi possível conectar ao servidor. Verifique se o backend está rodando');
      }
      
      throw error;
    }
  }

  async verifyToken(): Promise<{ valid: boolean; user?: any }> {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('⚠️ [API] Nenhum token para verificar');
        return { valid: false };
      }
      
      // Testar conectividade primeiro
      await this.testBasicConnectivity();
      
      const response = await fetch(`${this.baseURL}/auth/verify`, {
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        console.log(`⚠️ [API] Token inválido: ${response.status}`);
        localStorage.removeItem('authToken');
        return { valid: false };
      }
      
      const userData = await this.handleResponse(response, ' VERIFY TOKEN');
      return { valid: true, user: userData.user || userData };
      
    } catch (error) {
      console.log('⚠️ [API] Erro na verificação do token:', error);
      localStorage.removeItem('authToken');
      return { valid: false };
    }
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${this.baseURL}/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });
    } catch (error) {
      console.warn('⚠️ [API] Erro no logout do servidor (ignorando):', error);
    } finally {
      localStorage.removeItem('authToken');
    }
  }

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<any> {
    const response = await fetch(`${this.baseURL}/auth/change-password`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });
    
    return await this.handleResponse(response, ' CHANGE PASSWORD');
  }

  // USUÁRIOS
  async getUsers(filters: Record<string, any> = {}): Promise<any[]> {
    console.log('🔄 [API] Carregando usuários:', filters);
    
    try {
      const baseUrl = this.getFullUrl('/users');
      const url = new URL(baseUrl);
      
      // Adicionar filtros
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          url.searchParams.append(key, String(value));
        }
      });
      
      const response = await fetch(url.toString(), {
        headers: this.getAuthHeaders()
      });
      
      const users = await this.handleResponse(response, ' GET USERS');
      return users || [];
      
    } catch (error) {
      console.error('❌ [API] Erro ao carregar usuários:', error);
      throw error;
    }
  }

  async createUser(userData: Record<string, any>): Promise<any> {
    console.log('📤 [API] Criando usuário:', { ...userData, password: '***' });
    
    try {
      // Validações do lado cliente
      if (!userData.name?.trim()) {
        throw new Error('Nome é obrigatório');
      }
      
      if (!userData.email?.trim()) {
        throw new Error('Email é obrigatório');
      }
      
      if (!userData.type) {
        throw new Error('Tipo de usuário é obrigatório');
      }
      
      const response = await fetch(`${this.baseURL}/users`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(userData)
      });
      
      const result = await this.handleResponse(response, ' CREATE USER');
      return result;
      
    } catch (error) {
      console.error('❌ [API] Erro ao criar usuário:', error);
      
      if (error instanceof Error && (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED'))) {
        throw new Error('Não foi possível conectar ao servidor. Verifique se o backend está rodando na porta 3001');
      }
      
      throw error;
    }
  }

  async updateUser(userId: string, userData: Record<string, any>): Promise<any> {
    console.log('📝 [API] Atualizando usuário:', userId, userData);
    
    try {
      if (!userId) {
        throw new Error('ID do usuário é obrigatório');
      }
      
      const response = await fetch(`${this.baseURL}/users/${userId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(userData)
      });
      
      return await this.handleResponse(response, ' UPDATE USER');
      
    } catch (error) {
      console.error('❌ [API] Erro ao atualizar usuário:', error);
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<any> {
    console.log('🗑️ [API] Excluindo usuário:', userId);
    
    try {
      if (!userId) {
        throw new Error('ID do usuário é obrigatório');
      }
      
      const response = await fetch(`${this.baseURL}/users/${userId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      
      return await this.handleResponse(response, ' DELETE USER');
      
    } catch (error) {
      console.error('❌ [API] Erro ao excluir usuário:', error);
      
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        throw new Error('Não foi possível conectar ao servidor para excluir o usuário');
      }
      
      throw error;
    }
  }

  // PACIENTES
  async getPatients(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseURL}/patients`, {
        headers: this.getAuthHeaders()
      });
      
      const patients = await this.handleResponse(response, ' GET PATIENTS');
      return patients || [];
    } catch (error) {
      console.error('❌ [API] Erro ao carregar pacientes:', error);
      throw error;
    }
  }

  async getPatientsForSubstitution(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseURL}/patients?for_substitution=true`, {
        headers: this.getAuthHeaders()
      });
      
      const patients = await this.handleResponse(response, ' GET PATIENTS FOR SUBSTITUTION');
      return patients || [];
    } catch (error) {
      console.error('❌ [API] Erro ao carregar pacientes para substituição:', error);
      throw error;
    }
  }

  async createPatient(patientData: Record<string, any>): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/patients`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(patientData)
      });
      
      return await this.handleResponse(response, ' CREATE PATIENT');
    } catch (error) {
      console.error('❌ [API] Erro ao criar paciente:', error);
      throw error;
    }
  }

  async updatePatient(patientId: string, patientData: Record<string, any>): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/patients/${patientId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(patientData)
      });
      
      return await this.handleResponse(response, ' UPDATE PATIENT');
    } catch (error) {
      console.error('❌ [API] Erro ao atualizar paciente:', error);
      throw error;
    }
  }

  async deletePatient(patientId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/patients/${patientId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      
      return await this.handleResponse(response, ' DELETE PATIENT');
    } catch (error) {
      console.error('❌ [API] Erro ao excluir paciente:', error);
      throw error;
    }
  }

  // SESSÕES
  async getSessions(filters: Record<string, any> = {}): Promise<any[]> {
    try {
      const url = new URL(`${this.baseURL}/sessions`);
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          url.searchParams.append(key, String(value));
        }
      });
      
      const response = await fetch(url.toString(), {
        headers: this.getAuthHeaders()
      });
      
      const sessions = await this.handleResponse(response, ' GET SESSIONS');
      return sessions || [];
    } catch (error) {
      console.error('❌ [API] Erro ao carregar sessões:', error);
      throw error;
    }
  }

  async createSession(sessionData: Record<string, any>): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/sessions`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(sessionData)
      });
      
      return await this.handleResponse(response, ' CREATE SESSION');
    } catch (error) {
      console.error('❌ [API] Erro ao criar sessão:', error);
      throw error;
    }
  }

  async updateSession(sessionId: string, sessionData: Record<string, any>): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/sessions/${sessionId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(sessionData)
      });
      
      return await this.handleResponse(response, ' UPDATE SESSION');
    } catch (error) {
      console.error('❌ [API] Erro ao atualizar sessão:', error);
      throw error;
    }
  }

  async deleteSession(sessionId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      
      return await this.handleResponse(response, ' DELETE SESSION');
    } catch (error) {
      console.error('❌ [API] Erro ao excluir sessão:', error);
      throw error;
    }
  }

  async confirmSession(sessionId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/sessions/${sessionId}/confirm`, {
        method: 'PATCH',
        headers: this.getAuthHeaders()
      });
      
      return await this.handleResponse(response, ' CONFIRM SESSION');
    } catch (error) {
      console.error('❌ [API] Erro ao confirmar sessão:', error);
      throw error;
    }
  }

  async approveSession(sessionId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/sessions/${sessionId}/approve`, {
        method: 'PATCH',
        headers: this.getAuthHeaders()
      });
      
      return await this.handleResponse(response, ' APPROVE SESSION');
    } catch (error) {
      console.error('❌ [API] Erro ao aprovar sessão:', error);
      throw error;
    }
  }

  async launchSession(sessionId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/sessions/${sessionId}/launch`, {
        method: 'PATCH',
        headers: this.getAuthHeaders()
      });
      
      return await this.handleResponse(response, ' LAUNCH SESSION');
    } catch (error) {
      console.error('❌ [API] Erro ao lançar sessão:', error);
      throw error;
    }
  }

  // SUPERVISÕES
  async getSupervisions(filters: Record<string, any> = {}): Promise<any[]> {
    try {
      const url = new URL(`${this.baseURL}/supervisions`);
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          url.searchParams.append(key, String(value));
        }
      });
      
      const response = await fetch(url.toString(), {
        headers: this.getAuthHeaders()
      });
      
      const supervisions = await this.handleResponse(response, ' GET SUPERVISIONS');
      return supervisions || [];
    } catch (error) {
      console.error('❌ [API] Erro ao carregar supervisões:', error);
      throw error;
    }
  }

  async createSupervision(supervisionData: Record<string, any>): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/supervisions`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(supervisionData)
      });
      
      return await this.handleResponse(response, ' CREATE SUPERVISION');
    } catch (error) {
      console.error('❌ [API] Erro ao criar supervisão:', error);
      throw error;
    }
  }

  async deleteSupervision(supervisionId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/supervisions/${supervisionId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      
      return await this.handleResponse(response, ' DELETE SUPERVISION');
    } catch (error) {
      console.error('❌ [API] Erro ao excluir supervisão:', error);
      throw error;
    }
  }

  // CONFIGURAÇÕES DE SUPERVISÃO
  async getSupervisionRates(): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/settings/supervision-rates`, {
        headers: this.getAuthHeaders()
      });
      
      return await this.handleResponse(response, ' GET SUPERVISION RATES');
    } catch (error) {
      console.error('❌ [API] Erro ao carregar taxas de supervisão:', error);
      throw error;
    }
  }

  async saveSupervisionRates(rates: Record<string, number>): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/settings/supervision-rates`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(rates)
      });
      
      return await this.handleResponse(response, ' SAVE SUPERVISION RATES');
    } catch (error) {
      console.error('❌ [API] Erro ao salvar taxas de supervisão:', error);
      throw error;
    }
  }

  // AUXILIARES
  async getATs(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseURL}/users?type=at`, {
        headers: this.getAuthHeaders()
      });
      
      const ats = await this.handleResponse(response, ' GET ATS');
      return ats || [];
    } catch (error) {
      console.error('❌ [API] Erro ao carregar ATs:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService()