import { kv } from '@vercel/kv'

export async function POST(req) {
  try {
    const { member, notes } = await req.json()
    const data = await kv.get('group_availability') || {}
    if (!data[member]) data[member] = { overrides: {}, notes: '' }
    data[member].notes = notes
    await kv.set('group_availability', data)
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 })
  }
}
