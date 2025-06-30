import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
  port: process.env.EMAIL_PORT || 465,
  secure: process.env.EMAIL_SECURE === 'true', // true para 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendResetPasswordEmail = async (to, nombre, link) => {
  await transporter.sendMail({
    from: `"Eat & Run" <${process.env.EMAIL_USER}>`,
    to,
    subject: '🔒 Recuperación de contraseña',
    html: `
      <p>Hola ${nombre},</p>
      <p>Hiciste una solicitud para recuperar tu contraseña. Haz clic en el siguiente enlace:</p>
      <a href="${link}">${link}</a>
      <p>Este enlace es válido por 1 hora. Si no fuiste vos, ignorá este correo.</p>
    `
  });
};

export const sendWelcomeEmail = async (to, nombre) => {
  await transporter.sendMail({
    from: `"Eat & Run" <${process.env.EMAIL_USER}>`,
    to,
    subject: '👋 Bienvenido a Eat & Run',
    html: `
      <p>Hola ${nombre},</p>
      <p>Gracias por registrarte en Eat & Run. ¡Esperamos que disfrutes nuestros menús saludables! 🥗</p>
    `
  });
};
