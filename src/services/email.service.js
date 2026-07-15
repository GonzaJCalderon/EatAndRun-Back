import nodemailer from 'nodemailer';
import { config } from '../../config/env.js';

const EMAIL_FROM = process.env.EMAIL_FROM || 'Eat & Run';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendOrderConfirmationEmail = async (toEmail, userName, orderId, total, items) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️ No se enviará correo porque faltan credenciales de Gmail');
    return null;
  }

  // Generar HTML para los items
  const itemsHtml = items.map(item => {
    return `<li>${item.quantity}x ${item.item_name} - ${item.dia || ''}</li>`;
  }).join('');

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #4CAF50; text-align: center;">¡Gracias por tu pedido, ${userName}! 🥗</h2>
      <p style="font-size: 16px; color: #333;">Hemos recibido tu pedido correctamente. Acá tenés el detalle:</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #555;">Pedido #${orderId}</h3>
        <ul style="font-size: 15px; color: #444; padding-left: 20px;">
          ${itemsHtml}
        </ul>
        <hr style="border: 0; border-top: 1px solid #ccc; margin: 15px 0;" />
        <p style="font-size: 18px; font-weight: bold; margin: 0; text-align: right; color: #333;">Total: $${total}</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <p style="font-size: 14px; color: #666; margin-bottom: 15px;">¿Tenés alguna consulta sobre tu pedido o querés hacer un cambio?</p>
        <a href="https://wa.me/5492614601788?text=Hola,%20tengo%20una%20consulta%20sobre%20mi%20pedido%20%23${orderId}" style="background-color: #25D366; color: white; padding: 12px 25px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 15px; display: inline-block;">
          📱 Contactar por WhatsApp
        </a>
      </div>

      <p style="font-size: 14px; color: #888; text-align: center;">¡Que lo disfrutes!</p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: toEmail,
      subject: `🥗 Confirmación de Pedido #${orderId} - Eat & Run`,
      html: htmlContent,
    });
    
    console.log('✅ Correo enviado con éxito:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error enviando correo de confirmación:', error);
    return null;
  }
};
