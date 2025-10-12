import { NextRequest, NextResponse } from 'next/server';
import { sendApprovalEmail, sendTextEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email, type, name } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!process.env.BREVO_API_KEY) {
      return NextResponse.json({ error: 'Brevo API key not configured' }, { status: 500 });
    }

    let result;
    
    if (type === 'approval') {
      result = await sendApprovalEmail(email, name);
    } else {
      result = await sendTextEmail(
        email, 
        'Test Email from Admin Panel', 
        'This is a test email to verify the Brevo integration is working correctly.'
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Email sent successfully',
      result 
    });
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json({ 
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
