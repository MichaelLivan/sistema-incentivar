// VERSÃO CORRIGIDA DO apiService com melhor tratamento de erros

class ApiService {
  constructor() {
    this.baseURL = this.getApiUrl();
    console.log('🌐 [API] URL configurada:', this.baseURL);
  }

  getApiUrl() {
    // Verificar se estamos em produção ou desenvolvimento
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // Desenvolvimento local
        return 'http://localhost:3001/api';
      } else {
        // Produção - usar URL relativa
        return '/api';
      }
    }
    
    // Fallback
    return import.meta.env.VITE_API_URL || '/api';
  }

  getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    return headers;
  }

  // FUNÇÃO MELHORADA DE TRATAMENTO DE ERRO
  async handleResponse(response, context = '') {
    const contentType = response.headers.get('content-type');
    let responseData;

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
        originalError: parseError.message 
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
      let errorMessage;
      
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

  // FUNÇÃO DE LOGIN
  async login(email, password) {
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
      
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Não foi possível conectar ao servidor. Verifique se o backend está rodando');
      }
      
      throw error;
    }
  }

  // FUNÇÃO MELHORADA PARA CRIAR USUÁRIO
  async createUser(userData) {
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
      
      // Verificar conectividade primeiro
      await this.testBasicConnectivity();
      
      const response = await fetch(`${this.baseURL}/users`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(userData)
      });
      
      const result = await this.handleResponse(response, ' CREATE USER');
      return result;
      
    } catch (error) {
      console.error('❌ [API] Erro ao criar usuário:', error);
      
      // Tratar erros de rede
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        throw new Error('Não foi possível conectar ao servidor. Verifique se o backend está rodando na porta 3001');
      }
      
      throw error;
    }
  }

  // FUNÇÃO MELHORADA PARA ATUALIZAR USUÁRIO
  async updateUser(userId, userData) {
    console.log('📝 [API] Atualizando usuário:', userId, userData);
    
    try {
      if (!userId) {
        throw new Error('ID do usuário é obrigatório');
      }
      
      await this.testBasicConnectivity();
      
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

  // FUNÇÃO MELHORADA PARA EXCLUIR USUÁRIO
  async deleteUser(userId) {
    console.log('🗑️ [API] Excluindo usuário:', userId);
    
    try {
      if (!userId) {
        throw new Error('ID do usuário é obrigatório');
      }
      
      await this.testBasicConnectivity();
      
      const response = await fetch(`${this.baseURL}/users/${userId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      
      return await this.handleResponse(response, ' DELETE USER');
      
    } catch (error) {
      console.error('❌ [API] Erro ao excluir usuário:', error);
      
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Não foi possível conectar ao servidor para excluir o usuário');
      }
      
      throw error;
    }
  }

  // TESTE BÁSICO DE CONECTIVIDADE
  async testBasicConnectivity() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.baseURL}/users`, {
        method: 'HEAD', // Apenas cabeçalhos, mais rápido
        headers: this.getAuthHeaders(),
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (response.status === 401) {
        throw new Error('Token de autenticação inválido');
      }
      
      if (response.status === 403) {
        throw new Error('Sem permissão para acessar este recurso');
      }
      
      return true;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Timeout na conexão com o servidor');
      }
      throw error;
    }
  }

  // TESTE BÁSICO DE CONECTIVIDADE
  async testBasicConnectivity() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.baseURL}/users`, {
        method: 'HEAD', // Apenas cabeçalhos, mais rápido
        headers: this.getAuthHeaders(),
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (response.status === 401) {
        throw new Error('Token de autenticação inválido');
      }
      
      if (response.status === 403) {
        throw new Error('Sem permissão para acessar este recurso');
      }
      
      return true;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Timeout na conexão com o servidor');
      }
      throw error;
    }
  }

  // FUNÇÃO PARA OBTER USUÁRIOS COM RETRY
  async getUsers(filters = {}) {
    console.log('🔄 [API] Carregando usuários:', filters);
    
    try {
      const url = new URL(`${this.baseURL}/users`);
      
      // Adicionar filtros
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          url.searchParams.append(key, value);
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

  // VERIFICAÇÃO DE TOKEN MELHORADA
  async verifyToken() {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('⚠️ [API] Nenhum token para verificar');
        return { valid: false };
      }
      
      const response = await fetch(`${this.baseURL}/auth/verify`, {
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        console.log(`⚠️ [API] Token inválido: ${response.status}`);
        localStorage.removeItem('authToken'); // Limpar token inválido
        return { valid: false };
      }
      
      const userData = await this.handleResponse(response, ' VERIFY TOKEN');
      return { valid: true, user: userData.user || userData };
      
    } catch (error) {
      console.log('⚠️ [API] Erro na verificação do token:', error);
      localStorage.removeItem('authToken'); // Limpar token em caso de erro
      return { valid: false };
    }
  }
}

export const apiService = new ApiService();