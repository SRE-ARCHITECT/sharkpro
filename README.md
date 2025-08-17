# SharkPro - Sistema de Gestão de Empréstimos

Sistema completo para gestão de empréstimos e cobranças, agora integrado com Supabase para maior segurança e escalabilidade.

## 🚀 Funcionalidades

- **Autenticação Segura**: Sistema de login/logout com Supabase Auth
- **Gestão de Clientes**: Cadastro completo com documentos e validações
- **Gestão de Empréstimos**: Criação, acompanhamento e controle de parcelas
- **Dashboard Inteligente**: Estatísticas em tempo real e indicadores visuais
- **Relatórios PDF**: Geração automática de relatórios detalhados
- **Armazenamento de Documentos**: Upload seguro de documentos dos clientes
- **Controle de Acesso**: Sistema de permissões com administradores
- **Responsivo**: Interface adaptável para desktop e mobile
- **Modo Escuro**: Alternância entre temas claro e escuro

## 🛠️ Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Bibliotecas**: jsPDF, jspdf-autotable
- **APIs**: ViaCEP, Receita Federal
- **PWA**: Service Worker para funcionalidade offline

## 📋 Pré-requisitos

1. Conta no [Supabase](https://supabase.com)
2. Projeto Supabase configurado
3. Servidor web (para desenvolvimento local)

## ⚙️ Configuração

### 1. Configuração do Supabase

1. Crie um novo projeto no Supabase
2. Execute as migrações SQL em `supabase/migrations/`
3. Configure as variáveis de ambiente

### 2. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

### 3. Instalação

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev
```

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

- **`user_profiles`**: Perfis estendidos dos usuários
- **`clients`**: Dados completos dos clientes
- **`loans`**: Informações dos empréstimos
- **`payments`**: Controle de parcelas e pagamentos

### Segurança (RLS)

Todas as tabelas possuem Row Level Security habilitado:
- Usuários só acessam seus próprios dados
- Administradores têm acesso total
- Políticas específicas para cada operação (SELECT, INSERT, UPDATE, DELETE)

## 🔐 Autenticação

O sistema utiliza Supabase Auth com:
- Login por email/senha
- Sessões seguras com JWT
- Controle de permissões por perfil
- Recuperação de senha

## 📁 Armazenamento de Arquivos

- Bucket dedicado para documentos de clientes
- Upload seguro com validação de permissões
- URLs assinadas para acesso controlado

## 🎨 Interface

- Design moderno e intuitivo
- Navegação por abas
- Modais para formulários
- Sistema de notificações (toasts)
- Indicadores visuais de status
- Responsividade completa

## 📊 Dashboard

- Total de clientes cadastrados
- Empréstimos ativos
- Cobranças pendentes
- Valor total em aberto
- Lista de clientes com status

## 📄 Relatórios

Geração automática de relatórios PDF com:
- Dados completos do cliente
- Histórico de empréstimos
- Detalhamento de parcelas
- Cálculo de juros e multas
- Área para assinatura

## 🔧 Desenvolvimento

### Estrutura de Arquivos

```
src/
├── config/
│   └── supabase.js          # Configuração do Supabase
├── services/
│   ├── authService.js       # Serviços de autenticação
│   ├── clientService.js     # Serviços de clientes
│   └── loanService.js       # Serviços de empréstimos
├── utils/
│   ├── formatters.js        # Utilitários de formatação
│   └── toast.js             # Sistema de notificações
└── app-supabase.js          # Aplicação principal

supabase/
└── migrations/
    ├── create_initial_schema.sql
    └── create_storage_buckets.sql
```

### Padrões de Código

- Uso de ES6+ modules
- Async/await para operações assíncronas
- Classes para organização do código
- Tratamento de erros consistente
- Validação de dados no frontend e backend

## 🚀 Deploy

1. Configure as variáveis de ambiente no seu provedor
2. Execute o build da aplicação
3. Configure o Supabase para produção
4. Deploy dos arquivos estáticos

## 🔒 Segurança

- Row Level Security (RLS) em todas as tabelas
- Validação de dados no frontend e backend
- Sanitização de inputs
- Controle de acesso baseado em perfis
- Armazenamento seguro de documentos

## 📱 PWA

- Funcionalidade offline limitada
- Instalável em dispositivos móveis
- Service Worker para cache de recursos
- Manifest para metadados da aplicação

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 📞 Suporte

Para suporte e dúvidas, entre em contato através dos canais oficiais do projeto.

---

**SharkPro** - Sistema de Gestão de Empréstimos Profissional