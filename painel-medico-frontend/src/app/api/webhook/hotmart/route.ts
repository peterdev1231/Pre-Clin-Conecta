import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Variáveis de Ambiente Esperadas:
// process.env.NEXT_PUBLIC_SUPABASE_URL
// process.env.SUPABASE_SERVICE_ROLE_KEY
// process.env.HOTMART_SECRET_TOKEN (para verificar a assinatura do webhook - recomendado)
// process.env.NEXT_PUBLIC_APP_URL (ex: https://app.preclinconecta.com)

// Funções auxiliares para mapeamento de dados
function mapearPlanoHotmart(nomePlanoHotmart?: string): string {
  if (!nomePlanoHotmart) return 'desconhecido'; // Valor padrão ou tratamento de erro
  const nomeLower = nomePlanoHotmart.toLowerCase();
  
  // Primeiro verifica o trial anual (mais específico)
  if (nomeLower.includes('anual') && (nomeLower.includes('trial') || nomeLower.includes('teste'))) { // Verifica por 'trial' ou 'teste'
    return 'anual_trial';
  }

  // Depois verifica o anual pago (menos específico)
  if (nomeLower.includes('anual')) {
    return 'anual_pago';
  }

  // Verifica o mensal
  if (nomeLower.includes('mensal')) {
    return 'mensal';
  }

  return 'desconhecido'; // Fallback
}

function mapearStatusHotmart(statusHotmart?: string): string {
  if (!statusHotmart) return 'pendente_confirmacao_trial'; // Ou outro status padrão
  const statusLower = statusHotmart.toLowerCase();
  switch (statusLower) {
    case 'active':
    case 'activated': // Adicionando 'activated' que pode vir da Hotmart
      return 'ativo'; // Pode precisar diferenciar trial ativo de pago ativo aqui com base no tipo de plano
    case 'inactive':
      return 'inativo';
    case 'canceled':
    case 'cancelled': // Adicionando 'cancelled'
      return 'cancelado';
    case 'refunded':
      return 'reembolsado';
    case 'chargeback':
      return 'chargeback';
    case 'trial': // Se a Hotmart enviar 'trial' diretamente
      return 'trial';
    default:
      return 'pendente_confirmacao_trial'; // Ou um status genérico de pendência
  }
}

function calcularDataExpiracao(dataInicioParam: Date | number, nomePlanoHotmart?: string): string {
  const dataInicio = new Date(dataInicioParam);
  if (!nomePlanoHotmart || isNaN(dataInicio.getTime())) {
    // Retorna uma data no passado ou lança um erro se os parâmetros forem inválidos
    return new Date(0).toISOString(); 
  }
  const nomeLower = nomePlanoHotmart.toLowerCase();
  
  if (nomeLower.includes('anual')) {
    // Para 'anual_trial' ou 'anual_pago'
    // Se for trial, a Hotmart costuma dar 7 dias, mas o plano é "anual"
    // Vamos assumir que o trial tem uma duração específica, ex: 7 dias
    if (nomeLower.includes('trial')) {
        const dataExpiracaoTrial = new Date(dataInicio);
        dataExpiracaoTrial.setDate(dataInicio.getDate() + 7); // Trial de 7 dias
        return dataExpiracaoTrial.toISOString();
    }
    // Para anual pago
    const dataExpiracaoAnual = new Date(dataInicio);
    dataExpiracaoAnual.setFullYear(dataInicio.getFullYear() + 1);
    return dataExpiracaoAnual.toISOString();

  } else if (nomeLower.includes('mensal')) {
    const dataExpiracaoMensal = new Date(dataInicio);
    dataExpiracaoMensal.setMonth(dataInicio.getMonth() + 1);
    return dataExpiracaoMensal.toISOString();
  }
  
  // Fallback: se não for anual nem mensal, talvez um trial curto padrão?
  // Ou, se o plano for desconhecido, dar um acesso mínimo ou nenhum.
  // Por segurança, um trial curto se não especificado.
  const dataExpiracaoFallback = new Date(dataInicio);
  dataExpiracaoFallback.setDate(dataInicio.getDate() + 7); // Fallback para 7 dias
  return dataExpiracaoFallback.toISOString();
}

export async function POST(req: NextRequest) {
  console.log('[Hotmart Webhook] Recebida nova requisição.');

  // Inicializar Supabase Admin Client
  // Certifique-se de que as variáveis de ambiente estão configuradas na Vercel
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hotmartSecret = process.env.HOTMART_SECRET_TOKEN; // Seu token secreto configurado na Hotmart

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('[Hotmart Webhook] Variáveis de ambiente do Supabase não configuradas.');
    return NextResponse.json({ error: 'Configuração do servidor incompleta.' }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    // 1. Verificar o segredo do Hotmart (se configurado)
    // Exemplo: A Hotmart envia um header 'x-hotmart-hottok' ou similar.
    // A lógica exata de verificação depende de como o Hotmart envia o token/assinatura.
    // Adapte esta parte conforme a documentação do Hotmart sobre webhooks.
    const receivedSignature = req.headers.get('x-hotmart-hottok'); // Adapte para o header correto
    if (hotmartSecret && receivedSignature !== hotmartSecret) {
       console.warn('[Hotmart Webhook] Token de autenticação do Hotmart inválido ou ausente.');
       // Para produção, você pode querer retornar um erro 401 ou 403 aqui.
       // Por enquanto, apenas logamos, mas idealmente deveria bloquear se o token for obrigatório.
       // return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const payload = await req.json();
    console.log('[Hotmart Webhook] Payload recebido:', JSON.stringify(payload, null, 2));

    // 2. Extrair dados relevantes do payload do Hotmart
    // Ajustado com base no payload de exemplo fornecido
    const eventoPrincipal = payload.event; // Ex: "PURCHASE_APPROVED"
    const statusDaCompra = payload.data?.purchase?.status; // Ex: "APPROVED"
    const emailComprador = payload.data?.buyer?.email;
    const nomeComprador = payload.data?.buyer?.name;
    const transactionId = payload.data?.purchase?.transaction;
    // Outros campos que podem ser úteis: payload.data?.product?.id, payload.data?.product?.name, payload.data?.offer?.code, payload.data?.subscription?.subscriber?.code

    if (!emailComprador) {
      console.error('[Hotmart Webhook] Email do comprador não encontrado no payload.');
      return NextResponse.json({ error: 'Payload inválido: email do comprador ausente.' }, { status: 400 });
    }

    console.log(`[Hotmart Webhook] Status da compra: ${statusDaCompra}, Email: ${emailComprador}`);

    // 3. Verificar o status da transação (apenas prosseguir se aprovada/completa)
    // Adapte a lista de status/eventos conforme necessário
    // Usaremos o eventoPrincipal para mais clareza, mas poderia ser o statusDaCompra também.
    const eventosPermitidos = ['PURCHASE_APPROVED']; // Adicione outros eventos se necessário, ex: 'SUBSCRIPTION_ACTIVATED'
    if (!eventoPrincipal || !eventosPermitidos.includes(eventoPrincipal.toUpperCase())) {
      console.log(`[Hotmart Webhook] Evento '${eventoPrincipal}' (ou status '${statusDaCompra}') não requer ação. Ignorando.`);
      return NextResponse.json({ message: 'Webhook recebido, mas evento/status não requer ação.' }, { status: 200 });
    }

    console.log(`[Hotmart Webhook] Processando evento '${eventoPrincipal}' para ${emailComprador}.`);

    // 4. Gerar senha aleatória, criar usuário e enviar credenciais por email customizado
    let userId: string | undefined;

    // Função simples para gerar uma senha aleatória (adapte conforme necessário)
    function generateRandomPassword(length = 12): string {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
      let password = '';
      for (let i = 0; i < length; i++) {
        password += chars[Math.floor(Math.random() * chars.length)];
      }
      return password;
    }

    const generatedPassword = generateRandomPassword();
    console.log('[Hotmart Webhook] Generated password (DEBUG): ', generatedPassword); // DEBUG: REMOVER EM PRODUÇÃO

    console.log(`[Hotmart Webhook] Tentando criar usuário: ${emailComprador} com senha gerada.`);

    // Usar createUser em vez de inviteUserByEmail
    const { data: createUserData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: emailComprador,
        password: generatedPassword,
        email_confirm: true, // Assumimos que o email da Hotmart é válido/confirmado
        user_metadata: { 
            nome_completo: nomeComprador // Salva nome_completo nos metadados
        }
    });

    // Definir o nome da Edge Function de envio de email
    const emailFunctionName = 'enviar-email-boas-vindas'; // Nome da função Edge

    if (createUserError) {
        // Tratar caso de usuário já existente
        if (createUserError.message.toLowerCase().includes('user already registered') ||
            createUserError.message.toLowerCase().includes('already been registered') ||
            (createUserError.message.toLowerCase().includes('conflict') && createUserError.message.toLowerCase().includes('email'))) {

            console.log(`[Hotmart Webhook] Usuário ${emailComprador} já está registrado. Tentando buscar ID para atualizar assinatura e notificar.`);

            // Como createUser falhou porque o usuário já existe, tentamos buscar o usuário existente.
            const { data: { users: listaDeUsuarios }, error: erroListagem } = await supabaseAdmin.auth.admin.listUsers({ perPage: 10000 }); // Ajuste perPage conforme necessário

            if (erroListagem) {
              console.error('[Hotmart Webhook] Erro ao listar usuários para encontrar o ID do existente:', erroListagem);
              // Continuamos, mas sem userId.
            } else {
              const usuarioEncontrado = listaDeUsuarios.find(u => u.email === emailComprador);
              if (usuarioEncontrado) {
                userId = usuarioEncontrado.id;
                console.log(`[Hotmart Webhook] Usuário existente ${emailComprador} encontrado com ID: ${userId}.`);
                // Se o usuário já existe, NÃO geramos uma nova senha nem enviamos um email com senha. Assume-se que ele já definiu a senha ou passará pelo fluxo de "esqueci minha senha" se necessário.
                // Podemos adicionar uma lógica aqui para reenviar um link de "esqueci minha senha" se necessário, mas por enquanto, apenas logamos e continuamos para a lógica da assinatura.
                 console.log(`[Hotmart Webhook] Usuário ${emailComprador} já existe. Pulando envio de email de primeiro acesso com senha.`);
              } else {
                console.warn(`[Hotmart Webhook] Usuário ${emailComprador} supostamente já registrado (criação falhou), mas não foi encontrado na lista. Assinatura pode não ser vinculada.`);
              }
            }

        } else {
            // Outro erro durante a criação do usuário
            console.error('[Hotmart Webhook] Erro ao criar usuário no Supabase Auth:', createUserError.message, createUserError);
            return NextResponse.json({ error: `Falha ao criar usuário: ${createUserError.message}` }, { status: 500 });
        }
    } else if (createUserData && createUserData.user) {
        // Usuário criado com sucesso
        userId = createUserData.user.id;
        console.log(`[Hotmart Webhook] Usuário criado com sucesso para ${emailComprador}. ID do usuário: ${userId}.`);
        
        // Chamar a Edge Function para enviar o email APENAS se um NOVO usuário foi criado
        try {
            // Construir a URL da função Edge
            const supabaseUrlBase = process.env.NEXT_PUBLIC_SUPABASE_URL;
            if (!supabaseUrlBase) {
                 console.error('[Hotmart Webhook] Variável de ambiente NEXT_PUBLIC_SUPABASE_URL não configurada para chamar Edge Function.');
                 // Decida se deve retornar um erro ou apenas logar e continuar.
                 // Por enquanto, apenas logamos.
            } else {
                const emailFunctionUrl = `${supabaseUrlBase}/functions/v1/${emailFunctionName}`;

                console.log(`[Hotmart Webhook] Chamando Edge Function ${emailFunctionName} (${emailFunctionUrl}) para enviar credenciais.`);

                const emailResponse = await fetch(emailFunctionUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        // Usar a service_role key para chamar Edge Functions do backend é mais seguro
                        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` 
                    },
                    body: JSON.stringify({
                        emailDestinatario: emailComprador,
                        nomeDestinatario: nomeComprador,
                        senhaGerada: generatedPassword // Passa a senha gerada para a função Edge
                    }),
                });

                if (!emailResponse.ok) {
                    const emailErrorBody = await emailResponse.text();
                    console.error(`[Hotmart Webhook] Erro ao chamar Edge Function ${emailFunctionName}: Status ${emailResponse.status}. Corpo: ${emailErrorBody}`);
                    // Decida se este erro deve falhar o webhook inteiro ou apenas ser logado.
                    // Por enquanto, apenas logamos e continuamos para a lógica da assinatura.
                } else {
                    console.log(`[Hotmart Webhook] Edge Function ${emailFunctionName} chamada com sucesso.`);
                }
            }

        } catch (emailCallError) {
            console.error(`[Hotmart Webhook] Erro inesperado ao chamar Edge Function ${emailFunctionName}:`, emailCallError);
             // Por enquanto, apenas logamos e continuamos.
        }

    } else {
        // Caso inesperado: sem erro, mas sem dados do usuário criado.
        console.error('[Hotmart Webhook] Resposta de createUser não continha dados do usuário e nenhum erro foi lançado.');
        return NextResponse.json({ error: 'Resposta inesperada do Supabase ao tentar criar usuário.' }, { status: 500 });
    }
    
    if (!userId && (eventoPrincipal?.toUpperCase() === 'PURCHASE_APPROVED' || eventoPrincipal?.toUpperCase() === 'SUBSCRIPTION_ACTIVATED')) {
      // Se o userId não pôde ser determinado para um evento de compra/ativação, isso é um problema sério para vincular a assinatura.
      console.error(`[Hotmart Webhook] CRÍTICO: ID do usuário não pôde ser determinado para ${emailComprador} em um evento de compra/ativação. A assinatura não será vinculada corretamente.`);
      // Você pode querer retornar um erro aqui para sinalizar que a transação do webhook não pôde ser completada.
      // return NextResponse.json({ error: 'ID do usuário não pôde ser determinado, impossível processar a assinatura.' }, { status: 500 });
      // Por enquanto, apenas logamos de forma crítica e deixamos a lógica de salvarOuAtualizarAssinatura tentar lidar com userId undefined, se aplicável.
    } else if (!userId) {
      console.warn(`[Hotmart Webhook] ID do usuário não pôde ser determinado para ${emailComprador}.`);
    }

    // 6. Criar/atualizar perfil na tabela 'perfis_profissionais'
    if (userId) {
      const tipoPlanoCalculado = mapearPlanoHotmart(payload.data?.subscription?.plan?.name || payload.data?.product?.name);
      
      // Determinar status da assinatura com base no tipo de plano
      // Se for um plano trial, o status inicial deve ser 'trial'
      // Se for um plano pago, e o status da Hotmart é 'active', então é 'ativo'
      let statusAssinaturaCalculado = mapearStatusHotmart(payload.data?.subscription?.status);
      if (tipoPlanoCalculado.includes('trial') && statusAssinaturaCalculado === 'ativo') {
        statusAssinaturaCalculado = 'trial';
      }


      const dataInicioAssinatura = payload.data?.purchase?.approved_date ? 
                                  new Date(payload.data.purchase.approved_date).toISOString() : 
                                  new Date().toISOString(); // Fallback para agora se não houver data de aprovação

      const dataExpiracaoAcesso = calcularDataExpiracao(
                                  payload.data?.purchase?.approved_date || Date.now(), 
                                  payload.data?.subscription?.plan?.name || payload.data?.product?.name
                                );

      const perfilData = {
        user_id: userId,
        email: emailComprador,
        nome_completo: nomeComprador || emailComprador.split('@')[0], // Fallback para o início do email se nome não vier
        plano_hotmart_id: payload.data?.subscription?.plan?.id?.toString() || payload.data?.product?.id?.toString() || 'N/A',
        tipo_plano: tipoPlanoCalculado,
        status_assinatura: statusAssinaturaCalculado,
        data_inicio_assinatura: dataInicioAssinatura,
        data_expiracao_acesso: dataExpiracaoAcesso,
        hotmart_transaction_id: transactionId || 'N/A',
        hotmart_subscriber_code: payload.data?.subscription?.subscriber?.code || 'N/A',
        hotmart_purchase_id: transactionId || 'N/A', // Assumindo que é o mesmo que transactionId
        // criado_em e atualizado_em são gerenciados pelo Supabase (default ou triggers)
      };
      
      console.log('[Hotmart Webhook] Dados para upsert do perfil:', JSON.stringify(perfilData, null, 2));

      const { error: erroPerfil } = await supabaseAdmin
        .from('perfis_profissionais')
        .upsert(perfilData, { onConflict: 'user_id' }); 

      if (erroPerfil) {
        console.error('[Hotmart Webhook] Erro ao salvar/atualizar perfil do profissional:', JSON.stringify(erroPerfil, null, 2));
        // Considerar o que fazer em caso de erro aqui. 
        // Por enquanto, apenas loga, mas não interrompe o retorno de sucesso para a Hotmart.
      } else {
        console.log(`[Hotmart Webhook] Perfil profissional salvo/atualizado para ${emailComprador}.`);
      }
    }

    console.log(`[Hotmart Webhook] Processamento concluído para ${emailComprador}.`);
    return NextResponse.json({ message: 'Webhook processado com sucesso!' }, { status: 200 });

  } catch (error) {
    console.error('[Hotmart Webhook] Erro inesperado:', error);
    let errorMessage = 'Ocorreu um erro interno no servidor.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// TODO:
// 1. Confirmar os nomes exatos dos campos do payload da Hotmart (status, email, transaction_id, subscriber_code, product_id, offer_id, etc.)
// 2. Implementar a lógica de criação/atualização de usuários e perfis.
// 3. Implementar o envio de emails (boas-vindas, etc.).
// 4. Definir e configurar as variáveis de ambiente na Vercel: SUPABASE_SERVICE_ROLE_KEY e HOTMART_SECRET_TOKEN.
// 5. (Opcional) Adicionar uma tabela de logs para os webhooks recebidos para facilitar a depuração. 