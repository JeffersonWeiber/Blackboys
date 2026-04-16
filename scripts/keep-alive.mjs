import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERRO: SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios nas variáveis de ambiente.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function keepAlive() {
  console.log('Iniciando script de Keep-Alive para Supabase...')
  
  try {
    // 1. Inserir um novo registro de ping
    const { data, error: insertError } = await supabase
      .from('keep_alive')
      .insert([{ ping_status: 'ok' }])
      .select()

    if (insertError) throw insertError
    
    console.log('✅ Novo ping inserido com sucesso:', data[0].id)

    // 2. Deletar pings antigos (manter apenas o último inserido)
    // Isso evita acúmulo de dados desnecessários
    const { error: deleteError } = await supabase
      .from('keep_alive')
      .delete()
      .not('id', 'eq', data[0].id)

    if (deleteError) {
      console.warn('⚠️ Aviso: Não foi possível limpar pings antigos, mas o novo foi inserido.', deleteError)
    } else {
      console.log('✅ Registros antigos limpos.')
    }
    
    console.log('🚀 Operação de Keep-Alive concluída com sucesso.')
  } catch (error) {
    console.error('❌ Erro crítico no script de Keep-Alive:', error.message)
    process.exit(1)
  }
}

keepAlive()
