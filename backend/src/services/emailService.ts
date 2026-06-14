import nodemailer from 'nodemailer';

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const link = `${process.env.APP_URL}/auth?token=${token}`;
  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: 'Recuperação de senha — Mini ERP Web',
    html: `
      <p>Você solicitou a recuperação de senha.</p>
      <p><a href="${link}">Clique aqui para redefinir sua senha</a></p>
      <p>O link expira em 1 hora.</p>
      <p>Se você não solicitou isso, ignore este email.</p>
    `,
  });
}
