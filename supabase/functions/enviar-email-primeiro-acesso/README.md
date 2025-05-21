# Função de Envio de Email de Primeiro Acesso

Esta função Edge do Supabase gerencia o fluxo de primeiro acesso de usuários, permitindo separar claramente os processos de primeiro acesso e recuperação de senha.

## Funcionalidades

1. **Criação de usuários** - Se o usuário não existir, cria um novo com metadados apropriados
2. **Geração de links de primeiro acesso** - Gera links específicos para o primeiro acesso
3. **Verificação de status** - Previne o envio de links redundantes para usuários que já definiram senha

## Como usar

### Envio de link para um novo usuário

```javascript
const response = await fetch('https://iahvbukzioxbjbcxyqrv.supabase.co/functions/v1/enviar-email-primeiro-acesso', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  },
  body: JSON.stringify({
    email: 'usuario@exemplo.com',
    nome: 'Nome do Usuário', // Opcional
    redirectTo: 'https://app.preclinconecta.com' // Opcional, base da URL de redirecionamento
  })
});

const data = await response.json();
console.log(data);
```

### Resposta de sucesso (novo usuário)

```json
{
  "success": true,
  "message": "User created and first access link sent",
  "action": "user_created_and_recovery_email_sent",
  "userId": "user-uuid",
  "email": "usuario@exemplo.com",
  "linkUrl": "https://iahvbukzioxbjbcxyqrv.supabase.co/auth/v1/verify?..."
}
```

### Resposta de sucesso (usuário existente)

```json
{
  "success": true,
  "message": "First access link generated and sent",
  "action": "password_recovery_email_sent",
  "email": "usuario@exemplo.com",
  "linkUrl": "https://iahvbukzioxbjbcxyqrv.supabase.co/auth/v1/verify?..."
}
```

### Resposta para usuário que já completou primeiro acesso

```json
{
  "success": true,
  "message": "User has already completed first access",
  "alreadyCompleted": true
}
```

## Fluxo completo de integração com Hotmart

1. Quando o usuário faz a compra na Hotmart, utilize webhooks para receber a notificação
2. Chame esta função Edge para criar o usuário e gerar o link de primeiro acesso
3. Envie o email de boas-vindas com o link gerado
4. O usuário clica no link e é direcionado para `/definir-senha`
5. O sistema detecta que é um fluxo de primeiro acesso e permite a definição da senha
6. Os metadados do usuário são atualizados após a definição da senha

## Considerações de segurança

- Esta função deve ser chamada apenas por sistemas confiáveis (backend, webhooks seguros)
- A função usa a chave de serviço do Supabase, portanto tem acesso total ao banco de dados
- Os links gerados têm tempo de expiração, mas são válidos para uma única utilização 