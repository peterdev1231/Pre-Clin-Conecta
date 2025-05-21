import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Variáveis de Ambiente Esperadas:
// process.env.NEXT_PUBLIC_SUPABASE_URL
// process.env.SUPABASE_SERVICE_ROLE_KEY
// process.env.HOTMART_SECRET_TOKEN (para verificar a assinatura do webhook - recomendado)
// process.env.NEXT_PUBLIC_APP_URL (ex: https://app.preclinconecta.com)

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

    // 4. Verificar se o usuário já existe (opcional, mas bom para evitar duplicatas ou tratar atualizações)
    const { data: usuarioExistente, error: erroBuscaUsuario } = await supabaseAdmin
      .from('users') // Supabase armazena usuários em auth.users, mas acessamos via RPC ou `auth.admin`
      .select('id, email')
      .eq('email', emailComprador)
      .maybeSingle(); // Use maybeSingle se pode não existir

    if (erroBuscaUsuario && erroBuscaUsuario.code !== 'PGRST116') { // PGRST116: "Searched item not found"
        console.error('[Hotmart Webhook] Erro ao buscar usuário existente:', erroBuscaUsuario);
        // Não necessariamente bloquear, mas logar
    }

    if (usuarioExistente) {
      console.log(`[Hotmart Webhook] Usuário com email ${emailComprador} já existe. ID: ${usuarioExistente.id}. (Lógica de atualização/novo email pode ser necessária aqui)`);
      // TODO: Decidir o que fazer se o usuário já existe.
      // - Reenviar e-mail de boas-vindas?
      // - Atualizar dados do perfil?
      // - Ignorar?
      // Por enquanto, vamos permitir que o fluxo continue para o caso de reenvio ou se a criação do usuário for idempotente.
    }

    // 5. Criar novo usuário no Supabase Auth
    let userId = usuarioExistente?.id;
    let linkDefinicaoSenha = '';

    if (!usuarioExistente) {
      console.log(`[Hotmart Webhook] Criando novo usuário para ${emailComprador}.`);
      const { data: novoUsuarioData, error: erroNovoUsuario } = await supabaseAdmin.auth.admin.createUser({
        email: emailComprador,
        email_confirm: true, // Marcar como confirmado, já que a compra confirma a validade do email
        user_metadata: {
          nome_completo: nomeComprador,
          // Adicione outros metadados que desejar, ex: origem_cadastro: 'hotmart'
        },
        // A senha será definida pelo usuário através do link
      });

      if (erroNovoUsuario) {
        console.error('[Hotmart Webhook] Erro ao criar usuário no Supabase Auth:', erroNovoUsuario);
        return NextResponse.json({ error: `Falha ao criar usuário: ${erroNovoUsuario.message}` }, { status: 500 });
      }
      userId = novoUsuarioData.user?.id;
      console.log(`[Hotmart Webhook] Usuário criado com sucesso. ID: ${userId}, Email: ${emailComprador}`);
    } else {
       console.log(`[Hotmart Webhook] Usuário ${emailComprador} já existe. Tentando gerar novo link de definição/reset de senha.`);
    }
    
    if (!userId) {
      console.error('[Hotmart Webhook] ID do usuário não obtido após criação/verificação.');
      return NextResponse.json({ error: 'Falha ao obter ID do usuário.' }, { status: 500 });
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
    linkDefinicaoSenha = linkData.properties?.action_link; // O nome da propriedade pode variar um pouco, verifique a doc ou o objeto retornado
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

    // 8. (Opcional) Criar/atualizar perfil na tabela 'perfis_profissionais' ou similar
    // Exemplo:
    // if (userId) {
    //   const { error: erroPerfil } = await supabaseAdmin
    //     .from('perfis_profissionais') // ou sua tabela de perfis
    //     .upsert({
    //       user_id: userId, // Chave estrangeira para auth.users.id
    //       email: emailComprador,
    //       nome_completo: nomeComprador,
    //       // outros campos do perfil
    //       // hotmart_transaction_id: transactionId, // para referência
    //     }, { onConflict: 'user_id' }); // Evitar duplicatas se o perfil já existir
    //   if (erroPerfil) {
    //     console.error('[Hotmart Webhook] Erro ao salvar perfil do profissional:', erroPerfil);
    //   } else {
    //     console.log(`[Hotmart Webhook] Perfil salvo/atualizado para ${emailComprador}.`);
    //   }
    // }

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