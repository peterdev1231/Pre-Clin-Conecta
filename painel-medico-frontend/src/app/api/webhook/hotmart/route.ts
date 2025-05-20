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
          console.error('Dados insuficientes para processar compra aprovada (ID transação, tipoPlanoParaDb, dataExpiracaoAcessoParaDb ou statusAssinaturaParaDb ausentes).');
          console.error(`Valores: hotmartTransactionId=${hotmartTransactionId}, tipoPlanoParaDb=${tipoPlanoParaDb}, dataExpiracaoAcessoParaDb=${dataExpiracaoAcessoParaDb}, statusAssinaturaParaDb=${statusAssinaturaParaDb}`);
          if (!tipoPlanoParaDb) {
            console.warn(`Nome do plano Hotmart não reconhecido: '${hotmartPlanName}'. Verifique a configuração dos nomes dos planos.`);
            return NextResponse.json({ message: 'Nome do plano não reconhecido, evento ignorado.' }, { status: 200 });
          }
          return NextResponse.json({ error: 'Dados insuficientes para processar compra' }, { status: 400 });
        }

        const { data: existingUser, error: findUserError } = await supabaseAdmin
          .from('perfis_profissionais')
          .select('id, user_id, email, status_assinatura, tipo_plano, data_expiracao_acesso, plano_hotmart_id')
          .eq('email', buyerEmail)
          .single();

        if (findUserError && findUserError.code !== 'PGRST116') {
          console.error('Erro ao buscar usuário:', findUserError);
          throw findUserError;
        }

        let finalTipoPlano: 'mensal' | 'anual_trial' | 'anual_pago' | null = tipoPlanoParaDb;
        let finalStatusAssinatura: 'ativo' | 'trial' | 'inativo' | 'cancelado' | 'reembolsado' | 'chargeback' | null = statusAssinaturaParaDb;
        let finalDataExpiracao: Date | null = dataExpiracaoAcessoParaDb;
        let finalDataInicio: Date = dataInicioAssinaturaParaDb;

        if (existingUser) {
          console.log(`Usuário ${buyerEmail} encontrado. Verificando necessidade de atualização...`);
          if (hotmartPlanName === 'PréClin Conecta - Anual' &&
              existingUser.tipo_plano === 'anual_trial' &&
              existingUser.status_assinatura === 'trial') {
            console.log(`Potencial conversão de trial para anual pago para ${buyerEmail}.`);
            finalTipoPlano = 'anual_pago';
            finalStatusAssinatura = 'ativo';
            finalDataInicio = dataInicioAssinaturaParaDb;
            finalDataExpiracao = new Date(finalDataInicio);
            finalDataExpiracao.setFullYear(finalDataExpiracao.getFullYear() + 1);
            console.log(`Convertido para anual_pago. Nova data de expiração: ${finalDataExpiracao.toISOString()}`);
          } else if (
            existingUser.plano_hotmart_id !== (hotmartOfferCode || hotmartPlanName || hotmartProductName || 'N/A') ||
            existingUser.tipo_plano !== finalTipoPlano ||
            existingUser.status_assinatura !== finalStatusAssinatura ||
            (existingUser.data_expiracao_acesso && finalDataExpiracao && new Date(existingUser.data_expiracao_acesso).getTime() !== finalDataExpiracao.getTime())
          ) {
            console.log('Atualizando perfil existente com novos dados da compra/assinatura.');
          } else {
            console.log('Dados do perfil já estão atualizados. Nenhuma alteração necessária.');
            return NextResponse.json({ message: 'Webhook processado, perfil já atualizado.' }, { status: 200 });
          }

          const { error: updateProfileError } = await supabaseAdmin
            .from('perfis_profissionais')
            .update({
              plano_hotmart_id: hotmartOfferCode || hotmartPlanName || hotmartProductName || 'N/A',
              tipo_plano: finalTipoPlano,
              status_assinatura: finalStatusAssinatura,
              data_inicio_assinatura: finalDataInicio.toISOString(),
              data_expiracao_acesso: finalDataExpiracao!.toISOString(),
              hotmart_subscriber_code: hotmartSubscriberCode || hotmartTransactionId,
              hotmart_purchase_id: hotmartTransactionId,
              atualizado_em: new Date().toISOString(),
            })
            .eq('user_id', existingUser.user_id);

          if (updateProfileError) {
            console.error('Erro ao atualizar perfil profissional:', updateProfileError);
            throw updateProfileError;
          }
          console.log(`Perfil de ${buyerEmail} atualizado. Plano: ${finalTipoPlano}, Status: ${finalStatusAssinatura}, Expiração: ${finalDataExpiracao!.toISOString()}`);

        } else { 
          console.log(`Usuário ${buyerEmail} não encontrado. Criando novo usuário e perfil.`);
          const password = Math.random().toString(36).slice(-10);
          const { data: newUserAuth, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
            email: buyerEmail,
            password: password,
            email_confirm: true,
          });

          if (createUserError) {
            console.error('Erro ao criar usuário no Supabase Auth:', createUserError);
            throw createUserError;
          }
          if (!newUserAuth || !newUserAuth.user) {
            console.error('Falha ao criar usuário no Supabase Auth, newUserAuth.user é nulo.');
            throw new Error('Falha ao criar usuário no Supabase Auth.');
          }

          const { error: insertProfileError } = await supabaseAdmin
            .from('perfis_profissionais')
            .insert({
              user_id: newUserAuth.user.id,
              email: buyerEmail,
              plano_hotmart_id: hotmartOfferCode || hotmartPlanName || hotmartProductName || 'N/A',
              tipo_plano: finalTipoPlano,
              status_assinatura: finalStatusAssinatura,
              data_inicio_assinatura: finalDataInicio.toISOString(),
              data_expiracao_acesso: finalDataExpiracao!.toISOString(),
              hotmart_subscriber_code: hotmartSubscriberCode || hotmartTransactionId,
              hotmart_purchase_id: hotmartTransactionId,
            });

          if (insertProfileError) {
            console.error('Erro ao inserir perfil profissional:', insertProfileError);
            const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(newUserAuth.user.id);
            if (deleteUserError) {
                console.error('Erro ao tentar deletar usuário do Auth após falha na inserção do perfil:', deleteUserError);
            } else {
                console.log('Usuário do Auth deletado após falha na inserção do perfil.');
            }
            throw insertProfileError;
          }
          console.log(`Usuário ${buyerEmail} e perfil criados. Plano: ${finalTipoPlano}, Status: ${finalStatusAssinatura}, Expiração: ${finalDataExpiracao!.toISOString()}. Senha: ${password} (enviar por email).`);
          // TODO: Implementar envio de email com a senha
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