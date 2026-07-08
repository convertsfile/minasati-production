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

// DownloadFile يقوم بتنزيل ملف من مساحة التخزين إلى القرص المحلي بكفاءة عالية (متعدد الخيوط)
func (c *Client) DownloadFile(ctx context.Context, b2Key string, destPath string) error {
	// إنشاء الملف المحلي المعزول
	file, err := os.Create(destPath)
	if err != nil {
		return fmt.Errorf("failed to create local file: %w", err)
	}
	defer file.Close()

	// استخدام مدير التنزيل الرسمي لضمان استقرار التحميل حتى لو انقطع الاتصال جزئياً
	downloader := manager.NewDownloader(c.S3Client, func(d *manager.Downloader) {
		d.Concurrency = 3 // 3 خيوط تحميل كافية جداً لعدم استنزاف الشبكة
	})

	slog.Info("Downloading raw video from B2", "key", b2Key)

	_, err = downloader.Download(ctx, file, &s3.GetObjectInput{
		Bucket: aws.String(c.BucketName),
		Key:    aws.String(b2Key),
	})

	if err != nil {
		return fmt.Errorf("b2 download failed: %w", err)
	}

	return nil
}

// GetObjectStream returns an io.ReadCloser for streaming a B2 object (OPS-15).
// The caller is responsible for closing the returned body. This is used for
// rate-limited downloads via pv --rate-limit.
func (c *Client) GetObjectStream(ctx context.Context, b2Key string) (io.ReadCloser, error) {
	slog.Info("Streaming object from B2", "key", b2Key)

	output, err := c.S3Client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(c.BucketName),
		Key:    aws.String(b2Key),
	})
	if err != nil {
		return nil, fmt.Errorf("b2 get object stream failed: %w", err)
	}

	return output.Body, nil
}