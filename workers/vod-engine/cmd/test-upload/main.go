package main

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/a_ashraf_tech/vod-engine/internal/config"
	"github.com/a_ashraf_tech/vod-engine/internal/encoding"
	"github.com/joho/godotenv"
)

func main() {
	cwd, _ := os.Getwd()
	godotenv.Load(filepath.Join(cwd, "..", "..", ".env"))

	homeDir, _ := os.UserHomeDir()
	baseDir := filepath.Join(homeDir, "OneDrive", "Desktop", "new-minasaati")

	// Temp workdir
	workBase := filepath.Join(os.TempDir(), "vod-encode-test-"+fmt.Sprintf("%d", time.Now().Unix()))
	os.MkdirAll(workBase, 0755)
	defer os.RemoveAll(workBase)
	fmt.Printf("📁 Work dir: %s\n", workBase)

	cfg := config.Load()
	ffmpeg := encoding.NewFFmpegCommand(cfg)
	fmt.Println("✅ FFmpeg wrapper initialized")

	for _, id := range []string{"1", "2"} {
		inputPath := filepath.Join(baseDir, id+".mp4")
		if _, err := os.Stat(inputPath); os.IsNotExist(err) {
			fmt.Printf("❌ Video %s not found\n", id)
			continue
		}

		fmt.Printf("\n══════════════════════════════════════════\n")
		fmt.Printf("  ENCODING TEST — Video %s\n", id)
		fmt.Printf("══════════════════════════════════════════\n")

		jobDir := filepath.Join(workBase, fmt.Sprintf("lecture_%s", id))
		os.MkdirAll(jobDir, 0755)

		// Copy input file (simulating B2 download)
		inputCopy := filepath.Join(jobDir, "input.mp4")
		inputData, _ := os.ReadFile(inputPath)
		os.WriteFile(inputCopy, inputData, 0644)
		inputInfo, _ := os.Stat(inputCopy)
		fmt.Printf("📥 Input: %s (%.0f MB)\n", inputCopy, float64(inputInfo.Size())/(1024*1024))

		// Generate encryption key and key info
		encKey := make([]byte, 16)
		rand.Read(encKey)
		keyPath := filepath.Join(jobDir, "enc.key")
		os.WriteFile(keyPath, encKey, 0400)

		iv := make([]byte, 16)
		rand.Read(iv)
		keyInfoContent := fmt.Sprintf("http://localhost:8080/keys/lecture_%s.key\n%s\n%s", id, keyPath, hex.EncodeToString(iv))
		keyInfoPath := filepath.Join(jobDir, "enc.keyinfo")
		os.WriteFile(keyInfoPath, []byte(keyInfoContent), 0600)

		// Build and run FFmpeg HLS command
		qualities := []string{"480p", "720p"}

		fmt.Printf("🎬 Encoding %s at %v...\n", id, qualities)
		encodeStart := time.Now()

		// Get total duration first
		totalDuration := ffmpeg.GetTotalDuration(inputCopy)
		fmt.Printf("⏱️  Source duration: %.1f seconds\n", totalDuration)

		// Build FFmpeg command
		cmd, outputDirs, err := ffmpeg.BuildHLSCommand(inputCopy, jobDir, keyInfoPath, qualities)
		if err != nil {
			fmt.Printf("❌ BuildHLSCommand failed: %v\n", err)
			continue
		}

		// Set up stderr (progress goes to stderr for -progress pipe:1)
		cmd.Stderr = os.Stderr
		cmd.Dir = jobDir

		fmt.Printf("  FFmpeg command: %s\n", cmd.String())
		fmt.Printf("  Output dirs: %v\n", outputDirs)

		// Start FFmpeg
		if err := cmd.Start(); err != nil {
			fmt.Printf("❌ FFmpeg start failed: %v\n", err)
			continue
		}

		// Wait for completion with timeout
		done := make(chan error, 1)
		go func() {
			done <- cmd.Wait()
		}()

		fmt.Print("  Encoding...")
		select {
		case err := <-done:
			if err != nil {
				fmt.Printf("\n❌ FFmpeg encoding failed: %v\n", err)
				continue
			}
			fmt.Print(" done\n")
		case <-time.After(10 * time.Minute):
			cmd.Process.Kill()
			fmt.Printf("❌ FFmpeg timed out after 10 minutes\n")
			continue
		}

		encodeDuration := time.Since(encodeStart)
		fmt.Printf("✅ Encoding complete in %.1f seconds\n", encodeDuration.Seconds())

		// Count output files
		var files []string
		filepath.Walk(jobDir, func(path string, info os.FileInfo, err error) error {
			if err == nil && !info.IsDir() && path != inputCopy && path != keyPath && path != keyInfoPath {
				files = append(files, path)
			}
			return nil
		})

		var segmentsCount int
		var totalEncodedSize int64
		for _, f := range files {
			info, _ := os.Stat(f)
			if info != nil {
				totalEncodedSize += info.Size()
			}
			if filepath.Ext(f) == ".ts" {
				segmentsCount++
			}
		}

		fmt.Printf("\n══════════════════════════════════════════\n")
		fmt.Printf("  RESULTS\n")
		fmt.Printf("══════════════════════════════════════════\n")
		fmt.Printf("  Input size:       %.0f MB\n", float64(inputInfo.Size())/(1024*1024))
		fmt.Printf("  Qualities:        %v\n", qualities)
		fmt.Printf("  Encode duration:  %.1f s\n", encodeDuration.Seconds())
		fmt.Printf("  Output files:     %d\n", len(files))
		fmt.Printf("  TS segments:      %d\n", segmentsCount)
		fmt.Printf("  Output size:      %.1f MB\n", float64(totalEncodedSize)/(1024*1024))
		if encodeDuration.Seconds() > 0 {
			fmt.Printf("  Encoding speed:   %.1fx (est.)\n", totalDuration/encodeDuration.Seconds())
		}

		fmt.Printf("\n  Output files:\n")
		for _, f := range files {
			rel, _ := filepath.Rel(jobDir, f)
			info, _ := os.Stat(f)
			if info != nil {
				fmt.Printf("    📄 %s (%d KB)\n", rel, info.Size()/1024)
			} else {
				fmt.Printf("    📄 %s\n", rel)
			}
		}

		// Show master.m3u8 content
		masterPath := filepath.Join(jobDir, "master.m3u8")
		if data, err := os.ReadFile(masterPath); err == nil {
			fmt.Printf("\n  📋 master.m3u8:\n%s\n", string(data))
		}

		// Show variant playlist
		v0Index := filepath.Join(jobDir, "v0", "index.m3u8")
		if data, err := os.ReadFile(v0Index); err == nil {
			fmt.Printf("  📋 v0/index.m3u8:\n%s\n", string(data))
		}

		fmt.Printf("\n  ✅ Video %s encoded successfully!\n", id)
	}

	fmt.Printf("\n══════════════════════════════════════════\n")
	fmt.Printf("  ALL TESTS COMPLETE\n")
	fmt.Printf("══════════════════════════════════════════\n")
}
