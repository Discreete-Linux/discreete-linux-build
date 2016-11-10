# discreete-linux-build
Config tree required for building Discreete Linux

This is the config tree required for building your own image of Discreete Linux using live-build.

Building has only been tested on Debian 8; building on other versions of Debian or Debian derivatives like Ubuntu 
may be possible with some tweaks; but has not been tested. If you want to build on other systems including Windows, 
there are plenty of pre-built Debian Appliances for various virtualization platforms out there.

The configuration pulls in a number of packages from our own apt repository which are required to achieve the
functionality of Discreete Linux. If you want to look at the sources, you can either download the sources from
the same repository (deb https://www.discreete-linux.org/repository jessie main) or take a look at the git repositories here.

The configuration also includes a pre-built binary of VeraCrypt. You may prefer to build your own binary from sources,
see "Building VeraCrypt from Source" below.

Our repository also includes a binary image of a patched kernel which is vital for Discreete Linux. The kernel patch makes 
sure that Discreete Linux cannot access any internal hard drive. Since kernel images are update quite frequently, 
we do *not* include any sources or git repo for this kernel image. Instead we tell you how to build your own, see below. 

## Requirements

First off, you will need to get our customized version of live-build from 
[here](https://www.discreete-linux.org/repository/pool/main/l/live-build/live-build_20161103dsctl1_all.deb)
or build it from git sources [here](https://github.com/Discreete-Linux/live-build). This version supports
UEFI booting, see the README for more details.

## Building Discreete Linux

Download the config tree, cd to it and run:
`lb clean`
as root, followed by
`lb build`

Building will take some time, depending on your machine and internet connection. At the end, you should get a file named
`live.image.hybrid.iso`. This is a so-called ISOhybrid image which can be written to DVD as well as USB-Drives or SD cards.
For the latter, you can use dd like
`dd if=live.image.hybrid.iso of=/dev/sdX bs=1M`.
Be **very** careful what you type for /dev/sdX, you can overwrite your hard drive without further warning!

## Building VeraCrypt from Source

1. Get VeraCrypt Linux Sources and the signature from https://veracrypt.codeplex.com/ and be sure to verify the signature!
2. Unpack the sources
3. Install build requirements with
`apt-get install make gcc g++ nasm libfuse-dev makeself libwxgtk3.0-dev pkg-config`
4. `cd` to the source dir and run `make`

## Building the kernel image

1. Get the debian sources of the kernel you want to patch. This will in most cases be either the latest kernel 
from jessie-backports (a dependency of https://packages.debian.org/jessie-backports/linux-image-amd64) or the latest
stable kernel from jessie (https://packages.debian.org/jessie/linux-image-amd64). If you choose the kernel 
from jessie-backports, you will want the *unsigned* variant. We will tell you how to build a signed kernel image once
we have got it working ourselves ;-). You should end up with three files called linux_4.x*.dsc resp. linux_3.16*.dsc,
a corresponding *.orig.tar.xz and *.debian.tar.xz
2. Unpack the sources with `dpkg-source -x *.dsc`
3. Install all build dependencies as outlined in the *.dsc file, as well as libncurses5-dev and quilt.
4. Copy the patch from here to `debian/patches/libata.patch`
5. Run these commands in order:
   * `sed -i 's/^abiname: .*/abiname: dsctl1/' debian/config/defines`
   * `echo "libata.patch" >> debian/patches/series`
   * `quilt push -a`
   * `debian/rules clean`
   * `debian/rules clean` (yes, again!)
   * `fakeroot make -f debian/rules.gen setup_amd64_none_amd64`
   * `make -C debian/build/build_amd64_none_amd64 nconfig`
6. Within the nconfig menu, turn the following **off**:
   * Device drivers -> IEEE1394
   * Device drivers -> SCSI device support -> SCSI low-level drivers 
   * Device drivers -> SCSI device support -> PCMCIA SCSI adapter support
   * Device drivers -> SCSI device support -> SCSI Device Handlers
   * Device drivers -> Network device drivers
   * Networking support -> Amateur radio
   * Networking support -> IrDA (infrared) subsystem support
   * Networking support -> Bluetooth subsystem support
   * Networking support -> Wireless
   * Networking support -> WiMax
   * Networking support -> NFC subsystem
7. Now run:
   * `fakeroot debian/rules source`
   * `fakeroot make -f debian/rules.gen binary-arch_amd64_none_amd64`
   * `fakeroot make -f debian/rules.gen binary-arch_amd64_none_real`
