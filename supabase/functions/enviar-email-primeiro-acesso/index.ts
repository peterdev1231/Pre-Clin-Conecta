import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.33.1';

// Interfaces úteis para tipagem
interface EmailData {
  email: string;
  nome?: string;
  redirectTo?: string;
}

interface ResponseError {
  error: string;
  status: number;
}

serve(async (req: Request) => {
  try {
    // CORS headers para permitir requisições do frontend
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    // Verificar se a requisição é POST
    if (req.method !== 'POST') {
      return handleError({ 
        error: 'Method not allowed', 
        status: 405 
      });
    }

    // Extrair e validar o corpo da requisição
    const { email, nome, redirectTo } = await req.json() as EmailData;

    if (!email) {
      return handleError({ 
        error: 'Email is required', 
        status: 400
      });
    }

    // Criar um cliente Supabase com a chave de serviço
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Preparar a URL de redirecionamento
    const baseUrl = redirectTo || 'https://app.preclinconecta.com';
    const redirectUrl = `${baseUrl}/definir-senha`;

    // Verificar se o usuário já existe
    const { data: existingUser, error: getUserError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (getUserError && getUserError.code !== 'PGRST116') {
      console.error('Error checking user existence:', getUserError);
      return handleError({ 
        error: 'Error checking user existence', 
        status: 500
      });
    }

    if (existingUser) {
      // Usuário já existe, vamos apenas enviar um link de primeiro acesso
      try {
        // Buscar usuário do Supabase Auth
        const { data: userData, error: userAuthError } = await supabaseAdmin.auth.admin.getUserByEmail(email);
        
        if (userAuthError || !userData?.user) {
          throw new Error(`User auth not found: ${userAuthError?.message}`);
        }

        // Verificar metadados para não redefinir usuários que já completaram o processo
        const userMetadata = userData.user.user_metadata || {};
        if (userMetadata.first_access_completed_at) {
          return new Response(
            JSON.stringify({
              success: true,
              message: 'User has already completed first access',
              alreadyCompleted: true
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Atualizar metadados do usuário para indicar que está aguardando primeiro acesso
        await supabaseAdmin.auth.admin.updateUserById(userData.user.id, {
          user_metadata: {
            ...userMetadata,
            status: 'awaiting_first_access'
          }
        });

        // Gerar link de signup para definir a senha
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email,
          options: {
            redirectTo: redirectUrl,
            // Metadados adicionais para identificar que é um link de primeiro acesso
            data: {
              flow_type: 'first_access'
            }
          }
        });

        if (linkError) {
          throw new Error(`Failed to generate link: ${linkError.message}`);
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'First access link generated and sent',
            action: 'password_recovery_email_sent',
            email,
            linkUrl: linkData.properties.action_link // URL completa do link gerado
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        console.error('Error generating first access link:', err);
        return handleError({ 
          error: `Error generating first access link: ${err.message}`, 
          status: 500
        });
      }
    } else {
      // Usuário não existe, vamos criar um novo com status de "aguardando primeiro acesso"
      try {
        // Criar usuário no Supabase Auth
        const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true, // E-mail já confirmado
          user_metadata: {
            nome: nome || email.split('@')[0],
            status: 'awaiting_first_access',
            created_at: new Date().toISOString()
          }
        });

        if (createUserError) {
          throw new Error(`Failed to create user: ${createUserError.message}`);
        }

        // Gerar link de signup para definir a senha
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email,
          options: {
            redirectTo: redirectUrl,
            // Metadados adicionais para identificar que é um link de primeiro acesso
            data: {
              flow_type: 'first_access'
            }
          }
        });

        if (linkError) {
          throw new Error(`Failed to generate link: ${linkError.message}`);
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'User created and first access link sent',
            action: 'user_created_and_recovery_email_sent',
            userId: newUser.user.id,
            email,
            linkUrl: linkData.properties.action_link // URL completa do link gerado
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        console.error('Error creating user and generating link:', err);
        return handleError({ 
          error: `Error creating user and generating link: ${err.message}`, 
          status: 500
        });
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    return handleError({ 
      error: `Unexpected error: ${err.message}`, 
      status: 500
    });
  }
});

// Função auxiliar para lidar com erros de forma consistente
function handleError(error: ResponseError): Response {
  return new Response(
    JSON.stringify({
      success: false,
      message: error.error
    }),
    {
      status: error.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    }
  );
} 