import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts';

const BUCKET_NAME = 'arquivospacientes';
const PENDING_UPLOADS_PREFIX = 'pending_uploads'; // Novo prefixo para uploads pendentes

// Função para gerar um nome de arquivo único, mantendo a extensão original
const generateUniqueFilename = (originalName: string): string => {
  const extension = originalName.split('.').pop()?.toLowerCase() || 'bin';
  return `${crypto.randomUUID()}.${extension}`;
};

serve(async (req: Request) => {
  console.log(`[gerar-url-upload INVOKED] Method: ${req.method}, URL: ${req.url}`);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let supabaseClient: SupabaseClient;
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  } catch (error) {
    console.error('[gerar-url-upload] Error initializing Supabase client:', error);
    return new Response(JSON.stringify({ error: 'Internal server error during client initialization' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    });
  }

  try {
    const {
      fileName,             // Ex: "minhafoto.jpg"
      // fileType,          // Ex: "image/jpeg" - O createSignedUploadUrl infere ou você pode passar no options.
      submissionAttemptId,  // MODIFICADO: de respostaPacienteId para submissionAttemptId
      tipoDocumento,        // 'foto' ou 'exame'
    } = await req.json();

    console.log(`[gerar-url-upload RECEIVED DATA] fileName: ${fileName}, submissionAttemptId: ${submissionAttemptId}, tipoDocumento: ${tipoDocumento}`);

    if (!fileName || !submissionAttemptId || !tipoDocumento) {
      console.error('[gerar-url-upload VALIDATION FAILED] Missing fileName, submissionAttemptId, or tipoDocumento.');
      return new Response(JSON.stringify({ error: 'Missing fileName, submissionAttemptId, or tipoDocumento' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (!['foto', 'exame'].includes(tipoDocumento)) {
      console.error(`[gerar-url-upload VALIDATION FAILED] Invalid tipoDocumento: ${tipoDocumento}`);
      return new Response(JSON.stringify({ error: 'Invalid tipoDocumento. Must be "foto" or "exame".' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const uniqueFilename = generateUniqueFilename(fileName);
    // MODIFICADO: Caminho para incluir o prefixo de pendentes e submissionAttemptId
    const filePathInBucket = `${PENDING_UPLOADS_PREFIX}/${submissionAttemptId}/${tipoDocumento}/${uniqueFilename}`;

    console.log(`[gerar-url-upload] Generating signed URL for path: ${filePathInBucket}`);

    const { data, error } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(filePathInBucket);

    if (error) {
      console.error('[gerar-url-upload] Error creating signed URL:', error);
      throw new Error(`Storage error creating signed URL: ${error.message}`);
    }

    if (!data || !data.signedUrl) {
      console.error('[gerar-url-upload] No signedUrl returned from Supabase.');
      throw new Error('Failed to get signedUrl from Supabase.');
    }

    console.log(`[gerar-url-upload] Signed URL generated successfully for path: ${data.path}`);
    
    // TESTE: Retornar apenas a string da URL assinada
    return new Response(data.signedUrl, {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' }, // Mudar Content-Type
      status: 200,
    });

  } catch (error) {
    console.error('[gerar-url-upload] Error processing request:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 