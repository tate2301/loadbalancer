const express = require('express');
const { url } = require('inspector');
const socketClient = require('socket.io-client')
const scribbles = require('scribbles');



class MockServer {

    app = express() 

    socket = socketClient('http://localhost')

    server = require('http').createServer(this.app);

    nickname = ""
    PORT = 3000

    UP = true
    
    address = ""
    constructor (PORT, nickname, UP) {

        this.PORT = PORT
        this.nickname = nickname
        this.UP = UP === undefined ? true : false
        this.address = "http://localhost:" + PORT
        this.router()

        scribbles.config({
            dataOut:console.log
         })
         
        setInterval(function(){
            scribbles.status();
          }, 5000);
         

    }

    emmitHealthInfo({count}) {
        this.socket.emit('health-check', `connectionCount: ${count}`)
        
    }

    setStatus(UP) {
        this.UP = UP
        if(this.UP) {
            this.start()
        } else {
            this.stop()
        }
    }

    router = () => {

        this.app.get('/check', (req, res) => {
            console.log('Health Check Request');
            res.status(200).end();
        });

        this.app.use('*', (req, res) => {
            res.json({
                error: false,
                server: this.nickname,
                PORT: this.PORT
            })
        })

        
    }

    start = () => {
        if (this.UP) {
            this.server.listen(this.PORT, () => {
                this.socket.emit('boot', `[+] Mock server started on PORT: ${this.PORT} with nickname ${this.nickname} PID ${process.pid}`)
            })
        }
    }

    stop = () => {
        this.server.close(() => {
            this.socket.emit('boot', `[+] Mock server stopped on PORT: ${this.PORT} with nickname ${this.nickname} PID ${process.pid}`)

        })
    }

    
}

module.exports = MockServer