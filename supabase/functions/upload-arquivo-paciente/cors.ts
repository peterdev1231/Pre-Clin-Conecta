export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Em produção, restrinja para o seu domínio frontend
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}; 