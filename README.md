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
[here](https://www.discreete-linux.org/repository/pool/main/l/live-build/live-build_20160105dsctl1_all.deb)
or build it from git sources [here](https://github.com/Discreete-Linux/live-build). This version supports
UEFI booting, see the README for more details.

Then you need our PGP key which we use for signing. It is called "Discreete Linux signing key (2016) <info@discreete-linux.org>" and has the Key-ID 0xBA146BB0759613AC. You can retrieve it from any keyserver of the PGP keyserver network, like [here](https://pgp.mit.edu/pks/lookup?op=get&search=0xBA146BB0759613AC). Please verify the fingerprint of the key, it should be:
`66EC DC50 8027 3FDE E705 9071 BA14 6BB0 7596 13AC`
### A Note about our PGP keys

In addition to the signing key, there are two other keys of the Discreete Linux team:

1. "Discreete Linux communication key (2016) <info@discreete-linux.org>", Key-ID 0xCCA41CE3DBAFE0E2, Fingerprint `FFD8 8A62 59BC 7E8C 3B73 2EB CCA4 1CE3 DBAF E0E2`
2. "Discreete Linux automated signing key (2016-11) <info@discreete-linux.org>", Key-ID 0x9F11A473751FCD02, Fingerprint `C44F 6A9D 8C5F DC3A 1292 B8C 9F11 A473 751F CD02`

Why do we do this? The signing key is used for signing releases, repositories etc. only; the secret key is on a separate keyring on a separate, permanently offline machine which is only used for that purpose. The communication key is also only used offline in a Discreete environment, but the secret key, by it's nature, is in a keyring which we use on a daily basis. The automated signing key is used for signing individual packages and changelog entries, github commits etc. These are automated processes, the key resides on an online system.

## Building Discreete Linux

Download/checkout the config tree:

`git clone --branch v2016.01-beta1 https://github.com/Discreete-Linux/discreete-linux-build.git`

cd to it and verify the signature of the checksum file:

`gpg --verify SHA512SUM.asc SHA512SUM`

Then verify the checksums:

`sha512sum -c SHA512SUM`

Now, just to be sure, run:

`lb clean`

as root, followed by

`lb build`

Building will take some time, depending on your machine and internet connection. At the end, you should get a file named
`live.image.hybrid.iso`. This is a so-called ISOhybrid image which can be written to DVD as well as USB-Drives or SD cards.
For the latter, you can use dd like
`dd if=live.image.hybrid.iso of=/dev/sdX bs=1M`.
Be **very** careful what you type for /dev/sdX, you can overwrite your hard drive without further warning!

## Building VeraCrypt from Source

For verifying the Veracrypt sources, you need the PGP key called "VeraCrypt Team <veracrypt@idrix.fr>" with Key-ID 0xEB559C7C54DDD393.

1. Get VeraCrypt Linux Sources and the signature from https://veracrypt.codeplex.com/
2. Verify the signature like `gpg --verify VeraCrypt_1.19_Source.tar.gz.sig VeraCrypt_1.19_Source.tar.gz`
3. Unpack the sources
4. Install build requirements with
`apt-get install make gcc g++ nasm libfuse-dev makeself libwxgtk3.0-dev pkg-config`
5. `cd` to the source dir and run `make`

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
