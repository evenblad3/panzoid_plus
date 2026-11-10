# Panzoid+
[![web store](https://developer.chrome.com/static/docs/webstore/branding/image/206x58-chrome-web-bcb82d15b2486.png)](https://chromewebstore.google.com/detail/panzoid+/ehnkcfogapldjdcahfdhnfpddedeefpi)<br>
[![users](https://img.shields.io/chrome-web-store/users/ehnkcfogapldjdcahfdhnfpddedeefpi)](https://chromewebstore.google.com/detail/panzoid+/ehnkcfogapldjdcahfdhnfpddedeefpi)

A browser extension for Panzoid Clipmaker 3. It adds 37 visual effects that the editor
does not ship with, and a handful of tweaks that change how Clipmaker itself draws.

## What is in it
**Effects.** Blur and sharpen, colour correction, distortion, generators, perspective and
stylize. They are pasted into your clip as a single inlined shader, so a project that uses
them opens correctly for anyone, with or without the extension installed.

**Tweaks.** These change how Clipmaker runs on your machine and are never written into your
clip. Nobody who opens your project gets them. They need a page reload to take effect, so
save your project before switching one.

Because the tweaks hold on to Clipmaker's own internals, a change on the site can make one
of them stop working until the extension is updated. That is the trade for being able to
fix things the editor does not expose.

**Inspect.** Drop a `.pz` on it and get the media back out. A `.pz` is a gzipped tar: the
project, a small meta file, and every sound, image, font and model stored under the sha256
of its contents rather than under its name. Inspect reads the project to put the real names
back, and rebuilds models as `.obj`.

## Firefox
There is no Firefox port and I am not planning one. The tweaks run as a main world content
script reaching into Clipmaker's internals, and keeping that working against one browser is
already enough.

## Contributing
The extension is open for contribution. The main branch of development is
[github.com/evenblad3/panzoid_plus](https://github.com/evenblad3/panzoid_plus). That link
may move, so I am not promising it stays valid.

Effects are data. An effect is one `.effect` file of GLSL in `blobs/effects/` plus one
entry in `blobs/effects.json` describing its controls. There is no build step: the shader
is assembled, pruned and minified in the browser at the moment you paste it.

## What is planned
Tweaks that fix the bugs in Clipmaker that have been sitting there for seven years or more
and were never going to be fixed upstream.

## Licence
LGPL-3.0-or-later. See [LICENSE](LICENSE).
