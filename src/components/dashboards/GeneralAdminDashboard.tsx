// SCRIPT DE DIAGNÓSTICO - Adicione este código temporariamente no seu GeneralAdminDashboard

// 1. TESTE DE CONECTIVIDADE (adicione no useEffect)
useEffect(() => {
  const diagnosticTests = async () => {
    console.log('🔍 [DIAGNÓSTICO] Iniciando testes...');
    
    // Teste 1: Verificar URL da API
    console.log('📍 [DIAGNÓSTICO] URL da API configurada:', process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api');
    
    // Teste 2: Verificar token
    const token = localStorage.getItem('authToken');
    console.log('🔑 [DIAGNÓSTICO] Token presente:', !!token);
    if (token) {
      console.log('🔑 [DIAGNÓSTICO] Token preview:', token.substring(0, 20) + '...');
    }
    
    // Teste 3: Verificar usuário atual
    console.log('👤 [DIAGNÓSTICO] Usuário atual:', {
      name: user?.name,
      email: user?.email,
      type: user?.type,
      hasPermission: user?.type === 'adm-geral'
    });
    
    // Teste 4: Testar conectividade
    try {
      const connectionTest = await apiService.testConnection();
      console.log('🌐 [DIAGNÓSTICO] Teste de conexão:', connectionTest);
    } catch (error) {
      console.error('❌ [DIAGNÓSTICO] Erro na conexão:', error);
    }
    
    // Teste 5: Testar endpoint de usuários
    try {
      console.log('📋 [DIAGNÓSTICO] Testando GET /users...');
      const testUsers = await apiService.getUsers();
      console.log('✅ [DIAGNÓSTICO] GET /users funcionando:', testUsers.length, 'usuários');
    } catch (error) {
      console.error('❌ [DIAGNÓSTICO] Erro ao carregar usuários:', error);
    }
  };
  
  if (user) {
    diagnosticTests();
  }
}, [user]);

// 2. FUNÇÃO DE TESTE PARA CRIAR USUÁRIO (adicione como botão temporário)
const testCreateUser = async () => {
  console.log('🧪 [TESTE] Testando criação de usuário...');
  
  const testUserData = {
    name: 'Teste Usuario',
    email: `teste.${Date.now()}@example.com`,
    type: 'at-aba',
    sector: 'aba',
    hourly_rate: 35,
    password: '123456'
  };
  
  try {
    const result = await apiService.createUser(testUserData);
    console.log('✅ [TESTE] Usuário criado com sucesso:', result);
    alert('✅ Teste de criação funcionou!');
    
    // Recarregar lista
    const updatedUsers = await apiService.getUsers();
    setUsers(updatedUsers);
    
  } catch (error) {
    console.error('❌ [TESTE] Erro no teste de criação:', error);
    alert(`❌ Erro no teste: ${error.message}`);
  }
};

// 3. FUNÇÃO DE TESTE PARA EXCLUIR USUÁRIO
const testDeleteUser = async (userId) => {
  console.log('🧪 [TESTE] Testando exclusão de usuário:', userId);
  
  try {
    const result = await apiService.deleteUser(userId);
    console.log('✅ [TESTE] Usuário excluído:', result);
    alert('✅ Teste de exclusão funcionou!');
    
    // Recarregar lista
    const updatedUsers = await apiService.getUsers();
    setUsers(updatedUsers);
    
  } catch (error) {
    console.error('❌ [TESTE] Erro no teste de exclusão:', error);
    alert(`❌ Erro no teste: ${error.message}`);
  }
};

// 4. VERIFICAÇÃO DETALHADA DE HEADERS (adicione no apiService)
const debugRequest = async (url, options) => {
  console.log('📤 [DEBUG] Fazendo requisição:', {
    url,
    method: options.method || 'GET',
    headers: options.headers,
    bodyPreview: options.body ? options.body.substring(0, 100) + '...' : 'N/A'
  });
  
  const response = await fetch(url, options);
  
  console.log('📥 [DEBUG] Resposta recebida:', {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries())
  });
  
  return response;
};