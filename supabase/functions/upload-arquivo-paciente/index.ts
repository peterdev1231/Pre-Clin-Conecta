import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts';

// Função para gerar um nome de arquivo único, mantendo a extensão original
const generateUniqueFilename = (originalName: string): string => {
  const extension = originalName.split('.').pop();
  return `${crypto.randomUUID()}.${extension || 'bin'}`;
};

serve(async (req: Request) => {
  console.log(`[registrar-metadados-arquivo INVOKED] Method: ${req.method}`);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let supabaseClient: SupabaseClient;
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing Supabase credentials');
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  } catch (error) {
    console.error('[registrar-metadados-arquivo] Init error:', error);
    return new Response(JSON.stringify({ error: 'Init error' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 });
  }

  try {
    const {
      submission_attempt_id,
      nome_arquivo_original,
      path_storage,
      tipo_mime,
      tipo_documento,
      tamanho_arquivo_bytes,
    } = await req.json();

    console.log(`[registrar-metadados-arquivo RECEIVED DATA] submission_attempt_id: ${submission_attempt_id}, path: ${path_storage}, nome_original: ${nome_arquivo_original}`);

    if (!submission_attempt_id || !nome_arquivo_original || !path_storage || !tipo_mime || !tipo_documento || typeof tamanho_arquivo_bytes === 'undefined') {
      console.error('[registrar-metadados-arquivo VALIDATION FAILED] Missing required metadata fields for pending file.');
      return new Response(JSON.stringify({ error: 'Missing required metadata fields for pending file' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    const { error: dbError } = await supabaseClient
      .from('arquivos_pacientes')
      .insert({
        submission_attempt_id,
        nome_arquivo_original,
        path_storage,
        tipo_mime,
        tipo_documento,
        tamanho_arquivo_bytes,
      });

    if (dbError) {
      console.error('[registrar-metadados-arquivo] DB insert error:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log(`[registrar-metadados-arquivo] Metadata saved for ${path_storage} with submission_attempt_id ${submission_attempt_id}`);
    return new Response(JSON.stringify({ message: 'Pending metadata saved successfully' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    console.error('[registrar-metadados-arquivo] Processing error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
}); 