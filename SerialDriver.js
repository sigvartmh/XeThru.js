/*jshint strict:true */
var _ = require('lodash/core');
var SerialPort = require("serialport");
const parser = require("./parser")


/* Calculates crc(checksum) for the command and appends it before the end byte, does not check for escapes so add escapes after */
function crc8(command){
	let crc = 0x00;
	command.forEach((value) => crc ^= value );
	crc ^= flag.END; //remove the XOR for the end flag(lazy)
	command.splice(-1, command.lenght ,crc);
	//return command;
}

function addEscape(command){
	//console.log(command);
	let escape = [flag.START, flag.END];
	for(let i = 1; i < command.length-1; i++){
		if( escape.indexOf(command[i]) !== -1){
			command.splice(-1,i,flag.ESC);
		}
	}
	return new Buffer(command);
}

function toHexString(byteArray) {
  return byteArray.map(function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join(' ')
}



const app = {
	respiration : 0x1423a2d6,
	presence: 0x00288912,
	resp: [0xd6, 0xa2 , 0x23, 0x14]
}

const appId = {
	resp : [0x26, 0xfe, 0x75, 0x23],
	pres : [0xbe, 0x52, 0x1a, 0x99]
}

const flag = {
	START : 0x7D,
	END : 0x7E,
	ESC : 0x7F
};

const command ={
	RESET: 0x22,
	LOADAPP: 0x21,
	SETLEDCONTROL: 0x24,
	SETMODE : 0x20
};

const mode={
	RUN : 0x01,
	IDLE : 0x11
};

const ledmode = {
	off : 0x00,
	simple: 0x01,
	full: 0x02
};

const identifier= {
	SYSTEM : 0x30,
	APPDATA : 0x50
};

const response ={
	system : {
		booting: 0x10,
		ready: 0x11,
		ack: 0x10,
		error: 0x20
	},
	errcode :{
		notRecognized: 0x20,
		crcFail: 0x02
	}
};


const config = {
	baudRate: 115200,
	parser: parser.xethruProtocol([flag.START, flag.END])

};

var XTdevice = new SerialPort.SerialPort('COM3', config, false);
XTdevice.open(function(){
	console.log("Opened COM3: ", XTdevice.isOpen());
	
	let cmd = [flag.START, command.RESET, flag.END];
	crc8(cmd);
	const restart = addEscape(cmd);
	
	console.log("buffertest:", restart);
	
	XTdevice.write(restart, function(err,n){
		if(err){
			return console.log("Error:", err.message);
		}
		console.log(n,"bytes written");
	});
});

function arr2Uint32(byteArray){
	return new Uint32Array(new Uint8Array(byteArray).slice(-4))[0];
}

function arr2Float32(byteArray){
	return new Uint32Array(new Uint8Array(byteArray).slice(-4))[0];
}

function parseResp(byteArray){
	if(byteArray[10] === 4){
		console.log("Buffer:", Buffer(byteArray));
		console.log("Initializing:", arr2Uint32(byteArray.slice(14,18)),"%");
	}
		else{
	console.log("Counter(i):", Buffer(byteArray.slice(6,10)));
	console.log("StateCode(i):", Buffer(byteArray.slice(10,14)));
	console.log("StateData(i):", Buffer(byteArray.slice(14,18)));
	console.log("Distance(f):", Buffer(byteArray.slice(18,22)));
	console.log("Movement(f):", Buffer(byteArray.slice(22,26)));
	console.log("SignalQuality(i):", Buffer(byteArray.slice(26,30)));
	console.log("SignalQuality(i):", new Uint32Array(new Uint8Array(byteArray.slice(26,30)).slice(-4))[0]);
	console.log("CRC:", byteArray[byteArray.length-2].toString(16));
	console.log("END:", byteArray[byteArray.length-1].toString(16));
	console.log("StateData:", new Uint32Array(new Uint8Array(byteArray.slice(14,18)).slice(-4))[0]);
	console.log("Distance(f):", new Float32Array(new Uint8Array(byteArray.slice(18,22)).slice(-4))[0]);
	console.log("State:",byteArray[10]);
	}
	if(byteArray.slice(6,10)){
		
	}

}

var done = 0;
XTdevice.on('data', function(buff){
	//console.log(Buffer(buff));

	if((buff[1] === identifier.SYSTEM) && (buff[2] === response.system.ready)){
		console.log('ready');
		let cmd = [flag.START, command.LOADAPP, ...app.resp, flag.END];
		console.log(cmd);
		crc8(cmd);
		const respApp = addEscape(cmd);
		console.log(respApp);
		XTdevice.write(respApp, function(err,n){
		if(err){
			return console.log("Error:", err.message);
		}
			console.log(n,"bytes written");
		});
	}
	
	if((buff[1] === 0x10)){
		

		let cmd = [flag.START, command.SETMODE, mode.RUN, flag.END];
		crc8(cmd);
		const runApp = addEscape(cmd);
			done++;
		if (done === 2){
			console.log("Starting application");
			setTimeout(function(){
			XTdevice.write(runApp, function(err,n){
				if(err){
					return console.log("Error:", err.message);
				}
				
			});},900);
		}

	}
	
	if((buff[1] === identifier.APPDATA) && _.isEqual(buff.slice(2,6), appId.resp)){
		//console.log("Respdata recived");
		parseResp(buff);
	}
	
});

XTdevice.on('disconnect', function(err){
	console.log("Error:", err.message);
	XTdevice.close();
	setTimeout(function(){
		console.log("Reconnecting");
		XTdevice.open();
	},900);
});

XTdevice.on('error', function(err){
	XTdevice.close();
	setTimeout(function(){
		console.log("Reconnecting");
		XTdevice.open();
	},900);
});
