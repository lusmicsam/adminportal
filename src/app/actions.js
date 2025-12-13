"use server";

import nodemailer from "nodemailer";
import path from 'path';
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

export async function sendOtpEmail(email) {
    try {
        // Isolated Configuration for Gmail
        // We try to read from process.env, and if missing, we log explicit debug info
        const GMAIL_USER = process.env.GMAIL_USER;
        const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;

        if (!GMAIL_USER || !GMAIL_PASS) {
            console.error("--- DEBUG: MISSING CREDENTIALS ---");
            console.error("PWD:", process.cwd());
            console.error("GMAIL_USER:", GMAIL_USER ? "Present" : "Missing");
            console.error("GMAIL_PASS:", GMAIL_PASS ? "Present" : "Missing");
            console.error("----------------------------------");
            return { success: false, error: "Server Configuration Error: Missing Credentials in .env.local" };
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: GMAIL_USER,
                pass: GMAIL_PASS,
            },
        });

        // Generate random 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        const info = await transporter.sendMail({
            from: `"Nexus Admin" <${GMAIL_USER}>`,
            to: email,
            subject: "Nexus Admin - Your Verification Code",
            text: `Your login verification code is: ${otp}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 25px; border-radius: 12px; border: 1px solid #e2e8f0; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #0f172a; margin: 0;">Nexus Admin</h2>
                <p style="color: #64748b; font-size: 14px; margin-top: 5px;">Secure Login Verification</p>
            </div>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; text-align: center;">
                <p style="margin: 0 0 10px 0; color: #475569; font-size: 14px;">Your One-Time Password is:</p>
                <h1 style="margin: 0; color: #3b82f6; font-size: 32px; letter-spacing: 6px; font-weight: 700;">${otp}</h1>
            </div>

            <p style="margin-top: 25px; text-align: center; color: #94a3b8; font-size: 12px;">
                This code will expire in 10 minutes. If you did not request this code, please ignore this email.
            </p>
        </div>
      `,
        });

        console.log("Email sent successfully!");

        return {
            success: true,
            otp: otp
        };

    } catch (error) {
        console.error("Detailed Email Error:", error);
        return { success: false, error: "Failed to send OTP. Check server console for details." };
    }
}
