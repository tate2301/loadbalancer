/*
*   This is a load balancer built with ExpressJS that accepts a configuration containing servers in the stack
*   It uses Weighted Response Time to determine which server next gets the request.
*/

const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const request = require('request')
const MockServer = require('./mockserver')
const app = express()
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const crypto = require('crypto')


const config = require('./network.config.json')
const path = require("path");


app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))



class Balancer {
    state = {
        servers: [
            {
            nickname: "",
            PORT: 0
            }
        ],
        launchedServers: [
            
        ],
        unhealthyServers: [

        ]
    }

    constructor () {
        this.launchServer()
        this.socketWatcher()

        
    }

    async launchServer() {
        this.state.servers.pop()
        this.servers = await this.state.servers.push(...config.servers)
        
        await this.spinUpServers()
        await this.router()
        await setInterval(() => this.startHealthChecksPoll(), 5000);
    }


    spinUpServers() {
        this.state.servers.map(server => {
            this.state.launchedServers.push({...server, address: 'http://localhost:' + server.PORT})
        })
    }

    async startHealthChecksPoll() {
            console.log("\n[+] Health Check\n")
            this.state.launchedServers.map(server => {
                const response = request({uri: server.address, time: true})
                const startTime = new Date()

                response.on('response', serverResponse => {
                    if(serverResponse.statusCode != 200) {
                        server.UP = false
                        this.state.unhealthyServers.push({server})
                    } else {
                        this.state.unhealthyServers.pop(server)
                        var filtered = this.state.launchedServers.filter(function(value, index, arr){ 
                            return value.PORT !== server.PORT;
                        });
                        server.UP = true
                        server.responseTime = new Date() - startTime
                        filtered.push(server)
                       
                    }
                }).on('error', err => {
                    server.UP = false
                    this.state.unhealthyServers.push({server, reason: err.code})
                    console.log({unhealthyServers: this.state.unhealthyServers[0].server, reason: this.state.unhealthyServers[0].reason})
                })
            })


    }


    router(params) {

        // Health Check for all servers
        app.use('/check', (req, res) => {
            res.json({
                ...this.state
            })
        })

        app.use('/benchmarks', (req, res) => {
            res.sendFile(path.join(__dirname,'/benchmarks.html'));

        })

        app.use('/metrics', (req, res) => {
            res.sendFile(path.join(__dirname,'/metrics.html'));

        })

        app.use('/compare', (req, res) => {
            res.sendFile(path.join(__dirname,'/compare.html'));

        })

        app.use('*', (req, res, next) => {


            // Filter out to get unhealthy servers
            const unhealthy = this.state.launchedServers.filter(function( obj, index, arr ) {
                return obj.UP === false;
            });

            // Filter out for healthy servers
            const healthy = this.state.launchedServers.filter(function( obj, index, arr ) {
                return obj.UP === true || undefined;
            });


            
            console.log({x: unhealthy.length, active: healthy.length})
            const proxy = request({uri: sortServersByLatency(healthy)[0].address})

            sortServersByLatency(healthy).map(server => {
                console.log({
                    server: server.nickname,
                    time: server.responseTime
                })
            })
            
        
            proxy.on('response', proxyResponse => {
                // proxyResponse is an object here
                res.cookie('_sid', getClientIPHash(req.ip), { 
                maxAge: 900000, 
                httpOnly: true 
                })
            }).pipe(res, {end:true})
        
            // catch errors with proxy.on('error', err => {})
        
            req.pipe(proxy)
        }) 

        
    }

    socketWatcher() {
        io.on('connection', (socket) => {
            console.log(`\n[+] A server has connected - ${socket.client.id}`);
            socket.on('boot', (msg) => {
                console.log(msg);
              });

            socket.on('health-check', msg => {
                  console.log({msg})
            })


          });
    }

    start () {
        http.listen(80, () => {
            console.log('\n[*] Proxy started on port 80')
        })
    }

}



new Balancer().start()


// Helper methods

/* 
* Returns a hash of the source IP
* @param {string} sourceIP
*/
function getClientIPHash(ip) {
    var hash = crypto.createHash('sha1')
    return hash.update(ip, 'utf8').digest('hex')

}

/* 
* Returns an array of the Servers provided
* @param {string} sourceIP
*/
function sortServersByLatency(arr) {
    return arr.sort(function(a, b) {
        var keyA = new Date(a.responseTime),
            keyB = new Date(b.responseTime);
        // Compare the 2 dates
        if (keyA < keyB) return -1;
        if (keyA > keyB) return 1;
        return 0;
      });
}