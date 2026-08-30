import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { store } from '@/store/store'
import { Toaster } from '@/components/ui/sonner'
import App from './App.jsx'
import '@/styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <MotionConfig reducedMotion="user">
          <App />
          <Toaster />
        </MotionConfig>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
)
