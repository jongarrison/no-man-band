const { conforms } = require("lodash");

(function(noManBand) {

  const repl = require("repl");  
  const vm = require('vm'); //see: https://nodejs.org/api/vm.html#vm_script_runincontext_contextifiedobject_options
  const midiHelper = require('./lib/midiHelper');
  const noteHelper = require('./lib/noteHelper');
  const util = require('util');
  const _ = require('lodash');
  
  let replLog;
  let musicTimingInterval;
  let noteDuration = 1000;
  let cycle = 0;

  console.log("About to start REPL");
  const replServer = repl.start({
    prompt: "noManBand$ ",
    breakEvalOnSigint: false, //Can't be true if "eval" is overriden
    useGlobal: false, //Can't be true if "eval" is overriden
    terminal: true,
    ignoreUndefined: true,
    useColors: true,
    eval: (cmd, evalContext, filename, callback) => {
      try {
        const script = new vm.Script(cmd);
        let result = script.runInContext(evalContext);

        Promise.resolve(result)
            .then(async () => {

              if (!_.isEmpty(result) && result.hasOwnProperty("then")) {
                await result;
              }

              callback(null, result);
              replServer.displayPrompt();
            })
            .catch((error) => {
              console.error("Error while evaluating repl:");
              console.error(error);
              callback(error);
              replServer.displayPrompt();
            });

      } catch (e) {
        console.error("Uncaught error:");
        console.error(e);
        callback(e);
      }
    },
  });

  const context = replServer.context;
  context.console.log = (msg) => {
    //This approach is based on: https://stackoverflow.com/questions/28683743/adjust-node-repl-to-not-clobber-prompt-on-async-callback/63121427#63121427
    const promptOffset = replServer._prompt.length + replServer.line.length;
    replServer.output.write('\033[2K\033[1G'); // Erase to beginning of line, and reposition cursor at beginning of line
    replServer.output.write(msg + "\n");
    replServer.output.write('' + replServer._prompt + replServer.line); // Redraw existing line
    replServer.output.write('\033[' + (promptOffset + 1) + 'G'); // Move the cursor to where it was

    //This needs to be called with: context.console.log or the replLog shortcut
  };
  replLog = context.console.log;

  context.require = require;
  context.module = module;
  //context.context = context;
  context.connect = midiHelper.connect;
  context.listOutputPorts = midiHelper.listOutputPorts;
  context.list = midiHelper.listOutputPorts;
  context.connectVirtualOutput = midiHelper.connectVirtualOutput;
  
  const conf = {
    BPM: 180,
    playImpromptuOn: true,
    playScaleOn: false,
    playBeatOn: false,
    impromptuInputs: [
      ["A", "B", "C", ""],
      ["C", "C", "A", ""]
    ],
    impromptuInputsCycle: [
      0, 0, 0, 1
    ],
    impromptuOctive: 3,
  };
  context.conf = conf;

  //Add functions for toggling the active musical approach
  context.i = () => {
    conf.playImpromptuOn = !conf.playImpromptuOn;
  };
  context.b = () => {
    conf.playBeatOn = !conf.playBeatOn;
  };
  context.s = () => {
    conf.playScaleOn = !conf.playScaleOn;
  };
  
  context.start = () => {
    replLog("Start!");
    const cycleInterval = 1000/(conf.BPM/60);
    replLog("cycle interval: ", cycleInterval);
    
    musicTimingInterval = setInterval(context.playCycle, cycleInterval);
  };
  
  context.playCycle =() => {
    cycle++;      
    if (conf.playScaleOn) context.playScale(cycle);
    if (conf.playBeatOn) context.playBeat(cycle);
    if (conf.playImpromptuOn) context.playImpromptu(cycle);
  }
  
  context.stop = () => {
    replLog("Stop!");
    clearInterval(musicTimingInterval);
  };
  
  context.playScale = (noteIndexStart) => {
    const octave = 4;
    if (typeof noteIndexStart === 'undefined') noteIndexStart = 0;
    
    noteIndexStart = noteIndexStart % noteHelper.scale.length;
    const noteName = noteHelper.scale[noteIndexStart];
    const noteNumber = noteHelper.notes[noteName] + (octave * 12);
    replLog(`play note=${noteName} from noteIndexStart ${noteIndexStart}`);
  
    midiHelper.sendMessage([144, noteNumber, 100]);
  };
  
  context.playBeat = (cycle) => {
    const cyclePosition = cycle % 4; //0 based
    
    const lowOctave = 5;
    const highOctave = 6;
  
    let noteNumber;
    if (cyclePosition === 2) {
      noteNumber = 24 + (lowOctave * 12);
      midiHelper.sendMessage([144, noteNumber, 100]);
  
      replLog(`beat cyclePosition=${cyclePosition} lowOctave`);
    } else if (cyclePosition === 3) {
      noteNumber = 24 + (highOctave * 12);
      midiHelper.sendMessage([144, noteNumber, 100]);
  
      replLog(`beat cyclePosition=${cyclePosition} highOctave`);
    } else {
      replLog(`beat cyclePosition=${cyclePosition} quiet`);
    }
    // setTimeout(function() {
    //   midiHelper.sendMessage([128, noteNumber, 100]);
    // }, delay + 200);
  };
  
  context.flattenImpromptu = () => {
    //replLog(`flattenImpromptu`);
    let result = [];
    _.each(conf.impromptuInputsCycle, function(impromptuInput) {
      result = _.concat(result, conf.impromptuInputs[impromptuInput]);
    });
    return result;
  };
  
  context.playImpromptu = (cycle) => {
    //replLog(`playImpromptu`);
    const inputs = context.flattenImpromptu();
    
    const cyclePosition = cycle % inputs.length; //0 based
    const cycleNoteName = inputs[cyclePosition];
    
    let noteNumber = noteHelper.notes[cycleNoteName];
    
    if (noteNumber) {
      noteNumber = noteNumber + (conf.impromptuOctive * 12);
      replLog(`impromptu cyclePosition=${cyclePosition} cycleNoteName=${cycleNoteName}`);
      midiHelper.sendMessage([144, noteNumber, 100]);
    } else {
      replLog(`impromptu cyclePosition=${cyclePosition} rest`);
    }
  };
  
  context.playNote = () => {
    //replLog(`playNote`);
    
    const delay = 1000;
    const octave = 4;
    const noteNumber = 24 + (octave * 12);
    
    midiHelper.sendMessage([144, noteNumber, 100]);
    
    setTimeout(function() {
      replLog("Playing one note");
    }, delay);
    
    setTimeout(function() {
      midiHelper.sendMessage([128, noteNumber, 100]);
    }, delay + 200);
    
  };

  //Set the user up to connect quickly...
  context.listOutputPorts();
  replServer.displayPrompt();
})(module.exports);
