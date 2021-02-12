((midiHelper) => {
  //see: https://github.com/justinlatimer/node-midi
  //see: https://www.npmjs.com/package/midi
  
  var midi = require('midi');
  var midiOut = new midi.output();

  midiHelper.listOutputPorts = () => {
    console.log(`listOutputPorts portCount=${midiOut.getPortCount()}`);

    for (let i = 0; i < midiOut.getPortCount(); i++) {
      console.log(`Port: ${i} name: ${midiOut.getPortName(i)}`)
    }
  };

  midiHelper.connectVirtualOutput = () => {
    midiOut.openVirtualPort('nomanband');
    console.log("Opened output virtual port");
  };

  midiHelper.connect = (portNumber = 0) => {
    try {
      // midiOut.getPortCount();  
      midiOut.openPort(portNumber);
      console.log(`opened output port ${portNumber} name=${midiOut.getPortName(portNumber)}`)
    } catch(error) {
      console.error(error);
    }
  } //end connect

  // midiHelper.connectInput = () => {
  //       // Set up a new input.
  //       var input = new midi.input();
  
  //       // Count the available input ports.
  //         input.getPortCount();
        
  //       // Get the name of a specified input port.
  //         input.getPortName(0);
        
  //       // Configure a callback.
  //         input.on('message', function(deltaTime, message) {
  //           // The message is an array of numbers corresponding to the MIDI bytes:
  //           //   [status, data1, data2]
  //           // https://www.cs.cf.ac.uk/Dave/Multimedia/node158.html has some helpful
  //           // information interpreting the messages.
  //           //console.log('on message: m:' + message + ' d:' + deltaTime);
            
  //           /*
  //           switch (message[0]) {
  //             case 250:
  //               play();
  //               break;
  //             case 251:
  //               play();
  //               break;
  //             case 252:
  //               stop();
  //               break;
  //             default:
  //               break;
  //           }
  //           */
            
  //         });
        
  //         // Open the first available input port.
  //         input.openPort(0);
              
  // }


  midiHelper.sendMessage = (message) => {
    // The message is an array of numbers corresponding to the MIDI bytes:
    //   [status, data1, data2]
    // https://www.cs.cf.ac.uk/Dave/Multimedia/node158.html has some helpful
    // information interpreting the messages.
  
    //console.log("midiOut.sendMessage: ", message);
    midiOut.sendMessage(message);
  }

})(module.exports);