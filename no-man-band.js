(function(musicMachine) {
  /*
  JG notes, A new project should be started based on this one.  My notes should mention
  woolf waves as inspiration, but the project should be its own with the changes I've made
  
  - The project should include scribbletunes as a dependency and be able to generate scribble tunes midi based
    sections in real time
    
  - Should experiment with multichannel midi.  Is it possible that each instrument in garage band is another
    channel?  Try adding some drums.
    
  - musicMachine already has some channels, but they should be numbered and nickname-able
    
  - sessions should be saveable to project directories, each channel being its own midi file
  
  - 
   */


  var midiHelper = require('./lib/midiHelper');
  var noteHelper = require('./lib/noteHelper');
  var _ = require('lodash');
  
  var interval;
  var noteDuration = 1000;
  var cycle = 0;
  
  
  musicMachine.BPM = 180;
  musicMachine.playImpromptuOn = true;
  musicMachine.playScaleOn = false;
  musicMachine.playBeatOn = false;
  musicMachine.impromptuInputs = [
    ["A", "B", "C", ""],
    ["C", "C", "A", ""]
  ];
  musicMachine.impromptuInputsCycle = [
    0, 0, 0, 1
  ];
  musicMachine.impromptuOctive = 3;
  
  
  musicMachine.start = function() {
    console.log("Start!");
    var cycleInterval = 1000/(musicMachine.BPM/60);
    console.log("cycle interval: ", cycleInterval);
    
    interval = setInterval(playCycle, cycleInterval);
  };
  
  function playCycle() {
    cycle++;
    //console.log("PLAY CYCLE: ", cycle);
    
    //these are the steps of the program
  
    if (musicMachine.playScaleOn) playScale(cycle);
    if (musicMachine.playBeatOn) playBeat(cycle);
    if (musicMachine.playImpromptuOn) playImpromptu(cycle);
  }
  
  musicMachine.stop = function() {
    console.log("Stop!");
    clearInterval(interval);
  };
  
  function playScale(noteIndexStart) {
    var octave = 4;
    if (typeof noteIndexStart === 'undefined') noteIndexStart = 0;
    
    noteIndexStart = noteIndexStart % noteHelper.scale.length;
    var noteName = noteHelper.scale[noteIndexStart];
    var noteNumber = noteHelper.notes[noteName] + (octave * 12);
    console.log("play note: ", noteName, " from noteIndexStart: ", noteIndexStart);
  
    midiHelper.sendMessage([144, noteNumber, 100]);
  }
  
  function playBeat(cycle) {
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
  }
  
  function flattenImpromptu() {
    var result = [];
    _.each(musicMachine.impromptuInputsCycle, function(impromptuInput) {
      result = _.concat(result, musicMachine.impromptuInputs[impromptuInput]);
    });
    return result;
  }
  
  function playImpromptu(cycle) {
    var inputs = flattenImpromptu();
    
    var cyclePosition = cycle % inputs.length; //0 based
    var cycleNoteName = inputs[cyclePosition];
    
    var noteNumber = noteHelper.notes[cycleNoteName];
    
    if (noteNumber) {
      noteNumber = noteNumber + (musicMachine.impromptuOctive * 12);
      console.log("impromptu cyclePosition: ", cyclePosition, " cycleNoteName: ", cycleNoteName);
      midiHelper.sendMessage([144, noteNumber, 100]);
    } else {
      console.log("impromptu cyclePosition: ", cyclePosition, " rest");
    }
  }
  
  function playOneNoteAndQuit() {
    
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
    
    // setTimeout(function() {
    //   console.log("Quitting...");
    //   process.exit(0);
    // }, delay * 3);
  }
  
  
  
  
  console.log("jg-player starting...");
  //play();
  //playScale();
  //playOneNote();
  
  console.log("About to start REPL");
  var repl = require("repl");
  
  var util = require('util');
  var replServer = repl.start({
    prompt: "musicMachine> ",
    breakEvalOnSigint: true,
    ignoreUndefined: true,
    useGlobal: true,
    useColors: true
  });
  
  var context = replServer.context;
  context.require = require;
  context.module = module;
  context.mm = musicMachine;
  context.context = context;
  context.connect = midiHelper.connect;
  context.listOutputPorts = midiHelper.listOutputPorts;
  context.connectVirtualOutput = midiHelper.connectVirtualOutput;

})(module.exports);
