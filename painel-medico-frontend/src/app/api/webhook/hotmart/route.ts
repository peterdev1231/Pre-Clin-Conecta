// Forçando reavaliação de tipos do Next.js
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Variáveis de Ambiente Esperadas:
// process.env.NEXT_PUBLIC_SUPABASE_URL
// process.env.SUPABASE_SERVICE_ROLE_KEY
// process.env.HOTMART_SECRET_TOKEN (para verificar a assinatura do webhook - recomendado)
// process.env.NEXT_PUBLIC_APP_URL (ex: https://app.preclinconecta.com)

// Definir o nome da Edge Function de envio de email globalmente ou perto do uso
const emailFunctionName = 'enviar-email-boas-vindas'; // Nome da função Edge

// Função simples para gerar uma senha aleatória (adapte conforme necessário)
function generateRandomPassword(length = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

// Funções auxiliares para mapeamento de dados
function mapearPlanoHotmart(nomePlanoHotmart?: string, offerCode?: string): string {
  if (!nomePlanoHotmart && !offerCode) return 'desconhecido'; // Valor padrão ou tratamento de erro
  const nomeLower = nomePlanoHotmart?.toLowerCase() || '';

  // Prioriza a verificação pelo código da oferta para trial anual
  if (offerCode === 'e3nl8u6h') {
      return 'anual_trial';
  }
  
  // Fallback para lógica baseada no nome do plano (pode ser útil para outros planos ou casos)
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
    const offerCode = payload.data?.purchase?.offer?.code; // Extrair o código da oferta
    // Outros campos que podem ser úteis: payload.data?.product?.id, payload.data?.product?.name, payload.data?.offer?.code, payload.data?.subscription?.subscriber?.code

    if (!emailComprador) {
      console.error('[Hotmart Webhook] Email do comprador não encontrado no payload.');
      return NextResponse.json({ error: 'Payload inválido: email do comprador ausente.' }, { status: 400 });
    }

    console.log(`[Hotmart Webhook] Status da compra: ${statusDaCompra}, Email: ${emailComprador}`);

    // 3. Verificar o status da transação (apenas prosseguir se aprovada/completa)
    // Adapte a lista de status/eventos conforme necessário
    // Usaremos o eventoPrincipal para mais clareza, mas poderia ser o statusDaCompra também.
    const eventosPermitidos = [
      'PURCHASE_APPROVED', // Compra aprovada (inclui o início de trials que são aprovados)
      'SUBSCRIPTION_CANCELED', // Assinatura cancelada
      'RECURRENCE_CHARGE_DENIED', // Recorrência negada (falha no pagamento)
      'REFUNDED', // Compra reembolsada
      'CHARGEBACK', // Chargeback
      // Adicione outros eventos relevantes conforme a documentação da Hotmart:
      // 'SUBSCRIPTION_ACTIVATED', // Ativação de assinatura (pode ser útil)
      // 'TRIAL_STARTED', // Início de trial explícito (se Hotmart enviar)
      // 'TRIAL_ENDED', // Fim de trial (se Hotmart enviar)
      // 'RECURRENCE_CHARGE_APPROVED', // Recorrência aprovada (para renovações)
    ]; 

    const eventoPrincipalUpper = eventoPrincipal?.toUpperCase();

    if (!eventoPrincipalUpper || !eventosPermitidos.includes(eventoPrincipalUpper)) {
      console.log(`[Hotmart Webhook] Evento '${eventoPrincipal}' não requer ação. Ignorando.`);
      return NextResponse.json({ message: 'Webhook recebido, mas evento não requer ação.' }, { status: 200 });
    }

    console.log(`[Hotmart Webhook] Processando evento '${eventoPrincipal}' para ${emailComprador}.`);

    let userId: string | undefined; // Mova a declaração do userId para fora dos blocos if/else

    // Lógica para encontrar ou criar o usuário e determinar o userId (mantida, mas pode ser refinada)
    // Esta parte geralmente só precisa rodar para eventos como PURCHASE_APPROVED que criam o usuário.
    // Para outros eventos, o usuário já deve existir e você só precisa do email ou subscriber_code para encontrá-lo.
    // Vou manter a lógica de criação/busca de usuário aqui por enquanto, mas idealmente otimizaria para buscar o usuário existente para eventos pós-compra.
    
    // Tenta encontrar o usuário existente pelo email primeiro para qualquer evento.
    // Usando listUsers e filtrando localmente, pois a busca direta por email pode não ser suportada.
    const { data: { users }, error: fetchUserError } = await supabaseAdmin.auth.admin.listUsers(); // Remover filtro de email aqui

    if (fetchUserError) {
        console.error('[Hotmart Webhook] Erro ao buscar lista de usuários:', fetchUserError.message);
        // Dependendo da criticidade, pode retornar um erro 500 aqui
    } else if (users && users.length > 0) {
        // Filtrar a lista de usuários pelo email
        const existingUser = users.find(user => user.email === emailComprador);
        if (existingUser) {
             userId = existingUser.id;
            console.log(`[Hotmart Webhook] Usuário existente ${emailComprador} encontrado com ID: ${userId}.`);
        } else if (eventoPrincipalUpper === 'PURCHASE_APPROVED') {
             // Se não encontrou na lista e o evento é PURCHASE_APPROVED, tenta criar o usuário.
             console.log(`[Hotmart Webhook] Usuário ${emailComprador} não encontrado na lista, tentando criar...`);
            const generatedPassword = generateRandomPassword(); // Gere senha apenas se for criar
            const { data: createUserData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
                email: emailComprador,
                password: generatedPassword,
                email_confirm: true,
                user_metadata: { 
                    nome_completo: nomeComprador
                }
            });

            if (createUserError) {
                 console.error('[Hotmart Webhook] Erro ao criar usuário no Supabase Auth:', createUserError.message);
                 // Tratar caso de usuário já registrado aqui ou retornar erro.
                 // Se for user already registered, a busca inicial já deveria ter encontrado.
                 // Para outros erros de criação, provavelmente deve retornar erro 500.
                 return NextResponse.json({ error: `Falha ao criar usuário: ${(createUserError as any).error_description || createUserError.message}` }, { status: 500 });
            } else if (createUserData && createUserData.user) {
                userId = createUserData.user.id;
                console.log(`[Hotmart Webhook] Usuário criado com sucesso para ${emailComprador}. ID: ${userId}.`);
                // Chamar a Edge Function para enviar o email APENAS se um NOVO usuário foi criado
                 try {
                    const supabaseUrlBase = process.env.NEXT_PUBLIC_SUPABASE_URL;
                     if (supabaseUrlBase) {
                        const emailFunctionUrl = `${supabaseUrlBase}/functions/v1/${emailFunctionName}`;
                         console.log(`[Hotmart Webhook] Chamando Edge Function ${emailFunctionName} (${emailFunctionUrl})...`);

                        const emailResponse = await fetch(emailFunctionUrl, {
                             method: 'POST',
                             headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` 
                            },
                             body: JSON.stringify({
                                emailDestinatario: emailComprador,
                                nomeDestinatario: nomeComprador,
                                senhaGerada: generatedPassword 
                            }),
                        });

                         if (!emailResponse.ok) {
                            const emailErrorBody = await emailResponse.text();
                             console.error(`[Hotmart Webhook] Erro ao chamar Edge Function ${emailFunctionName}: Status ${emailResponse.status}. Corpo: ${emailErrorBody}`);
                        } else {
                             console.log(`[Hotmart Webhook] Edge Function ${emailFunctionName} chamada com sucesso.`);
                        }
                    } else {
                         console.error('[Hotmart Webhook] Variável de ambiente NEXT_PUBLIC_SUPABASE_URL não configurada para chamar Edge Function.');
                    }
                } catch (emailCallError) {
                     console.error(`[Hotmart Webhook] Erro inesperado ao chamar Edge Function ${emailFunctionName}:`, emailCallError);
                }
            }
        }
    }
    
    // Se o userId ainda não foi determinado neste ponto, não podemos vincular/atualizar a assinatura.
    if (!userId) {
         console.error(`[Hotmart Webhook] CRÍTICO: Não foi possível determinar o ID do usuário para ${emailComprador} no evento '${eventoPrincipal}'. A assinatura não será vinculada/atualizada.`);
         // Dependendo da política, pode retornar um erro 500 aqui, mas pode ser melhor retornar 200
         // para não fazer a Hotmart reenviar o webhook interminavelmente.
         return NextResponse.json({ error: 'ID do usuário não pôde ser determinado, impossível processar o evento.' }, { status: 200 }); // Retorna 200 para evitar retries
    }

    // Lógica para processar diferentes eventos
    let perfilUpdateData: any = null; // Dados para atualizar na tabela perfis_profissionais

    switch (eventoPrincipalUpper) {
        case 'PURCHASE_APPROVED':
            // Lógica de criação/atualização inicial da assinatura (já existente)
            const plano = mapearPlanoHotmart(payload.data?.subscription?.plan?.name, offerCode);
            const statusAssinatura = mapearStatusHotmart(payload.data?.subscription?.status);
            const dataInicioAssinaturaObj = payload.data?.subscription?.start_date ? new Date(payload.data.subscription.start_date) : new Date();
            const dataInicioAssinaturaString = dataInicioAssinaturaObj.toISOString();
            const dataExpiracaoAssinatura = calcularDataExpiracao(dataInicioAssinaturaObj, plano);
            
            // Verificar se os dados essenciais para criar/atualizar a assinatura estão presentes
            if (!userId || !plano || !statusAssinatura || !transactionId) {
                console.error('[Hotmart Webhook] Dados essenciais para assinatura ausentes (userId, plano, statusAssinatura, transactionId).');
                // Dependendo do caso, pode retornar um erro ou apenas logar e sair
                // return NextResponse.json({ error: 'Dados da assinatura incompletos no payload.' }, { status: 400 });
                // Para evitar parar o processamento de outros eventos, apenas logamos e continuamos
            }

            // Lógica para inserir/atualizar a assinatura no Supabase
             // Busca por uma assinatura existente para este usuário e transactionId (ou subscriber_code, se mais confiável para assinaturas)
             // Para o primeiro evento de uma assinatura (PURCHASE_APPROVED), pode não haver uma entrada ainda.
             // Para eventos subsequentes (SUBSCRIPTION_ACTIVATED, RECURRENCE_CHARGE_APPROVED, etc.), haverá.

             // Tentar encontrar a assinatura pelo transactionId ou subscriber_code
             const subscriberCode = payload.data?.subscription?.subscriber?.code; // Pode ser o identificador mais estável para assinaturas

             let existingSubscription;
             if (subscriberCode) {
                 const { data: existingSubs, error: fetchSubError } = await supabaseAdmin
                    .from('assinaturas')
                    .select('*')
                    .eq('subscriber_code', subscriberCode)
                     .single(); // Assumindo que subscriber_code é único para assinaturas ativas/ativas recentes

                 if (fetchSubError && fetchSubError.code !== 'PGRST116') { // PGRST116 = No rows found
                     console.error('[Hotmart Webhook] Erro ao buscar assinatura existente por subscriber_code:', fetchSubError.message);
                     // Continuar, mas sem atualizar uma assinatura existente encontrada por esta busca
                 } else if (existingSubs) {
                     existingSubscription = existingSubs;
                     console.log(`[Hotmart Webhook] Assinatura existente encontrada por subscriber_code ${subscriberCode}.`);
                 }
             } else if (transactionId) {
                 // Fallback: tentar buscar pelo transactionId se subscriber_code não estiver disponível
                 // Nota: transactionId representa a compra inicial, não a assinatura recorrente em si
                 const { data: existingSubs, error: fetchSubError } = await supabaseAdmin
                    .from('assinaturas')
                    .select('*')
                    .eq('transaction_id_hotmart', transactionId)
                     .single(); 

                 if (fetchSubError && fetchSubError.code !== 'PGRST116') { // PGRST116 = No rows found
                      console.error('[Hotmart Webhook] Erro ao buscar assinatura existente por transaction_id:', fetchSubError.message);
                 } else if (existingSubs) {
                     existingSubscription = existingSubs;
                      console.log(`[Hotmart Webhook] Assinatura existente encontrada por transaction_id ${transactionId}.`);
                 }
             }
             

             // Dados para inserir/atualizar
             const assinaturaData = {
                 user_id: userId,
                 tipo_plano: plano,
                 status_assinatura: statusAssinatura,
                 transaction_id_hotmart: transactionId, // transactionId da compra inicial
                 hotmart_id: offerCode, // Usar o código da oferta aqui (e3nl8u6h ou errb81gg)
                 data_inicio: dataInicioAssinaturaString, // Usar a string ISO para o BD
                 data_expiracao: dataExpiracaoAssinatura, // Calculada
                 // Armazenar subscriber_code para futuras atualizações de status de recorrência/cancelamento
                 subscriber_code: subscriberCode, 
                 // Adicionar outros campos relevantes se necessário (ex: valor pago, detalhes do produto, etc.)
             };

             if (existingSubscription) {
                 // Atualiza a assinatura existente
                 const { data: updatedSubscription, error: updateError } = await supabaseAdmin
                    .from('assinaturas')
                    .update(assinaturaData)
                    .eq(existingSubscription.subscriber_code ? 'subscriber_code' : 'transaction_id_hotmart', existingSubscription.subscriber_code || existingSubscription.transaction_id_hotmart);
                
                 if (updateError) {
                     console.error('[Hotmart Webhook] Erro ao atualizar assinatura existente:', updateError.message);
                      // Dependendo do caso, pode retornar um erro 500 aqui
                 } else {
                     console.log('[Hotmart Webhook] Assinatura existente atualizada com sucesso.', updatedSubscription);
                 }

             } else {
                 // Insere uma nova assinatura se não encontrou uma existente (esperado para PURCHASE_APPROVED inicial)
                 // Verifica se temos o transactionId ou subscriber_code para evitar inserir duplicatas em retries do webhook
                 if (transactionId || subscriberCode) { // Só insere se tiver um identificador único
                     const { data: newSubscription, error: insertError } = await supabaseAdmin
                        .from('assinaturas')
                        .insert([assinaturaData]);

                     if (insertError) {
                         console.error('[Hotmart Webhook] Erro ao inserir nova assinatura:', insertError.message);
                          // Dependendo do caso, pode retornar um erro 500 aqui
                     } else {
                          console.log('[Hotmart Webhook] Nova assinatura inserida com sucesso.', newSubscription);
                     }
                 } else {
                     console.warn('[Hotmart Webhook] Não foi possível inserir nova assinatura: transactionId ou subscriber_code ausente.');
                 }

             }

             // Lógica adicional para outros eventos (cancelamento, falha de pagamento, etc.)
             // Estes eventos precisariam encontrar a assinatura existente (provavelmente pelo subscriber_code)
             // e atualizar apenas o status e talvez a data de expiração se aplicável.
             // A estrutura atual já busca a assinatura pelo subscriber_code, então a lógica de atualização acima já se aplicaria.

             // Exemplo (simplificado): Para um evento de cancelamento (SUBSCRIPTION_CANCELED)
             // Você buscaria a assinatura pelo subscriber_code e a atualizaria para status_assinatura: 'cancelado'
             // A lógica atual de buscar e atualizar já suportaria isso.

             perfilUpdateData = {
                 user_id: userId,
                 email: emailComprador, // Pode querer atualizar email se mudou
                 nome_completo: nomeComprador || emailComprador.split('@')[0],
                 plano_hotmart_id: payload.data?.subscription?.plan?.id?.toString() || payload.data?.product?.id?.toString() || 'N/A',
                 tipo_plano: plano,
                 status_assinatura: statusAssinatura,
                 data_inicio_assinatura: dataInicioAssinaturaString,
                 data_expiracao_acesso: dataExpiracaoAssinatura,
                 hotmart_transaction_id: transactionId || 'N/A',
                 hotmart_subscriber_code: payload.data?.subscription?.subscriber?.code || 'N/A',
                 hotmart_purchase_id: transactionId || 'N/A',
                 // criado_em e atualizado_em são gerenciados pelo Supabase ou triggers
                 atualizado_em: new Date().toISOString(), // Atualiza o timestamp de atualização
             };
            console.log('[Hotmart Webhook] Dados para upsert do perfil (PURCHASE_APPROVED):', JSON.stringify(perfilUpdateData, null, 2));
            break;

        case 'SUBSCRIPTION_CANCELED':
             // Quando a assinatura é cancelada
             perfilUpdateData = {
                 user_id: userId,
                 status_assinatura: 'cancelado', // Define o status como cancelado
                 data_expiracao_acesso: new Date().toISOString(), // Pode definir a expiração para agora ou manter a data original
                 atualizado_em: new Date().toISOString(),
             };
            console.log('[Hotmart Webhook] Dados para update do perfil (SUBSCRIPTION_CANCELED):', JSON.stringify(perfilUpdateData, null, 2));
            break;

        case 'RECURRENCE_CHARGE_DENIED':
             // Quando a recorrência é negada (pagamento falhou)
             // Você pode querer definir o status para inativo ou um status específico de falha de pagamento
             perfilUpdateData = {
                 user_id: userId,
                 status_assinatura: 'inativo', // Ou outro status para falha de pagamento
                 // Opcional: ajustar data_expiracao_acesso ou adicionar um campo para tentativas de pagamento
                 atualizado_em: new Date().toISOString(),
             };
            console.log('[Hotmart Webhook] Dados para update do perfil (RECURRENCE_CHARGE_DENIED):', JSON.stringify(perfilUpdateData, null, 2));
            break;

        case 'REFUNDED':
             // Quando a compra é reembolsada
             perfilUpdateData = {
                 user_id: userId,
                 status_assinatura: 'reembolsado', // Define o status como reembolsado
                 data_expiracao_acesso: new Date().toISOString(), // Acesso geralmente removido no reembolso
                 atualizado_em: new Date().toISOString(),
             };
            console.log('[Hotmart Webhook] Dados para update do perfil (REFUNDED):', JSON.stringify(perfilUpdateData, null, 2));
            break;

        case 'CHARGEBACK':
             // Quando ocorre um chargeback
             perfilUpdateData = {
                 user_id: userId,
                 status_assinatura: 'chargeback', // Define o status como chargeback
                 data_expiracao_acesso: new Date().toISOString(), // Acesso geralmente removido no chargeback
                 atualizado_em: new Date().toISOString(),
             };
            console.log('[Hotmart Webhook] Dados para update do perfil (CHARGEBACK):', JSON.stringify(perfilUpdateData, null, 2));
            break;

        default:
            // Este bloco não deve ser alcançado se a verificação inicial funcionar,
            // mas é um fallback seguro.
            console.warn(`[Hotmart Webhook] Evento '${eventoPrincipal}' permitido mas sem tratamento específico.`);
            return NextResponse.json({ message: 'Webhook recebido, evento permitido mas sem tratamento específico.' }, { status: 200 });
    }

    // Executar o upsert/update na tabela perfis_profissionais
    if (perfilUpdateData && userId) { // Certifica-se de que temos dados para atualizar e userId
         const { error: erroPerfil } = await supabaseAdmin
            .from('perfis_profissionais')
            .upsert([perfilUpdateData], { onConflict: 'user_id' }); // Usar array para upsert/insert

        if (erroPerfil) {
             console.error('[Hotmart Webhook] Erro ao salvar/atualizar perfil do profissional:', JSON.stringify(erroPerfil, null, 2));
            return NextResponse.json({ error: 'Falha ao atualizar perfil do profissional.' }, { status: 500 });
        } else {
             console.log(`[Hotmart Webhook] Perfil profissional salvo/atualizado para ${emailComprador}.`);
             return NextResponse.json({ message: 'Webhook processado com sucesso!' }, { status: 200 });
        }
    } else if (!perfilUpdateData) {
        // Caso um evento permitido não tenha gerado dados para atualização (pode acontecer para eventos informativos)
        console.log(`[Hotmart Webhook] Evento '${eventoPrincipal}' processado, mas nenhum dado de perfil para atualizar.`);
         return NextResponse.json({ message: 'Webhook processado com sucesso, nenhuma atualização de perfil necessária.' }, { status: 200 });
    }
     // Se chegou aqui e perfilUpdateData existe mas userId não (não deveria acontecer pelo check anterior), retorna 500.
     return NextResponse.json({ error: 'Lógica de processamento falhou: perfilUpdateData gerado mas userId ausente.' }, { status: 500 });

  } catch (error) {
    console.error('[Hotmart Webhook] Erro inesperado no processamento do webhook:', error);
    let errorMessage = 'Ocorreu um erro interno no servidor ao processar o webhook.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// TODO:
// 1. Confirmar os nomes exatos dos campos do payload da Hotmart para CADA tipo de evento (status da assinatura, data de expiração, etc.). A estrutura do payload pode variar um pouco entre eventos.
// 2. Refinar a lógica dentro de cada case do switch para extrair os dados corretos do payload para aquele evento específico.
// 3. Considerar o tratamento de eventos duplicados ou fora de ordem (usando o transactionId ou purchase.event_history se disponível).
// 4. Implementar lógica para reativar acesso ou ajustar data de expiração em eventos como recorrência aprovada após uma falha.
// 5. Definir e configurar as variáveis de ambiente na Vercel: SUPABASE_SERVICE_ROLE_KEY e HOTMART_SECRET_TOKEN.
// 6. Adicionar logging mais detalhado, talvez em uma tabela separada no Supabase.
// 7. Testar cada tipo de evento de webhook simulando-o ou usando as ferramentas da Hotmart.

// TODO:
// 1. Confirmar os nomes exatos dos campos do payload da Hotmart (status, email, transaction_id, subscriber_code, product_id, offer_id, etc.)
// 2. Implementar a lógica de criação/atualização de usuários e perfis.
// 3. Implementar o envio de emails (boas-vindas, etc.).
// 4. Definir e configurar as variáveis de ambiente na Vercel: SUPABASE_SERVICE_ROLE_KEY e HOTMART_SECRET_TOKEN.
// 5. (Opcional) Adicionar uma tabela de logs para os webhooks recebidos para facilitar a depuração. 