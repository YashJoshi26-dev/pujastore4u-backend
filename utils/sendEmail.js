const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST,
  port:   Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOrderEmail = async ({ to, subject, order }) => {
  const itemRows = order.items.map(i =>
    `<tr>
      <td style="padding:8px;border-bottom:1px solid #f0f0f0">${i.title}</td>
      <td style="padding:8px;border-bottom:1px solid #f0f0f0">${i.sku||"—"}</td>
      <td style="padding:8px;border-bottom:1px solid #f0f0f0">${i.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #f0f0f0">₹${i.price}</td>
    </tr>`
  ).join("");

  const html = `
    <h2>Order ${order.orderId}</h2>
    <p>Customer: ${order.customerInfo.name} | ${order.customerInfo.phone}</p>
    <p>Address: ${order.deliveryAddress.address}, ${order.deliveryAddress.city} - ${order.deliveryAddress.pincode}</p>
    <table style="width:100%;border-collapse:collapse">
      <tr style="background:#f8f8f8">
        <th style="padding:8px;text-align:left">Product</th>
        <th style="padding:8px;text-align:left">SKU</th>
        <th style="padding:8px;text-align:left">Qty</th>
        <th style="padding:8px;text-align:left">Price</th>
      </tr>
      ${itemRows}
    </table>
    <p><strong>Subtotal:</strong> ₹${order.subtotal}</p>
    <p><strong>Shipping:</strong> ₹${order.shipping}</p>
    <p><strong>Total:</strong> ₹${order.total}</p>
    <p><strong>Payment:</strong> ${order.paymentMethod.toUpperCase()}</p>
  `;

  await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, html });
};

module.exports = { sendOrderEmail };