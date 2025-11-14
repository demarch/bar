# 🔐 Credenciais e Informações de Acesso

## ⚠️ IMPORTANTE - SEGURANÇA

Este arquivo contém credenciais padrão do sistema. **NUNCA** compartilhe estas informações publicamente.

Em produção, **SEMPRE** altere todas as senhas e chaves secretas!

---

## 🔑 Credenciais de Acesso

### Usuário Administrador (Padrão)
```
Login: admin
Senha: admin123
Tipo: admin
```

**⚠️ ALTERE ESTA SENHA NO PRIMEIRO ACESSO!**

### Como Criar Novos Usuários

Via SQL (conecte ao banco de dados):
```sql
-- Primeiro, gere o hash da senha
-- Use o script: npm run hash-password sua_senha

INSERT INTO usuarios (nome, login, senha, tipo, ativo)
VALUES (
  'Nome do Usuário',
  'login_usuario',
  '$2b$10$hash_gerado_aqui',
  'atendente',  -- ou 'caixa' ou 'admin'
  true
);
```

---

## 🗄️ Banco de Dados

### PostgreSQL (Desenvolvimento)
```
Host: localhost
Porta: 5432
Database: bar_system
Usuário: admin
Senha: senha_segura_2024
```

### Connection String
```
postgresql://admin:senha_segura_2024@localhost:5432/bar_system
```

### Acesso via Docker
```bash
# Conectar ao PostgreSQL
docker-compose exec postgres psql -U admin -d bar_system

# Ver todas as tabelas
\dt

# Ver comandas abertas
SELECT * FROM comandas WHERE status = 'aberta';
```

---

## 🔴 Redis (Desenvolvimento)

```
Host: localhost
Porta: 6379
Senha: (sem senha em dev)
```

### Acesso via Docker
```bash
# Conectar ao Redis
docker-compose exec redis redis-cli

# Listar todas as chaves
KEYS *

# Ver valor de uma chave
GET chave_aqui
```

---

## 🌐 URLs de Acesso

### Desenvolvimento
```
Frontend:  http://localhost:3000
Backend:   http://localhost:3001
API Docs:  http://localhost:3001/api
Health:    http://localhost:3001/health
```

### API Endpoints Base
```
Autenticação:     /api/auth
Comandas:         /api/comandas
Produtos:         /api/produtos
Acompanhantes:    /api/acompanhantes
Caixa:            /api/caixa
Quartos:          /api/quartos
```

---

## 🔐 JWT Secrets (Desenvolvimento)

```env
JWT_SECRET=bar_system_secret_key_2024_change_in_production
JWT_REFRESH_SECRET=bar_system_refresh_secret_key_2024_change_in_production
```

**⚠️ EM PRODUÇÃO**: Gere secrets fortes e únicos:
```bash
# Linux/Mac
openssl rand -base64 64

# Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

---

## 📊 Dados Iniciais

O sistema já vem com dados de exemplo:

### Categorias
- Cervejas
- Drinks
- Destilados
- Refrigerantes
- Porções
- Comissionados
- Quartos

### Produtos (Exemplos)
- Heineken: R$ 10,00
- Caipirinha: R$ 25,00
- Dose Whisky: R$ 35,00
- Dose Whisky Premium (Comissionado): R$ 50,00 (40% comissão)

### Configuração de Quartos
- 30 minutos: R$ 70,00
- 1 hora: R$ 100,00
- 1h30: R$ 150,00
- 2 horas: R$ 200,00

---

## 🔧 Comandos Úteis

### Gerar Hash de Senha
```bash
cd backend
npm install
npx ts-node src/utils/hashPassword.ts sua_senha
```

### Backup do Banco
```bash
# Backup
docker-compose exec postgres pg_dump -U admin bar_system > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
docker-compose exec -T postgres psql -U admin bar_system < backup_20241113_120000.sql
```

### Reset Completo
```bash
# Para do sistema e apaga TODOS os dados
docker-compose down -v

# Inicia tudo do zero
docker-compose up -d
```

---

## 🚨 Troubleshooting

### Esqueci a senha do admin
```sql
-- Conecte ao banco e execute:
UPDATE usuarios
SET senha = '$2b$10$rZ5qX8p0vJ7KZ0YvJ7KZ0u7KZ0YvJ7KZ0YvJ7KZ0YvJ7KZ0YvJ7KZ.'
WHERE login = 'admin';

-- Nova senha será: admin123
```

### Resetar um caixa travado
```sql
-- Fechar todos os caixas abertos
UPDATE movimentos_caixa
SET status = 'fechado', data_fechamento = NOW()
WHERE status = 'aberto';
```

### Limpar dados de teste
```sql
-- CUIDADO: Isso apaga TODOS os dados
TRUNCATE TABLE itens_comanda CASCADE;
TRUNCATE TABLE comandas CASCADE;
TRUNCATE TABLE movimentos_caixa CASCADE;
TRUNCATE TABLE ocupacao_quartos CASCADE;
```

---

## 📝 Notas de Segurança

### ✅ Faça (DO):
- ✅ Altere senhas padrão
- ✅ Use HTTPS em produção
- ✅ Configure firewall
- ✅ Faça backups regulares
- ✅ Mantenha logs de auditoria
- ✅ Use secrets fortes e únicos

### ❌ Não Faça (DON'T):
- ❌ Exponha o banco diretamente na internet
- ❌ Compartilhe credenciais no código
- ❌ Use senhas fracas
- ❌ Desative a autenticação
- ❌ Ignore atualizações de segurança

---

**Última atualização:** 2024-11-13

**Desenvolvido com segurança em mente** 🛡️
