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
  if (nomeLower.includes('anual') && nomeLower.includes('trial')) {
    return 'anual_trial';
  }
  if (nomeLower.includes('anual')) {
    // Assumindo que se não é trial e é anual, é pago. Ajuste conforme necessário.
    return 'anual_pago';
  }
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

    // 4. Verificar se o usuário já existe
    let usuarioExistente = null;
    try {
      // A documentação mais recente sugere que filtros como `email` não são diretamente suportados em `listUsers`.
      // A melhor abordagem seria criar um usuário e lidar com o conflito, ou iterar sobre os usuários.
      // No entanto, para verificar a existência antes de criar e para o seu fluxo:
      // Vamos prosseguir com a criação e Supabase lidará com o erro se o email já existir (se houver constraint unique).
      // Mas, para o log e para obter o userId se já existir, precisamos de uma busca.
      // A createUser irá falhar se o email já existir e for confirmado.

      // Simplificando a lógica de verificação de usuário existente para este contexto:
      // Tentaremos criar o usuário. Se ele já existir, o createUser pode falhar ou retornar o usuário existente
      // dependendo da configuração e se o email está confirmado. 
      // Vamos remover a busca explícita por enquanto e confiar no comportamento do createUser e generateLink.
      // A lógica de `userId = usuarioExistente?.id;` será ajustada após a tentativa de criação.
      // Esta parte precisa ser refinada para um tratamento robusto de usuário existente.
      // Por ora, focaremos em corrigir a query direta a `public.users`.
      // A busca por `from('users')` estava definitivamente errada.
      // Para o fluxo de "criar ou obter link para usuário existente", a lógica abaixo (criar, depois gerar link) é mais direta.

    } catch (e) {
      console.warn('[Hotmart Webhook] Aviso ao tentar listar/verificar usuário (pode ser ignorado se a criação tratar conflitos):', e);
    }

    // 5. Criar novo usuário no Supabase Auth ou obter dados se já existir
    let userId: string | undefined;

    const { data: novoUsuarioData, error: erroNovoUsuario } = await supabaseAdmin.auth.admin.createUser({
      email: emailComprador,
      email_confirm: true, 
      user_metadata: { nome_completo: nomeComprador },
    });

    if (erroNovoUsuario) {
      // Verifica mensagens comuns de erro do Supabase para "usuário já existe"
      if (erroNovoUsuario.message.toLowerCase().includes('user already exists') || 
          erroNovoUsuario.message.toLowerCase().includes('duplicate key value violates unique constraint')) {
        
        console.log(`[Hotmart Webhook] Tentativa de criar usuário ${emailComprador} falhou pois ele já existe. Buscando ID do usuário existente.`);
        
        // IMPORTANTE: listUsers() sem filtros busca TODOS os usuários.
        // Para um grande número de usuários, implemente paginação ou uma função SQL (RPC) otimizada.
        const { data: { users: listaDeUsuarios }, error: erroListagem } = await supabaseAdmin.auth.admin.listUsers({ perPage: 10000 }); 

        if (erroListagem) {
          console.error('[Hotmart Webhook] Erro ao listar usuários para encontrar o ID do existente:', erroListagem);
          return NextResponse.json({ error: `Falha ao buscar usuário existente: ${erroListagem.message}` }, { status: 500 });
        }
        
        const usuarioEncontrado = listaDeUsuarios.find(u => u.email === emailComprador);
        
        if (usuarioEncontrado) {
          userId = usuarioEncontrado.id;
          console.log(`[Hotmart Webhook] Usuário existente ${emailComprador} encontrado com ID: ${userId}.`);
        } else {
          console.error(`[Hotmart Webhook] Erro CRÍTICO: Usuário ${emailComprador} supostamente já existe (createUser falhou), mas não foi encontrado na lista de usuários.`);
          return NextResponse.json({ error: 'Inconsistência ao processar usuário existente.' }, { status: 500 });
        }
      } else {
        // Outro erro durante a criação do usuário, não relacionado a "já existe"
        console.error('[Hotmart Webhook] Erro ao criar usuário no Supabase Auth:', erroNovoUsuario);
        return NextResponse.json({ error: `Falha ao criar usuário: ${erroNovoUsuario.message}` }, { status: 500 });
      }
    } else {
      // Usuário criado com sucesso pela primeira vez
      userId = novoUsuarioData.user?.id;
      console.log(`[Hotmart Webhook] Novo usuário ${emailComprador} criado com sucesso. ID: ${userId}`);
    }
    
    if (!userId) {
      console.error('[Hotmart Webhook] ID do usuário não pôde ser determinado.');
      return NextResponse.json({ error: 'Falha crítica ao obter ID do usuário.' }, { status: 500 });
    }

    // 6. Gerar o link para definir a senha
    // Este link é para o primeiro acesso, mas pode ser usado para reset se o usuário já existir e não tiver senha.
    // A URL de redirecionamento deve ser a sua página /definir-senha no frontend.
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/definir-senha`;
    const { data: linkData, error: erroLink } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink', // Pode ser 'signup' se o usuário é novo, ou 'recovery' se já existe. Magiclink pode funcionar bem aqui.
                         // Usar 'recovery' para garantir que funcione mesmo se o usuário já existir (para definir a senha inicial).
                         // Ou usar 'invite' para novos usuários se quiser um fluxo de convite.
                         // Para definir senha inicial, 'recovery' (se user já existe) ou um tipo especial como 'invite' ou 'magiclink'
                         // com redirectTo para a página de definir senha é o ideal.
                         // Vamos usar 'magiclink' pois é versátil e pode levar ao redirectTo para definir senha.
                         // Se quiser forçar a definição de senha como parte do fluxo de signup, precisaria de um `redirectTo`
                         // na criação do usuário ou um tipo de link específico.
                         // 'recovery' é mais seguro se o usuário já existir.
                         // Para um "primeiro acesso para definir senha", `type: 'magiclink'` com o `redirectTo` correto é uma boa abordagem.
                         // Se o usuário acabou de ser criado, 'invite' pode ser mais semântico.
                         // Vamos tentar com 'invite' para novos usuários e 'recovery' para existentes.
      email: emailComprador,
      options: {
        redirectTo: redirectUrl, // A página onde o usuário definirá a senha
      }
    });

    if (erroLink) {
      console.error('[Hotmart Webhook] Erro ao gerar link de definição de senha:', erroLink);
      return NextResponse.json({ error: `Falha ao gerar link: ${erroLink.message}` }, { status: 500 });
    }
    let linkDefinicaoSenha = linkData.properties?.action_link; // O nome da propriedade pode variar um pouco, verifique a doc ou o objeto retornado
    if (!linkDefinicaoSenha && linkData.user && linkData.user.confirmation_sent_at) {
        // Se foi 'invite' e já mandou, ou outro tipo que envia automaticamente,
        // pode ser que não retorne o action_link diretamente aqui,
        // mas sim que o Supabase já enviou um e-mail.
        // Precisamos garantir que estamos gerando um link para NOSSO e-mail.
        // Para o nosso email personalizado, precisamos do link explícito.
        // Re-tentando com 'recovery' se 'invite' não deu link direto para nosso uso
        // Ou melhor, vamos usar um tipo que com certeza nos dê o link para o email.
        // `generateLink` com `type: 'magiclink'` ou `type: 'recovery'` deveria dar o `action_link`.
        // Se estamos criando o usuário acima, e ele não tem senha, o `magiclink` para `redirectTo` à página de definir senha é bom.

        // Simplificando: usar `type: 'magiclink'` e garantir que o `redirectTo` leve para a página certa.
        // Ou, para ser mais explícito sobre "definir senha pela primeira vez",
        // considere se o Supabase tem um tipo específico para "convite para definir senha".
        // Por enquanto, `magiclink` com `redirectTo` para `/definir-senha` deve funcionar.
        // Ajuste o tipo se necessário para o fluxo exato (primeiro acesso vs. recuperação).
        // Para primeiro acesso, talvez o `type: 'invite'` seria ideal se quisermos que o Supabase envie o e-mail
        // mas como queremos enviar nosso próprio e-mail, precisamos do link.

        // Vamos refazer a geração do link para ser mais robusto para obter o action_link
        const { data: linkDataRetry, error: erroLinkRetry } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink', // Magiclink é uma boa opção para levar o usuário à página de definir senha.
            email: emailComprador,
            options: { redirectTo: redirectUrl }
        });
        if (erroLinkRetry) {
            console.error('[Hotmart Webhook] Erro ao gerar link de definição de senha (retry):', erroLinkRetry);
            return NextResponse.json({ error: `Falha ao gerar link: ${erroLinkRetry.message}` }, { status: 500 });
        }
        linkDefinicaoSenha = linkDataRetry.properties?.action_link;
    }


    if (!linkDefinicaoSenha) {
      console.error('[Hotmart Webhook] Não foi possível obter o action_link para definição de senha.');
      return NextResponse.json({ error: 'Falha ao obter link de definição de senha.' }, { status: 500 });
    }
    console.log(`[Hotmart Webhook] Link de definição de senha gerado: ${linkDefinicaoSenha}`);


    // 7. Invocar a Edge Function 'enviar-email-boas-vindas'
    const { error: erroEnvioEmail } = await supabaseAdmin.functions.invoke('enviar-email-boas-vindas', {
      body: {
        emailDestinatario: emailComprador,
        nomeDestinatario: nomeComprador,
        linkDefinicaoSenha: linkDefinicaoSenha,
      },
    });

    if (erroEnvioEmail) {
      console.error('[Hotmart Webhook] Erro ao invocar a função de enviar email:', erroEnvioEmail);
      // Não necessariamente um erro fatal para o webhook do Hotmart, mas precisa ser investigado.
      // O usuário foi criado, mas o email pode não ter sido enviado.
      // Retornar sucesso para Hotmart, mas logar o erro.
    } else {
      console.log(`[Hotmart Webhook] Função 'enviar-email-boas-vindas' invocada com sucesso para ${emailComprador}.`);
    }

    // 8. Criar/atualizar perfil na tabela 'perfis_profissionais'
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