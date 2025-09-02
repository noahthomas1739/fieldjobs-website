import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const { data: prompts, error } = await supabase
      .from('upgrade_prompts')
      .select(`
        *,
        jobs!inner(title, is_free_job, free_job_expires_at)
      `)
      .eq('user_id', userId)
      .is('shown_at', null)
      .lte('triggered_at', new Date().toISOString())
      .order('triggered_at', { ascending: true })

    if (error) {
      console.error('Error fetching prompts:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      prompts: prompts.filter(p => p.jobs.is_free_job)
    })

  } catch (error) {
    console.error('Error fetching upgrade prompts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { promptId, action } = await request.json()

    if (!promptId) {
      return NextResponse.json({ error: 'Prompt ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('upgrade_prompts')
      .update({
        shown_at: new Date().toISOString(),
        action_taken: action || 'shown'
      })
      .eq('id', promptId)

    if (error) {
      console.error('Error updating prompt:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating upgrade prompt:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}