=== RUN   TestHealthLiveProbe
--- PASS: TestHealthLiveProbe (0.00s)
=== RUN   TestHealthReadyProbe
--- PASS: TestHealthReadyProbe (0.00s)
=== RUN   TestHealthStartupProbe
--- PASS: TestHealthStartupProbe (0.00s)
=== RUN   TestHealthDefault
--- PASS: TestHealthDefault (0.00s)
=== RUN   TestHealthDefaultResponseContainsResources
--- PASS: TestHealthDefaultResponseContainsResources (0.00s)
=== RUN   TestHealthProbeInvalid
--- PASS: TestHealthProbeInvalid (0.00s)
PASS
ok  	github.com/a_ashraf_tech/vod-engine/internal/api/handlers	0.087s
?   	github.com/a_ashraf_tech/vod-engine/internal/api/middlewares	[no test files]
?   	github.com/a_ashraf_tech/vod-engine/internal/auth	[no test files]
?   	github.com/a_ashraf_tech/vod-engine/internal/b2	[no test files]
=== RUN   TestNewCircuitBreaker_InitialState
--- PASS: TestNewCircuitBreaker_InitialState (0.00s)
=== RUN   TestCircuitBreaker_CLOSEDToOpen
2026/07/08 14:58:02 INFO circuit_breaker.state_change service=test from=closed to=open
2026/07/08 14:58:02 WARN circuit_breaker.opened service=test failure_count=3 threshold=3 critical=true
--- PASS: TestCircuitBreaker_CLOSEDToOpen (0.00s)
=== RUN   TestCircuitBreaker_OpenFastFails
2026/07/08 14:58:02 INFO circuit_breaker.state_change service=test from=closed to=open
2026/07/08 14:58:02 WARN circuit_breaker.opened service=test failure_count=1 threshold=1 critical=true
--- PASS: TestCircuitBreaker_OpenFastFails (0.00s)
=== RUN   TestCircuitBreaker_OpenToHalfOpen
2026/07/08 14:58:02 INFO circuit_breaker.state_change service=test from=closed to=open
2026/07/08 14:58:02 WARN circuit_breaker.opened service=test failure_count=1 threshold=1 critical=true
2026/07/08 14:58:02 INFO circuit_breaker.state_change service=test from=open to=half_open
2026/07/08 14:58:02 INFO circuit_breaker.state_change service=test from=half_open to=open
2026/07/08 14:58:02 WARN circuit_breaker.opened service=test failure_count=2 threshold=1 critical=true
--- PASS: TestCircuitBreaker_OpenToHalfOpen (0.10s)
=== RUN   TestCircuitBreaker_HalfOpenToClosed
2026/07/08 14:58:02 INFO circuit_breaker.state_change service=test from=closed to=open
2026/07/08 14:58:02 WARN circuit_breaker.opened service=test failure_count=1 threshold=1 critical=true
2026/07/08 14:58:02 INFO circuit_breaker.state_change service=test from=open to=half_open
2026/07/08 14:58:02 INFO circuit_breaker.state_change service=test from=half_open to=closed
2026/07/08 14:58:02 INFO circuit_breaker.recovered service=test message="Circuit closed after successful probe"
--- PASS: TestCircuitBreaker_HalfOpenToClosed (0.10s)
=== RUN   TestCircuitBreaker_HalfOpenMaxProbes
2026/07/08 14:58:02 INFO circuit_breaker.state_change service=test from=closed to=open
2026/07/08 14:58:02 WARN circuit_breaker.opened service=test failure_count=1 threshold=1 critical=true
2026/07/08 14:58:02 INFO circuit_breaker.state_change service=test from=open to=half_open
2026/07/08 14:58:02 INFO circuit_breaker.state_change service=test from=half_open to=open
2026/07/08 14:58:02 WARN circuit_breaker.opened service=test failure_count=2 threshold=1 critical=true
2026/07/08 14:58:02 INFO circuit_breaker.state_change service=test from=open to=half_open
2026/07/08 14:58:02 INFO circuit_breaker.state_change service=test from=half_open to=open
2026/07/08 14:58:02 WARN circuit_breaker.opened service=test failure_count=3 threshold=1 critical=true
2026/07/08 14:58:02 INFO circuit_breaker.state_change service=test from=open to=half_open
2026/07/08 14:58:02 INFO circuit_breaker.state_change service=test from=half_open to=open
2026/07/08 14:58:02 WARN circuit_breaker.opened service=test failure_count=4 threshold=1 critical=true
2026/07/08 14:58:02 INFO circuit_breaker.state_change service=test from=open to=half_open
2026/07/08 14:58:02 INFO circuit_breaker.state_change service=test from=half_open to=open
2026/07/08 14:58:02 WARN circuit_breaker.opened service=test failure_count=5 threshold=1 critical=true
2026/07/08 14:58:03 INFO circuit_breaker.state_change service=test from=open to=half_open
2026/07/08 14:58:03 INFO circuit_breaker.state_change service=test from=half_open to=open
2026/07/08 14:58:03 WARN circuit_breaker.opened service=test failure_count=6 threshold=1 critical=true
    circuitbreaker_test.go:184: 2 successful calls out of 5 in half-open test
--- PASS: TestCircuitBreaker_HalfOpenMaxProbes (0.51s)
=== RUN   TestCircuitBreaker_SuccessResetsCounter
--- PASS: TestCircuitBreaker_SuccessResetsCounter (0.00s)
=== RUN   TestErrCircuitOpen_Sentinel
--- PASS: TestErrCircuitOpen_Sentinel (0.00s)
=== RUN   TestCircuitBreaker_ConcurrentSafety
2026/07/08 14:58:03 INFO circuit_breaker.state_change service=concurrent-test from=closed to=open
2026/07/08 14:58:03 WARN circuit_breaker.opened service=concurrent-test failure_count=5 threshold=5 critical=true
    circuitbreaker_test.go:245: Concurrent test: 20 errors out of 20 calls
--- PASS: TestCircuitBreaker_ConcurrentSafety (0.00s)
=== RUN   TestCircuitBreaker_ForceState
2026/07/08 14:58:03 INFO circuit_breaker.state_change service=test from=closed to=open
2026/07/08 14:58:03 INFO circuit_breaker.state_change service=test from=open to=closed
--- PASS: TestCircuitBreaker_ForceState (0.00s)
=== RUN   TestCircuitBreaker_HalfOpenMaxProbesLimit
2026/07/08 14:58:03 INFO circuit_breaker.state_change service=test-halfopen from=closed to=open
2026/07/08 14:58:03 WARN circuit_breaker.opened service=test-halfopen failure_count=1 threshold=1 critical=true
--- PASS: TestCircuitBreaker_HalfOpenMaxProbesLimit (0.60s)
PASS
ok  	github.com/a_ashraf_tech/vod-engine/internal/circuitbreaker	1.395s
=== RUN   TestLoadDefaults
--- PASS: TestLoadDefaults (0.00s)
=== RUN   TestLoadFromEnv
--- PASS: TestLoadFromEnv (0.00s)
=== RUN   TestLoadJWTSecret
--- PASS: TestLoadJWTSecret (0.00s)
=== RUN   TestGetEnvInt
--- PASS: TestGetEnvInt (0.00s)
=== RUN   TestGetEnvFloat
--- PASS: TestGetEnvFloat (0.00s)
=== RUN   TestGetEnvInt64
--- PASS: TestGetEnvInt64 (0.00s)
=== RUN   TestGetEnv
--- PASS: TestGetEnv (0.00s)
=== RUN   TestValidateValid
--- PASS: TestValidateValid (0.00s)
=== RUN   TestValidateWatchdogTimeoutZero
--- PASS: TestValidateWatchdogTimeoutZero (0.00s)
=== RUN   TestValidatePredictiveThresholdZero
--- PASS: TestValidatePredictiveThresholdZero (0.00s)
=== RUN   TestValidateRecoveryFactorZero
--- PASS: TestValidateRecoveryFactorZero (0.00s)
=== RUN   TestValidateWebhookBufferSizeTooSmall
--- PASS: TestValidateWebhookBufferSizeTooSmall (0.00s)
=== RUN   TestValidateMinFreeDiskPctBelowRange
--- PASS: TestValidateMinFreeDiskPctBelowRange (0.00s)
=== RUN   TestValidateMinFreeDiskPctAboveRange
--- PASS: TestValidateMinFreeDiskPctAboveRange (0.00s)
=== RUN   TestValidateMultipleErrors
--- PASS: TestValidateMultipleErrors (0.00s)
=== RUN   TestValidateNegativeCBJobDelay
--- PASS: TestValidateNegativeCBJobDelay (0.00s)
PASS
ok  	github.com/a_ashraf_tech/vod-engine/internal/config	0.084s
=== RUN   TestLimitedWriter_WriteWithinLimit
--- PASS: TestLimitedWriter_WriteWithinLimit (0.00s)
=== RUN   TestLimitedWriter_WriteExactLimit
--- PASS: TestLimitedWriter_WriteExactLimit (0.00s)
=== RUN   TestLimitedWriter_WriteBeyondLimit
--- PASS: TestLimitedWriter_WriteBeyondLimit (0.00s)
=== RUN   TestLimitedWriter_WritePartialBeyondLimit
--- PASS: TestLimitedWriter_WritePartialBeyondLimit (0.00s)
=== RUN   TestLimitedWriter_WriteMultiplePartial
--- PASS: TestLimitedWriter_WriteMultiplePartial (0.00s)
=== RUN   TestLimitedWriter_ZeroLimit
--- PASS: TestLimitedWriter_ZeroLimit (0.00s)
=== RUN   TestLimitedWriterConcurrent
--- PASS: TestLimitedWriterConcurrent (0.00s)
=== RUN   TestLimitedWriterString
--- PASS: TestLimitedWriterString (0.00s)
=== RUN   TestNewPipeline
--- PASS: TestNewPipeline (0.00s)
=== RUN   TestPipeline_SetMetricsCollector
--- PASS: TestPipeline_SetMetricsCollector (0.00s)
=== RUN   TestDownloadWithRateLimit_RoutingNoLimit
--- PASS: TestDownloadWithRateLimit_RoutingNoLimit (0.04s)
=== RUN   TestDownloadWithPV_FallbackWhenPvNotFound
    pipeline_test.go:245: pv not installed — fallback path is confirmed at code level
    pipeline_test.go:254: Pipeline created with rate limit, verify via code inspection
--- PASS: TestDownloadWithPV_FallbackWhenPvNotFound (0.03s)
=== RUN   TestDownloadWithRateLimit_RoutingWithLimit
--- PASS: TestDownloadWithRateLimit_RoutingWithLimit (0.00s)
=== RUN   TestRunFFmpeg_CrashLogWritten
2026/07/08 14:58:02 WARN Failed to set FFmpeg OOM score (non-fatal, LINUX-01) pid=19876 error="open /proc/19876/oom_score_adj: The system cannot find the path specified."
2026/07/08 14:58:02 INFO watchdog.started component=watchdog job_id=test-crash-log lecture_id=crash-test pid=19876
ffmpeg version N-123074-g4e32fb4c2a-20260228 Copyright (c) 2000-2026 the FFmpeg developers
  built with gcc 15.2.0 (crosstool-NG 1.28.0.1_403899e)
  configuration: --prefix=/ffbuild/prefix --pkg-config-flags=--static --pkg-config=pkg-config --cross-prefix=x86_64-w64-mingw32- --arch=x86_64 --target-os=mingw32 --enable-gpl --enable-version3 --disable-debug --disable-w32threads --enable-pthreads --enable-iconv --enable-zlib --enable-libxml2 --enable-libvmaf --enable-fontconfig --enable-libharfbuzz --enable-libfreetype --enable-libfribidi --enable-vulkan --enable-libshaderc --enable-libvorbis --disable-libxcb --disable-xlib --disable-libpulse --enable-opencl --enable-gmp --enable-lzma --enable-liblcevc-dec --enable-amf --enable-libaom --enable-libaribb24 --enable-avisynth --enable-chromaprint --enable-libdav1d --enable-libdavs2 --enable-libdvdread --enable-libdvdnav --disable-libfdk-aac --enable-ffnvcodec --enable-cuda-llvm --enable-frei0r --enable-libgme --enable-libkvazaar --enable-libaribcaption --enable-libass --enable-libbluray --enable-libjxl --enable-libmp3lame --enable-libopus --enable-libplacebo --enable-librist --enable-libssh --enable-libtheora --enable-libvpx --enable-libwebp --enable-libzmq --enable-lv2 --enable-libvpl --enable-openal --enable-liboapv --enable-libopencore-amrnb --enable-libopencore-amrwb --enable-libopenh264 --enable-libopenjpeg --enable-libopenmpt --enable-librav1e --enable-librubberband --enable-schannel --enable-sdl2 --enable-libsnappy --enable-libsoxr --enable-libsrt --enable-libsvtav1 --enable-libtwolame --enable-libuavs3d --disable-libdrm --enable-vaapi --enable-libvidstab --enable-libvvenc --enable-whisper --enable-libx264 --enable-libx265 --enable-libxavs2 --enable-libxvid --enable-libzimg --enable-libzvbi --extra-cflags=-DLIBTWOLAME_STATIC --extra-cxxflags= --extra-libs=-lgomp --extra-ldflags=-pthread --extra-ldexeflags= --cc=x86_64-w64-mingw32-gcc --cxx=x86_64-w64-mingw32-g++ --ar=x86_64-w64-mingw32-gcc-ar --ranlib=x86_64-w64-mingw32-gcc-ranlib --nm=x86_64-w64-mingw32-gcc-nm --extra-version=20260228
  libavutil      60. 25.100 / 60. 25.100
  libavcodec     62. 23.103 / 62. 23.103
  libavformat    62. 10.101 / 62. 10.101
  libavdevice    62.  2.100 / 62.  2.100
  libavfilter    11. 12.100 / 11. 12.100
  libswscale      9.  4.100 /  9.  4.100
  libswresample   6.  2.100 /  6.  2.100
[in#0 @ 0000015c32a64c40] moov atom not found
[in#0 @ 0000015c32a64200] Error opening input: Invalid data found when processing input
Error opening input file C:\Users\drhab\AppData\Local\Temp\TestRunFFmpeg_CrashLogWritten3219672850\002\input.mp4.
Error opening input files: Invalid data found when processing input
2026/07/08 14:58:32 WARN watchdog.stall_detected component=watchdog job_id=test-crash-log lecture_id=crash-test stall_count=1 elapsed_s=30.0003241 threshold=0
2026/07/08 14:58:32 WARN watchdog.kill component=watchdog job_id=test-crash-log lecture_id=crash-test pid=19876 reason=no_progress stall_count=1
2026/07/08 14:58:47 ERROR pipeline.ffmpeg_error component=pipeline job_id=test-crash-log lecture_id=crash-test exit_code=3199971767 stderr="ffmpeg version N-123074-g4e32fb4c2a-20260228 Copyright (c) 2000-2026 the FFmpeg developers\r\n  built with gcc 15.2.0 (crosstool-NG 1.28.0.1_403899e)\r\n  configuration: --prefix=/ffbuild/prefix --pkg-config-flags=--static --pkg-config=pkg-config --cross-prefix=x86_64-w64-mingw32- --arch=x86_64 --target-os=mingw32 --enable-gpl --enable-version3 --disable-debug --disable-w32threads --enable-pthreads --enable-iconv --enable-zlib --enable-libxml2 --enable-libvmaf --enable-fontconfig --enable-libharfbuzz --enable-libfreetype --enable-libfribidi --enable-vulkan --enable-libshaderc --enable-libvorbis --disable-libxcb --disable-xlib --disable-libpulse --enable-opencl --enable-gmp --enable-lzma --enable-liblcevc-dec --enable-amf --enable-libaom --enable-libaribb24 --enable-avisynth --enable-chromaprint --enable-libdav1d --enable-libdavs2 --enable-libdvdread --enable-libdvdnav --disable-libfdk-aac --enable-ffnvcodec --enable-cuda-llvm --enable-frei0r --enable-libgme --enable-libkvazaar --enable-libaribcaption --enable-libass --enable-libbluray --enable-libjxl --enable-libmp3lame --enable-libopus --enable-libplacebo --enable-librist --enable-libssh --enable-libtheora --enable-libvpx --enable-libwebp --enable-libzmq --enable-lv2 --enable-libvpl --enable-openal --enable-liboapv --enable-libopencore-amrnb --enable-libopencore-amrwb --enable-libopenh264 --enable-libopenjpeg --enable-libopenmpt --enable-librav1e --enable-librubberband --enable-schannel --enable-sdl2 --enable-libsnappy --enable-libsoxr --enable-libsrt --enable-libsvtav1 --enable-libtwolame --enable-libuavs3d --disable-libdrm --enable-vaapi --enable-libvidstab --enable-libvvenc --enable-whisper --enable-libx264 --enable-libx265 --enable-libxavs2 --enable-libxvid --enable-libzimg --enable-libzvbi --extra-cflags=-DLIBTWOLAME_STATIC --extra-cxxflags= --extra-libs=-lgomp --extra-ldflags=-pthread --extra-ldexeflags= --cc=x86_64-w64-mingw32-gcc --cxx=x86_64-w64-mingw32-g++ --ar=x86_64-w64-mingw32-gcc-ar --ranlib=x86_64-w64-mingw32-gcc-ranlib --nm=x86_64-w64-mingw32-gcc-nm --extra-version=20260228\r\n  libavutil      60. 25.100 / 60. 25.100\r\n  libavcodec     62. 23.103 / 62. 23.103\r\n  libavformat    62. 10.101 / 62. 10.101\r\n  libavdevice    62.  2.100 / 62.  2.100\r\n  libavfilter    11. 12.100 / 11. 12.100\r\n  libswscale      9.  4.100 /  9.  4.100\r\n  libswresample   6.  2.100 /  6.  2.100\r\n[in#0 @ 0000015c32a64c40] moov atom not found\r\n[in#0 @ 0000015c32a64200] Error opening input: Invalid data found when processing input\r\nError opening input file C:\\Users\\drhab\\AppData\\Local\\Temp\\TestRunFFmpeg_CrashLogWritten3219672850\\002\\input.mp4.\r\nError opening input files: Invalid data found when processing input\r\n" error="exit status 0xbebbb1b7" exit_reason=watchdog_kill:no_progress
    pipeline_test.go:322: FFmpeg error (expected): ffmpeg exited with code 3199971767: exit status 0xbebbb1b7
    pipeline_test.go:333: Crash log written: 2688 bytes
--- PASS: TestRunFFmpeg_CrashLogWritten (45.16s)
=== RUN   TestRunFFmpeg_StderrCaptureTruncation
2026/07/08 14:58:47 WARN Failed to set FFmpeg OOM score (non-fatal, LINUX-01) pid=4936 error="open /proc/4936/oom_score_adj: The system cannot find the path specified."
2026/07/08 14:58:47 INFO watchdog.started component=watchdog job_id=test-truncation lecture_id=trunc-test pid=4936
ffmpeg version N-123074-g4e32fb4c2a-20260228 Copyright (c) 2000-2026 the FFmpeg developers
  built with gcc 15.2.0 (crosstool-NG 1.28.0.1_403899e)
  configuration: --prefix=/ffbuild/prefix --pkg-config-flags=--static --pkg-config=pkg-config --cross-prefix=x86_64-w64-mingw32- --arch=x86_64 --target-os=mingw32 --enable-gpl --enable-version3 --disable-debug --disable-w32threads --enable-pthreads --enable-iconv --enable-zlib --enable-libxml2 --enable-libvmaf --enable-fontconfig --enable-libharfbuzz --enable-libfreetype --enable-libfribidi --enable-vulkan --enable-libshaderc --enable-libvorbis --disable-libxcb --disable-xlib --disable-libpulse --enable-opencl --enable-gmp --enable-lzma --enable-liblcevc-dec --enable-amf --enable-libaom --enable-libaribb24 --enable-avisynth --enable-chromaprint --enable-libdav1d --enable-libdavs2 --enable-libdvdread --enable-libdvdnav --disable-libfdk-aac --enable-ffnvcodec --enable-cuda-llvm --enable-frei0r --enable-libgme --enable-libkvazaar --enable-libaribcaption --enable-libass --enable-libbluray --enable-libjxl --enable-libmp3lame --enable-libopus --enable-libplacebo --enable-librist --enable-libssh --enable-libtheora --enable-libvpx --enable-libwebp --enable-libzmq --enable-lv2 --enable-libvpl --enable-openal --enable-liboapv --enable-libopencore-amrnb --enable-libopencore-amrwb --enable-libopenh264 --enable-libopenjpeg --enable-libopenmpt --enable-librav1e --enable-librubberband --enable-schannel --enable-sdl2 --enable-libsnappy --enable-libsoxr --enable-libsrt --enable-libsvtav1 --enable-libtwolame --enable-libuavs3d --disable-libdrm --enable-vaapi --enable-libvidstab --enable-libvvenc --enable-whisper --enable-libx264 --enable-libx265 --enable-libxavs2 --enable-libxvid --enable-libzimg --enable-libzvbi --extra-cflags=-DLIBTWOLAME_STATIC --extra-cxxflags= --extra-libs=-lgomp --extra-ldflags=-pthread --extra-ldexeflags= --cc=x86_64-w64-mingw32-gcc --cxx=x86_64-w64-mingw32-g++ --ar=x86_64-w64-mingw32-gcc-ar --ranlib=x86_64-w64-mingw32-gcc-ranlib --nm=x86_64-w64-mingw32-gcc-nm --extra-version=20260228
2026/07/08 14:59:17 WARN watchdog.stall_detected component=watchdog job_id=test-truncation lecture_id=trunc-test stall_count=1 elapsed_s=30.0004846 threshold=0
2026/07/08 14:59:17 WARN watchdog.kill component=watchdog job_id=test-truncation lecture_id=trunc-test pid=4936 reason=no_progress stall_count=1
2026/07/08 14:59:32 ERROR pipeline.ffmpeg_error component=pipeline job_id=test-truncation lecture_id=trunc-test exit_code=3199971767 stderr="ffmpeg version N-123074-g4e32fb4c2a-20260228 Copyright (c) 2000-2026 the FFmpeg developers\r\n  built ..." error="exit status 0xbebbb1b7" exit_reason=watchdog_kill:no_progress
    pipeline_test.go:385: FFmpeg error length: 58, contains 'ffmpeg': true
--- PASS: TestRunFFmpeg_StderrCaptureTruncation (45.12s)
=== RUN   TestFetchEncryptionKey
--- PASS: TestFetchEncryptionKey (0.00s)
=== RUN   TestFetchEncryptionKey_DefaultURL
--- PASS: TestFetchEncryptionKey_DefaultURL (0.00s)
PASS
ok  	github.com/a_ashraf_tech/vod-engine/internal/encoding	90.445s
=== RUN   TestCanStartJob_NilWhenQuotaDisabled
--- PASS: TestCanStartJob_NilWhenQuotaDisabled (0.00s)
=== RUN   TestEstimateDiskNeeded
--- PASS: TestEstimateDiskNeeded (0.00s)
=== RUN   TestEstimateDiskNeeded_Formula
--- PASS: TestEstimateDiskNeeded_Formula (0.00s)
=== RUN   TestCanStartJob_BlocksWhenEstimatedExceedsQuota
--- PASS: TestCanStartJob_BlocksWhenEstimatedExceedsQuota (2.25s)
=== RUN   TestCanStartJob_AllowsWhenWithinQuota
--- PASS: TestCanStartJob_AllowsWhenWithinQuota (0.18s)
=== RUN   TestCanStartJob_NilWhenFileNotFound
2026/07/08 14:58:04 WARN B2 client not set in Guardian, cannot determine raw video size via HeadObject
--- PASS: TestCanStartJob_NilWhenFileNotFound (0.00s)
=== RUN   TestCanStartJob_NilForNilJob
--- PASS: TestCanStartJob_NilForNilJob (0.00s)
=== RUN   TestCanStartJob_PathTraversalBlocked
2026/07/08 14:58:04 WARN Path traversal attempt blocked in getRawVideoSize raw_key=../../etc/passwd
--- PASS: TestCanStartJob_PathTraversalBlocked (0.00s)
=== RUN   TestRecoveryThreshold
--- PASS: TestRecoveryThreshold (0.00s)
=== RUN   TestCanStart_CPULoad
    guardian_test.go:190: CanStart returned block: &{Blocked:true Resource:ram Current:0 MB Threshold:1536 MB Description:Available RAM 0MB below threshold 1536MB}
--- PASS: TestCanStart_CPULoad (0.00s)
=== RUN   TestRingBufferNew
--- PASS: TestRingBufferNew (0.00s)
=== RUN   TestRingBufferPushAndCount
--- PASS: TestRingBufferPushAndCount (0.00s)
=== RUN   TestRingBufferGetReturnsCorrectOrder
--- PASS: TestRingBufferGetReturnsCorrectOrder (0.00s)
=== RUN   TestRingBufferGetPartial
--- PASS: TestRingBufferGetPartial (0.00s)
=== RUN   TestRingBufferGetEmpty
--- PASS: TestRingBufferGetEmpty (0.00s)
=== RUN   TestRingBufferGetNegative
--- PASS: TestRingBufferGetNegative (0.00s)
=== RUN   TestRingBufferWraparound
--- PASS: TestRingBufferWraparound (0.00s)
=== RUN   TestRingBufferWraparoundExact
--- PASS: TestRingBufferWraparoundExact (0.00s)
=== RUN   TestRingBufferConcurrencySafe
--- PASS: TestRingBufferConcurrencySafe (0.00s)
=== RUN   TestLinearRegressionSlope_Positive
--- PASS: TestLinearRegressionSlope_Positive (0.00s)
=== RUN   TestLinearRegressionSlope_Negative
--- PASS: TestLinearRegressionSlope_Negative (0.00s)
=== RUN   TestLinearRegressionSlope_Flat
--- PASS: TestLinearRegressionSlope_Flat (0.00s)
=== RUN   TestLinearRegressionSlope_InsufficientSamples
--- PASS: TestLinearRegressionSlope_InsufficientSamples (0.00s)
=== RUN   TestLinearRegressionSlope_Empty
--- PASS: TestLinearRegressionSlope_Empty (0.00s)
=== RUN   TestLinearRegressionSlope_RAMValues
--- PASS: TestLinearRegressionSlope_RAMValues (0.00s)
=== RUN   TestLinearRegressionSlope_NoisyData
--- PASS: TestLinearRegressionSlope_NoisyData (0.00s)
=== RUN   TestPredictiveCanStart_ReturnsNilWhenInsufficientHistory
--- PASS: TestPredictiveCanStart_ReturnsNilWhenInsufficientHistory (0.00s)
=== RUN   TestPredictiveCanStart_BlocksOnUpwardCPUTrend
2026/07/08 14:58:04 WARN guardian.resource_block resource=cpu_trend current_load=5.8 slope=1.3999999999999997 time_to_threshold_s=0.714285714 threshold=6
--- PASS: TestPredictiveCanStart_BlocksOnUpwardCPUTrend (0.00s)
=== RUN   TestPredictiveCanStart_AllowsWhenCPUTrendBelowThreshold
--- PASS: TestPredictiveCanStart_AllowsWhenCPUTrendBelowThreshold (0.00s)
=== RUN   TestPredictiveCanStart_AllowsOnFlatCPUTrend
--- PASS: TestPredictiveCanStart_AllowsOnFlatCPUTrend (0.00s)
=== RUN   TestPredictiveCanStart_BlocksOnDownwardRAMTrend
2026/07/08 14:58:04 WARN guardian.resource_block resource=ram_trend current_ram_mb=1000 slope=-500 time_to_threshold_s=10 threshold_mb=0
--- PASS: TestPredictiveCanStart_BlocksOnDownwardRAMTrend (0.00s)
=== RUN   TestPredictiveCanStart_AllowsWhenRAMStable
--- PASS: TestPredictiveCanStart_AllowsWhenRAMStable (0.00s)
=== RUN   TestPredictiveCanStart_AllowsWhenRAMIncreasing
--- PASS: TestPredictiveCanStart_AllowsWhenRAMIncreasing (0.00s)
=== RUN   TestCheckUnblock_DoesNotUnblockBeforeRecoveryTime
--- PASS: TestCheckUnblock_DoesNotUnblockBeforeRecoveryTime (0.00s)
=== RUN   TestCheckUnblock_CPUUnblockWhenTrendReversed
2026/07/08 14:58:04 INFO guardian.resource_unblock resource=cpu_trend current_slope=-0.1 time_to_threshold_s=0 message="Trend reversed, resuming job scheduling"
--- PASS: TestCheckUnblock_CPUUnblockWhenTrendReversed (0.00s)
=== RUN   TestCheckUnblock_RAMUnblockWhenTrendReversed
2026/07/08 14:58:04 INFO guardian.resource_unblock resource=ram_trend current_slope=0.5 time_to_threshold_s=0 message="Trend reversed, resuming job scheduling"
--- PASS: TestCheckUnblock_RAMUnblockWhenTrendReversed (0.00s)
=== RUN   TestCheckUnblock_CPUStaysBlockedWhenTrendContinues
--- PASS: TestCheckUnblock_CPUStaysBlockedWhenTrendContinues (0.00s)
=== RUN   TestCheckUnblock_RAMStaysBlockedWhenTrendContinues
--- PASS: TestCheckUnblock_RAMStaysBlockedWhenTrendContinues (0.00s)
=== RUN   TestProcessSamples_PopulatesRingBuffer
--- PASS: TestProcessSamples_PopulatesRingBuffer (0.10s)
=== RUN   TestProcessSamples_ExitsOnContextCancel
--- PASS: TestProcessSamples_ExitsOnContextCancel (0.00s)
=== RUN   TestProcessSamples_DoesNotBlockOnFullChannel
--- PASS: TestProcessSamples_DoesNotBlockOnFullChannel (0.10s)
=== RUN   TestAddSample_NilDoesNotPanic
--- PASS: TestAddSample_NilDoesNotPanic (0.00s)
=== RUN   TestAddSample_PopulatesAllBuffers
--- PASS: TestAddSample_PopulatesAllBuffers (0.00s)
=== RUN   TestPredictiveCanStart_CanStartWithZeroSamples
--- PASS: TestPredictiveCanStart_CanStartWithZeroSamples (0.00s)
=== RUN   TestPredictiveCanStart_AddSampleAfterNew
--- PASS: TestPredictiveCanStart_AddSampleAfterNew (0.00s)
=== RUN   TestProcessSamples_ChannelNotClosedUnexpectedly
--- PASS: TestProcessSamples_ChannelNotClosedUnexpectedly (0.05s)
PASS
ok  	github.com/a_ashraf_tech/vod-engine/internal/guardian	2.824s
=== RUN   TestNewCorrelationID_Format
--- PASS: TestNewCorrelationID_Format (0.00s)
=== RUN   TestNewCorrelationID_Uniqueness
--- PASS: TestNewCorrelationID_Uniqueness (0.00s)
=== RUN   TestNewCorrelationID_VersionBits
--- PASS: TestNewCorrelationID_VersionBits (0.00s)
=== RUN   TestNewCorrelationID_DeterministicAfterNew
--- PASS: TestNewCorrelationID_DeterministicAfterNew (0.00s)
=== RUN   TestLogAttrs_AllFields
--- PASS: TestLogAttrs_AllFields (0.00s)
=== RUN   TestLogAttrs_EmptyFields
--- PASS: TestLogAttrs_EmptyFields (0.00s)
=== RUN   TestLogAttrs_ComponentOnly
--- PASS: TestLogAttrs_ComponentOnly (0.00s)
=== RUN   TestSeverityCritical
--- PASS: TestSeverityCritical (0.00s)
PASS
ok  	github.com/a_ashraf_tech/vod-engine/internal/logging	0.061s
=== RUN   TestCounterIncrement
--- PASS: TestCounterIncrement (0.00s)
=== RUN   TestGaugeSet
--- PASS: TestGaugeSet (0.00s)
=== RUN   TestHistogramObserve
--- PASS: TestHistogramObserve (0.00s)
=== RUN   TestRenderPrometheusText
    metrics_test.go:117: Rendered output:
        # HELP vod_engine_active_jobs Currently active encoding jobs
        # TYPE vod_engine_active_jobs gauge
        vod_engine_active_jobs 2
        # HELP vod_engine_jobs_processed_total Total jobs processed
        # TYPE vod_engine_jobs_processed_total counter
        vod_engine_jobs_processed_total 2
        # HELP vod_engine_encoding_duration_seconds Encoding duration histogram
        # TYPE vod_engine_encoding_duration_seconds histogram
        vod_engine_encoding_duration_seconds_bucket{le="60",quality="480p"} 0
        vod_engine_encoding_duration_seconds_bucket{le="300",quality="480p"} 1
        vod_engine_encoding_duration_seconds_bucket{le="600",quality="480p"} 2
        vod_engine_encoding_duration_seconds_bucket{le="+Inf",quality="480p"} 2
        vod_engine_encoding_duration_seconds_sum{quality="480p"} 470.000000
        vod_engine_encoding_duration_seconds_count{quality="480p"} 2
--- PASS: TestRenderPrometheusText (0.00s)
=== RUN   TestResponseTime
--- PASS: TestResponseTime (0.00s)
=== RUN   TestMetricNames
--- PASS: TestMetricNames (0.00s)
=== RUN   TestPrometheusFormat_HelpTypeNoLabels
--- PASS: TestPrometheusFormat_HelpTypeNoLabels (0.00s)
=== RUN   TestPrometheusFormat_HistogramSingleLabelSet
    metrics_test.go:244: Histogram bucket line: vod_engine_encoding_duration_seconds_bucket{le="60",quality="480p"} 0
    metrics_test.go:252: Histogram bucket line has merged labels (correct): vod_engine_encoding_duration_seconds_bucket{le="60",quality="480p"} 0
    metrics_test.go:244: Histogram bucket line: vod_engine_encoding_duration_seconds_bucket{le="300",quality="480p"} 1
    metrics_test.go:252: Histogram bucket line has merged labels (correct): vod_engine_encoding_duration_seconds_bucket{le="300",quality="480p"} 1
    metrics_test.go:244: Histogram bucket line: vod_engine_encoding_duration_seconds_bucket{le="600",quality="480p"} 1
    metrics_test.go:252: Histogram bucket line has merged labels (correct): vod_engine_encoding_duration_seconds_bucket{le="600",quality="480p"} 1
    metrics_test.go:244: Histogram bucket line: vod_engine_encoding_duration_seconds_bucket{le="+Inf",quality="480p"} 1
    metrics_test.go:252: Histogram bucket line has merged labels (correct): vod_engine_encoding_duration_seconds_bucket{le="+Inf",quality="480p"} 1
--- PASS: TestPrometheusFormat_HistogramSingleLabelSet (0.00s)
=== RUN   TestPrometheusFormat_LabelsWithLabelsInName
    metrics_test.go:272: Output with embedded label counter:
        # HELP vod_engine_jobs_processed_total Total successful jobs
        # TYPE vod_engine_jobs_processed_total counter
        vod_engine_jobs_processed_total{status="success"} 1
--- PASS: TestPrometheusFormat_LabelsWithLabelsInName (0.00s)
=== RUN   TestPrometheusFormat_HistogramSumCountWithLabels
    metrics_test.go:302: Histogram output:
        # HELP vod_engine_encoding_duration_seconds Encoding duration histogram
        # TYPE vod_engine_encoding_duration_seconds histogram
        vod_engine_encoding_duration_seconds_bucket{le="60",quality="480p"} 0
        vod_engine_encoding_duration_seconds_bucket{le="300",quality="480p"} 1
        vod_engine_encoding_duration_seconds_bucket{le="600",quality="480p"} 1
        vod_engine_encoding_duration_seconds_bucket{le="+Inf",quality="480p"} 1
        vod_engine_encoding_duration_seconds_sum{quality="480p"} 120.000000
        vod_engine_encoding_duration_seconds_count{quality="480p"} 1
--- PASS: TestPrometheusFormat_HistogramSumCountWithLabels (0.00s)
=== RUN   TestGaugeRegisterIdempotent
--- PASS: TestGaugeRegisterIdempotent (0.00s)
=== RUN   TestCounterRegisterIdempotent
--- PASS: TestCounterRegisterIdempotent (0.00s)
=== RUN   TestHistogramInfBucket
--- PASS: TestHistogramInfBucket (0.00s)
=== RUN   TestTextfileWrite
--- PASS: TestTextfileWrite (0.26s)
=== RUN   TestTextfileWriteAtomicity
--- PASS: TestTextfileWriteAtomicity (0.11s)
=== RUN   TestTextfileWriteCustomPath
--- PASS: TestTextfileWriteCustomPath (0.11s)
PASS
ok  	github.com/a_ashraf_tech/vod-engine/internal/metrics	0.560s
=== RUN   TestNewMonitor
--- PASS: TestNewMonitor (0.00s)
=== RUN   TestSnapshotInitial
--- PASS: TestSnapshotInitial (0.00s)
=== RUN   TestSnapshotAfterForceSample
--- PASS: TestSnapshotAfterForceSample (0.00s)
=== RUN   TestForceSample
--- PASS: TestForceSample (0.00s)
=== RUN   TestReadNVMeHealth_Throttled
--- PASS: TestReadNVMeHealth_Throttled (0.00s)
=== RUN   TestNVMeCheckInterval
--- PASS: TestNVMeCheckInterval (0.00s)
=== RUN   TestSetFDLimit
--- PASS: TestSetFDLimit (0.00s)
=== RUN   TestIsVirtualDevice
--- PASS: TestIsVirtualDevice (0.00s)
=== RUN   TestIsAllDigits
--- PASS: TestIsAllDigits (0.00s)
=== RUN   TestParseFloat
--- PASS: TestParseFloat (0.00s)
=== RUN   TestParseUint64
--- PASS: TestParseUint64 (0.00s)
=== RUN   TestExtractKBValue
--- PASS: TestExtractKBValue (0.00s)
PASS
ok  	github.com/a_ashraf_tech/vod-engine/internal/monitor	0.071s
?   	github.com/a_ashraf_tech/vod-engine/internal/queue	[no test files]
=== RUN   TestNewJobTelemetry
--- PASS: TestNewJobTelemetry (0.00s)
=== RUN   TestAddSample
--- PASS: TestAddSample (0.00s)
=== RUN   TestCompute
--- PASS: TestCompute (0.00s)
=== RUN   TestComputeEmptySamples
--- PASS: TestComputeEmptySamples (0.00s)
=== RUN   TestToLogEvent
--- PASS: TestToLogEvent (0.00s)
=== RUN   TestSerialize
--- PASS: TestSerialize (0.00s)
=== RUN   TestString
--- PASS: TestString (0.00s)
=== RUN   TestMultipleSamplesAggregation
--- PASS: TestMultipleSamplesAggregation (0.00s)
PASS
ok  	github.com/a_ashraf_tech/vod-engine/internal/telemetry	0.062s
=== RUN   TestReadProcessCPUTime_Basic
--- PASS: TestReadProcessCPUTime_Basic (0.01s)
=== RUN   TestReadProcessCPUTime_SpacesInComm
    watchdog_test.go:105: Old approach: utime=0 stime=0
    watchdog_test.go:106: New approach: utime=100 stime=200
--- PASS: TestReadProcessCPUTime_SpacesInComm (0.00s)
=== RUN   TestReadProcessCPUTime_EmptyComm
--- PASS: TestReadProcessCPUTime_EmptyComm (0.00s)
=== RUN   TestReadProcessCPUTime_NoClosingParen
    watchdog_test.go:147: no closing paren as expected
--- PASS: TestReadProcessCPUTime_NoClosingParen (0.00s)
=== RUN   TestProcessExists
--- PASS: TestProcessExists (0.00s)
=== RUN   TestUpdateSegmentStats
--- PASS: TestUpdateSegmentStats (0.02s)
=== RUN   TestKillReason
--- PASS: TestKillReason (0.00s)
=== RUN   TestWatchdogKillReasonStorage
--- PASS: TestWatchdogKillReasonStorage (0.00s)
=== RUN   TestReadProcessCPUTime_EdgeCases
=== RUN   TestReadProcessCPUTime_EdgeCases/normal
=== RUN   TestReadProcessCPUTime_EdgeCases/spaces_in_comm
=== RUN   TestReadProcessCPUTime_EdgeCases/special_chars
=== RUN   TestReadProcessCPUTime_EdgeCases/long_comm
=== RUN   TestReadProcessCPUTime_EdgeCases/multi_spaces
=== RUN   TestReadProcessCPUTime_EdgeCases/zero_cpu
--- PASS: TestReadProcessCPUTime_EdgeCases (0.00s)
    --- PASS: TestReadProcessCPUTime_EdgeCases/normal (0.00s)
    --- PASS: TestReadProcessCPUTime_EdgeCases/spaces_in_comm (0.00s)
    --- PASS: TestReadProcessCPUTime_EdgeCases/special_chars (0.00s)
    --- PASS: TestReadProcessCPUTime_EdgeCases/long_comm (0.00s)
    --- PASS: TestReadProcessCPUTime_EdgeCases/multi_spaces (0.00s)
    --- PASS: TestReadProcessCPUTime_EdgeCases/zero_cpu (0.00s)
PASS
ok  	github.com/a_ashraf_tech/vod-engine/internal/watchdog	0.099s
=== RUN   TestPoolStartStop
2026/07/08 14:58:02 INFO Scheduler starting max_concurrent=1 max_retries=3 retry_base_delay_s=30
2026/07/08 14:58:02 INFO Scheduler stopping gracefully...
2026/07/08 14:58:03 INFO Scheduler stopped
--- PASS: TestPoolStartStop (1.01s)
=== RUN   TestPoolMaxRetries
--- PASS: TestPoolMaxRetries (0.00s)
=== RUN   TestPoolQueueStats
--- PASS: TestPoolQueueStats (0.00s)
=== RUN   TestPoolShutdownState
--- PASS: TestPoolShutdownState (0.00s)
=== RUN   TestPoolAddJob_QueueFull
    pool_test.go:154: Got expected error: queue full: 2 items exceeds max 1
--- PASS: TestPoolAddJob_QueueFull (0.01s)
=== RUN   TestSchedulerReconfigure_SendsPollInterval
--- PASS: TestSchedulerReconfigure_SendsPollInterval (0.01s)
=== RUN   TestSchedulerReconfigure_NonBlockingSend
2026/07/08 14:58:03 WARN Scheduler reconfiguration channel full, dropping stale interval stale_interval_seconds=2
--- PASS: TestSchedulerReconfigure_NonBlockingSend (0.01s)
=== RUN   TestHasExistingJob_FindsInQueue
2026/07/08 14:58:03 INFO Job enqueued lecture_id=42 quality=480p priority=1 job_id=09c114adbb860c902cd7db8c94ff652d correlation_id=8976ab21-5cb8-40a1-b626-6d8643c571fe
--- PASS: TestHasExistingJob_FindsInQueue (0.01s)
=== RUN   TestHasExistingJob_NotFoundForDifferentQuality
2026/07/08 14:58:03 INFO Job enqueued lecture_id=42 quality=480p priority=1 job_id=cf121e5f8d8fa6a0f544cc51cef44981 correlation_id=623da2f0-d5f3-40d3-8e03-60355480627a
--- PASS: TestHasExistingJob_NotFoundForDifferentQuality (0.01s)
=== RUN   TestHasExistingJob_FindsActiveJob
--- PASS: TestHasExistingJob_FindsActiveJob (0.01s)
=== RUN   TestHasExistingJob_NotFoundWhenCompleted
--- PASS: TestHasExistingJob_NotFoundWhenCompleted (0.01s)
=== RUN   TestAddJob_IdempotentDuplicateSkip
2026/07/08 14:58:03 INFO Job enqueued lecture_id=100 quality=480p priority=1 job_id=13c0a59f86d53f171f4d57187995571d correlation_id=07738297-0c5e-4b26-8d8d-547641b0b1fa
2026/07/08 14:58:03 INFO Skipping duplicate job (idempotency) lecture_id=100 quality=480p
2026/07/08 14:58:03 INFO All sub-jobs already exist in queue, returning idempotent success lecture_id=100
--- PASS: TestAddJob_IdempotentDuplicateSkip (0.01s)
=== RUN   TestHandleJobFailure_B2UnreachableGoesToDeadLetter
2026/07/08 14:58:03 ERROR Job failed lecture_id=b2-lecture quality=480p retry_count=0 max_retries=1 error="B2 connection refused: no such host"
2026/07/08 14:58:03 ERROR Job reached max retries, moving to dead-letter queue lecture_id=b2-lecture quality=480p
2026/07/08 14:58:03 WARN B2 unreachable, job moved to dead-letter with ERR_B2_UNREACHABLE code lecture_id=b2-lecture quality=480p
2026/07/08 14:58:03 INFO pipeline.telemetry event=pipeline.telemetry lecture_id=b2-lecture teacher_id="" quality=480p queue_wait_time_s=9.223372036854776e+09 encoding_duration_s=0 video_duration_s=0 encoding_speed_fps=0 cpu_avg_pct=0 cpu_peak_pct=0 ram_avg_mb=0 ram_peak_mb=0 disk_read_mb=0 disk_write_mb=0 download_speed_mbps=0 upload_speed_mbps=0 total_size_mb=0 segments_count=0 retry_count=1 exit_reason=b2_failure:upload final_status=failed
2026/07/08 14:58:03 ERROR Completion webhook failed lecture_id=b2-lecture error="Post \"/api/internal/webhooks/video-encoded\": unsupported protocol scheme \"\""
--- PASS: TestHandleJobFailure_B2UnreachableGoesToDeadLetter (0.02s)
=== RUN   TestHandleJobFailure_RetriesNonB2Error
2026/07/08 14:58:03 ERROR Job failed lecture_id=other-lecture quality=720p retry_count=0 max_retries=3 error="ffmpeg: cannot open display"
2026/07/08 14:58:03 INFO Job will be retried lecture_id=other-lecture attempt=1 delay_s=1
2026/07/08 14:58:03 INFO queue.requeue lecture_id=other-lecture quality=720p retry_count=1 delay_s=1
2026/07/08 14:58:03 INFO pipeline.telemetry event=pipeline.telemetry lecture_id=other-lecture teacher_id="" quality=720p queue_wait_time_s=9.223372036854776e+09 encoding_duration_s=0 video_duration_s=0 encoding_speed_fps=0 cpu_avg_pct=0 cpu_peak_pct=0 ram_avg_mb=0 ram_peak_mb=0 disk_read_mb=0 disk_write_mb=0 download_speed_mbps=0 upload_speed_mbps=0 total_size_mb=0 segments_count=0 retry_count=1 exit_reason=encoding_failure final_status=failed
--- PASS: TestHandleJobFailure_RetriesNonB2Error (0.01s)
=== RUN   TestTryDequeue_PerJobDiskQuotaBlocks
2026/07/08 14:58:03 INFO Job enqueued lecture_id=42 quality=480p priority=1 job_id=41387a5ad42711ce714c2023f4c8e93d correlation_id=36d7fed3-e710-4513-a5af-21efe9b3e02d
2026/07/08 14:58:03 INFO Scheduler starting max_concurrent=1 max_retries=0 retry_base_delay_s=30
2026/07/08 14:58:03 WARN guardian.resource_block resource=workdir current="0 GB" threshold="0 GB" description="Work dir usage 0GB exceeds max 0GB"
    pool_test.go:462: After tryDequeue: pending=1, dead=0
2026/07/08 14:58:03 INFO Scheduler context cancelled, stopping
--- PASS: TestTryDequeue_PerJobDiskQuotaBlocks (0.21s)
=== RUN   TestCleanupProgressTicker
--- PASS: TestCleanupProgressTicker (0.01s)
=== RUN   TestSendProgressThrottled_CleanedOnCompletion
--- PASS: TestSendProgressThrottled_CleanedOnCompletion (0.00s)
=== RUN   TestHasExistingJob_FoundWhenDeadLetter
--- PASS: TestHasExistingJob_FoundWhenDeadLetter (0.00s)
PASS
ok  	github.com/a_ashraf_tech/vod-engine/internal/worker	1.414s
