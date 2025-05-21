const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Script de Deploy PréClin Conecta\n');

// Função para executar comandos shell e exibir saída
function runCommand(command) {
  try {
    console.log(`\n> Executando: ${command}\n`);
    const output = execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`\n❌ Erro ao executar o comando: ${error.message}`);
    return false;
  }
}

// Fluxo principal do deploy
async function deploy() {
  // Etapa 1: Garantir que as alterações locais foram commitadas
  rl.question('\n⚠️  Você já commitou todas as alterações? (s/n): ', (answer) => {
    if (answer.toLowerCase() !== 's') {
      console.log('🛑 Por favor, commite suas alterações antes de fazer o deploy.');
      rl.close();
      return;
    }

    // Etapa 2: Compilar o projeto
    console.log('\n📦 Compilando o projeto...');
    if (!runCommand('npm run build')) {
      rl.close();
      return;
    }

    // Etapa 3: Confirmar deploy para produção
    rl.question('\n⚠️  Deseja fazer o deploy para PRODUÇÃO? Esta ação afetará o site em produção. (s/n): ', (deployAnswer) => {
      if (deployAnswer.toLowerCase() !== 's') {
        console.log('🛑 Deploy cancelado pelo usuário.');
        rl.close();
        return;
      }

      // Etapa 4: Deploy para Vercel
      console.log('\n🚀 Iniciando deploy para Vercel...');
      runCommand('vercel --prod');
      
      console.log('\n✅ Processo de deploy concluído!');
      console.log('\n👀 Verifique o status do deploy na Vercel Dashboard.');
      rl.close();
    });
  });
}

// Iniciar o processo de deploy
deploy().catch(err => {
  console.error('\n❌ Erro no processo de deploy:', err);
  rl.close();
}); 