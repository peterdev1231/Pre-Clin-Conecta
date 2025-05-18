import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  Deno.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { resposta_paciente_id } = await req.json()
    console.log(`[listar-arquivos-resposta] Recebido resposta_paciente_id: ${resposta_paciente_id}`);

    if (!resposta_paciente_id) {
      return new Response(
        JSON.stringify({ error: 'resposta_paciente_id é obrigatório' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Buscar arquivos associados à resposta
    const { data: arquivosDb, error: errorArquivos } = await supabaseAdmin
      .from('arquivos_pacientes')
      .select('id, nome_arquivo_original, tipo_documento, path_storage, criado_em, tipo_mime')
      .eq('resposta_paciente_id', resposta_paciente_id)

    if (errorArquivos) {
      console.error('[listar-arquivos-resposta] Erro ao buscar arquivos do DB:', errorArquivos)
      throw errorArquivos
    }

    console.log(`[listar-arquivos-resposta] Arquivos encontrados no DB: ${JSON.stringify(arquivosDb)}`);

    if (!arquivosDb || arquivosDb.length === 0) {
      console.log('[listar-arquivos-resposta] Nenhum arquivo encontrado, retornando array vazio.');
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Mapear para a estrutura esperada pelo frontend (com nome_arquivo)
    const arquivosFormatados = arquivosDb.map(arquivo => ({
      id: arquivo.id,
      nome_arquivo: arquivo.nome_arquivo_original,
      tipo_documento: arquivo.tipo_documento,
      path_storage: arquivo.path_storage,
      criado_em: arquivo.criado_em,
      tipo_mime: arquivo.tipo_mime,
      signedUrl: null,
      error: undefined as string | undefined
    }));

    // Gerar URLs assinadas para cada arquivo
    const arquivosComUrl = await Promise.all(
      arquivosFormatados.map(async (arquivo) => {
        console.log(`[listar-arquivos-resposta] Gerando URL para path: ${arquivo.path_storage}`);
        if (!arquivo.path_storage) {
          console.error(`[listar-arquivos-resposta] Path de armazenamento NULO ou INDEFINIDO para arquivo ID: ${arquivo.id}`);
          return { ...arquivo, signedUrl: null, error: 'Path de armazenamento ausente para este arquivo.' };
        }
        try {
          const { data, error: errorSignedUrl } =
            await supabaseAdmin.storage
              .from('arquivospacientes')
              .createSignedUrl(arquivo.path_storage, 60 * 5)

          if (errorSignedUrl) {
            console.error(
              `[listar-arquivos-resposta] Erro ao gerar URL assinada para ${arquivo.path_storage}:`,
              JSON.stringify(errorSignedUrl)
            )
            return { ...arquivo, signedUrl: null, error: `Falha ao gerar URL: ${errorSignedUrl.message}` }
          }
          console.log(`[listar-arquivos-resposta] URL gerada para ${arquivo.path_storage}: ${data?.signedUrl}`);
          return { ...arquivo, signedUrl: data?.signedUrl }
        } catch (mapError) {
          console.error(`[listar-arquivos-resposta] Exceção dentro do map para ${arquivo.path_storage}:`, mapError);
          return { ...arquivo, signedUrl: null, error: `Exceção ao processar arquivo: ${mapError.message}` };
        }
      })
    )

    console.log(`[listar-arquivos-resposta] Arquivos com URLs: ${JSON.stringify(arquivosComUrl)}`);
    return new Response(JSON.stringify(arquivosComUrl), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (e) {
    console.error('[listar-arquivos-resposta] Erro INESPERADO CAPTURADO (status 500):', e);
    console.error('[listar-arquivos-resposta] Detalhes do erro: message:', e.message, 'stack:', e.stack, 'name:', e.name);
    let errorMessage = 'Erro interno do servidor ao listar arquivos.';
    if (e instanceof Error) {
        errorMessage = e.message;
    } else if (typeof e === 'string') {
        errorMessage = e;
    } else if (typeof e === 'object' && e !== null && 'message' in e) {
        errorMessage = String(e.message);
    }

    return new Response(JSON.stringify({ error: errorMessage, details: JSON.stringify(e) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}) 