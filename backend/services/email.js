const nodemailer = require("nodemailer");
const createHttpError = require("../utils/httpError");

const deliveryError = (status, message) => {
    const error = createHttpError(status, message);
    // Only this fixed, user-facing text may bypass the generic server-error response.
    error.publicMessage = message;
    return error;
};

const createEmailTransport = () => {
    const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
        console.error("Email delivery configuration is incomplete. Check SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM.");
        throw deliveryError(503, "Email sign-in is temporarily unavailable. Please try again later.");
    }
    const port = Number(process.env.SMTP_PORT || 587);
    return nodemailer.createTransport({
        host: SMTP_HOST, port, secure: port === 465, requireTLS: port !== 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
        tls: {
            rejectUnauthorized: process.env.NODE_ENV === "production"
        },
        connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000
    });
};

const sendOtpEmail = async ({ email, otp }) => {
    const transporter = createEmailTransport();
    try {
        const result = await transporter.sendMail({
            from: process.env.SMTP_FROM, to: email,
            subject: "Your Gaming Universe sign-in code",
            text: `Your Gaming Universe code is ${otp}. It expires in 5 minutes.\n\nIf you did not request this code, you can ignore this email.`
        });
        if (!result.accepted?.length) throw new Error("Email rejected");
    } catch (error) {
        if (error.code === "EAUTH") {
            console.error("Email provider rejected SMTP authentication. Check SMTP_USER and SMTP_PASS; Gmail requires a valid app password.");
        } else {
            console.error("Email delivery failed. Check the SMTP provider and connection settings.");
        }
        // Never return/log raw SMTP responses, passwords, or OTPs.
        throw deliveryError(502, "We could not send your code. Please try again shortly.");
    } finally {
        transporter.close();
    }
};

module.exports = { sendOtpEmail };
