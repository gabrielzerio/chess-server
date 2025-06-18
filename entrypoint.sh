#!/bin/sh

set -e

echo "Aguardando o banco de dados iniciar..."
while ! nc -z mysql 3306; do
  sleep 1
done
echo "Banco de dados iniciado com sucesso!"


echo "Aplicando migrações do banco de dados..."
npx prisma migrate deploy


echo "Iniciando a aplicação..."
exec "$@"