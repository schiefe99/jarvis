const { Resend } = require('resend');

const client = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function sendInvite({ to, name, link }) {
  if (!client) {
    const err = new Error('E-mail não configurado');
    err.code = 'EMAIL_NOT_CONFIGURED';
    throw err;
  }

  const { error } = await client.emails.send({
    from: 'Jarvis <onboarding@resend.dev>',
    to,
    subject: 'Você foi convidado pro Jarvis',
    html: `<p>Olá, ${name}! Você foi convidado a acessar o Jarvis.</p><p><a href="${link}">Clique aqui pra criar sua senha</a></p><p>Esse link expira em 7 dias.</p>`,
  });

  if (error) {
    const err = new Error(error.message || 'Falha ao enviar e-mail');
    err.code = 'EMAIL_SEND_FAILED';
    throw err;
  }
}

module.exports = { sendInvite };
