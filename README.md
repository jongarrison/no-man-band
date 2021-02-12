A simple project to play around with midi and generative music.  The recent inspiration is a vague idea that it would be fun to have an OpenSCAD for music. Let's code in that direction.

The project runs as an interactive repl. You can see all of the commands by entering "global"

# Setup

npm install

# Running:

You'll need something that receives midi commands and plays sounds.  [Plogue's Sforzand](https://www.plogue.com/products/sforzando.html) est magnifique.

node noManBand.js

*in the repl*

> listOutputPorts()

    Port: 0 name: IAC Driver Bus 1
    Port: 1 name: sforzando
    Port: 2 name: Bidule  1
    Port: 3 name: Bidule  2
    Port: 4 name: Bidule  3
    Port: 5 name: Bidule  4

> connect(1)

    opened output port 1 name=sforzando

> start()




# Inspiration

* [scribbletune](https://www.npmjs.com/package/scribbletune)
* [woolf-waves](https://github.com/radiodario/woolf-waves)
* [midi](https://www.npmjs.com/package/midi)
