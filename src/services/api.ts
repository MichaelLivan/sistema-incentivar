const API_BASE_URL = (() => {
  // Em produção (Railway), usar a URL do próprio serviço
  if (import.meta.env.PROD) {
    // Se VITE_API_URL estiver definido, usar ele, senão usar URL relativa
    return import.meta.env.VITE_API_URL || '/api';
  }
  // Em desenvolvimento, usar localhost na porta correta do backend (3001)
  return 'http://localhost:3001/api';
})();

console.log('🌐 API_BASE_URL configurado:', API_BASE_URL);
console.log('🔍 Modo:', import.meta.env.PROD ? 'PRODUÇÃO' : 'DESENVOLVIMENTO');

class ApiService {
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  private async handleResponse(response: Response): Promise<any> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        message: `Erro ${response.status}: ${response.statusText}` 
      }));
      throw new Error(error.message || 'Erro na requisição');
    }
    return response.json();
  }

  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    let url = `${API_BASE_URL}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }
    return url;
  }

  // Autenticação
  async login(email: string, password: string): Promise<{ user: any; token: string }> {
    console.log('🔄 Fazendo login para:', email);
    console.log('🌐 URL:', `${API_BASE_URL}/auth/login`);
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    console.log('📊 Status da resposta:', response.status);
    const data = await this.handleResponse(response);
    console.log('✅ Login bem-sucedido:', data);
    
    return data;
  }

  // Buscar pacientes para substituição (todos do setor)
  async getPatientsForSubstitution(): Promise<any[]> {
    console.log('🔄 Carregando pacientes para substituição...');
    
    const response = await fetch(`${API_BASE_URL}/patients?for_substitution=true`, {
      headers: this.getAuthHeaders()
    });
    
    const patients = await this.handleResponse(response);
    console.log('✅ Pacientes para substituição carregados:', patients.length);
    
    return patients;
  }

  async verifyToken(): Promise<{ valid: boolean; user?: any }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        headers: this.getAuthHeaders()
      });
      const user = await this.handleResponse(response);
      return { valid: true, user };
    } catch (error) {
      console.log('⚠️ Token inválido:', error);
      return { valid: false };
    }
  }

  async logout(): Promise<void> {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
  }

  // Pacientes - SEM MOCK, apenas dados reais
  async getPatients(filters?: { sector?: string; at_id?: string }): Promise<any[]> {
    console.log('🔄 Carregando pacientes do banco de dados...');
    console.log('📋 Filtros aplicados:', filters);
    
    const url = new URL(`${API_BASE_URL}/patients`);
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          console.log(`📌 Adicionando filtro: ${key} = ${value}`);
          url.searchParams.append(key, value);
        }
      });
    }
    
    console.log('🌐 URL final:', url.toString());
    
    const response = await fetch(url.toString(), {
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      console.error('❌ Erro ao carregar pacientes:', response.status, response.statusText);
      throw new Error(`Erro ao carregar pacientes: ${response.status}`);
    }
    
    const patients = await this.handleResponse(response);
    console.log('✅ Pacientes carregados do banco:', patients.length);
    console.log('📊 Dados dos pacientes:', patients);
    
    return patients;
  }

  async getMyPatients(atId: string): Promise<any[]> {
    console.log('🔄 Carregando meus pacientes para AT:', atId);
    return this.getPatients({ at_id: atId });
  }

  async createPatient(patientData: any): Promise<any> {
    console.log('📤 Criando paciente:', patientData);
    
    const response = await fetch(`${API_BASE_URL}/patients`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(patientData)
    });
    
    const result = await this.handleResponse(response);
    console.log('✅ Paciente criado:', result);
    
    return result;
  }

  async updatePatient(id: string, patientData: any): Promise<any> {
    console.log('📝 Atualizando paciente:', id, patientData);
    
    const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(patientData)
    });
    
    const result = await this.handleResponse(response);
    console.log('✅ Paciente atualizado:', result);
    
    return result;
  }

  async deletePatient(id: string): Promise<{ success: boolean }> {
    console.log('🗑️ Deletando paciente:', id);
    
    const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    
    const result = await this.handleResponse(response);
    console.log('✅ Paciente deletado:', result);
    
    return result;
  }

  // ==================== Atendimentos ====================
  async getSessions(filters?: { 
    month?: number; 
    year?: number; 
    patient_id?: string;
    at_id?: string;
  }): Promise<any[]> {
    console.log('🔄 Carregando sessões do banco:', filters);
    
    const stringFilters: Record<string, string> | undefined = filters
      ? Object.fromEntries(
          Object.entries(filters)
            .filter(([_, value]) => value !== undefined && value !== null)
            .map(([key, value]) => [key, String(value)])
        )
      : undefined;
    
    const url = this.buildUrl('/sessions', stringFilters);
    console.log('🌐 URL das sessões:', url);
    
    const response = await fetch(url, {
      headers: this.getAuthHeaders()
    });
    
    const sessions = await this.handleResponse(response);
    console.log('✅ Sessões carregadas:', sessions.length);
    
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
    console.log('📤 Criando sessão no banco:', sessionData);
    
    const response = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(sessionData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro ao criar sessão:', response.status, errorText);
      throw new Error(errorText || `Erro ${response.status}`);
    }
    
    const result = await this.handleResponse(response);
    console.log('✅ Sessão criada no banco:', result);
    
    return result;
  }

  async updateSession(id: string, sessionData: any): Promise<any> {
    console.log('📝 Atualizando sessão:', id, sessionData);
    
    const response = await fetch(`${API_BASE_URL}/sessions/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(sessionData)
    });
    
    return this.handleResponse(response);
  }

  async confirmSession(id: string): Promise<any> {
    console.log('✅ Confirmando sessão:', id);
    
    const response = await fetch(`${API_BASE_URL}/sessions/${id}/confirm`, {
      method: 'PATCH',
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  async approveSession(id: string): Promise<any> {
    console.log('👍 Aprovando sessão:', id);
    
    const response = await fetch(`${API_BASE_URL}/sessions/${id}/approve`, {
      method: 'PATCH',
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  async launchSession(id: string): Promise<any> {
    console.log('🚀 Lançando sessão:', id);
    
    const response = await fetch(`${API_BASE_URL}/sessions/${id}/launch`, {
      method: 'PATCH',
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  async deleteSession(id: string): Promise<{ success: boolean }> {
    console.log('🗑️ Deletando sessão:', id);
    
    const response = await fetch(`${API_BASE_URL}/sessions/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  // ==================== Supervisões ====================
  async getSupervisions(filters?: { 
    month?: number; 
    year?: number; 
    at_id?: string 
  }): Promise<any[]> {
    console.log('🔄 Carregando supervisões do banco:', filters);
    
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
    console.log('📤 Criando supervisão:', supervisionData);
    
    const response = await fetch(`${API_BASE_URL}/supervisions`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(supervisionData)
    });
    
    return this.handleResponse(response);
  }

  async updateSupervision(id: string, supervisionData: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/supervisions/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(supervisionData)
    });
    
    return this.handleResponse(response);
  }

  async deleteSupervision(id: string): Promise<{ success: boolean }> {
    console.log('🗑️ Deletando supervisão:', id);
    
    const response = await fetch(`${API_BASE_URL}/supervisions/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  // ==================== Métodos auxiliares necessários ====================
  
  // Buscar ATs do banco
  async getATs(): Promise<any[]> {
    console.log('🔄 Carregando ATs do banco...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/users?type=at`, {
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        console.error('❌ Erro ao carregar ATs:', response.status);
        return [];
      }
      
      const users = await this.handleResponse(response);
      const ats = users.filter((user: any) => user.type && user.type.startsWith('at-'));
      
      console.log('✅ ATs carregados do banco:', ats.length);
      return ats;
      
    } catch (error) {
      console.error('❌ Erro ao carregar ATs:', error);
      return [];
    }
  }

  // Verificar se email já existe
  async checkEmailNotRegistered(email: string): Promise<boolean> {
    try {
      const encodedEmail = encodeURIComponent(email);
      const response = await fetch(`${API_BASE_URL}/users/email/${encodedEmail}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        return false;
      }
      
      const result = await response.json();
      return result?.isAvailable || false;
      
    } catch (error) {
      console.error('❌ Erro ao verificar email:', error);
      return false;
    }
  }

  // Gerenciar usuários - ATUALIZADO com suporte a hourly_rate
  async createUser(userData: {
    name: string;
    email: string;
    type: string;
    sector?: string;
    hourly_rate?: number;
  }): Promise<any> {
    console.log('📤 Criando usuário no banco:', userData);
    
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    
    const result = await this.handleResponse(response);
    console.log('✅ Usuário criado:', result);
    
    return result;
  }

  async updateUser(id: string, userData: any): Promise<any> {
    console.log('📝 Atualizando usuário:', id, userData);
    
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    
    const result = await this.handleResponse(response);
    console.log('✅ Usuário atualizado:', result);
    
    return result;
  }

  async deleteUser(id: string): Promise<{ success: boolean }> {
    console.log('🗑️ Deletando usuário:', id);
    
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    
    const result = await this.handleResponse(response);
    console.log('✅ Usuário deletado:', result);
    
    return result;
  }

  async getUsers(filters?: { sector?: string; type?: string }): Promise<any[]> {
    console.log('🔄 Carregando usuários:', filters);
    
    const url = new URL(`${API_BASE_URL}/users`);
    if (filters?.sector) {
      url.searchParams.append('sector', filters.sector);
    }
    if (filters?.type) {
      url.searchParams.append('type', filters.type);
    }
    
    const response = await fetch(url.toString(), {
      headers: this.getAuthHeaders()
    });
    
    const users = await this.handleResponse(response);
    console.log('✅ Usuários carregados:', users.length);
    
    return users;
  }

  // Alterar senha
  async changePassword(passwordData: { currentPassword: string; newPassword: string }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(passwordData)
    });
    
    return this.handleResponse(response);
  }

  // ==================== Métodos de configuração ====================
  
  // Salvar/carregar configurações de supervisão
  async saveSupervisionRates(rates: { aba: number; denver: number; grupo: number; escolar: number }): Promise<any> {
    console.log('💾 Salvando taxas de supervisão:', rates);
    
    const response = await fetch(`${API_BASE_URL}/settings/supervision-rates`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(rates)
    });
    
    return this.handleResponse(response);
  }

  async getSupervisionRates(): Promise<{ aba: number; denver: number; grupo: number; escolar: number }> {
    console.log('🔄 Carregando taxas de supervisão...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/settings/supervision-rates`, {
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        // Retornar valores padrão se não houver configuração salva
        return { aba: 35, denver: 35, grupo: 35, escolar: 35 };
      }
      
      const rates = await this.handleResponse(response);
      console.log('✅ Taxas de supervisão carregadas:', rates);
      
      return rates;
    } catch (error) {
      console.error('❌ Erro ao carregar taxas de supervisão:', error);
      // Retornar valores padrão em caso de erro
      return { aba: 35, denver: 35, grupo: 35, escolar: 35 };
    }
  }
}

export const apiService = new ApiService();