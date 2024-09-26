import { filterEntries } from '../../../../lib/database'

export async function POST(request: Request) {
  try {
    const { color, category, style, limit } = await request.json()
    const criteria = []

    if (color.length > 0) criteria.push({ field: 'color', values: color })
    if (category.length > 0)
      criteria.push({ field: 'categories', values: category })
    if (style.length > 0) criteria.push({ field: 'style', values: style })

    const matches = await filterEntries('products', criteria, limit)
    console.log('Matches found', matches)
    return new Response(JSON.stringify({ matches }), {
      status: 200
    })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: 'Failed to find matches' }), {
      status: 500
    })
  }
}
