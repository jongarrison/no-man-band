(function(noManBand) {

  var midiHelper = require('./lib/midiHelper');
  var noteHelper = require('./lib/noteHelper');
  var _ = require('lodash');
  
  var interval;
  var noteDuration = 1000;
  var cycle = 0;

  console.log("About to start REPL");
  var repl = require("repl");
  
  var util = require('util');
  var replServer = repl.start({
    prompt: "noManBand> ",
    breakEvalOnSigint: true,
    ignoreUndefined: true,
    useGlobal: true,
    useColors: true
  });
  
  var context = replServer.context;
  context.require = require;
  context.module = module;
  context.context = context;
  context.connect = midiHelper.connect;
  context.listOutputPorts = midiHelper.listOutputPorts;
  context.connectVirtualOutput = midiHelper.connectVirtualOutput;
  
  context.BPM = 180;
  context.playImpromptuOn = true;
  context.playScaleOn = false;
  context.playBeatOn = false;
  context.impromptuInputs = [
    ["A", "B", "C", ""],
    ["C", "C", "A", ""]
  ];
  context.impromptuInputsCycle = [
    0, 0, 0, 1
  ];
  context.impromptuOctive = 3;
  
  context.start = () => {
    console.log("Start!");
    var cycleInterval = 1000/(context.BPM/60);
    console.log("cycle interval: ", cycleInterval);
    
    interval = setInterval(context.playCycle, cycleInterval);
  };
  
  context.playCycle =() => {
    cycle++;
    //console.log("PLAY CYCLE: ", cycle);
    
    //these are the steps of the program
  
    if (context.playScaleOn) context.playScale(cycle);
    if (context.playBeatOn) context.playBeat(cycle);
    if (context.playImpromptuOn) context.playImpromptu(cycle);
  }
  
  context.stop = () => {
    console.log("Stop!");
    clearInterval(interval);
  };
  
  context.playScale = (noteIndexStart) => {
    var octave = 4;
    if (typeof noteIndexStart === 'undefined') noteIndexStart = 0;
    
    noteIndexStart = noteIndexStart % noteHelper.scale.length;
    var noteName = noteHelper.scale[noteIndexStart];
    var noteNumber = noteHelper.notes[noteName] + (octave * 12);
    console.log("play note: ", noteName, " from noteIndexStart: ", noteIndexStart);
  
    midiHelper.sendMessage([144, noteNumber, 100]);
  };
  
  context.playBeat = (cycle) => {
    var cyclePosition = cycle % 4; //0 based
    
    const lowOctave = 5;
    const highOctave = 6;
  
    var noteNumber;
    if (cyclePosition === 2) {
      noteNumber = 24 + (lowOctave * 12);
      midiHelper.sendMessage([144, noteNumber, 100]);
  
      console.log("beat cyclePosition:", cyclePosition, " lowOctave");
    } else if (cyclePosition === 3) {
      noteNumber = 24 + (highOctave * 12);
      midiHelper.sendMessage([144, noteNumber, 100]);
  
      console.log("beat cyclePosition:", cyclePosition, " highOctave");
    } else {
      console.log("beat cyclePosition:", cyclePosition, " quiet");
    }
    // setTimeout(function() {
    //   midiHelper.sendMessage([128, noteNumber, 100]);
    // }, delay + 200);
  };
  
  context.flattenImpromptu = () => {
    var result = [];
    _.each(context.impromptuInputsCycle, function(impromptuInput) {
      result = _.concat(result, context.impromptuInputs[impromptuInput]);
    });
    return result;
  };
  
  context.playImpromptu = (cycle) => {
    var inputs = flattenImpromptu();
    
    var cyclePosition = cycle % inputs.length; //0 based
    var cycleNoteName = inputs[cyclePosition];
    
    var noteNumber = noteHelper.notes[cycleNoteName];
    
    if (noteNumber) {
      noteNumber = noteNumber + (context.impromptuOctive * 12);
      console.log("impromptu cyclePosition: ", cyclePosition, " cycleNoteName: ", cycleNoteName);
      midiHelper.sendMessage([144, noteNumber, 100]);
    } else {
      console.log("impromptu cyclePosition: ", cyclePosition, " rest");
    }
  };
  
  context.playOneNoteAndQuit = () => {
    
    var delay = 1000;
    var octave = 4;
    var noteNumber = 24 + (octave * 12);
    
    midiHelper.sendMessage([144, noteNumber, 100]);
    
    setTimeout(function() {
      console.log("Playing one note");
    }, delay);
    
    setTimeout(function() {
      midiHelper.sendMessage([128, noteNumber, 100]);
    }, delay + 200);
    
  };
})(module.exports);
