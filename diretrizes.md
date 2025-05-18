Visão Geral do Sistema
Este sistema consiste em uma aplicação web com duas interfaces principais: um painel para profissionais de saúde e um formulário voltado para pacientes. A arquitetura foi projetada com foco em robustez, segurança e facilidade de uso.
Componentes Principais

Sistema de Autenticação

Exclusivo para profissionais de saúde (médicos/clínicas)
Não é necessária autenticação para pacientes


Portal do Profissional de Saúde

Painel para gerenciamento de respostas dos pacientes
Geração e gerenciamento de links
Configurações do sistema


Sistema de Formulário para Pacientes

Formulários web responsivos acessíveis via links únicos
Coleta e validação de dados
Recursos para upload de arquivos


Sistema de Banco de Dados

[x] Armazenamento seguro das respostas dos pacientes (estrutura definida)
[x] Associação das respostas aos profissionais de saúde (estrutura definida)
[x] Armazenamento de arquivos/imagens enviados (estrutura definida)



Papéis de Usuário e Funções
Profissional de Saúde (Usuário Autenticado)
Funções:

Geração de Links

Criar links únicos para enviar aos pacientes
Opção para personalizar perguntas do formulário (se necessário)
Capacidade de desativar/expirar links


Gerenciamento de Respostas

Visualizar lista de todas as respostas em ordem cronológica
Filtrar respostas por status (lidas/não lidas)
Buscar por pacientes/respostas específicas
Marcar respostas como lidas


Visualização de Respostas

Ver detalhes das respostas dos pacientes
Acessar arquivos/imagens enviados pelos pacientes
Imprimir ou exportar dados das respostas
Visualizar histórico do paciente (se houver múltiplos envios)


Gerenciamento de Conta

Atualizar informações de perfil
Alterar senha/configurações de segurança
Gerenciar preferências de notificação


Análises (Opcional)

Visualizar taxas de resposta
Acompanhar métricas de preenchimento de formulário
Analisar queixas/medicações comuns dos pacientes



Paciente (Usuário Não Autenticado)
Funções:

Acesso ao Formulário

Acessar formulário via link único
Não é necessário login


Preenchimento do Formulário

Fornecer informações pessoais
Descrever queixa principal/motivo da consulta
Listar medicações atuais
Indicar alergias (com opção de selecionar "nenhuma")
Enviar fotos relevantes (opcional)
Enviar resultados de exames relevantes (opcional)


Revisão do Formulário

Revisar informações inseridas antes do envio
Editar informações se necessário


Envio

Enviar formulário preenchido
Receber confirmação de envio bem-sucedido



Fluxo Lógico de Dados

Fluxo de Geração de Link

Profissional faz login no painel
Profissional clica no botão "Gerar Novo Link"
Sistema gera link único com ID do profissional associado
Profissional compartilha link com paciente (via email, SMS, etc.)


Fluxo do Formulário do Paciente

Paciente acessa o link
Sistema apresenta formulário passo a passo
Paciente preenche campos obrigatórios
Paciente envia arquivos opcionais
Paciente revisa informações
Paciente envia formulário
Sistema confirma envio bem-sucedido


Fluxo de Processamento de Dados

Sistema valida dados do formulário
Sistema armazena respostas no banco de dados
Sistema associa resposta ao profissional via ID do link
Sistema marca resposta como "não lida"
Sistema notifica profissional sobre novo envio (opcional)


Fluxo de Revisão do Profissional

Profissional faz login no painel
Profissional vê nova resposta não lida
Profissional clica na resposta para ver detalhes
Sistema exibe informações organizadas do paciente
Profissional pode marcar resposta como "lida"
Profissional pode imprimir ou exportar dados conforme necessário



Considerações de Robustez

Segurança

Armazenamento criptografado para informações do paciente
Autenticação segura para profissionais
Timeouts automáticos de sessão
Limitação de taxa para prevenir abusos


Confiabilidade

Funcionalidade de salvamento automático do formulário

Fase 2: Desenvolvimento do projeto
Semana 3: Backend - Core
Dia 1-2: Sistema de Autenticação

[x] Implementar registro e login de médicos (Interface e lógica inicial implementadas)
[x] Implementar gestão de sessões e tokens (Contexto de Auth e hooks básicos implementados via Supabase)
[x] Implementar recuperação de senha (Interface e lógica inicial implementadas)

Dia 3-5: API de Gerenciamento de Links

[x] Implementar geração de links únicos (Edge Function `gerar-link-formulario` OK)
[x] Implementar verificação de validade de links (Edge Function `verificar-link-formulario` OK)
[x] Implementar sistema de expiração automática (verificação no acesso OK, `data_expiracao` funcional)

Semana 4: Backend - Formulários e Respostas
Dia 1-3: API de Formulários

[x] Implementar endpoint de submissão de formulário (Edge Function `submeter-formulario-paciente` OK)
[x] Implementar validação de dados do formulário (básica na Edge Function OK)
[x] Implementar armazenamento de respostas (tabela `respostas_pacientes` OK)

Dia 4-5: API de Arquivos

[x] Implementar upload seguro de imagens e documentos (Upload funcional via Edge Function `upload-arquivo-paciente` e tabela `arquivos_pacientes`)
[ ] Implementar validação e sanitização de arquivos (validação básica de tipo na EF, robustez pendente)
[x] Implementar integração com S3 (Supabase Storage configurado e funcional)

Semana 5: Frontend - Portal do Médico
Dia 1-2: Interface de Autenticação

[x] Implementar telas de login e recuperação de senha (Telas de Login, Cadastro, Solicitação de Recuperação e Atualização de Senha OK)
[x] Implementar gerenciamento de sessão no cliente (AuthProvider e useAuth implementados)
[x] Implementar proteção de rotas (Componente ProtectedRoute básico implementado)

Dia 3-5: Dashboard Principal

Implementar listagem de respostas (UI base, busca de dados e responsividade OK; funcionalidade completa pendente)
Implementar filtros e pesquisa (Pesquisa por nome OK; filtros avançados pendentes)
[x] Implementar geração de novos links (Modal e chamada à Edge Function OK)

Semana 6: Frontend - Formulário do Paciente e Detalhes
Dia 1-3: Formulário do Paciente

Implementar formulário responsivo em etapas:

[x] Etapa 1: Nome do paciente
[x] Etapa 2: Queixa principal
[x] Etapa 3: Medicações em uso
[x] Etapa 4: Alergias conhecidas
[x] Etapa 5: Upload de fotos (opcional) (Placeholder UI OK, lógica de envio pendente da API de Arquivos)
[x] Etapa 6: Upload de exames (opcional) (Placeholder UI OK, lógica de envio pendente da API de Arquivos)
[x] Etapa 7: Revisão e confirmação



Dia 4-5: Visualização Detalhada
[~] Visualização Detalhada (UI e ações básicas OK, visualizador de arquivos aguardando URLs da API de Upload)
  [x] Implementar tela de detalhe da resposta (busca de dados, layout, parse de JSON)
  [x] Implementar ações (marcar como lido/não lido funcional, impressão básica do navegador)
  [/] Implementar visualizador de imagens/documentos (Iniciando busca de arquivos e geração de URLs seguras)

Fase 3: Testes e Refinamento (2 semanas)