const express = require('express');
const { url } = require('inspector');
const socketClient = require('socket.io-client')
const config = require('./network.config.json')
//const scribbles = require('scribbles');
const { v4: UUID } = require('uuid');


class MockServer {

    app = express() 

    socket = socketClient('http://localhost')

    server = require('http').createServer(this.app);

    nickname = ""
    PORT = 3000

    UP = true
    
    address = ""

    uuid = UUID()
    constructor (PORT, nickname, UP) {

        this.PORT = PORT
        this.nickname = nickname
        this.UP = UP === undefined ? true : false
        this.address = "http://localhost:" + PORT
        this.router()

        /*
        scribbles.config({
            dataOut:console.log
         })
         
        setInterval(function(){
            scribbles.status();
          }, 5000);
         
        */
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

        this.app.get('/m/check', (req, res) => {
            console.log('Health Check Request');
            res.status(200).json({uuid: this.uuid}).end();
        });

        this.app.get('/m/stop', (req, res) => {
            this.stop(() => {
                res.json({message: 'Server stopped - ' + this.uuid})
            })
        })

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
                this.socket.emit('boot', `[+] Mock server started on PORT: ${this.PORT} with nickname ${this.nickname} \n   - PID: ${process.pid} \n   - UUID: ${this.uuid}`)
            })
        }
    }

    stop = (cb) => {
        this.server.close(() => {
            this.socket.emit('boot', `[+] Mock server stopped on PORT: ${this.PORT} with nickname ${this.nickname} PID ${process.pid}`)

        })
        cb() 
    }

    
}

const servers = config.servers
const serverPool = []

servers.map(server => {
    const mock = new MockServer(server.PORT, server.nickname, server.UP)
    mock.id = server.PORT
    mock.start()
    serverPool.push(mock)
})

setTimeout(() => {
    
}, 10000)


module.exports = MockServer