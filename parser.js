'use strict';

const config = {
	baudRate: 115200,

};

const app = {
	respiration : 0x1423a2d6,
	presence: 0x00288912
};

const appId = {
	resp : [0x26, 0xfe, 0x75, 0x23],
	pres : [0xbe, 0x52, 0x1a, 0x99]
};

const flags = {
	START : 0x7D,
	END : 0x7E,
	ESC : 0x7F
};

const commands ={
	RESET: 0x22,
	LOADAPP: 0x21,
	SETLEDCONTROL: 0x24
};

const ledmode = {
	off : 0x00,
	simple: 0x01,
	full: 0x02
};

const identifiers = {
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

module.exports =  {
	xethruProtocol: function (delimiter) {
    if (Object.prototype.toString.call(delimiter) !== '[object Array]') {
      delimiter = [ delimiter ];
    }
    var buf = [];
    var nextDelimIndex = 0;
    let escape = false;
    return function (emitter, buffer) {
      for (var i = 0; i < buffer.length; i++) {
      	if((buffer[i] !== flags.ESC) && !escape){
        	buf[buf.length] = buffer[i];
        }else{
        	escape=true;
        	console.log("Escape");
        }
        if((buf[buf.length - 1] === delimiter[nextDelimIndex]) && !escape) {
          nextDelimIndex++;
        }
        if(escape){
        	escape=false;
        }
        if (nextDelimIndex === delimiter.length) {
          emitter.emit('data', buf);
          buf = [];
          nextDelimIndex = 0;
        }
      }
    };
	}
}