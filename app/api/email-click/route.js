import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const LINK_BASE = (process.env.OUTREACH_LINK_BASE || 'https://field-jobs.co').replace(
  /\/$/,
  ''
)
const DEFAULT_EMPLOYERS = `${LINK_BASE}/employers?utm_source=email&utm_medium=outreach&utm_campaign=cold_email`

function isSafeRedirectUrl(url) {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return false
    const host = u.hostname.toLowerCase()
    return (
      host === 'field-jobs.co' ||
      host === 'www.field-jobs.co' ||
      host === 'field-job.com' ||
      host === 'www.field-job.com'
    )
  } catch {
    return false
  }
}

function isUuidToken(t) {
  return (
    typeof t === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t)
  )
}

/**
 * Tracked employer CTA from cold outreach: logs first click, optional notify email, then redirects.
 * Query: ?t=<click_token from email_log>
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('t')
  const fallback = new URL(DEFAULT_EMPLOYERS)

  if (!token || !isUuidToken(token)) {
    return NextResponse.redirect(fallback, 302)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('email-click: missing Supabase env')
    return NextResponse.redirect(fallback, 302)
  }

  const supabaseAdmin = createClient(url, key)

  const { data: row, error } = await supabaseAdmin
    .from('email_log')
    .select('id, redirect_url, recipient_email, email_number, clicked, lead_id')
    .eq('click_token', token)
    .maybeSingle()

  if (error || !row) {
    return NextResponse.redirect(fallback, 302)
  }

  const dest = row.redirect_url || DEFAULT_EMPLOYERS
  if (!isSafeRedirectUrl(dest)) {
    return NextResponse.redirect(fallback, 302)
  }

  const alreadyClicked = !!row.clicked

  if (!alreadyClicked) {
    const { error: upErr } = await supabaseAdmin
      .from('email_log')
      .update({
        clicked: true,
        clicked_at: new Date().toISOString(),
      })
      .eq('id', row.id)

    if (upErr) {
      console.error('email-click: update failed', upErr.message)
    }

    const notifyTo = (
      process.env.CLICK_NOTIFY_EMAIL || 'Field.jobs.email@gmail.com'
    ).trim()
    const resendKey = process.env.RESEND_API_KEY
    if (notifyTo && resendKey && !upErr) {
      try {
        const resend = new Resend(resendKey)
        await resend.emails.send({
          from: `${process.env.RESEND_FROM_NAME || 'Noah Thomas'} <${
            process.env.RESEND_FROM_EMAIL || 'noah.thomas@field-jobs.co'
          }>`,
          to: notifyTo,
          subject: `Outreach link clicked — ${row.recipient_email}`,
          text: `Someone opened the tracked employers link from a cold outreach email.

Recipient: ${row.recipient_email}
Lead id: ${row.lead_id || '—'}
Email # in sequence: ${row.email_number}
Time (UTC): ${new Date().toISOString()}`,
        })
      } catch (e) {
        console.error('email-click: notify send failed', e)
      }
    }
  }

  return NextResponse.redirect(dest, 302)
}
