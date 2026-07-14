const Anthropic = require('@anthropic-ai/sdk');

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

const CREATE_TASK_TOOL = {
  name: 'create_task',
  description: 'Cria uma nova tarefa (ticket) no Jarvis. Use somente quando o usuário pedir explicitamente para criar, adicionar ou registrar uma tarefa/ticket.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Título curto e claro da tarefa' },
      description: { type: 'string', description: 'Detalhes adicionais, se mencionados' },
      due_date: { type: 'string', description: 'Data de vencimento no formato YYYY-MM-DD, se o usuário mencionar um prazo' },
    },
    required: ['title'],
  },
};

async function ask({ system, messages, maxTokens = 1024 }) {
  if (!client) {
    const err = new Error('IA não configurada');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: maxTokens,
    output_config: { effort: 'low' },
    system,
    messages,
  });

  return response.content.find(b => b.type === 'text')?.text ?? '';
}

async function chat({ system, messages, onCreateTask, maxTokens = 512 }) {
  if (!client) {
    const err = new Error('IA não configurada');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const baseParams = {
    model: 'claude-sonnet-5',
    max_tokens: maxTokens,
    output_config: { effort: 'low' },
    system,
    tools: [CREATE_TASK_TOOL],
  };

  const response = await client.messages.create({ ...baseParams, messages });

  if (response.stop_reason === 'tool_use') {
    const toolUse = response.content.find(b => b.type === 'tool_use');
    let result;
    try {
      result = await onCreateTask(toolUse.input);
    } catch (err) {
      result = { error: err.message };
    }

    const followup = await client.messages.create({
      ...baseParams,
      messages: [
        ...messages,
        { role: 'assistant', content: response.content },
        { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(result) }] },
      ],
    });

    return {
      text: followup.content.find(b => b.type === 'text')?.text ?? '',
      taskCreated: !result.error,
    };
  }

  return {
    text: response.content.find(b => b.type === 'text')?.text ?? '',
    taskCreated: false,
  };
}

module.exports = { ask, chat };
