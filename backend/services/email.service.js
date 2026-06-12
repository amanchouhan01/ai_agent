import nodemailer from 'nodemailer'
import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
)

oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
})


const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
    }
})

export const sendOTP = async (email, otp) => {
    await transporter.sendMail({
        from: `"DevRoom" <${process.env.GMAIL_USER}>`,
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