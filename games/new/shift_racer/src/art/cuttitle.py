# Builds ../title.js (window.SRTITLE: the start-screen painting as a data URI) from the approved painting.
import os
from cutlib import load, uri, HERE
im=load('title_1.b64'); out=os.path.join(HERE,'..','title.js')
open(out,'w').write('/* built by art/cuttitle.py from the approved start-screen painting. Do not edit by hand. */\nwindow.SRTITLE="'+uri(im,84)+'";\n'); print(im.size,os.path.getsize(out)//1024,'KB')
