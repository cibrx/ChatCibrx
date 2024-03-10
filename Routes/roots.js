const express = require('express')
const routes = express.Router()



routes.get('/', (req, res) => {
    res.render('index.ejs')
})

routes.get('/home', (req, res) => {
    if (req.session.username) {
        res.render('home.ejs')
    } else {
        res.status(302).redirect('/')
    }
})

module.exports = routes