package b2

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

// DeletePrefix يقوم بالبحث عن كل الملفات التي تحمل بادئة معينة (مثل مجلد) ومسحها بالكامل
func (c *Client) DeletePrefix(ctx context.Context, prefix string) error {
	slog.Info("Starting batch deletion from B2", "prefix", prefix)

	// إعداد المُنقّب (Paginator) للبحث عن الملفات (يجلب 1000 ملف في كل طلب كحد أقصى)
	paginator := s3.NewListObjectsV2Paginator(c.S3Client, &s3.ListObjectsV2Input{
		Bucket: aws.String(c.BucketName),
		Prefix: aws.String(prefix),
	})

	var deletedCount int

	for paginator.HasMorePages() {
		page, err := paginator.NextPage(ctx)
		if err != nil {
			return fmt.Errorf("failed to list objects for deletion: %w", err)
		}

		if len(page.Contents) == 0 {
			continue
		}

		// تجميع الملفات في مصفوفة المسح
		var objectIds []types.ObjectIdentifier
		for _, object := range page.Contents {
			objectIds = append(objectIds, types.ObjectIdentifier{
				Key: object.Key,
			})
		}

		// إرسال طلب المسح الجماعي (Batch Delete)
		_, err = c.S3Client.DeleteObjects(ctx, &s3.DeleteObjectsInput{
			Bucket: aws.String(c.BucketName),
			Delete: &types.Delete{
				Objects: objectIds,
				Quiet:   aws.Bool(true), // تقليل حجم الرد عبر الشبكة لتسريع العملية
			},
		})

		if err != nil {
			return fmt.Errorf("failed to delete objects batch: %w", err)
		}

		deletedCount += len(objectIds)
	}

	slog.Info("Successfully deleted files from B2", "prefix", prefix, "total_deleted", deletedCount)
	return nil
}

// DeleteObject يقوم بمسح ملف واحد محدد بالكامل باستخدام مفتاحه (Key)
func (c *Client) DeleteObject(ctx context.Context, key string) error {
	slog.Info("Deleting single object from B2", "key", key)

	_, err := c.S3Client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(c.BucketName),
		Key:    aws.String(key),
	})

	if err != nil {
		return fmt.Errorf("failed to delete object %s: %w", key, err)
	}

	slog.Info("Successfully deleted object from B2", "key", key)
	return nil
}