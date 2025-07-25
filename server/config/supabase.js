import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "..", "..", ".env") });

console.log('🔧 [SUPABASE] Iniciando configuração...');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 [SUPABASE] Verificando configuração...');
console.log('📍 [SUPABASE] SUPABASE_URL:', supabaseUrl ? '✅ Configurado' : '❌ Não encontrado');
console.log('🔑 [SUPABASE] SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? '✅ Configurado' : '❌ Não encontrado');

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("❌ [SUPABASE] ERRO CRÍTICO: Variáveis de ambiente Supabase ausentes!");
  console.error("📋 [SUPABASE] Configure as seguintes variáveis no arquivo .env:");
  console.error("   SUPABASE_URL=https://seu-projeto.supabase.co");
  console.error("   SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key");
  console.error("🔗 [SUPABASE] Encontre essas informações em: https://app.supabase.com/project/SEU_PROJETO/settings/api");
  
  // Não fazer exit aqui para não quebrar o servidor em desenvolvimento
  console.error("⚠️ [SUPABASE] Continuando sem conexão com banco...");
}

// ✅ CONFIGURAÇÃO OTIMIZADA DO CLIENTE SUPABASE
let supabase = null;

if (supabaseUrl && supabaseServiceRoleKey) {
  console.log('🔧 [SUPABASE] Criando cliente...');
  
  try {
    supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-application-name': 'sistema-incentivar',
          'apikey': supabaseServiceRoleKey
        }
      },
      realtime: {
        enabled: false // Desabilitar realtime para melhor performance
      }
    });
    
    console.log('✅ [SUPABASE] Cliente criado com sucesso');
    
  } catch (error) {
    console.error('❌ [SUPABASE] Erro ao criar cliente:', error);
    supabase = null;
  }
} else {
  console.warn('⚠️ [SUPABASE] Cliente não criado - variáveis ausentes');
}

// ✅ FUNÇÃO DE TESTE DE CONEXÃO MELHORADA
const testConnection = async (retries = 3, delay = 2000) => {
  if (!supabase) {
    console.error('❌ [SUPABASE] Não é possível testar - cliente não inicializado');
    return false;
  }
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 [SUPABASE] Testando conexão (tentativa ${attempt}/${retries})...`);
      
      // Teste simples de conexão
      const startTime = Date.now();
      
      const { data, error, count } = await supabase
        .from('users')
        .select('count', { count: 'exact', head: true });
      
      const responseTime = Date.now() - startTime;
      
      if (error) {
        console.error(`❌ [SUPABASE] Erro na tentativa ${attempt}:`, {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        
        // Se não for a última tentativa, aguardar antes de tentar novamente
        if (attempt < retries) {
          console.log(`⏳ [SUPABASE] Aguardando ${delay}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        return false;
      }
      
      console.log('✅ [SUPABASE] Conexão estabelecida com sucesso!');
      console.log(`📊 [SUPABASE] Tempo de resposta: ${responseTime}ms`);
      console.log(`👥 [SUPABASE] Total de usuários no banco: ${count || 'N/A'}`);
      console.log(`🗄️ [SUPABASE] URL do banco: ${supabaseUrl}`);
      
      return true;
      
    } catch (criticalError) {
      console.error(`❌ [SUPABASE] Erro crítico na tentativa ${attempt}:`, {
        message: criticalError.message,
        name: criticalError.name,
        stack: process.env.NODE_ENV === 'development' ? criticalError.stack : undefined
      });
      
      if (attempt < retries) {
        console.log(`⏳ [SUPABASE] Aguardando ${delay}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error('❌ [SUPABASE] Todas as tentativas de conexão falharam');
  return false;
};

// ✅ FUNÇÃO PARA VERIFICAR SAÚDE DA CONEXÃO
const checkHealth = async () => {
  if (!supabase) {
    return {
      status: 'error',
      message: 'Cliente Supabase não inicializado',
      details: { url: !!supabaseUrl, key: !!supabaseServiceRoleKey }
    };
  }
  
  try {
    const startTime = Date.now();
    const { error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      return {
        status: 'error',
        message: 'Erro na consulta ao banco',
        details: { error: error.message, code: error.code }
      };
    }
    
    return {
      status: 'healthy',
      message: 'Conexão ativa e funcionando',
      details: { responseTime: `${responseTime}ms`, url: supabaseUrl }
    };
    
  } catch (error) {
    return {
      status: 'error',
      message: 'Erro crítico na conexão',
      details: { error: error.message }
    };
  }
};

// ✅ EXECUTAR TESTE APENAS EM DESENVOLVIMENTO E COM DELAY
if (process.env.NODE_ENV !== 'production' && supabase) {
  // Aguardar um pouco para o servidor inicializar completamente
  setTimeout(() => {
    testConnection()
      .then(success => {
        if (success) {
          console.log('🎉 [SUPABASE] Inicialização completa e bem-sucedida!');
        } else {
          console.warn('⚠️ [SUPABASE] Problemas na conexão - verifique configurações');
        }
      })
      .catch(error => {
        console.error('❌ [SUPABASE] Erro no teste de conexão:', error);
      });
  }, 1000);
}

// ✅ TRATAMENTO DE SINAIS PARA GRACEFUL SHUTDOWN
process.on('SIGINT', () => {
  console.log('📴 [SUPABASE] Fechando conexões...');
  // Supabase client não precisa de cleanup explícito, mas é boa prática logar
});

process.on('SIGTERM', () => {
  console.log('📴 [SUPABASE] Fechando conexões...');
});

// ✅ EXPORTAR CLIENTE E FUNÇÕES UTILITÁRIAS
export { checkHealth, testConnection };

export default supabase;