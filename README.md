A simple project to play around with midi and generative music.  The recent inspiration is a vague idea that it would be fun to have an OpenSCAD for music. Let's code in that direction.

The project runs as an interactive repl. You can see all of the commands by entering "global"

# Setup

\$ npm install

# Running:

You'll need something that receives midi commands and plays sounds.  [Plogue's Sforzand](https://www.plogue.com/products/sforzando.html) est magnifique.

*from the commandline:*

\$ node noManBand.js

*now in the no-man-band repl:*

\$ listOutputPorts()

    Port: 0 name: IAC Driver Bus 1
    Port: 1 name: sforzando
    Port: 2 name: Bidule  1

\$ connect(1)

    opened output port 1 name=sforzando

\$ start()
 
# Inspiration

* [scribbletune](https://www.npmjs.com/package/scribbletune)
* [woolf-waves](https://github.com/radiodario/woolf-waves)
* [midi](https://www.npmjs.com/package/midi)
