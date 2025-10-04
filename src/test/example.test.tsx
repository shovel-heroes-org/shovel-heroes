import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

// 簡單的測試組件
function TestComponent() {
  return <div>Hello Vitest!</div>
}

describe('Vitest 測試', () => {
  it('應該正確渲染組件', () => {
    render(<TestComponent />)
    expect(screen.getByText('Hello Vitest!')).toBeInTheDocument()
  })

  it('基本數學運算測試', () => {
    expect(2 + 2).toBe(4)
  })
})