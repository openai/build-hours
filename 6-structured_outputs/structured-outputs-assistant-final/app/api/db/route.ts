import { listEntries } from '../../../lib/database'

export async function GET() {
  console.log('List all entries in DB')
  try {
    const entries = await listEntries('candidates')
    return new Response(JSON.stringify({ candidates: entries }), {
      status: 200
    })
  } catch (error) {
    console.error(error)
    return new Response(
      JSON.stringify({ error: 'Failed to list entries database' }),
      {
        status: 500
      }
    )
  }
}
