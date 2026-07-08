# Start Laravel server with custom PHP configuration for video uploads
Write-Host "Starting Laravel server with custom PHP configuration..." -ForegroundColor Green
Write-Host "Memory Limit: 2048M" -ForegroundColor Cyan
Write-Host "Upload Max: 1500M" -ForegroundColor Cyan
Write-Host "Post Max: 1500M" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server will be available at: http://localhost:8000" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Use -d flags to override only specific directives instead of -c which replaces entire php.ini
# This ensures all required PHP extensions remain loaded
php -d upload_max_filesize=1500M -d post_max_size=1500M -d memory_limit=2048M -d max_input_time=600 artisan serve --port=8000
