import { Resend } from 'resend';

// Initialize Resend only if API key is available
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendWaitlistEmail(email: string, apkUrl: string) {
    if (!resend || !process.env.RESEND_API_KEY) {
        console.warn('⚠️ RESEND_API_KEY not found, skipping email send');
        return { success: false, error: 'Missing API key' };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'Pairly <onboarding@resend.dev>', // Update this with your verified domain if available
            to: [email],
            subject: '🎉 Welcome to Pairly - You\'re in!',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .header { background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); padding: 40px 20px; text-align: center; color: white; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
            .content { padding: 40px 30px; }
            .button { display: inline-block; background: #FF6B6B; color: white; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: 600; margin: 30px 0; box-shadow: 0 4px 6px rgba(255, 107, 107, 0.3); transition: transform 0.2s; }
            .button:hover { transform: translateY(-2px); }
            .steps { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .step { margin-bottom: 10px; display: flex; align-items: center; }
            .step-icon { background: #FF6B6B; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 10px; font-weight: bold; }
            .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Pairly! 💖</h1>
              <p>Your journey to deeper connection starts here.</p>
            </div>
            
            <div class="content">
              <h2>You're on the list! 🚀</h2>
              <p>Thanks for joining the Pairly waitlist. We're building the most intimate space for couples, and we're thrilled to have you.</p>
              
              <div class="steps">
                <div class="step"><span class="step-icon">1</span> Download the app below</div>
                <div class="step"><span class="step-icon">2</span> Sign in with <strong>${email}</strong></div>
                <div class="step"><span class="step-icon">3</span> Invite your partner & start pairing</div>
              </div>
              
              <center>
                <a href="${apkUrl}" class="button">📱 Download Pairly App</a>
              </center>
              
              <p><strong>🎁 Pro Tip:</strong> Share your referral code with friends to unlock Premium features for free!</p>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} Pairly. All rights reserved.</p>
              <p>Made with ❤️ for couples everywhere.</p>
            </div>
          </div>
        </body>
        </html>
      `,
        });

        if (error) {
            console.error('Email send error:', error);
            return { success: false, error };
        }

        console.log('Email sent successfully:', data);
        return { success: true, data };
    } catch (error: any) {
        console.error('Email service error:', error);
        return { success: false, error: error.message };
    }
}

export async function sendReferralSuccessEmail(referrerEmail: string, newUserName: string) {
    if (!resend || !process.env.RESEND_API_KEY) {
        console.warn('⚠️ RESEND_API_KEY not found, skipping referral email');
        return;
    }

    try {
        await resend.emails.send({
            from: 'Pairly <onboarding@resend.dev>',
            to: [referrerEmail],
            subject: '🎉 You got a new referral!',
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>High Five! ✋</h2>
          <p><strong>${newUserName}</strong> just joined Pairly using your invite link.</p>
          <p>You're getting closer to unlocking Premium rewards!</p>
          <p>Keep sharing the love!</p>
        </div>
      `,
        });
    } catch (error) {
        console.error('Referral email error:', error);
    }
}
