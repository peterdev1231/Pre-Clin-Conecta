import { NextRequest, NextResponse } from 'next/server';

// Rota em manutenção temporária
export async function POST(req: NextRequest) {
  return NextResponse.json({ message: 'Webhook em manutenção. Por favor, tente novamente mais tarde.' }, { status: 503 });
}

// TODO:
// 1. Confirmar os nomes exatos dos campos do payload da Hotmart (status, email, transaction_id, subscriber_code, product_id, offer_id, etc.)
// 2. Implementar a lógica de criação/atualização de usuários e perfis.
// 3. Implementar o envio de emails (boas-vindas, etc.).
// 4. Definir e configurar as variáveis de ambiente na Vercel: SUPABASE_SERVICE_ROLE_KEY e HOTMART_SECRET_TOKEN.
// 5. (Opcional) Adicionar uma tabela de logs para os webhooks recebidos para facilitar a depuração. 