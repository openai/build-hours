import { JSONSchema } from 'openai/lib/jsonschema'

const fields = ['title', 'categories', 'color', 'style']

const colors = [
  'White',
  'Black',
  'Green',
  'Grey',
  'Brushed Brass',
  'Chrome',
  'Slate Gray',
  'Bichon Frise',
  'Blue',
  'Dark Gray',
  'Brown',
  'White/Pine Oak',
  'Charcoal Gray / Black',
  'Beige',
  'Teak & Black',
  'C gold',
  'Silver',
  'Satin Nickel',
  'White&teak',
  'Orange',
  'Pink',
  'Black Vinyl',
  'Matte Black',
  'Black and Beige',
  'Dark Grey',
  'Brushed Nickel',
  'Smoke Grey',
  'Natural Wood Wash',
  'All Black',
  'Rainforest',
  'Dark Blue',
  'Oil Rubbed Bronze',
  'Burgundy',
  'Dusty Blue',
  'Espresso',
  'Shiny Black',
  'Multi Color',
  'Bamboo',
  'Multicolored',
  'Wood',
  'Navy',
  'Rustic Walnut',
  'Grey & Black',
  'Grey & White',
  'Mahogany Wood Brown',
  'Camel',
  'Wine Gold',
  'Rustic Brown',
  'Orange Brown',
  'Two Tone Cream/Brown',
  'Red',
  'Snowblue',
  'Rustic',
  'Dark Brown',
  'Light Green',
  'Cream/Walnut',
  'Dusty Pink',
  'Harvard Pink',
  'Walnut',
  'Gold',
  'Bourbon Brown',
  'Driftwood/White',
  'Green and Brown',
  'Green/Beige',
  'Light Lavender',
  'Pure White',
  'blackish green',
  'Grey&white',
  'Brown-diamond',
  'Whitewashed Wood & Black Metal',
  'White and Gray',
  'tree gold',
  'Navy Blue',
  'Polished Chrome',
  'Rustic Brown + Black',
  'White and Brown',
  'Slate',
  'Antique Brass/Mirror',
  'Grey / White',
  'Gunmetal',
  'Black/Blue',
  'Grey3',
  'Navy Blue + Teak',
  'Tuscan Bronze',
  'Tan Woven',
  'Kiwi',
  'Espresso/Brown',
  'Charcoal',
  'Coffee',
  'black',
  'Khaki',
  'Brown+black',
  'Walnut Finish',
  'Walnut/Gold',
  'Smoke Gray',
  'Rainbow Unicorn',
  'Copper',
  'Black Sand'
]

const categories = [
  'Infant & Toddler Beds',
  'Chairs',
  'Bedroom Armoires',
  'Mobile Storage Islands',
  'Over the Door Shoe Organizers',
  'Makeup Mirrors',
  'Bean Bags',
  'Baby Products',
  'Wall-Mounted Wine Racks',
  'Outdoor Décor',
  'Computer Gaming Chairs',
  'Home & Kitchen',
  'Bathroom Hardware',
  'Racks & Holders',
  'Bean Bags, Covers & Refills',
  "Kids' Furniture",
  'Mattresses & Box Springs',
  'Folding Chairs',
  'Step Stools',
  'Bedding',
  'Sofas',
  'Doormats',
  'Nursery',
  'Sofas & Couches',
  'Television & Video',
  'Sofa Parts',
  'Bathroom Accessories',
  'Sofa & Console Tables',
  'Bars & Wine Cabinets',
  'Wine Racks & Cabinets',
  'TV Trays',
  'Folding Shoe Racks',
  'Coffee Tables',
  'Home Office Furniture',
  'TV & Media Furniture',
  'Supply Organizers',
  'Storage Islands & Carts',
  'Wall-Mounted Mirrors',
  'Furniture',
  'Towel Bars',
  'Game & Recreation Room Furniture',
  'Living Room Sets',
  'Vanities & Vanity Benches',
  'Home Décor Products',
  'Dressers',
  'Shower Mirrors',
  'Bar Cabinets',
  'Ottomans',
  'Kitchen Furniture',
  'Trash, Recycling & Compost',
  'Bassinets',
  'Shoe Cabinets',
  'Storage & Organization',
  'Towel Rings',
  'Patio Seating',
  'Accessories',
  'Table & Chair Sets',
  'Storage Benches',
  'Barstools',
  'Media Storage',
  'Home Office Desks',
  'Mirrors',
  'Video Game Chairs',
  'Toy Bags & Nets',
  'Mattress Pads & Toppers',
  'Beds, Frames & Bases',
  'Free Standing Shoe Racks',
  'Mattress Toppers',
  'Bedside Cribs',
  'Towel Racks',
  'Storage Trunks',
  'Accent Furniture',
  'Storage Trunks & Chests',
  'Changing & Dressing',
  'Boot & Shoe Boxes',
  'TV Mounts, Stands & Turntables',
  'Storage Cabinets',
  'Freestanding Wine Racks & Cabinets',
  'Replacement Parts',
  'Gliders, Ottomans & Rocking Chairs',
  'Home Audio',
  'Nesting Tables',
  'Coat Racks',
  'Tables',
  'Tools & Home Improvement',
  'Electronics',
  'Filing Products',
  'Home Office Chairs',
  'Entryway Furniture',
  'Turntables & Accessories',
  'Patio Furniture & Accessories',
  'Home Office Desk Chairs',
  'Bed Parts',
  'DVD Cases',
  'Bed Frames',
  'Tables & Chairs',
  'Bathroom Mirrors',
  'Wastebaskets',
  'Wall-Mounted Vanity Mirrors',
  'Towel Holders',
  'Mattresses',
  'Clothing & Closet Storage',
  'Bathroom Sets',
  'Tools & Accessories',
  'Office & School Supplies',
  'Kitchen & Dining',
  'Over-the-Toilet Storage',
  'TV Wall & Ceiling Mounts',
  'Nightstands',
  'Adirondack Chairs',
  'Home Bar Furniture',
  'Living Room Furniture',
  'Gaming Chairs',
  'Bookcases',
  'Wine Cabinets',
  'Folding Tables',
  'Office Products',
  'Dining Room Furniture',
  'Shoe Organizers',
  'Poufs',
  'Patio, Lawn & Garden',
  'Box Springs',
  'Bookcases, Cabinets & Shelves',
  'End Tables',
  'Bar & Serving Carts',
  'Turntables',
  'Bath',
  'Chests & Dressers',
  'Ladder Shelves',
  'Storage Carts',
  'Beauty & Personal Care',
  'Beds',
  'Toy Chests & Organizers',
  'Recliner Parts',
  'Chairs & Seats',
  'Bathroom Furniture',
  'Bedroom Furniture',
  'Hardware',
  'Folding Tables & Chairs',
  'Desk Chairs'
]

const styles = [
  'Modern',
  'Classic',
  'Traditional',
  'Contemporary',
  'Modern, Boho, Chic',
  'wood',
  'Farmhouse',
  'Art Deco',
  'Modern and Elegant',
  'Shabby Chic',
  'Country Rustic',
  'Mid-Century Modern',
  'Bohemian',
  'Retro',
  'Natural',
  'Rustic',
  'Glam,Farmhouse,Traditional',
  'Colonial'
]

const componentsList = ['card', 'header', 'item', 'pie_chart', 'bar_chart']

const toolsList = [
  {
    name: 'search_products',
    description:
      'Searches for products matching certain criteria in the database',
    parameters: {
      type: 'object',
      properties: {
        color: {
          description: 'colors that could be a match, empty array if N/A',
          type: 'array',
          items: {
            type: 'string',
            enum: colors
          }
        },
        category: {
          description: 'categories that could be a match, empty array if N/A',
          type: 'array',
          items: {
            type: 'string',
            enum: categories
          }
        },
        style: {
          description: 'styles that could be a match, empty array if N/A',
          type: 'array',
          items: {
            type: 'string',
            enum: styles
          }
        },
        limit: {
          type: 'integer',
          description:
            'The maximum number of products to return, use 10 by default if nothing is specified by the user'
        }
      },
      required: ['color', 'category', 'style', 'limit'],
      additionalProperties: false
    },
    strict: true
  },
  {
    name: 'generate_ui',
    description: 'Generate UI components dynamically to display data',
    parameters: {
      type: 'object',
      properties: {
        component: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'component name',
              enum: componentsList
            },
            data: {
              type: 'array',
              description:
                'data to display in the component, empty array if N/A',
              items: {
                type: 'object',
                properties: {
                  label: {
                    type: 'string',
                    description: 'Data item label'
                  },
                  value: {
                    type: 'string',
                    description: 'Data item value'
                  }
                },
                required: ['label', 'value'],
                additionalProperties: false
              }
            },
            content: {
              anyOf: [
                {
                  type: 'object',
                  description: "Product item is the component is 'item'",
                  properties: {
                    title: {
                      type: 'string'
                    },
                    primary_image: {
                      type: 'string'
                    },
                    price: {
                      type: 'string'
                    },
                    categories: {
                      type: 'array',
                      items: {
                        type: 'string'
                      }
                    },
                    color: {
                      type: 'string'
                    },
                    style: {
                      type: 'string'
                    }
                  },
                  additionalProperties: false,
                  required: [
                    'title',
                    'primary_image',
                    'price',
                    'categories',
                    'color',
                    'style'
                  ]
                },
                {
                  type: 'string',
                  description:
                    'text content to display in the component, empty if N/A.'
                }
              ]
            },
            children: {
              type: 'array',
              description: 'Nested UI components',
              items: {
                $ref: '#'
              }
            }
          },
          required: ['name', 'data', 'content', 'children'],
          additionalProperties: false
        }
      },
      required: ['component'],
      additionalProperties: false
    },
    strict: true
  },
  {
    name: 'add_to_cart',
    description:
      'Add items to cart when the user has confirmed their interest.',
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ID of the product to add to the cart'
              },
              quantity: {
                type: 'integer',
                description: 'Quantity of the product to add to the cart'
              }
            },
            required: ['id', 'quantity'],
            additionalProperties: false
          }
        }
      },
      required: ['items'],
      additionalProperties: false
    },
    strict: true
  }
]

interface Parameter {
  type: 'object'
  properties: JSONSchema
  required: string[]
  additionalProperties?: boolean
}

interface Tool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters?: Parameter
    strict?: boolean
  }
}

export const tools: Tool[] = toolsList.map(tool => {
  return {
    type: 'function',
    function: {
      ...tool,
      parameters: tool.parameters as Parameter
    }
  }
})
