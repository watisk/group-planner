import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export async function GET() {
  try {
    const data = await redis.get('group_availability') || {}
    return Response.json(data)
  } catch (e) {
    return Response.json({})
  }
}

export async function POST(req) {
  try {
    const { member, date, status, updatedAt } = await req.json()
    const data = await redis.get('group_availability') || {}
    if (!data[member]) data[member] = { overrides: {}, notes: '' }
    data[member].overrides[date] = status
    data[member].lastUpdated = updatedAt || new Date().toISOString()
    await redis.set('group_availability', data)
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ ok: false }, { status: 500 })
  }
}
