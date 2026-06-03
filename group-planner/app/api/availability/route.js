import { kv } from '@vercel/kv'

export async function GET() {
  try {
    const data = await kv.get('group_availability') || {}
    return Response.json(data)
  } catch (e) {
    return Response.json({}, { status: 200 })
  }
}

export async function POST(req) {
  try {
    const { member, date, status } = await req.json()
    const data = await kv.get('group_availability') || {}
    if (!data[member]) data[member] = { overrides: {}, notes: '' }
    data[member].overrides[date] = status
    await kv.set('group_availability', data)
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 })
  }
}
