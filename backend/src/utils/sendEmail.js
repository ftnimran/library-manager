const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
    throw new Error("Email credentials missing in .env file!");
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false, // 🚀 STARTTLS ke liye false hona zaroori hai
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // 🚀 FIX: Cloud servers pe pehli baar connect hone me thoda time lagta hai
    connectionTimeout: 20000, // 20 seconds
    greetingTimeout: 20000,
    socketTimeout: 20000,
    // 🚀 FIX: Render ya Vercel par SSL errors ko bypass karne ke liye
    tls: {
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: `"Library Management System" <${process.env.EMAIL_FROM}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
