import { getEntryById } from '../../../../lib/database'

export async function POST(request: Request) {
  try {
    const { items } = await request.json()
    const cartItems = await Promise.all(
      items.map(async (item: { id: string; quantity: number }) => {
        console.log('retrieving item', item)
        const product = await getEntryById('products', item.id)
        console.log('product retrieved', product)
        return { item: { ...product }, quantity: item.quantity }
      })
    )
    return new Response(JSON.stringify({ cartItems }), {
      status: 200
    })
  } catch (error) {
    console.error(error)
    return new Response(
      JSON.stringify({ error: 'Failed to find candidates' }),
      {
        status: 500
      }
    )
  }
}
