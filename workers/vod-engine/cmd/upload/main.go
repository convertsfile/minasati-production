package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/a_ashraf_tech/vod-engine/internal/b2"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env
	if err := godotenv.Load(); err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	b2Config := b2.Config{
		KeyID:      os.Getenv("B2_KEY_ID"),
		AppKey:     os.Getenv("B2_APP_KEY"),
		BucketName: os.Getenv("B2_BUCKET_NAME"),
		Region:     os.Getenv("B2_REGION"),
		Endpoint:   os.Getenv("B2_ENDPOINT"),
	}

	ctx := context.Background()
	b2Client, err := b2.NewClient(ctx, b2Config)
	if err != nil {
		log.Fatalf("Failed to initialize B2 client: %v", err)
	}

	videos := []string{"1.mp4", "2.mp4", "3.mp4"}
	baseDir := `C:\Users\drhab\OneDrive\Desktop\new-minasaati`

	for _, video := range videos {
		localPath := filepath.Join(baseDir, video)
		b2Key := fmt.Sprintf("raw/%s", video)

		fmt.Printf("Checking if %s exists in B2...\n", b2Key)
		size, err := b2Client.HeadObject(ctx, b2Key)
		if err == nil && size > 0 {
			fmt.Printf("File %s already exists in B2 with size %d bytes, skipping upload.\n", b2Key, size)
			continue
		}

		fmt.Printf("Uploading %s to B2 as %s via Multipart Upload...\n", localPath, b2Key)
		start := time.Now()
		file, err := os.Open(localPath)
		if err != nil {
			log.Fatalf("Failed to open file %s: %v", localPath, err)
		}
		_, err = b2Client.UploadStream(ctx, file, b2Key, "video/mp4", b2.UploadOptions{PartSizeMB: 5, Concurrency: 3})
		file.Close()
		if err != nil {
			log.Fatalf("Failed to upload %s: %v", video, err)
		}
		fmt.Printf("Uploaded %s successfully in %v\n", video, time.Since(start))
	}

	fmt.Println("All B2 video files are ready!")
}
