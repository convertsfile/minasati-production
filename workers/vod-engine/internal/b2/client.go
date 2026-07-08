package b2

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// Config يحمل إعدادات الاتصال. 
// فصل الإعدادات في Struct يجعل الكود قابلاً للاختبار (Testable) بسهولة.
type Config struct {
	KeyID      string
	AppKey     string
	BucketName string
	Region     string
	Endpoint   string
}

// Validate للتحقق من أن كل البيانات المطلوبة موجودة وتحديد المفقود بدقة
func (c *Config) Validate() error {
	if c.KeyID == "" {
		return fmt.Errorf("missing B2_KEY_ID")
	}
	if c.AppKey == "" {
		return fmt.Errorf("missing B2_APP_KEY")
	}
	if c.BucketName == "" {
		return fmt.Errorf("missing B2_BUCKET_NAME")
	}
	if c.Endpoint == "" {
		return fmt.Errorf("missing B2_ENDPOINT")
	}
	if c.Region == "" {
		return fmt.Errorf("missing B2_REGION")
	}
	return nil
}

// Client الغلاف الخاص بنا للتعامل مع مساحة التخزين
type Client struct {
	S3Client   *s3.Client
	BucketName string
}

// NewClient الآن تستقبل Config بدلاً من قراءته من نظام التشغيل مباشرة
func NewClient(ctx context.Context, cfg Config) (*Client, error) {
	// 1. التحقق الدقيق من الإعدادات
	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("invalid B2 configuration: %w", err)
	}

	// 2. إعداد نقطة الاتصال المخصصة
	customResolver := aws.EndpointResolverWithOptionsFunc(func(service, rgn string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL:           cfg.Endpoint,
			SigningRegion: cfg.Region,
		}, nil
	})

	// 3. تحميل الإعدادات من مكتبة AWS
	awsCfg, err := config.LoadDefaultConfig(ctx,
		config.WithEndpointResolverWithOptions(customResolver),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(cfg.KeyID, cfg.AppKey, "")),
		config.WithRegion(cfg.Region),
	)
	if err != nil {
		slog.Error("Failed to load AWS/B2 configuration", "error", err)
		return nil, fmt.Errorf("unable to load config: %w", err)
	}

	// 4. إنشاء العميل مع سد ثغرة الـ DNS (UsePathStyle)
	s3Client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.UsePathStyle = true // هذه الإضافة تمنع العديد من مشاكل التوافق مع S3-Compatible APIs
	})

	slog.Info("Successfully initialized Backblaze B2 Client", "bucket", cfg.BucketName)

	return &Client{
		S3Client:   s3Client,
		BucketName: cfg.BucketName,
	}, nil
}

func (c *Client) DeleteFile(ctx context.Context, key string) error {
	_, err := c.S3Client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(c.BucketName),
		Key:    aws.String(key),
	})
	
	if err != nil {
		return err
	}
	
	return nil
}

// HeadObject performs a HEAD request on a B2 object and returns its size in bytes (OPS-23).
// Returns 0 if the object doesn't exist or an error occurs.
func (c *Client) HeadObject(ctx context.Context, key string) (int64, error) {
	output, err := c.S3Client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(c.BucketName),
		Key:    aws.String(key),
	})
	if err != nil {
		return 0, fmt.Errorf("b2 head object failed for key %s: %w", key, err)
	}
	if output.ContentLength == nil {
		return 0, fmt.Errorf("b2 head object returned nil ContentLength for key %s", key)
	}
	return *output.ContentLength, nil
}

// CountPrefix counts the total number of objects in the bucket that have the given prefix.
func (c *Client) CountPrefix(ctx context.Context, prefix string) (int, error) {
	slog.Info("Counting objects in B2", "prefix", prefix)

	paginator := s3.NewListObjectsV2Paginator(c.S3Client, &s3.ListObjectsV2Input{
		Bucket: aws.String(c.BucketName),
		Prefix: aws.String(prefix),
	})

	var totalCount int

	for paginator.HasMorePages() {
		page, err := paginator.NextPage(ctx)
		if err != nil {
			return 0, fmt.Errorf("failed to list objects for counting: %w", err)
		}

		totalCount += len(page.Contents)
	}

	slog.Info("Successfully counted files on B2", "prefix", prefix, "total_count", totalCount)
	return totalCount, nil
}