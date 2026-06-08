import { Resend } from 'resend';
import { config } from '../../config/env.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM || '"Eat & Run" <pedidos@eatandrun.com.ar>';

export const sendOrderConfirmationEmail = async (toEmail, userName, orderId, total, items) => {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ No se envió correo porque no está configurado RESEND_API_KEY');
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

      <p style="font-size: 14px; color: #666; text-align: center;">Si tenés alguna consulta, no dudes en escribirnos.</p>
      <p style="font-size: 14px; color: #888; text-align: center;">¡Que lo disfrutes!</p>
    </div>
  `;

  try {
    const data = await resend.emails.send({
      from: EMAIL_FROM,
      to: [toEmail],
      subject: `🥗 Confirmación de Pedido #${orderId} - Eat & Run`,
      html: htmlContent,
    });
    
    console.log('✅ Correo enviado con éxito:', data.id);
    return data;
  } catch (error) {
    console.error('❌ Error enviando correo de confirmación:', error);
    return null;
  }
};
