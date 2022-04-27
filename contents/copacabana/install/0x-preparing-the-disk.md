<style>
  h2 {
    margin-top: 24px;
    border-bottom: 1px solid;
  }

  code {
    color: #ccc;
    font-family: monospace;
    font-size: 95%;
  }

  .cmd-box {
    background: #333;
    color: #fff;
    font-family: monospace;
    font-size: 95%;
    padding: 10px;
  }

  .cmd-box code {
    display: block;
    color: #fff;
  }

  .cmd-box code.nl::before {
    content: "root # ";
    font-weight: bold;
    background: linear-gradient(90deg, #ef2929 70%, royalblue 50%);
    -webkit-background-clip: text;
    color: transparent;
  }

  .cmd-box .comment {
    color: slategray;
  }
</style>

<h1>Preparing the disk</h1>

<!-- Block devices start -->
<h2>Block devices</h2>

<p>Before starting let's look at the types of the devices and how their
  are labeled in a Linux System.
</p>

<p>SCSI and Serial ATA (Often called SATA) drives like are both labeled under device handles such as:
  <code>/dev/sda</code>,
  <code>/dev/sdb</code>,
  <code>/dev/sdc,</code> etc.
</p>

<p>PCI Express based NVMe solid state disks have
  device handles such as
  <code>/dev/nvme0n1</code>,
  <code>/dev/nvme0n2</code>, etc.
</p>

<table style="border: 1px solid">
  <tbody>
    <tr style="background-color:#1A3060">
      <th>Type of device</th>
      <th>Default device handle</th>
    </tr>
    <tr>
      <td>SATA, SAS, SCSI, or USB flash</td>
      <td><code>/dev/sda</code></td>
    </tr>
    <tr>
      <td>NVM Express (NVMe)</td>
      <td><code>/dev/nvme0n1</code></td>
    </tr>
    <tr>
      <td>MMC, eMMC, and SD</td>
      <td><code>/dev/mmcblk0</code></td>
    </tr>
    <tr>
      <td>Virtual disk</td>
      <td><code>/dev/vda</code></td>
    </tr>
  </tbody>
</table>

<p>To list the devices connected to your machine</p>

<div class="cmd-box">
  <code class="nl">fdisk -l</code>
  <code>
    Disk /dev/sda: <span class="comment">#size</span> GiB, 
    <span class="comment">#size-in-bytes</span> bytes, 
    <span class="comment">#size</span> sectors<br>
    Disk model: <span class="comment">#device-model</span><br>
    Units: sectors of 1 * 512 = 512 bytes<br>
    Sector size (logical/physical): 512 bytes / 512 bytes<br>
    I/O size (minimum/optimal): 512 bytes / 512 bytes<br>
    Disklabel type: <span class="comment">#mbr / gpt</span><br>
    Disk identifier: <span class="comment">#device identifier</span>
  </code>
</div>

<p>If you have a lot of devices connected and it doesn't fit all the
  information on the screen you can run
</p>

<div class="cmd-box">
  <code class="nl">fdisk -l | less</code>
  <code>
    <span class="comment">
      #Use the keyboard arrows for navigate and press "q" for exit
    </span>
  </code>
</div>

<!-- Block devices end -->

<!-- Partition Table start -->

<h2>Partition Table</h2>

<p>There are 2 types of partition table,
  the BIOS legacy using MBR and UEFI using GPT.
</p>

<p>The example below shows a basic and minimal
  partition scheme. The swap partition is optional
  but very recommended for prevents system crashes
  when you pass the RAM's usage limits.
</p>

<br>
<p>Bios whith MBR basic partition scheme:</p>

<table style="border: 1px solid">
  <tbody>
    <tr style="background-color:#1A3060">
      <th>Size</th>
      <th>Type</th>
      <th>File system</th>
      <th>Mount point</th>
    </tr>
    <tr>
      <th>optional</th>
      <th>Linux swap / Solaris</th>
      <th>(swap)</th>
      <th>none</th>
    </tr>
    <tr>
      <th>size left</th>
      <th>Linux</th>
      <th>ext4 (or btrfs, xfs, jfs, f2fs)</th>
      <th>/</th>
    </tr>
  </tbody>
</table>

<br>
<p>UEFI whith GPT basic partition scheme:</p>

<table style="border: 1px solid">
  <tbody>
    <tr style="background-color:#1A3060">
      <th>Size</th>
      <th>Type</th>
      <th>File system</th>
      <th>Mount point</th>
    </tr>
    <tr>
      <th>>= 512 MiB</th>
      <th>EFI System</th>
      <th>fat32</th>
      <th>/boot</th>
    </tr>
    <tr>
      <th>optional</th>
      <th>Linux swap</th>
      <th>(swap)</th>
      <th>none</th>
    </tr>
    <tr>
      <th>size left</th>
      <th>Linux</th>
      <th>ext4 (or btrfs, xfs, jfs, f2fs)</th>
      <th>/</th>
    </tr>
  </tbody>
</table>

<p>The /boot partition whith fat32 filesystem is required to boot the system in a UEFI machine.</p>

<p>If you want to compile the source code of Copacabana Linux is extremely recommended you split the root partition in some other parts to prevent some issues.</p>

<p>Split the root partition is a good way to backup your system if you have some problems.</p>

<p>See a basic example</p>

<table style="border: 1px solid">
  <tbody>
    <tr style="background-color:#1A3060">
      <th>Mount point</th>
      <th>Generic size</th>
    </tr>
    <tr>
      <th>/</th>
      <th>size left</th>
    </tr>
    <tr>
      <th>/boot</th>
      <th>512 MiB</th>
    </tr>
    <tr>
      <th>/var</th>
      <th>10 %</th>
    </tr>
    <tr>
      <th>/opt</th>
      <th>15 %</th>
    </tr>
    <tr>
      <th>/usr</th>
      <th>50 %</th>
    </tr>
  </tbody>
</table>

<p>For more information about how to prepare the dis for compile the source code see: build/groundwork/#Creating and mounting the virtual disk image</p>

<!-- Partition Table end -->
