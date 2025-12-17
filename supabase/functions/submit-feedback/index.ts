import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Turnstile secret key - must be set in Supabase secrets
const TURNSTILE_SECRET_KEY = Deno.env.get('TURNSTILE_SECRET_KEY');

// Email recipient for feedback (must be verified email on Resend or use verified domain)
const FEEDBACK_EMAIL = 'orangeisblackish@gmail.com';

// Resend API key - must be set in Supabase secrets
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

// Valid feedback types
const VALID_TYPES = ['feature', 'bug', 'usability', 'data-error', 'complaint', 'other'] as const;
type FeedbackType = typeof VALID_TYPES[number];

// Type labels for email display
const TYPE_LABELS: Record<FeedbackType, { label: string; emoji: string; color: string }> = {
  feature: { label: 'Feature Request', emoji: '💡', color: '#f59e0b' },
  bug: { label: 'Bug Report', emoji: '🐛', color: '#dc2626' },
  usability: { label: 'Usability Issue', emoji: '⚠️', color: '#f97316' },
  'data-error': { label: 'Data Error', emoji: '📊', color: '#8b5cf6' },
  complaint: { label: 'Complaint', emoji: '💬', color: '#6b7280' },
  other: { label: 'Other Feedback', emoji: '❓', color: '#3b82f6' },
};

interface FeedbackRequest {
  type: FeedbackType;
  title: string;
  description: string;
  email?: string;
  turnstileToken: string;
  userAgent?: string;
  url?: string;
}

// Verify Turnstile token
async function verifyTurnstile(token: string): Promise<boolean> {
  if (!TURNSTILE_SECRET_KEY) {
    console.error('TURNSTILE_SECRET_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: TURNSTILE_SECRET_KEY,
        response: token,
      }),
    });

    const data = await response.json();
    console.log('Turnstile response:', JSON.stringify(data));
    
    if (!data.success) {
      console.error('Turnstile verification failed:', data['error-codes']);
    }
    
    return data.success === true;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
}

// Send email via Resend
async function sendEmailViaResend(
  type: FeedbackType,
  title: string,
  description: string,
  email?: string,
  userAgent?: string,
  url?: string
): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    // In development without Resend, log the feedback instead
    console.log('=== FEEDBACK SUBMISSION ===');
    console.log(`Type: ${type}`);
    console.log(`Title: ${title}`);
    console.log(`Description: ${description}`);
    console.log(`Email: ${email || 'Not provided'}`);
    console.log(`User Agent: ${userAgent || 'Unknown'}`);
    console.log(`URL: ${url || 'Unknown'}`);
    console.log('===========================');
    return { success: true }; // Return true in dev to allow testing
  }

  const typeInfo = TYPE_LABELS[type];
  const typeLabel = `${typeInfo.emoji} ${typeInfo.label}`;
  const timestamp = new Date().toISOString();

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${typeInfo.color};">${typeLabel}</h2>
      
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; color: #111827;">${title}</h3>
      </div>
      
      <div style="background: #ffffff; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 16px;">
        <p style="margin: 0; white-space: pre-wrap; color: #374151;">${description}</p>
      </div>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      
      <div style="font-size: 12px; color: #6b7280;">
        <p><strong>Submitted:</strong> ${timestamp}</p>
        ${email ? `<p><strong>Contact Email:</strong> <a href="mailto:${email}">${email}</a></p>` : ''}
        ${userAgent ? `<p><strong>User Agent:</strong> ${userAgent}</p>` : ''}
        ${url ? `<p><strong>Page URL:</strong> ${url}</p>` : ''}
      </div>
    </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TTC Alerts Feedback <onboarding@resend.dev>',
        to: [FEEDBACK_EMAIL],
        subject: `[TTC Alerts] ${typeLabel}: ${title}`,
        html: htmlContent,
        reply_to: email || undefined,
      }),
    });

    const responseData = await response.json();
    console.log('Resend response:', response.status, JSON.stringify(responseData));

    if (!response.ok) {
      console.error('Resend API error:', responseData);
      return { success: false, error: responseData.message || responseData.error || 'Unknown Resend error' };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: FeedbackRequest = await req.json();
    const { type, title, description, email, turnstileToken, userAgent, url } = body;

    // Validate required fields
    if (!type || !VALID_TYPES.includes(type as FeedbackType)) {
      return new Response(JSON.stringify({ error: 'Invalid feedback type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!title || title.trim().length < 3 || title.trim().length > 100) {
      return new Response(JSON.stringify({ error: 'Title must be 3-100 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!description || description.trim().length < 10 || description.trim().length > 2000) {
      return new Response(JSON.stringify({ error: 'Description must be 10-2000 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!turnstileToken) {
      return new Response(JSON.stringify({ error: 'Captcha verification required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify Turnstile token
    const turnstileValid = await verifyTurnstile(turnstileToken);
    if (!turnstileValid) {
      return new Response(JSON.stringify({ 
        error: 'Captcha verification failed'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send email
    const emailResult = await sendEmailViaResend(
      type,
      title.trim(),
      description.trim(),
      email?.trim(),
      userAgent,
      url
    );

    if (!emailResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Failed to submit feedback'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
