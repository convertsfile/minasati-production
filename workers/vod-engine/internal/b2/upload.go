package b2

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/s3/manager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// UploadOptions يمنحنا مرونة للتحكم في استهلاك الذاكرة لكل ملف على حدة
type UploadOptions struct {
	PartSizeMB  int
	Concurrency int
}

// UploadFile — Single PUT للملفات الصغيرة (أسرع من multipart)
func (c *Client) UploadFile(ctx context.Context, localPath string, b2Key string, contentType string) error {
	file, err := os.Open(localPath)
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	_, err = c.S3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(c.BucketName),
		Key:         aws.String(b2Key),
		Body:        file,
		ContentType: aws.String(contentType),
	})

	if err != nil {
		return fmt.Errorf("single PUT upload failed: %w", err)
	}

	slog.Debug("Uploaded file (single PUT)", "key", b2Key)
	return nil
}

// UploadStream النسخة الاحترافية والمحصنة
func (c *Client) UploadStream(ctx context.Context, fileStream io.Reader, safeKeyName string, contentType string, opts UploadOptions) (string, error) {
	
	// وضع قيم افتراضية آمنة إذا لم يتم تمريرها
	if opts.PartSizeMB == 0 {
		opts.PartSizeMB = 5
	}
	if opts.Concurrency == 0 {
		opts.Concurrency = 3
	}

	uploader := manager.NewUploader(c.S3Client, func(u *manager.Uploader) {
		u.PartSize = int64(opts.PartSizeMB) * 1024 * 1024
		u.Concurrency = opts.Concurrency
		u.LeavePartsOnError = false
	})

	slog.Info("Starting multipart stream upload", "key", safeKeyName, "concurrency", opts.Concurrency)

	result, err := uploader.Upload(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(c.BucketName),
		Key:         aws.String(safeKeyName),
		Body:        fileStream,
		ContentType: aws.String(contentType),
	})

	if err != nil {
		slog.Error("Failed to upload stream", "key", safeKeyName, "error", err)
		return "", fmt.Errorf("multipart upload failed: %w", err)
	}

	slog.Info("Successfully uploaded file", "key", safeKeyName)

	return result.Location, nil
}