'use client'
import React, { useEffect, useState } from 'react'
import Image from 'next/image'

import Assistant from './assistant'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from './ui/dropdown-menu'
import { ShoppingCart } from 'lucide-react'
import { Product } from '@/lib/assistant'

export interface CartItem {
  item: Product
  quantity: number
}

interface CartProps {
  items: CartItem[]
  resetCart: () => void
  resetDb: () => void
}

const Cart: React.FC<CartProps> = ({
  items,
  resetTable,
  resetDb
}: CartProps) => {
  return (
    <div className="h-screen w-1/3 p-4">
      <div className="h-full bg-white rounded-lg px-8 py-6 shadow-sm">
        <div className="w-full flex flex-col items-start justify-between">
          <div className="flex items-center">
            <ShoppingCart
              size={24}
              className="text-neutral-600"
              onClick={resetDb}
            />
            <h1 className="ml-4 text-lg font-bold">Cart</h1>
            {items.length > 0 && (
              <div className="ml-4 text-sm rounded-full bg-neutral-300 text-neutral-600 px-2.5 py-1">
                {items.length}
              </div>
            )}
          </div>
          {/* <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="default"
              className="flex items-center gap-2"
            >
              <Filter size={16} />
              Filter job
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {jobs.map(job => (
              <DropdownMenuItem
                key={job.id}
                onSelect={() => setSelectedJob(job.id)}
              >
                {job.title}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onSelect={() => resetTable()}>
              Reset
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu> */}
          <div className="mt-4">
            {items.length === 0 ? (
              <p>Your cart is empty.</p>
            ) : (
              items.map((cartItem, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 border-b border-neutral-200"
                >
                  <div className="flex items-center">
                    <Image
                      src={cartItem.item.primary_image}
                      alt={cartItem.item.title}
                      width={48}
                      height={48}
                      className="object-cover mr-4"
                    />
                    <div>
                      <p className="font-semibold">{cartItem.item.title}</p>
                      <p className="text-sm text-neutral-600">
                        {cartItem.item.price}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm">Quantity: {cartItem.quantity}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Cart
