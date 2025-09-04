'use client'
import React, { useState } from 'react'
import Cart, { CartItem } from './cart'
import Assistant from './assistant'

const MainView: React.FC = () => {
  const [cartItems, setCart] = useState<CartItem[]>([])

  const resetDb = async () => {
    try {
      const response = await fetch('/api/db/init', {
        method: 'POST'
      })
      if (response.status === 200) alert('Database has been reset')
      else alert('Failed to reset database')
    } catch (error) {
      console.error('Failed to reset database', error)
      alert('Failed to reset database')
    }
  }

  const resetCart = () => {
    setCart([])
  }

  return (
    <div className="flex gap-16">
      <Cart items={cartItems} resetCart={resetCart} resetDb={resetDb} />
      <Assistant cart={cartItems} setCart={setCart} />
    </div>
  )
}

export default MainView
