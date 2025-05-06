import express from 'express';
import cors from 'cors';

// Initialize the express engine
const app: express.Application = express();
app.use(express.json());
app.use(cors());

let games: any = {}; // Simples armazenamento em memória

app.post('/games', (req, res) => {
  const gameId = Math.random().toString(36).substr(2, 9);
  games[gameId] = { players: [], state: {/* ...estado inicial... */} };
  res.json({ gameId });
});

app.post('/games/:gameId/join', (req, res) => {
  const { gameId } = req.params;
  const { playerName } = req.body;
  if (!games[gameId]) return res.status(404).json({ error: 'Game not found' });
  games[gameId].players.push(playerName);
  res.json({ success: true });
});

// ...outras rotas...

app.listen(3001, () => console.log('API rodando na porta 3001'));
