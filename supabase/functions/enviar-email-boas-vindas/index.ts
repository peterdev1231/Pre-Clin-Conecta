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
    
    let emailHtmlBody = `
      <div style="max-width:600px;margin:0 auto;padding:20px;font-family:Arial, sans-serif;background-color:#ffffff;color:#333333;">
        <p style="font-size:16px;line-height:1.5;color:#064E3B;">
          Olá <strong>${nomeFormatado}</strong>,
        </p>

        <p style="font-size:14px;line-height:1.6;">
          Seja muito bem-vindo(a) ao <strong style="color:#00B35A;">PréClin Conecta</strong>! Estamos muito felizes em ter você conosco.
        </p>

        <p style="font-size:14px;line-height:1.6;">
          Seu acesso à plataforma foi criado com sucesso.
        </p>

        <p style="font-size:14px;line-height:1.6;">
          <strong style="color:#064E3B;">Seu email para login é:</strong> ${emailDestinatario}
        </p>
    `;

    if (senhaGerada) {
        emailHtmlBody += `
        <p style="font-size:14px;line-height:1.6;">
          <strong style="color:#064E3B;">Sua senha temporária para o primeiro acesso é:</strong>
          <code style="display:inline-block;background-color:#F2F2F2;padding:4px 8px;border-radius:4px;color:#333333;">${senhaGerada}</code>
        </p>
        <p style="font-size:14px;line-height:1.6;">
          Recomendamos que você altere esta senha após o primeiro login por segurança.
        </p>
        <p style="text-align:center;margin:30px 0;">
          <a
            href="${APP_LOGIN_URL}"
            style="
              background-color:#00B35A;
              color:#ffffff;
              text-decoration:none;
              font-size:16px;
              font-weight:bold;
              padding:12px 24px;
              border-radius:8px;
              display:inline-block;
            "
          >
            Ir para a Página de Login
          </a>
        </p>
        <p style="font-size:12px;line-height:1.4;color:#777777;">
          Se o botão acima não funcionar, copie e cole o seguinte endereço no seu navegador:<br>
          ${APP_LOGIN_URL}
        </p>
    `;
    } else {
        emailHtmlBody += `
        <p style="font-size:14px;line-height:1.6;">
          Para acessar sua conta, por favor, visite a página de login:
          <a href="${APP_LOGIN_URL}" style="color:#00B35A;text-decoration:none;">${APP_LOGIN_URL}</a>
        </p>
        <p style="font-size:14px;line-height:1.6;">
          Se você não souber sua senha, utilize a opção "Esqueci minha senha" na página de login.
        </p>
        <p style="font-size:12px;color:#FF6B6B;">
          <!-- log de advertência caso queira -->
          ⚠️ [enviar-email-boas-vindas] senhaGerada não fornecida no payload.
        </p>
    `;
    }

    emailHtmlBody += `
        <hr style="border:none;border-top:1px solid #EEEEEE;margin:30px 0;">

        <p style="font-size:14px;line-height:1.6;">
          Se tiver qualquer dúvida, nossa equipe de suporte está à disposição através do email
          <a href="mailto:${SUPPORT_EMAIL}" style="color:#00B35A;text-decoration:none;">
            ${SUPPORT_EMAIL}
          </a>.
        </p>

        <p style="font-size:12px;line-height:1.4;color:#777777;">
          Lembre-se: este é um email automático, por favor, não responda diretamente a esta mensagem.
        </p>

        <p style="font-size:14px;line-height:1.6;color:#064E3B;">
          Atenciosamente,<br>
          <strong>Equipe PréClin Conecta</strong>
        </p>
      </div>
    `;

    const resendPayload = {
      from: `${EMAIL_FROM_NAME} <${EMAIL_FROM_ADDRESS}>`,
      to: [emailDestinatario],
      subject: 'Bem-vindo(a) ao PréClin Conecta!',
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