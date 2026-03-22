const midi = require("@julusian/midi");

function getPorts() {
  const probe = new midi.Output();
  const count = probe.getPortCount();
  const ports = [];
  for (let i = 0; i < count; i++) {
    ports.push({ index: i, name: probe.getPortName(i) });
  }
  probe.closePort();
  return ports;
}

function createOutput(label) {
  const tag = label || "output";
  const midiOut = new midi.Output();
  let connectedPort = null;
  let connectedName = null;

  return {
    isConnected: () => connectedPort !== null,
    getConnectedPort: () => connectedPort,

    sendMessage: (message) => {
      if (connectedPort === null) return;
      midiOut.sendMessage(message);
    },

    connect: (portNumber = 0) => {
      try {
        if (connectedPort !== null) {
          console.log(
            `[${tag}] closing port ${connectedPort} (${connectedName})`,
          );
          midiOut.closePort();
          connectedPort = null;
          connectedName = null;
        }

        const count = midiOut.getPortCount();
        console.log(`[${tag}] sees ${count} ports:`);
        for (let i = 0; i < count; i++) {
          console.log(`[${tag}]   ${i}: ${midiOut.getPortName(i)}`);
        }

        const name = midiOut.getPortName(portNumber);
        console.log(`[${tag}] opening port ${portNumber} (${name})`);
        midiOut.openPort(portNumber);
        connectedPort = portNumber;
        connectedName = name;
        console.log(`[${tag}] connected to port ${portNumber} (${name})`);
        return { ok: true, port: portNumber, name };
      } catch (error) {
        console.error(`[${tag}] connect error:`, error.message);
        connectedPort = null;
        connectedName = null;
        return { ok: false, error: error.message };
      }
    },

    disconnect: () => {
      console.log(
        `[${tag}] disconnecting from port ${connectedPort} (${connectedName})`,
      );
      try {
        midiOut.closePort();
      } catch (e) {
        // ignore
      }
      connectedPort = null;
      connectedName = null;
    },
  };
}

module.exports = { getPorts, createOutput };
