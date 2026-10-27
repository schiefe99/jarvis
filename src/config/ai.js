// O assistente fica bloqueado até o adm liberar (VITE_AI_ENABLED=true no front e AI_ENABLED=true no server).
export const AI_ENABLED = import.meta.env.VITE_AI_ENABLED === 'true';
export const AI_LOCKED_MESSAGE = 'Pegue as credenciais com o adm';
