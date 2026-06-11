import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
})

export const sendOTP = async (email, otp) => {
    await transporter.sendMail({
        from: `"DevRoom" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your DevRoom OTP',
        html: `
            <div style="font-family: Arial; max-width: 400px; margin: auto; padding: 20px; background: #1e293b; color: white; border-radius: 12px;">
                <h2 style="color: #3b82f6;">DevRoom Verification</h2>
                <p>Your OTP is:</p>
                <h1 style="letter-spacing: 8px; color: #3b82f6; font-size: 36px;">${otp}</h1>
                <p style="color: #94a3b8;">Valid for 5 minutes. Do not share this with anyone.</p>
            </div>
        `
    })
}