import * as React from 'react'
import './spinner.css'

export function Spinner() {
  return (
    <div className="fulfilling-bouncing-circle-spinner">
      <div className="circle"></div>
      <div className="orbit"></div>
    </div>
  )
}
