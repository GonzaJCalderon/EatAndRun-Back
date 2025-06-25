import nodemailer from 'nodemailer';

export const sendResetPasswordEmail = async (to, name, link) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_FROM,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: `Eat&Run 🍽️ <${process.env.EMAIL_FROM}>`,
    to,
    subject: '🔒 Recuperar tu contraseña',
    html: `
      <p>Hola ${name},</p>
      <p>Hacé clic en el siguiente enlace para restablecer tu contraseña:</p>
      <a href="${link}" target="_blank">Restablecer contraseña</a>
      <p>Este enlace expirará en 1 hora.</p>
    `
  };

  await transporter.sendMail(mailOptions);
};
