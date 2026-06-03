import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export async function POST(req) {
  try {
    const { member, notes } = await req.json()
    const data = await redis.get('group_availability') || {}
    if (!data[member]) data[member] = { overrides: {}, notes: '' }
    data[member].notes = notes
    await redis.set('group_availability', data)
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ ok: false }, { status: 500 })
  }
}
