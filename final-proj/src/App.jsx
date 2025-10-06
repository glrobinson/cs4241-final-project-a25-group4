import './App.css'
import { useEffect, useRef, useState } from 'react'

export default function App() {
  const [msgs, whoMsgs] = useState([])
  const ref = useRef(null)

  useEffect(() => {
    const ws = new WebSocket('ws://127.0.0.1:3000')
    ref.current = ws
    ws.onmessage = async (evt) => {
      const text = typeof evt.data === 'string' ? evt.data : await evt.data.text()
      whoMsgs((m) => [...m, `them: ${text}`])
    }
    return () => ws.close()
  }, [])

  const send = (e) => {
    e.preventDefault()
    const input = e.target.elements.msg
    const txt = input.value.trim()
    if (!txt || !ref.current || ref.current.readyState !== WebSocket.OPEN) return
    ref.current.send(txt)
    whoMsgs((m) => [...m, `me: ${txt}`])
    input.value = ''
  }
  return (
    <div>
      <form onSubmit={send}>
        <input name="msg" />
      </form>
      <div>
        {msgs.map((m, i) => <li key={i}>{m}</li>)}
      </div>
    </div>
  )
}