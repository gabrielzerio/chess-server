import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ChessGame from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChessGame />
  </StrictMode>
)
