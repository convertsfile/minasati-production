# VOD Engine Filesystem Mount Recommendations

## NVMe Work Directory (`/var/tmp`)

For optimal encoding performance on NVMe, use the following mount options:

### EXT4 (Recommended)
```
UUID=<uuid>  /var/tmp  ext4  defaults,noatime,nodiratime,data=ordered,nodelalloc,commit=30  0  2
```

**Option rationale:**
- `noatime,nodiratime` — eliminates access-time writes on every file read (reduces write amplification)
- `data=ordered` — ensures metadata is written before data (consistency on crash)
- `nodelalloc` — disable delayed allocation (reduces fragmentation for HLS segment writes)
- `commit=30` — flush journal every 30 seconds (reduces write amplification on NVMe)

### XFS (Alternative)
```
UUID=<uuid>  /var/tmp  xfs  defaults,noatime,nodiratime,allocsize=1m,largeio  0  2
```

**Option rationale:**
- `allocsize=1m` — pre-allocate 1 MB extents for large sequential writes (HLS segments)
- `largeio` — optimize for large I/O requests

## Queue Directory (`/var/lib/vod-engine/queue`)

Should be on a separate EXT4 partition or at minimum on the same NVMe with different mount options:

```
UUID=<uuid>  /var/lib/vod-engine  ext4  defaults,noatime  0  2
```

This isolates queue metadata writes from encoding I/O pressure.

## Partition Layout Recommendation

| Mount Point | Size | Filesystem | Purpose |
|-------------|------|------------|---------|
| `/` | 20 GB | ext4 | OS root |
| `/var/tmp` | 75 GB | ext4 (tuned) | Encoding work dir |
| `/var/lib/vod-engine` | 5 GB | ext4 | Queue persistence |
| `/var/log` | 10 GB | ext4 | Logs & crash reports |

Total: ~110 GB (on a 100 GB NVMe, adjust OS root size or increase NVMe).

## Verify Mount Options

```bash
mount | grep /var/tmp
# Should show noatime,nodiratime
```
