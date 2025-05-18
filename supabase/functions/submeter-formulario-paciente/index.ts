import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts';

console.log('submeter-formulario-paciente function booting up');

interface FormData {
  linkId: string; // codigo_unico do link
  submissionAttemptId: string; // NOVO: ID da tentativa de submissão para associar arquivos
  nomePaciente: string;
  queixaPrincipal: string;
  medicacoesEmUso?: string;
  alergiasConhecidas?: string;
  // Futuramente: informações sobre arquivos enviados (paths no storage, etc.)
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // Alterado de ANON para SERVICE_ROLE

    if (!supabaseUrl || !supabaseServiceRoleKey) { // Verificação atualizada
      console.error('Supabase URL or Service Role Key is not defined in environment variables.'); // Mensagem atualizada
      throw new Error('Configuração do servidor incompleta.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey); // Usar Service Role Key

    const formData = await req.json() as FormData;

    if (!formData.linkId || !formData.submissionAttemptId || !formData.nomePaciente || !formData.queixaPrincipal) {
      return new Response(JSON.stringify({ error: 'Dados do formulário incompletos. Link ID, ID da tentativa, nome e queixa são obrigatórios.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    
    console.log(`Submitting form for linkId: ${formData.linkId}, submissionAttemptId: ${formData.submissionAttemptId}`);

    // 1. Verificar o link
    const { data: linkData, error: linkError } = await supabase
      .from('links_formularios')
      .select('id, profissional_id, ativo, data_expiracao, usado_em')
      .eq('codigo_unico', formData.linkId)
      .single();

    if (linkError || !linkData) {
      console.warn('Link not found or db error:', linkError?.message);
      return new Response(JSON.stringify({ error: 'Link do formulário inválido ou não encontrado.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404, // Not Found ou 400 Bad Request se link inválido
      });
    }

    if (!linkData.ativo) {
      return new Response(JSON.stringify({ error: 'Este link de formulário não está mais ativo.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403, // Forbidden
      });
    }

    if (linkData.usado_em) {
      return new Response(JSON.stringify({ error: 'Este formulário já foi respondido.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403, // Forbidden
      });
    }

    if (linkData.data_expiracao) {
      const now = new Date();
      const expirationDate = new Date(linkData.data_expiracao);
      if (now > expirationDate) {
        return new Response(JSON.stringify({ error: 'Este link de formulário expirou.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403, // Forbidden
        });
      }
    } else {
      // Se por algum motivo não tiver data de expiração (não deveria acontecer)
      console.warn(`Link ID ${formData.linkId} sem data de expiração.`);
    }

    const profissionalId = linkData.profissional_id;
    const originalLinkId = linkData.id; // UUID da tabela links_formularios

    // 2. Inserir a resposta do paciente
    const { data: novaResposta, error: insertError } = await supabase
      .from('respostas_pacientes')
      .insert({
        link_formulario_id: originalLinkId,
        profissional_id: profissionalId,
        nome_paciente: formData.nomePaciente,
        queixa_principal: formData.queixaPrincipal,
        medicacoes_em_uso: formData.medicacoesEmUso,
        alergias_conhecidas: formData.alergiasConhecidas,
        data_envio: new Date().toISOString(),
        // 'revisado_pelo_profissional' e 'atualizado_em' terão seus defaults ou serão atualizados depois
      })
      .select('id') // Retornar o ID da resposta criada
      .single();

    if (insertError) {
      console.error('Erro ao inserir resposta do paciente:', insertError.message);
      throw new Error('Falha ao salvar os dados do formulário.');
    }

    if (!novaResposta || !novaResposta.id) {
      console.error('Não foi possível obter o ID da resposta do paciente após inserção.');
      throw new Error('Erro ao confirmar o salvamento dos dados.');
    }
    
    const respostaIdReal = novaResposta.id;
    console.log(`Resposta do paciente ${respostaIdReal} salva com sucesso.`);

    // 3. Associar arquivos pendentes à resposta recém-criada
    const { error: updateArquivosError } = await supabase
      .from('arquivos_pacientes')
      .update({ resposta_paciente_id: respostaIdReal })
      .eq('submission_attempt_id', formData.submissionAttemptId)
      .is('resposta_paciente_id', null); // Apenas atualiza se ainda não estiver associado

    if (updateArquivosError) {
      console.error(`Erro ao associar arquivos pendentes (submission_attempt_id: ${formData.submissionAttemptId}) à resposta ${respostaIdReal}:`, updateArquivosError.message);
      // Considerar logar este erro, mas não necessariamente falhar a submissão inteira por isso,
      // já que os dados do formulário principal foram salvos. Uma rotina de reconciliação poderia lidar com isso.
    } else {
      console.log(`Arquivos pendentes para submission_attempt_id: ${formData.submissionAttemptId} associados à resposta ${respostaIdReal}.`);
    }

    // 4. Marcar o link como usado
    const { error: updateLinkError } = await supabase
      .from('links_formularios')
      .update({ 
        usado_em: new Date().toISOString(),
        ativo: false 
      })
      .eq('id', originalLinkId);

    if (updateLinkError) {
      console.error('Erro ao marcar link como usado:', updateLinkError.message);
      // Logar e continuar.
    } else {
      console.log(`Link ${originalLinkId} marcado como usado.`);
    }

    return new Response(JSON.stringify({ 
      message: 'Formulário enviado com sucesso!', 
      respostaId: respostaIdReal 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // Created
    });

  } catch (error) {
    console.error('Erro inesperado na função submeter-formulario-paciente:', error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message || 'Ocorreu um erro interno no servidor.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 