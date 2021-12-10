import React, { useEffect, useState } from 'react'
import { Routes } from './routes'

import Logo from './assets/logo.png'

import './App.less'

function App(){
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const checkStatus = () => {
      if (document.readyState === 'complete') {
        setReady(true)
      } else {
        const timer = setTimeout(checkStatus, 100)

        return () => {
          clearTimeout(timer)
        }
      }
    }

    checkStatus()
  }, [])

  return (
    <div className="App">
      {ready ? (
        <Routes />
      ) : (
        <div className="g-loading">
          <img className="g-loading-logo" src={Logo} alt="logo" />
        </div>
      )}
    </div>
  )
}

export default App
