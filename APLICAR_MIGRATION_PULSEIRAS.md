# 🎯 Como Aplicar a Migration do Sistema de Pulseiras

## Passo a Passo Rápido (Docker)

### 1️⃣ Certifique-se que o Docker está rodando

```bash
docker-compose ps
```

Se o PostgreSQL não estiver rodando:
```bash
docker-compose up -d postgres
```

### 2️⃣ Aplique a Migration

**Use este comando (copia e cola no terminal):**

```bash
cat backend/database/migrations/apply_all_migrations.sql | \
  docker-compose exec -T postgres psql -U admin -d bar_system
```

### 3️⃣ Aguarde a Confirmação

Você verá mensagens como:
```
NOTICE:  Campo tipo_acompanhante adicionado à tabela acompanhantes
NOTICE:  Campo numero_pulseira_fixa adicionado à tabela acompanhantes
NOTICE:  Tabela pulseiras_ativas_dia criada
CREATE VIEW
CREATE FUNCTION
COMMIT
```

### 4️⃣ Verifique se Funcionou

```bash
docker-compose exec postgres psql -U admin -d bar_system -c "SELECT * FROM vw_pulseiras_disponiveis LIMIT 5;"
```

Se ver uma lista de pulseiras (1, 2, 3, 4, 5), está tudo certo! ✅

---

## 🎉 Pronto!

Agora você pode:

1. **Cadastrar acompanhantes fixas** com pulseiras reservadas
2. **Cadastrar acompanhantes rotativas** que recebem pulseiras por ordem de chegada
3. **Ativar acompanhantes** e o sistema atribui automaticamente a pulseira
4. **Consultar pulseiras disponíveis** via API

---

## 📚 Documentação Completa

Para mais detalhes, veja:
- **Guia Completo**: `backend/database/migrations/003_SISTEMA_PULSEIRAS_GUIA.md`
- **Migration SQL**: `backend/database/migrations/003_add_companion_bracelet_system.sql`

---

## ⚠️ Problemas?

### Erro de autenticação
Verifique se as variáveis no `.env` estão corretas:
```bash
cat .env | grep POSTGRES
```

### Banco não existe
```bash
docker-compose exec postgres psql -U admin -c "CREATE DATABASE bar_system;"
```

### Outros problemas
Consulte a seção **Troubleshooting** no guia completo.
