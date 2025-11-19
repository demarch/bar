FROM nginx:alpine

# Copiar configuração customizada
COPY nginx.conf /etc/nginx/nginx.conf

# Criar diretório para logs
RUN mkdir -p /var/log/nginx

# Expor portas
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
