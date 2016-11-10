tracker-search-provider
=======================

__Gnome-shell extension__: displays tracker search results in the shell overview


## Description
When in overview mode of gnome-shell, everytime you enter a string, the shell displays found results for you.
This can be programs, contacts etc.
This extension displays the results, which the tracker framework delivers - obviously, you need a working tracker framework (https://wiki.gnome.org/Projects/Tracker).

It is only invoked, for searches (=string length) above 2 characters.

This extension is derived from https://github.com/cewee/tracker-search.
Since it looks like it was abandoned, I completely refactored it to work again in gnome-shell 3.10 onward.


## Usage
Just open the gnone-shell overview and start typing. When your typed word is longer than 2 chars, the tracker database os searched and the results displayed.

You can also only search specific file types: You use this by typing 
* 'v myvideoname...' -> v means to display only videos
* 'i mystrangeimagename....' -> i means to display only images
* 'm somemusicfile..' -> m means to display only audio files


## Installation
To install, simply copy the 3 files into a directory '~/.local/share/gnome-shell/extensions/tracker-search-provider@sinnix.de'
(the directory 'tracker-search-provider@sinnix.de' has to be created first).
Then reload your shell (you can also logout/login) and acitvate it with gnome-tweak-tool or the extensions website.
Be sure you have the tracker framework installed and running and you have installed the GObject introspection (gir1.2-tracker package).
You do also need tracker-needle.

Please feel free to contribute (especially for displaying the results itself)
