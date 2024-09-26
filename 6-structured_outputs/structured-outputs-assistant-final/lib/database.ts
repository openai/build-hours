import sqlite3 from 'sqlite3'
import productsData from '../data/amazon_furniture_db.json'
import path from 'path'
import { Product } from './assistant'
const dbPath = path.join(process.cwd(), 'data', 'database.sqlite')

const db = new sqlite3.Database(dbPath, err => {
  if (err) {
    console.error('Error opening database:', err.message)
  } else {
    console.log('Connected to the database.')
  }
})

// Function to list entries in a table
export const listEntries = async (tableName: string): Promise<any[]> => {
  const query = `SELECT * FROM ${tableName}`
  const params: any[] = []

  return new Promise((resolve, reject) => {
    db.all(query, params, (err: Error | null, rows: any[]) => {
      if (err) {
        console.error(err.message)
        reject(err)
      } else {
        // Return all rows
        resolve(rows)
      }
    })
  })
}

// Function to retrieve a single entry by ID
export const getEntryById = async (
  tableName: string,
  id: string
): Promise<any> => {
  const query = `SELECT * FROM ${tableName} WHERE id = ?`

  return new Promise((resolve, reject) => {
    db.get(query, [id], (err: Error | null, row: any) => {
      if (err) {
        console.error(err.message)
        reject(err)
      } else {
        resolve(row)
      }
    })
  })
}

// Function to update an entry by ID
export const updateEntryById = async (
  tableName: string,
  id: string,
  data: any
): Promise<void> => {
  const columns = Object.keys(data)
    .map(key => `${key} = ?`)
    .join(', ')
  const values = Object.values(data)
  const query = `UPDATE ${tableName} SET ${columns} WHERE id = ?`

  return new Promise((resolve, reject) => {
    db.run(query, [...values, id], function (err: Error | null) {
      if (err) {
        console.error(err.message)
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

// Function to insert a new entry
export const insertEntry = async (
  tableName: string,
  data: any
): Promise<void> => {
  const columns = Object.keys(data).join(', ')
  const placeholders = Object.keys(data)
    .map(() => '?')
    .join(', ')
  const values = Object.values(data)
  const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`

  return new Promise((resolve, reject) => {
    db.run(query, values, function (err: Error | null) {
      if (err) {
        console.error(err.message)
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

// Function to delete an entry by ID
export const deleteEntryById = async (
  tableName: string,
  id: string
): Promise<void> => {
  const query = `DELETE FROM ${tableName} WHERE id = ?`

  return new Promise((resolve, reject) => {
    db.run(query, [id], function (err: Error | null) {
      if (err) {
        console.error(err.message)
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

// Function to filter entries based on specific criteria
export const filterEntries = async (
  tableName: string,
  criteria: { field: string; values: string[] }[],
  limit: number = 3
): Promise<any[]> => {
  const whereClauses = criteria
    .filter(c => c.values.length > 0)
    .map(c => {
      const placeholders = c.values.map(() => '?').join(', ')
      return `${c.field} IN (${placeholders})`
    })
    .join(' AND ')

  const values = criteria.flatMap(c => c.values)
  const query = `SELECT * FROM ${tableName} WHERE ${whereClauses} LIMIT ${limit}`

  return new Promise((resolve, reject) => {
    db.all(query, values, (err: Error | null, rows: any[]) => {
      if (err) {
        console.error(err.message)
        reject(err)
      } else {
        resolve(rows)
      }
    })
  })
}

export const queryDb = async (query: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(query, (err: Error | null, rows: any[]) => {
      if (err) {
        console.error(err.message)
        reject(err)
      } else {
        resolve(rows)
      }
    })
  })
}

// Reinitialize db to initial state
export const initDb = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('DROP TABLE IF EXISTS products', (err: Error | null) => {
        if (err) {
          console.error(err.message)
          reject(err)
          return
        }

        db.run(
          `CREATE TABLE products (
            id TEXT PRIMARY KEY,
            title TEXT,
            url TEXT,
            primary_image TEXT,
            price TEXT,
            categories TEXT,
            color TEXT,
            style TEXT
          )`,
          (err: Error | null) => {
            if (err) {
              console.error(err.message)
              reject(err)
              return
            }

            const products: Product[] = productsData

            const insertStmt = db.prepare(
              `INSERT INTO products (
                  id, title, url, primary_image, price, categories, color, style
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            )

            products.forEach(item => {
              insertStmt.run(
                item.id,
                item.title,
                item.url,
                item.primary_image,
                item.price,
                JSON.stringify(item.categories),
                item.color,
                item.style
              )
            })

            insertStmt.finalize(err => {
              if (err) {
                console.error(err.message)
                reject(err)
              } else {
                resolve()
              }
            })
          }
        )
      })
    })
  })
}
