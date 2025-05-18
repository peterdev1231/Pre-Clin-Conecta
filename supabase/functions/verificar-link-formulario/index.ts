import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log('verificar-link-formulario function booting up - v2 (service role)');

serve(async (req: Request) => {
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for admin client');
      throw new Error('Supabase URL or Service Role Key is not defined for admin operations.');
    }

    // Cliente Supabase usando a Service Role Key para bypassar RLS para esta operação específica
    const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    const { linkId } = await req.json();

    if (!linkId) {
      return new Response(JSON.stringify({ status: 'invalid', reason: 'missing_link_id' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log(`Verifying linkId (using service role): ${linkId}`);

    // Buscar o link na tabela usando o codigo_unico com o cliente admin
    const { data: linkData, error: dbError } = await supabaseAdminClient
      .from('links_formularios')
      .select('id, profissional_id, ativo, data_expiracao, usado_em')
      .eq('codigo_unico', linkId)
      .single();

    if (dbError) {
      // Se o erro for PGRST116, significa "single() did not return a single row", ou seja, link não encontrado.
      if (dbError.code === 'PGRST116') {
        console.warn(`Link ID ${linkId} not found (service role query).`);
        return new Response(JSON.stringify({ status: 'invalid', reason: 'not_found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        });
      }
      // Para outros erros de banco, logar e retornar erro genérico
      console.error('Database error (service role query):', dbError);
      throw new Error('Falha ao consultar o banco de dados (admin operation).');
    }

    if (!linkData) { // Redundante devido ao .single() e PGRST116, mas bom para clareza.
      console.warn(`Link ID ${linkId} resulted in no data (service role query), though no DB error.`);
      return new Response(JSON.stringify({ status: 'invalid', reason: 'not_found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Verificar se o link está ativo
    if (!linkData.ativo) {
      console.log(`Link ID ${linkId} is inactive.`);
      return new Response(JSON.stringify({ status: 'invalid', reason: 'inactive' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403, // Forbidden
      });
    }

    // Verificar se o link já foi usado
    if (linkData.usado_em) {
      console.log(`Link ID ${linkId} has already been used on: ${linkData.usado_em}`);
      return new Response(JSON.stringify({ status: 'invalid', reason: 'already_used' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Verificar a data de expiração
    if (linkData.data_expiracao) {
      const now = new Date();
      const expirationDate = new Date(linkData.data_expiracao);
      if (now > expirationDate) {
        console.log(`Link ID ${linkId} expired on: ${linkData.data_expiracao}`);
        return new Response(JSON.stringify({ status: 'invalid', reason: 'expired' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        });
      }
    } else {
      // Se não houver data_expiracao, o link não expira (pode ser um caso de uso ou um erro de lógica na criação)
      // Conforme o modal, o link é válido por 7 dias, então data_expiracao deveria existir.
      // Considerar isso como inválido se a regra é sempre ter expiração.
      // Por ora, vamos assumir que se não tem data_expiracao, não expira.
      // Mas, de acordo com o modal "O link será válido por 7 dias", data_expiracao DEVE existir.
      // Se for uma regra estrita, podemos retornar 'expired' ou 'invalid_configuration' aqui.
      console.warn(`Link ID ${linkId} does not have an expiration date set.`);
    }

    // Se todas as verificações passaram, o link é válido
    console.log(`Link ID ${linkId} is valid (service role check).`);
    return new Response(
      JSON.stringify({
        status: 'valid',
        linkDetails: {
          id: linkData.id, // UUID do link na tabela links_formularios
          profissional_id: linkData.profissional_id,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in verify-link-form function (v2 - service role):', error.message, error);
    return new Response(JSON.stringify({ error: error.message, status: 'invalid', reason: 'internal_server_error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 