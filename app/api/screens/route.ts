import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createScreen } from '@/lib/services/screens';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body?.name || '').trim();
    const location = String(body?.location || '').trim();
    const orientation = body?.orientation === 'portrait' ? 'portrait' : 'landscape';
    const organizationId = String(body?.organizationId || '').trim();

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization is required.' }, { status: 400 });
    }

    const supabase = await createClient();
    const screen = await createScreen(supabase, organizationId, {
      name,
      location,
      orientation
    });

    return NextResponse.json({ screen }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create screen.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}