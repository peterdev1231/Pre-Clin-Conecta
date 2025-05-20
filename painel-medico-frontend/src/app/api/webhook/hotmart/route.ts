import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Variáveis de ambiente deverão ser configuradas na Vercel (e localmente em .env.local)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const HOTMART_SECRET_TOKEN = process.env.HOTMART_SECRET_TOKEN!;

// Inicializa o cliente Supabase com a chave de serviço para operações de admin (como criar usuários)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req: NextRequest) {
  console.log('Recebido postback da Hotmart...');

  // 1. Validar o token de segurança da Hotmart
  const receivedToken = req.headers.get('X-HOTMART-HOTTOK');
  // console.log('Token recebido:', receivedToken); // Para depuração
  // console.log('Token esperado:', HOTMART_SECRET_TOKEN); // Para depuração

  if (receivedToken !== HOTMART_SECRET_TOKEN) {
    console.error('Token da Hotmart inválido.');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('Token da Hotmart validado com sucesso.');

  try {
    const payload = await req.json();
    console.log('Payload Hotmart:', JSON.stringify(payload, null, 2));

    // Extraindo dados com base na estrutura confirmada do payload
    const eventType = payload.event; // Ex: "PURCHASE_COMPLETE", "SUBSCRIPTION_CANCELLATION", etc.
    const buyerEmail = payload.data?.buyer?.email;
    const hotmartTransactionId = payload.data?.purchase?.transaction; // ID da transação da Hotmart
    const hotmartSubscriberCode = payload.data?.subscription?.subscriber?.code; // Código do assinante da Hotmart
    const hotmartProductName = payload.data?.product?.name;
    const hotmartPlanName = payload.data?.subscription?.plan?.name;
    const hotmartOfferCode = payload.data?.purchase?.offer?.code;
    const purchaseApprovedDateTimestamp = payload.data?.purchase?.approved_date; // Timestamp em milissegundos
    const hotmartSubscriptionStatus = payload.data?.subscription?.status;

    if (!eventType || !buyerEmail) {
      console.error('Tipo de evento ou email do comprador não encontrado no payload.');
      return NextResponse.json({ error: 'Dados essenciais ausentes no payload' }, { status: 400 });
    }

    // Variáveis para o banco de dados
    let tipoPlanoParaDb: 'mensal' | 'anual_trial' | 'anual_pago' | null = null;
    let statusAssinaturaParaDb: 'ativo' | 'trial' | 'inativo' | 'cancelado' | 'reembolsado' | 'chargeback' | null = null;
    let dataExpiracaoAcessoParaDb: Date | null = null;
    const dataInicioAssinaturaParaDb = purchaseApprovedDateTimestamp ? new Date(purchaseApprovedDateTimestamp) : new Date();


    // Lógica para determinar tipo de plano e data de expiração com base nos códigos de oferta ou nomes dos planos
    if (hotmartOfferCode === 'errb81gg' || hotmartPlanName === 'PréClin Conecta - Mensal') {
      tipoPlanoParaDb = 'mensal';
      statusAssinaturaParaDb = 'ativo';
      dataExpiracaoAcessoParaDb = new Date(dataInicioAssinaturaParaDb);
      dataExpiracaoAcessoParaDb.setMonth(dataExpiracaoAcessoParaDb.getMonth() + 1);
    } else if (hotmartOfferCode === 'e3nl8u6h' || hotmartPlanName === 'PréClin Conecta - Anual') {
      // Por padrão, uma nova compra do plano Anual (identificado pela oferta ou nome) inicia como trial
      tipoPlanoParaDb = 'anual_trial';
      statusAssinaturaParaDb = 'trial';
      dataExpiracaoAcessoParaDb = new Date(dataInicioAssinaturaParaDb);
      dataExpiracaoAcessoParaDb.setDate(dataExpiracaoAcessoParaDb.getDate() + 7); // 7 dias de trial
    }

    console.log('Evento Hotmart:', eventType);
    console.log('Email Comprador:', buyerEmail);
    console.log('ID Transação Hotmart:', hotmartTransactionId);
    console.log('Sub. Code Hotmart:', hotmartSubscriberCode);
    console.log('Produto Hotmart:', hotmartProductName);
    console.log('Plano Hotmart:', hotmartPlanName);
    console.log('Oferta Hotmart:', hotmartOfferCode);
    console.log('Data Aprovação:', dataInicioAssinaturaParaDb);
    console.log('Status Ass. Hotmart:', hotmartSubscriptionStatus);
    console.log('Tipo Plano Deduzido:', tipoPlanoParaDb);
    console.log('Data Expiração Deduzida:', dataExpiracaoAcessoParaDb);


    switch (eventType) {
      case 'PURCHASE_APPROVED':
      case 'PURCHASE_COMPLETE':
        console.log(`Evento '${eventType}' para ${buyerEmail}`);
        if (!hotmartTransactionId || !tipoPlanoParaDb || !dataExpiracaoAcessoParaDb || !statusAssinaturaParaDb) {
          console.error('[Webhook Hotmart] Dados insuficientes para processar compra aprovada (ID transação, tipoPlanoParaDb, dataExpiracaoAcessoParaDb ou statusAssinaturaParaDb ausentes).');
          console.error(`[Webhook Hotmart] Valores: hotmartTransactionId=${hotmartTransactionId}, tipoPlanoParaDb=${tipoPlanoParaDb}, dataExpiracaoAcessoParaDb=${dataExpiracaoAcessoParaDb}, statusAssinaturaParaDb=${statusAssinaturaParaDb}`);
          if (!tipoPlanoParaDb) {
            console.warn(`[Webhook Hotmart] Nome do plano Hotmart não reconhecido: '${hotmartPlanName}'. Verifique a configuração dos nomes dos planos.`);
            return NextResponse.json({ message: 'Nome do plano não reconhecido, evento ignorado.' }, { status: 200 });
          }
          return NextResponse.json({ error: 'Dados insuficientes para processar compra' }, { status: 400 });
        }

        // Primeiro, verifique se o usuário existe no Supabase Auth
        const { data: authUserResponse, error: findAuthUserError } = await supabaseAdmin.auth.admin.getUserByEmail(buyerEmail);

        let userIdForProfile: string;
        let isNewAuthUser = false; // Flag para saber se devemos enviar o email de boas-vindas com link de definir senha

        if (findAuthUserError) {
            if (findAuthUserError.name === 'UserNotFoundError') {
                // Usuário NÃO existe no Supabase Auth, então criamos
                console.log(`[Webhook Hotmart] Usuário ${buyerEmail} não encontrado no Supabase Auth. Criando...`);
                const temporaryPassword = Math.random().toString(36).slice(-12); // Senha temporária apenas para criação via API
                const { data: newUserAuthData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
                    email: buyerEmail,
                    password: temporaryPassword,
                    email_confirm: true, // Confirma o email automaticamente
                });

                if (createUserError) {
                    console.error(`[Webhook Hotmart] Erro ao criar usuário ${buyerEmail} no Supabase Auth:`, createUserError);
                    return NextResponse.json({ error: 'Falha ao criar usuário no sistema de autenticação', detail: createUserError.message }, { status: 500 });
                }
                if (!newUserAuthData?.user) {
                    console.error(`[Webhook Hotmart] Falha ao criar usuário ${buyerEmail} no Supabase Auth, dados do usuário nulos retornados.`);
                    return NextResponse.json({ error: 'Falha ao criar usuário no sistema de autenticação, dados nulos.' }, { status: 500 });
                }
                userIdForProfile = newUserAuthData.user.id;
                isNewAuthUser = true; 
                console.log(`[Webhook Hotmart] Usuário Auth ${userIdForProfile} criado para ${buyerEmail}.`);
            } else {
                // Um erro diferente de "usuário não encontrado" ocorreu ao verificar o Auth
                console.error(`[Webhook Hotmart] Erro ao verificar usuário ${buyerEmail} no Supabase Auth:`, findAuthUserError);
                return NextResponse.json({ error: 'Falha ao verificar usuário no sistema de autenticação', detail: findAuthUserError.message }, { status: 500 });
            }
        } else {
            // Usuário JÁ EXISTE no Supabase Auth
            userIdForProfile = authUserResponse.user.id;
            console.log(`[Webhook Hotmart] Usuário ${buyerEmail} já existe no Supabase Auth (ID: ${userIdForProfile}).`);
            isNewAuthUser = true; // Tratar como "novo" para fins de envio do email com link de acesso/senha.
        }

        // Agora, crie ou atualize o PERFIL em 'perfis_profissionais'
        const nomeComprador = payload.data?.buyer?.name;
        const { data: existingProfile, error: findProfileError } = await supabaseAdmin
            .from('perfis_profissionais')
            .select('id, nome_completo') // Selecionar nome_completo para manter se não vier novo
            .eq('user_id', userIdForProfile)
            .single(); 

        if (findProfileError && findProfileError.code !== 'PGRST116') { // PGRST116 = zero rows
            console.error(`[Webhook Hotmart] Erro ao buscar perfil para user_id ${userIdForProfile} (Email: ${buyerEmail}):`, findProfileError);
            return NextResponse.json({ error: 'Falha ao buscar perfil profissional', detail: findProfileError.message }, { status: 500 });
        }

        if (existingProfile) {
            console.log(`[Webhook Hotmart] Perfil para ${buyerEmail} (user_id: ${userIdForProfile}) encontrado. Atualizando...`);
            const { error: updateProfileError } = await supabaseAdmin
                .from('perfis_profissionais')
                .update({
                    plano_hotmart_id: hotmartOfferCode || hotmartPlanName || hotmartProductName || 'N/A',
                    tipo_plano: tipoPlanoParaDb, 
                    status_assinatura: statusAssinaturaParaDb,
                    data_inicio_assinatura: dataInicioAssinaturaParaDb.toISOString(),
                    data_expiracao_acesso: dataExpiracaoAcessoParaDb!.toISOString(),
                    hotmart_subscriber_code: hotmartSubscriberCode || hotmartTransactionId,
                    hotmart_purchase_id: hotmartTransactionId,
                    nome_completo: nomeComprador || existingProfile.nome_completo, 
                    atualizado_em: new Date().toISOString(),
                })
                .eq('user_id', userIdForProfile);

            if (updateProfileError) {
                console.error(`[Webhook Hotmart] Erro ao atualizar perfil profissional para ${buyerEmail}:`, updateProfileError);
                return NextResponse.json({ error: 'Falha ao atualizar perfil profissional', detail: updateProfileError.message }, { status: 500 });
            }
            console.log(`[Webhook Hotmart] Perfil de ${buyerEmail} atualizado.`);
        } else {
            console.log(`[Webhook Hotmart] Perfil para ${buyerEmail} (user_id: ${userIdForProfile}) não encontrado. Criando...`);
            const { error: insertProfileError } = await supabaseAdmin
                .from('perfis_profissionais')
                .insert({
                    user_id: userIdForProfile,
                    email: buyerEmail,
                    nome_completo: nomeComprador,
                    plano_hotmart_id: hotmartOfferCode || hotmartPlanName || hotmartProductName || 'N/A',
                    tipo_plano: tipoPlanoParaDb,
                    status_assinatura: statusAssinaturaParaDb,
                    data_inicio_assinatura: dataInicioAssinaturaParaDb.toISOString(),
                    data_expiracao_acesso: dataExpiracaoAcessoParaDb!.toISOString(),
                    hotmart_subscriber_code: hotmartSubscriberCode || hotmartTransactionId,
                    hotmart_purchase_id: hotmartTransactionId,
                });

            if (insertProfileError) {
                console.error(`[Webhook Hotmart] Erro ao inserir perfil profissional para ${buyerEmail}:`, insertProfileError);
                return NextResponse.json({ error: 'Falha ao criar perfil profissional', detail: insertProfileError.message }, { status: 500 });
            }
            console.log(`[Webhook Hotmart] Perfil profissional para ${buyerEmail} (Nome: ${nomeComprador || 'N/A'}) criado com sucesso.`);
        }

        if (isNewAuthUser) {
            const appURL = process.env.NEXT_PUBLIC_APP_URL;
            const welcomeEmailFunctionUrl = process.env.SUPABASE_WELCOME_EMAIL_FUNCTION_URL;

            if (!appURL) {
                console.error('[Webhook Hotmart] NEXT_PUBLIC_APP_URL não definida. Não é possível gerar link de recuperação ou enviar email corretamente.');
            }
            if (!welcomeEmailFunctionUrl) {
                console.error('[Webhook Hotmart] SUPABASE_WELCOME_EMAIL_FUNCTION_URL não definida. Não é possível enviar email de boas-vindas.');
            }

            if (appURL && welcomeEmailFunctionUrl) {
                let passwordSetupLink: string | undefined = undefined;
                const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                    type: 'recovery',
                    email: buyerEmail,
                    options: { redirectTo: `${appURL}/atualizar-senha` }
                });

                if (linkError) {
                    console.error(`[Webhook Hotmart] Erro ao gerar link de recuperação para ${buyerEmail}:`, linkError);
                } else if (linkData?.properties?.action_link) {
                    passwordSetupLink = linkData.properties.action_link;
                    console.log(`[Webhook Hotmart] Link de definição de senha gerado para ${buyerEmail}.`);
                } else {
                     console.warn(`[Webhook Hotmart] Não foi possível obter action_link para ${buyerEmail} ao gerar link de recuperação.`);
                }
                
                try {
                    const emailPayload = {
                        emailDestinatario: buyerEmail,
                        nomeDestinatario: nomeComprador || buyerEmail.split('@')[0],
                        linkDefinicaoSenha: passwordSetupLink 
                    };
                    console.log('[Webhook Hotmart] Enviando payload para função de email:', JSON.stringify(emailPayload));
                    
                    const emailResponse = await fetch(welcomeEmailFunctionUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(emailPayload),
                    });

                    if (emailResponse.ok) {
                        const emailResult = await emailResponse.json();
                        console.log(`[Webhook Hotmart] Email de boas-vindas solicitado para ${buyerEmail}. ID da mensagem Resend: ${emailResult.resendMessageId}`);
                    } else {
                        const errorBody = await emailResponse.text();
                        console.error(`[Webhook Hotmart] Falha ao solicitar email de boas-vindas para ${buyerEmail}. Status: ${emailResponse.status}. Resposta: ${errorBody}`);
                    }
                } catch (emailError) {
                    console.error(`[Webhook Hotmart] Erro de rede ou inesperado ao chamar a função de email para ${buyerEmail}:`, emailError);
                }
            }
        } else {
            console.log(`[Webhook Hotmart] Usuário ${buyerEmail} já existia no Auth e não foi tratado como novo para envio de email de boas-vindas com link de senha. Perfil atualizado, se aplicável.`);
        }
        break;

      case 'SUBSCRIPTION_CANCELLATION': // Verificar o nome exato do evento para cancelamento de assinatura
      case 'PURCHASE_CANCELED':
      case 'PURCHASE_REFUNDED':
      case 'PURCHASE_CHARGEBACK':
      case 'SUBSCRIPTION_STATUS_CHANGED': // Pode ser usado para pegar cancelamentos também se o status for 'CANCELED'
        console.log(`Evento de revogação/alteração '${eventType}' para ${buyerEmail}, Status Hotmart: ${hotmartSubscriptionStatus}`);
        
        const idToSearch = hotmartSubscriberCode || hotmartTransactionId;
        if (!idToSearch) {
            console.error('Não foi possível encontrar um ID (subscriber_code ou transaction_id) para buscar o perfil para revogação.');
            return NextResponse.json({ error: 'ID de assinante/transação ausente para revogação' }, { status: 400 });
        }

        let newStatus: 'inativo' | 'cancelado' | 'reembolsado' | 'chargeback' = 'inativo';
        if (eventType === 'SUBSCRIPTION_CANCELLATION' || (eventType === 'SUBSCRIPTION_STATUS_CHANGED' && hotmartSubscriptionStatus === 'CANCELED')) {
          newStatus = 'cancelado';
        } else if (eventType === 'PURCHASE_REFUNDED') {
          newStatus = 'reembolsado';
        } else if (eventType === 'PURCHASE_CHARGEBACK') {
          newStatus = 'chargeback';
        } else if (eventType === 'PURCHASE_CANCELED'){
          newStatus = 'cancelado'; // Ou 'inativo' dependendo da sua regra de negócio
        }

        const { data: profileToUpdate, error: findProfileError } = await supabaseAdmin
            .from('perfis_profissionais')
            .select('id')
            .or(`hotmart_subscriber_code.eq.${idToSearch},hotmart_purchase_id.eq.${idToSearch}`)
            .eq('email', buyerEmail) // Adicionar filtro de email para segurança
            .maybeSingle(); // Usar maybeSingle para não dar erro se não encontrar, mas tratar o caso

        if (findProfileError) {
            console.error('Erro ao buscar perfil para revogação:', findProfileError);
            throw findProfileError;
        }

        if (!profileToUpdate) {
            console.warn(`Perfil não encontrado para revogação com ID ${idToSearch} e email ${buyerEmail}. O acesso pode já ter sido removido ou os dados não batem.`);
            // Retornar 200 para não fazer a Hotmart reenviar, já que não há o que fazer aqui.
            return NextResponse.json({ message: 'Perfil não encontrado para revogação, nada a fazer.' }, { status: 200 });
        }

        const { error: updateError } = await supabaseAdmin
          .from('perfis_profissionais')
          .update({
            status_assinatura: newStatus,
            // Opcional: definir data_expiracao_acesso para a data atual se o acesso for imediato
            // data_expiracao_acesso: new Date().toISOString(), 
            atualizado_em: new Date().toISOString(),
          })
          .eq('id', profileToUpdate.id);

        if (updateError) {
          console.error('Erro ao atualizar status da assinatura para revogação:', updateError);
          throw updateError;
        }
        console.log(`Acesso revogado/atualizado para ${buyerEmail} (status: ${newStatus}) devido ao evento ${eventType}.`);
        break;
      
      // Adicionar outros casos conforme necessário (ex: 'billet_printed', 'trial_conversion', etc.)
      // Ex: case 'SUBSCRIPTION_RENEWAL': // Para renovações, atualizar data de expiração

      default:
        console.warn(`Evento Hotmart não tratado ou desconhecido: '${eventType}'`, payload);
        return NextResponse.json({ message: 'Evento não tratado intencionalmente' }, { status: 200 });
    }

    return NextResponse.json({ message: 'Webhook processado com sucesso' }, { status: 200 });

  } catch (error) {
    console.error('Erro ao processar payload da Hotmart:', error);
    let errorMessage = 'Erro interno do servidor.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Não exponha detalhes do erro para a Hotmart, apenas um erro genérico.
    return NextResponse.json({ error: 'Falha ao processar webhook' , detail: errorMessage}, { status: 500 });
  }
}

// TODO:
// 1. Confirmar os nomes exatos dos campos do payload da Hotmart (status, email, transaction_id, subscriber_code, product_id, offer_id, etc.)
// 2. Implementar a lógica de criação/atualização de usuários e perfis.
// 3. Implementar o envio de emails (boas-vindas, etc.).
// 4. Definir e configurar as variáveis de ambiente na Vercel: SUPABASE_SERVICE_ROLE_KEY e HOTMART_SECRET_TOKEN.
// 5. (Opcional) Adicionar uma tabela de logs para os webhooks recebidos para facilitar a depuração. 