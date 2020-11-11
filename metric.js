const apiBenchmark = require('api-benchmark');
const fs = require('fs');

const service = {
    LoadBalanced: "localhost",
    SingleServer1: "localhost:1000",
    SingleServer2: "localhost:2000",
    SingleServer3: "localhost:4000",
};

const routes = {
    serverPoolStatus: {
        method: 'get',
        route: '/check',
    },
    anyOtherRequest: {
        method: 'get',
        route: '/hello',
    },
};

const service_routes = {
    anyOtherRequest: {
        method: 'get',
        route: '/somereallyreallylongroutewithoutcomputation',
    },
};

apiBenchmark.measure(service, routes, function(err, results){
    console.log(results);
});

apiBenchmark.measure(service, routes, function(err, results){
    apiBenchmark.getHtml(results, function(error, html){
        fs.writeFileSync('benchmarks.html', html);
    });
});

apiBenchmark.measure(service, service_routes, {
    debug: false,
    runMode: 'parallel',
    maxConcurrentRequests: 100,
    delay: 0,
    maxTime: 100000,
    minSamples: 1000,
    stopOnError: false
}, function(err, results){
    apiBenchmark.getHtml(results, function(error, html){
        fs.writeFileSync('metrics.html', html);
    });
});

apiBenchmark.compare(service, service_routes, {
    debug: false,
    runMode: 'parallel',
    maxConcurrentRequests: 100,
    delay: 0,
    maxTime: 100000,
    minSamples: 100000,
    stopOnError: false
}, function(err, results){
    apiBenchmark.getHtml(results, function(error, html){
        fs.writeFileSync('compare.html', html);
    });
});