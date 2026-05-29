# Jetson Probe 20260529T122458Z

```text
HOST=orin
DATE_UTC=2026-05-29T12:24:58Z

Linux orin 5.15.148-tegra #1 SMP PREEMPT Thu Sep 18 15:08:33 PDT 2025 aarch64 aarch64 aarch64 GNU/Linux

               total        used        free      shared  buff/cache   available
Mem:           7.4Gi       1.5Gi       4.6Gi       6.0Mi       1.3Gi       5.6Gi
Swap:          3.7Gi       1.0Gi       2.7Gi

Filesystem      Size  Used Avail Use% Mounted on
/dev/nvme0n1p1  468G   44G  405G  10% /
/dev/nvme0n1p1  468G   44G  405G  10% /

/usr/local/bin/ollama
/usr/sbin/nvidia-smi
/usr/local/bin/jtop

Fri May 29 21:24:58 2026       
+---------------------------------------------------------------------------------------+
| NVIDIA-SMI 540.4.0                Driver Version: 540.4.0      CUDA Version: 12.6     |
|-----------------------------------------+----------------------+----------------------+
| GPU  Name                 Persistence-M | Bus-Id        Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf          Pwr:Usage/Cap |         Memory-Usage | GPU-Util  Compute M. |
|                                         |                      |               MIG M. |
|=========================================+======================+======================|
|   0  Orin (nvgpu)                  N/A  | N/A              N/A |                  N/A |
| N/A   N/A  N/A               N/A /  N/A | Not Supported        |     N/A          N/A |
|                                         |                      |                  N/A |
+-----------------------------------------+----------------------+----------------------+
                                                                                         
+---------------------------------------------------------------------------------------+
| Processes:                                                                            |
|  GPU   GI   CI        PID   Type   Process name                            GPU Memory |
|        ID   ID                                                             Usage      |
|=======================================================================================|
|  No running processes found                                                           |
+---------------------------------------------------------------------------------------+

NAME                             ID              SIZE      MODIFIED   
batiai/gemma4-e2b:q4             eaf2c94f0ed2    3.4 GB    2 days ago    
ternary-bonsai-1.7b-q2:latest    e26e7ff46b18    463 MB    3 days ago    
eslider/bonsai-1.7b:latest       dd4843b3c288    248 MB    3 days ago    
```
