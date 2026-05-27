import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.PORTAL_JWT_SECRET || 'dev-secret-key-change-in-prod';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, plan } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }

    if (plan !== 'free' && plan !== 'pro') {
      return NextResponse.json({ error: 'Invalid plan type.' }, { status: 400 });
    }

    // Set expiration to 1 year (365 days)
    const expiresIn = '365d';
    const payload = {
      email,
      plan,
      issued_at: new Date().toISOString()
    };

    // Sign the token
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn });

    return NextResponse.json({
      status: 'success',
      license_key: token,
      expires_in: expiresIn,
      payload
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
