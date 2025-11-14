# Como Aplicar a Migração de Comissão Fixa

A migração para adicionar suporte a comissão fixa precisa ser aplicada no banco de dados. Escolha um dos métodos abaixo:

## ⚡ Método 1: Via API REST (Recomendado)

Este é o método mais simples e seguro. Requer que o backend esteja rodando.

### Passo 1: Recompilar e Reiniciar o Backend

```bash
# Parar os containers
docker-compose down

# Reconstruir e iniciar
docker-compose up -d --build backend

# Ver os logs
docker-compose logs -f backend
```

### Passo 2: Aplicar a Migração via API

#### Opção A: Usando o script fornecido

```bash
./apply-migration-api.sh
```

#### Opção B: Manualmente com curl

```bash
# 1. Fazer login como admin
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login": "admin", "senha": "admin123"}' \
  | grep -o '"token":"[^"]*"' \
  | sed 's/"token":"//;s/"$//')

# 2. Aplicar migração
curl -X POST http://localhost:3001/api/migrations/apply-commission-fix \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
```

---

## 🐘 Método 2: Direto no PostgreSQL

Se você tem acesso direto ao container PostgreSQL:

### Via Docker Exec

```bash
# Copiar o arquivo SQL para o container
docker cp apply-migration-simple.sql bar-postgres:/tmp/

# Executar a migração
docker exec -it bar-postgres psql -U admin -d bar_system -f /tmp/apply-migration-simple.sql
```

### Via psql Local

```bash
# Se você tem psql instalado localmente
PGPASSWORD=admin123 psql -h localhost -U admin -d bar_system -f apply-migration-simple.sql
```

### Via Cliente SQL (DBeaver, pgAdmin, etc.)

1. Conecte-se ao banco de dados `bar_system`
2. Abra o arquivo `backend/database/migrations/apply_all_migrations.sql`
3. Execute o script completo

---

## 🔍 Verificar se a Migração Foi Aplicada

Após aplicar a migração, verifique se funcionou:

```sql
-- Verificar se a coluna existe
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'produtos' AND column_name = 'comissao_fixa';

-- Verificar se o produto foi criado
SELECT nome, preco, comissao_fixa
FROM produtos
WHERE nome = 'Drink Comissionado';

-- Listar todos os produtos comissionados
SELECT
    nome,
    preco,
    CASE
        WHEN comissao_fixa IS NOT NULL THEN 'Fixa: R$ ' || comissao_fixa::TEXT
        WHEN comissao_percentual IS NOT NULL THEN 'Percentual: ' || comissao_percentual::TEXT || '%'
        ELSE 'Sem comissão'
    END as tipo_comissao
FROM produtos
WHERE tipo = 'comissionado' AND ativo = true;
```

---

## ✅ Resultado Esperado

Após a migração bem-sucedida, você deve ver:

1. **Nova coluna:** `produtos.comissao_fixa` (DECIMAL 10,2)
2. **Novo produto:** "Drink Comissionado"
   - Preço: R$ 50,00
   - Comissão Fixa: R$ 20,00
   - Categoria: Comissionados

---

## 🐛 Solução de Problemas

### Erro: "column comissao_fixa already exists"
✅ **Isso é normal!** A migração já foi aplicada anteriormente. Ignore o erro.

### Erro: "Backend não compila"
O backend tem alguns warnings do TypeScript, mas deve rodar normalmente. Se não estiver rodando:

```bash
# Verificar logs
docker-compose logs backend

# Reiniciar apenas o backend
docker-compose restart backend
```

### Erro: "Cannot connect to database"
Verifique se o PostgreSQL está rodando:

```bash
docker-compose ps
docker-compose logs postgres
```

---

## 📊 Testando no PDV

Depois de aplicar a migração:

1. Acesse o PDV
2. Crie uma nova comanda
3. Na categoria "Comissionados", você verá "Drink Comissionado"
4. Selecione uma acompanhante
5. Adicione o produto
6. **Resultado:** A acompanhante receberá R$ 20,00 de comissão (valor fixo), independente do seu percentual configurado

---

## 📝 Notas Importantes

- A migração é **idempotente** (pode ser executada múltiplas vezes sem problemas)
- A coluna `comissao_fixa` pode ser NULL (usa cálculo percentual) ou conter um valor em reais
- Produtos com `comissao_fixa` ainda precisam de uma acompanhante selecionada
- A comissão fixa é multiplicada pela quantidade vendida

---

## 🆘 Precisa de Ajuda?

Se nenhum método funcionar, entre em contato fornecendo:
- Logs do backend (`docker-compose logs backend`)
- Logs do PostgreSQL (`docker-compose logs postgres`)
- Qual método você tentou usar
