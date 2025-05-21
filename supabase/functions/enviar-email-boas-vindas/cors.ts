// supabase/functions/enviar-email-boas-vindas/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Idealmente, restrinja para seus domínios em produção
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Esta função será chamada via POST
}; 