import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div className="p-10 bg-blue-100 text-blue-900 font-bold text-3xl">
        Tailwind v4 is working!
      </div>
    </>
  )
}

export default App
