// Configuração global para testes Vitest

import { vi } from 'vitest';

// Mock global de alert/dialog, se necessário
globalThis.alert = vi.fn();
globalThis.confirm = vi.fn();
globalThis.prompt = vi.fn();

// ...adicione outros mocks globais conforme necessário...
