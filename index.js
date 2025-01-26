var request = require('request');
var fs = require('fs');
var http = require('http');
var crypto = require('crypto');
var process = require('process');

var domain_base = process.env.DOMAIN_BASE;
var server_key = process.env.SERVER_KEY;
var mnemonics = fs.readFileSync('mnemonic.txt').toString().split(",").map(x => x.trim()).filter(x => x != "");

var calcName = (str) => crypto.createHash('md5').update(`${server_key} ${str}`).digest("hex").match(/.{1,4}/g).map(x => parseInt(x, 16) % mnemonics.length).map(x => mnemonics[x]).join("-");


function setupDdns(req, res, uuid, ipaddr = null){
	let domain = `${calcName(uuid.toLowerCase())}`;
	let ip = ipaddr || req.headers['CF-Connecting-IP'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || "127.0.0.1";
	
	request(`${process.env.API_ENDPOINT}/update?secret=${process.env.SERVER_SECRET}&domain=${domain}&addr=${ip}`, function (error, response, body) {
		if(error){
			res.statusCode = 500;
			res.setHeader('Content-Type', 'text/html');
			res.write("something wrong");
			res.end();
			return;
		}
		console.log(body);
		res.statusCode = 200;
		res.setHeader('Content-Type', 'application/json');
		let obj = {
			domain: `${domain}.${domain_base}`,
			ip: `${ip}`,
			update_url: `https://${req.headers['host'] || 'dyndns.moegirl.live'}/update/${uuid}`
		};
		res.write(JSON.stringify(obj, null, 2));
		res.end();
	});
}


function server(req, res) {
    console.log(req.url);
    if(req.method == 'GET' && req.url.startsWith("/update/") && req.url.match(/[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}/g)[0]){
        let uuid = req.url.match(/[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}/g)[0];
		let ip = req.url.match(/((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.){3}(25[0-5]|(2[0-4]|1\d|[1-9]|)\d)/g)?.[0];
		setupDdns(req, res, uuid, ip);
    }else{
		setupDdns(req, res, crypto.randomUUID());
	}
}

http.createServer(server).listen(3000);