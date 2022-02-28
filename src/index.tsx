import React from 'react'
import ReactDOM from 'react-dom'
import * as Sentry from '@sentry/react'

import App from './App'
import * as serviceWorker from './serviceWorker'

Sentry.init({
  dsn:
    'https://b38fa4cb18f34d3fadb15787420bab8c@o288719.ingest.sentry.io/6124533',
  tracesSampleRate: 0.1,
  allowUrls: [/https?:\/\/app\.1sol\.io/]
})

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
)

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.register()
