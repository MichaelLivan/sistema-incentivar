import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 1. VERIFICAR ESTRUTURA DA TABELA
async function checkTableStructure() {
  console.log('\n🔍 VERIFICANDO ESTRUTURA DA TABELA USERS...\n');
  
  try {
    // Tentar buscar um registro para ver quais campos existem
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Erro ao acessar tabela users:', error.message);
      return false;
    }

    if (data && data.length > 0) {
      console.log('✅ Tabela users existe. Campos encontrados:');
      Object.keys(data[0]).forEach(field => {
        console.log(`   - ${field}`);
      });
    } else {
      console.log('⚠️ Tabela users existe mas está vazia');
    }

    return true;
  } catch (err) {
    console.error('❌ Erro ao verificar estrutura:', err.message);
    return false;
  }
}