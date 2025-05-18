// supabase/functions/submeter-formulario-paciente/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // TODO: Restringir para a URL do frontend em produção
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // A submissão será POST
}; 