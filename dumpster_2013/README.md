## Running *The Dumpster* (2013 Kiosk Version)

2024 revised version of The Dumpster (2013 Kiosk Version). Compiles with Processing v.4.3. Runs at 1280x800 resolution within a fullscreen app.

---

#### Installing Processing

It may (or may not) be necessary to install Processing v.4.3 on your computer. This can be obtained from: 

* [https://processing.org/download](https://processing.org/download). Version 4.3 is known to work. 
* Uncompress `data.zip` so that there is a folder, `TheDumpster/data`
* Click on `TheDumpster.pde` to open the project in Processing. 
* You may or may not need to modify the dimensions in the `setup()` function in line 24 of `TheDumpster.pde`. 


In Processing, to export application versions of the project, 

* File > Export Application ...
* Check "macOS (Intel 64-bit)" under Platforms
* Check "macOS (Apple Silicon)" under Platforms
* Check "Presentation Mode" under Fullscreen
* Do **not** check "Show a Stop button"
* Check "Include Java" under Embed Java
* Export apps

---

#### Installation for Mac Silicon

To run the app exported for Mac Silicon (*preferred*), it may be necessary to install Java 17 on your computer. This can be obtained from:

* [https://www.oracle.com/java/technologies/downloads/#jdk17-mac](https://www.oracle.com/java/technologies/downloads/#jdk17-mac), specifically the DMG:
* [https://download.oracle.com/java/17/latest/jdk-17_macos-aarch64_bin.dmg](https://download.oracle.com/java/17/latest/jdk-17_macos-aarch64_bin.dmg) for ARM Silicon (M1 etc).

Now, launch the ARM program `/Dumpster_2013/macos-aarch64/TheDumpster.app`

---

#### Installation for Intel Mac

To run the app exported for Intel x86 Macs, it may be necessary to install Rosetta 2 on your computer. 

* Simply launching the x86 app will prompt the user to install Rosetta. Clicking “Install” will then install the Rosetta 2 software onto the Mac.
* Alternatively, you can install Rosetta using the Terminal with the command `softwareupdate --install-rosetta` or `/usr/sbin/softwareupdate --install-rosetta --agree-to-license`

Now, launch the x86 program `/Dumpster_2013/macos-x86_64/TheDumpster.app`

---