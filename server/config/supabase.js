import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "..", "..", ".env") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Verificando configuração do Supabase...');
console.log('📍 SUPABASE_URL:', supabaseUrl ? '✅ Configurado' : '❌ Não encontrado');
console.log('🔑 SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? '✅ Configurado' : '❌ Não encontrado');

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("❌ ERRO: Variáveis de ambiente Supabase ausentes!");
  console.error("Por favor, configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env");
  console.error("Exemplo:");
  console.error("SUPABASE_URL=https://seu-projeto.supabase.co");
  console.error("SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key");
  process.exit(1);
}

// Criar cliente Supabase com configurações otimizadas
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application-name': 'sistema-incentivars'
    }
  }
});

// Testar conexão na inicialização
const testConnection = async () => {
  try {
    console.log('🔄 Testando conexão com Supabase...');
    
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Erro ao conectar com Supabase:', error.message);
      return false;
    }
    
    console.log('✅ Conexão com Supabase estabelecida com sucesso!');
    console.log(`📊 Total de usuários no banco: ${data?.length || 'N/A'}`);
    return true;
    
  } catch (err) {
    console.error('❌ Erro crítico na conexão:', err);
    return false;
  }
};

// Executar teste de conexão (apenas em desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
  testConnection();
}

export default supabase;