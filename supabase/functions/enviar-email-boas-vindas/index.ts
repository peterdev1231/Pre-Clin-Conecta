import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'; // Verifique sua versão do std
import { corsHeaders } from './cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const EMAIL_FROM_ADDRESS = 'naoresponder@preclinconecta.com';
const EMAIL_FROM_NAME = 'Equipe PréClin Conecta';
// Tenta pegar do ambiente da function, senão usa um fallback.
// Certifique-se de que NEXT_PUBLIC_APP_URL está nos segredos da função se quiser que seja dinâmico.
const APP_URL = Deno.env.get('NEXT_PUBLIC_APP_URL') || 'https://app.preclinconecta.com'; 
const APP_LOGIN_URL = `${APP_URL}/login`;
const SUPPORT_EMAIL = 'suporte@preclinconecta.com';

interface WelcomeEmailPayload {
  emailDestinatario: string;
  nomeDestinatario?: string;
  linkDefinicaoSenha?: string; // Campo antigo, será descontinuado para este fluxo
  senhaGerada?: string; // NOVO CAMPO: para receber a senha gerada
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!RESEND_API_KEY) {
    console.error('[enviar-email-boas-vindas] RESEND_API_KEY não configurada.');
    return new Response(JSON.stringify({ error: 'Configuração do servidor de email incompleta.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload: WelcomeEmailPayload = await req.json();
    const { emailDestinatario, nomeDestinatario, linkDefinicaoSenha, senhaGerada } = payload;

    console.log('[enviar-email-boas-vindas] Payload recebido. Senha gerada:', senhaGerada);

    if (!emailDestinatario) {
      return new Response(JSON.stringify({ error: 'emailDestinatario é obrigatório.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const nomeFormatado = nomeDestinatario || emailDestinatario.split('@')[0] || 'Usuário';
    
    const emailSubject = 'Bem-vindo(a) ao PréClin Conecta!';
    let emailHtmlBody = `
      <p>Olá ${nomeFormatado},</p>
      <p>Seja muito bem-vindo(a) ao PréClin Conecta! Estamos muito felizes em ter você conosco.</p>
      <p>Seu acesso à plataforma foi criado com sucesso.</p>
      <p><strong>Seu email para login é:</strong> ${emailDestinatario}</p>
    `;

    if (senhaGerada) {
        emailHtmlBody += `
            <p><strong>Sua senha temporária para o primeiro acesso é:</strong> <code>${senhaGerada}</code></p>
            <p>Recomendamos que você altere esta senha após o primeiro login por segurança.</p>
            <p>Você pode fazer login agora clicando aqui: <a href="${APP_LOGIN_URL}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Ir para a Página de Login</a></p>
             <p style="font-size: 0.9em; color: #666;">Se o botão acima não funcionar, copie e cole o seguinte endereço no seu navegador:<br>${APP_LOGIN_URL}</p>
        `;
    } else {
        // Fallback caso a senha gerada não seja fornecida (não deveria acontecer neste fluxo)
         emailHtmlBody += `
            <p>Para acessar sua conta, por favor, visite a página de login: <a href="${APP_LOGIN_URL}">${APP_LOGIN_URL}</a></p>
            <p>Se você não souber sua senha, utilize a opção "Esqueci minha senha" na página de login.</p>
         `;
         console.warn('[enviar-email-boas-vindas] senhaGerada não fornecida no payload para email de boas-vindas.');
    }

    emailHtmlBody += `
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p>Se tiver qualquer dúvida, nossa equipe de suporte está à disposição através do email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
      <p style="font-size: 0.9em; color: #666;">Lembre-se: este é um email automático, por favor, não responda diretamente a esta mensagem.</p>
      <p>Atenciosamente,<br>Equipe PréClin Conecta</p>
    `;

    const resendPayload = {
      from: `${EMAIL_FROM_NAME} <${EMAIL_FROM_ADDRESS}>`,
      to: [emailDestinatario],
      subject: emailSubject,
      html: emailHtmlBody,
    };

    console.log(`[enviar-email-boas-vindas] Preparando para enviar email para: ${emailDestinatario}`);
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendPayload),
    });

    if (!response.ok) {
      const errorBodyText = await response.text(); // Ler como texto para evitar erro de JSON malformado
      console.error(`[enviar-email-boas-vindas] Erro ao enviar email pelo Resend. Status: ${response.status}. Corpo: ${errorBodyText}`);
      try {
        const errorBodyJson = JSON.parse(errorBodyText);
        throw new Error(`Falha ao enviar email: ${errorBodyJson.message || response.statusText}`);
      } catch (e) {
        throw new Error(`Falha ao enviar email: ${response.statusText} - ${errorBodyText}`);
      }
    }

    const data = await response.json();
    console.log('[enviar-email-boas-vindas] Email enviado com sucesso via Resend. ID da mensagem:', data.id);

    return new Response(JSON.stringify({ message: 'Email de boas-vindas enviado com sucesso!', resendMessageId: data.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[enviar-email-boas-vindas] Erro inesperado:', error);
    return new Response(JSON.stringify({ error: error.message || 'Ocorreu um erro interno no servidor.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 