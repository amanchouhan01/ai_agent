const express = require('express')
const path = require('path')
const app = express()

// COOP/COEP headers — WebContainer ke liye zaroori
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
    next()
})

app.use(express.static(path.join(__dirname, 'dist')))

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`Frontend running on port ${PORT}`))