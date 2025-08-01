## SERVIDOR com a lógica de xadrez, 
* socket.io para transmissão dos movimentos real time
* express + REST API para criação de salas de jogo
* typescript para tipagem
* prisma ORM + mariadb para persistencia de dados
* containerização da aplicação e DB
requisitos para rodar o projeto, -> docker engine

docker compose -f docker-compose.hml.yml up --build -d

PORTA 3001