import { initDb } from '../../../../lib/database'

export async function POST() {
  console.log('Init DB')
  try {
    await initDb()
    return new Response(
      JSON.stringify({ message: 'Database initialized successfully' }),
      {
        status: 200
      }
    )
  } catch (error) {
    console.error(error)
    return new Response(
      JSON.stringify({ error: 'Failed to initialize database' }),
      {
        status: 500
      }
    )
  }
}
