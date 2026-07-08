<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\ForumPost;
use App\Services\FileUploadService;
use App\Services\BackblazeStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ForumController extends Controller
{
    public function __construct(
        private FileUploadService $fileUploadService,
        private BackblazeStorageService $b2Service
    ) {
    }

    public function index(Request $request)
    {
        $user = $request->user();

        $posts = ForumPost::whereHas('user', function ($query) use ($user) {
            $query->where('academic_year', $user->academic_year)
                ->where('status', 'active');
        })
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        // 🚀 تنظيف البيانات وجلب الروابط السحابية الصحيحة للصور
        $posts->getCollection()->transform(fn($post) => [
            'id' => $post->id,
            'body' => $post->body,
            'imageUrl' => $post->image ? $this->b2Service->getUrl($post->image) : null,
            'authorName' => $post->user->full_name,
            'isOwn' => $post->user_id === $user->id,
            'adminReply' => $post->admin_reply,
            'repliedAt' => $post->replied_at?->format('Y-m-d H:i:s'),
            'createdAt' => $post->created_at->format('Y-m-d H:i:s'),
        ]);

        return ApiResponse::paginated($posts, 'تم جلب منشورات المنتدى');
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'body' => 'required|string|min:5|max:5000',
            'image' => 'nullable|file|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $imagePath = null;

        if ($request->hasFile('image')) {
            // 🚀 الرفع الآمن للسحابة
            $uploadResult = $this->fileUploadService->upload($request->file('image'), "forum/{$user->academic_year}");

            if (!$uploadResult) {
                return ApiResponse::error('فشل في رفع الصورة، يرجى المحاولة لاحقاً', 'ERR_UPLOAD_FAILED', 500);
            }
            $imagePath = $uploadResult['public_id']; // حفظ المفتاح السحابي
        }

        $post = ForumPost::create([
            'user_id' => $user->id,
            'body' => $validated['body'],
            'image' => $imagePath,
        ]);

        return ApiResponse::success([
            'id' => $post->id,
            'body' => $post->body,
            'imageUrl' => $post->image ? $this->b2Service->getUrl($post->image) : null,
        ], 'تم نشر سؤالك بنجاح', 201);
    }

    public function destroy(Request $request, ForumPost $post)
    {
        if ($post->user_id !== $request->user()->id) {
            return ApiResponse::error('غير مصرح لك بحذف هذا المنشور', 'ERR_UNAUTHORIZED', 403);
        }

        // 🚀 حذف الصورة من السحابة فعلياً لتوفير مساحة الباقة
        if ($post->image) {
            $this->fileUploadService->delete($post->image);
        }

        $post->delete();

        return ApiResponse::success(null, 'تم حذف المنشور بنجاح');
    }
}