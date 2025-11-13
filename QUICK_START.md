# 🚀 Guia Rápido de Início

Este guia vai te ajudar a rodar o sistema em menos de 5 minutos!

## ✅ Pré-requisitos

- [x] Docker instalado (versão 20.10+)
- [x] Docker Compose instalado (versão 2.0+)
- [x] Porta 3000, 3001, 5432 e 6379 disponíveis

## 📦 Instalação Rápida

### 1. Clone o projeto e entre na pasta
```bash
cd bar
```

### 2. Inicie os containers Docker
```bash
docker-compose up -d
```

**Aguarde** cerca de 1-2 minutos para os serviços iniciarem completamente.

### 3. Verifique se está tudo rodando
```bash
docker-compose ps
```

Você deve ver 4 containers rodando:
- `bar-postgres` (banco de dados)
- `bar-redis` (cache)
- `bar-backend` (API)
- `bar-frontend` (interface)

### 4. Acesse o sistema
Abra seu navegador em: **http://localhost:3000**

### 5. Faça login
```
Usuário: admin
Senha: admin123
```

## 🎯 Primeiros Passos

### 1. Abrir o Caixa
- Após fazer login, será necessário abrir um caixa
- Clique no botão "Abrir Caixa"
- Informe o valor inicial (ex: 500.00)
- Confirme

### 2. Criar sua primeira comanda
- No PDV, digite um número de comanda (ex: 001)
- Clique em "Nova"
- A comanda será criada e estará pronta para receber itens

### 3. Adicionar produtos
- Selecione uma categoria (Cervejas, Drinks, etc)
- Clique no produto desejado
- Informe a quantidade
- Clique em "Adicionar"
- O item será lançado na comanda automaticamente

### 4. Produtos comissionados
- Primeiro, ative uma acompanhante:
  - Vá em Acompanhantes (menu)
  - Clique em "Ativar" na acompanhante desejada
- Selecione a categoria "Comissionados"
- Escolha o produto
- Selecione a acompanhante no dropdown
- Adicione o item
- A comissão será calculada automaticamente (40% por padrão)

## 🔧 Comandos Úteis

### Ver logs em tempo real
```bash
docker-compose logs -f
```

### Reiniciar todos os serviços
```bash
docker-compose restart
```

### Parar todos os serviços
```bash
docker-compose down
```

### Parar e limpar tudo (incluindo dados)
```bash
docker-compose down -v
```

## 🐛 Solução de Problemas

### Porta já está em uso
Se alguma porta estiver em uso, edite o `docker-compose.yml`:
```yaml
frontend:
  ports:
    - "3001:3000"  # Mude 3000 para outra porta
```

### Container não inicia
```bash
# Ver logs do container específico
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres
```

### Banco de dados não conecta
```bash
# Reiniciar o postgres
docker-compose restart postgres

# Aguardar 30 segundos e reiniciar backend
docker-compose restart backend
```

### Limpar e recomeçar do zero
```bash
docker-compose down -v
docker-compose up -d
```

## 📱 Dispositivos Suportados

- **Desktop**: Telas grandes (monitores, caixa)
- **Tablet**: PDV touchscreen
- **Mobile**: Visualização e consultas rápidas

## 🔐 Segurança

⚠️ **IMPORTANTE**:
- Altere a senha padrão do admin após primeiro acesso
- Em produção, altere as chaves JWT no `.env`
- Configure HTTPS para produção
- Nunca exponha as portas do banco diretamente

## 📚 Próximos Passos

- Leia o [README.md](README.md) completo para entender todas as funcionalidades
- Configure produtos e preços específicos do seu estabelecimento
- Cadastre usuários para caixa e atendentes
- Configure as comissões das acompanhantes
- Ajuste a tabela de preços dos quartos

## 🆘 Ajuda

Se encontrar problemas:
1. Verifique os logs: `docker-compose logs -f`
2. Verifique se todas as portas estão livres
3. Reinicie os serviços: `docker-compose restart`
4. Em último caso, limpe tudo: `docker-compose down -v` e inicie novamente

---

**Pronto!** Você agora tem um sistema completo de gestão de bar rodando! 🎉
