<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\ForumPost;
use App\Notifications\ForumPostReplied;
use App\Services\FileUploadService; // 🚀 نقل الملفات للسحابة
use App\Services\BackblazeStorageService; // 🚀 جلب الروابط الصحيحة
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
        $posts = ForumPost::with('user')
            ->orderBy('created_at', 'desc')
            ->paginate($request->integer('limit', 20));

        // SEC-MAJOR-02: convert storage keys to short-lived signed URLs.
        // The admin viewing this page is already authenticated and
        // authorized as an admin, so we sign for a longer window (10 min)
        // to keep the page interactive.
        $posts->getCollection()->transform(fn($post) => [
            'id' => $post->id,
            'studentName' => $post->user->full_name,
            'studentNumber' => $post->user->student_number,
            'body' => $post->body,
            'imageUrl' => $post->image ? $this->b2Service->getSignedUrl($post->image, 600) : null,
            'adminReply' => $post->admin_reply,
            'adminReplyAudioUrl' => $post->admin_reply_audio ? $this->b2Service->getSignedUrl($post->admin_reply_audio, 600) : null,
            'adminReplyImageUrl' => $post->admin_reply_image ? $this->b2Service->getSignedUrl($post->admin_reply_image, 600) : null,
            'repliedAt' => $post->replied_at ? $post->replied_at->format('Y-m-d H:i:s') : null,
            'createdAt' => $post->created_at->format('Y-m-d H:i:s'),
        ]);

        return ApiResponse::paginated($posts, 'تم جلب منشورات المنتدى');
    }

    public function reply(Request $request, ForumPost $post)
    {
        $validated = $request->validate([
            'reply' => 'nullable|string|max:2000',
            'audio' => 'nullable|file|mimes:webm,mp3,wav,m4a,ogg|max:10240',
            'image' => 'nullable|file|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        if (empty($validated['reply']) && !$request->hasFile('audio') && !$request->hasFile('image')) {
            return ApiResponse::error('يجب تقديم نص أو تسجيل صوتي أو صورة للرد', 'ERR_EMPTY_REPLY', 422);
        }

        $updateData = [
            'admin_reply' => $validated['reply'] ?? null,
            'replied_at' => now(),
        ];

        // 🚀 الرفع الآمن للسحابة
        if ($request->hasFile('audio')) {
            $uploadResult = $this->fileUploadService->upload($request->file('audio'), 'forum/admin_replies/audio');
            if ($uploadResult)
                $updateData['admin_reply_audio'] = $uploadResult['public_id'];
        }
        if ($request->hasFile('image')) {
            $uploadResult = $this->fileUploadService->upload($request->file('image'), 'forum/admin_replies/images');
            if ($uploadResult)
                $updateData['admin_reply_image'] = $uploadResult['public_id'];
        }

        $post->update($updateData);

        // إرسال إشعار للطالب
        $post->user->notify(new ForumPostReplied($post));

        return ApiResponse::success([
            'id' => $post->id,
            'adminReply' => $post->admin_reply,
            'adminReplyAudioUrl' => $post->admin_reply_audio ? $this->b2Service->getSignedUrl($post->admin_reply_audio, 600) : null,
            'adminReplyImageUrl' => $post->admin_reply_image ? $this->b2Service->getSignedUrl($post->admin_reply_image, 600) : null,
            'repliedAt' => $post->replied_at->format('Y-m-d H:i:s'),
        ], 'تم إرسال الرد بنجاح');
    }

    public function updateReply(Request $request, ForumPost $post)
    {
        $validated = $request->validate([
            'reply' => 'nullable|string|max:2000',
            'audio' => 'nullable|file|mimes:webm,mp3,wav,m4a,ogg|max:10240',
            'image' => 'nullable|file|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        if (empty($validated['reply']) && !$request->hasFile('audio') && !$request->hasFile('image')) {
            return ApiResponse::error('يجب تقديم نص أو تسجيل صوتي أو صورة للرد', 'ERR_EMPTY_REPLY', 422);
        }

        $updateData = [
            'admin_reply' => $validated['reply'] ?? null,
            'replied_at' => now(),
        ];

        if ($request->hasFile('audio')) {
            if ($post->admin_reply_audio)
                $this->fileUploadService->delete($post->admin_reply_audio);

            $uploadResult = $this->fileUploadService->upload($request->file('audio'), 'forum/admin_replies/audio');
            if ($uploadResult)
                $updateData['admin_reply_audio'] = $uploadResult['public_id'];
        }

        if ($request->hasFile('image')) {
            if ($post->admin_reply_image)
                $this->fileUploadService->delete($post->admin_reply_image);

            $uploadResult = $this->fileUploadService->upload($request->file('image'), 'forum/admin_replies/images');
            if ($uploadResult)
                $updateData['admin_reply_image'] = $uploadResult['public_id'];
        }

        $post->update($updateData);

        return ApiResponse::success([
            'id' => $post->id,
            'adminReply' => $post->admin_reply,
            'adminReplyAudioUrl' => $post->admin_reply_audio ? $this->b2Service->getSignedUrl($post->admin_reply_audio, 600) : null,
            'adminReplyImageUrl' => $post->admin_reply_image ? $this->b2Service->getSignedUrl($post->admin_reply_image, 600) : null,
            'repliedAt' => $post->replied_at->format('Y-m-d H:i:s'),
        ], 'تم تحديث الرد بنجاح');
    }

    public function deleteReply(ForumPost $post)
    {
        // 🚀 حذف آمن من مساحة التخزين السحابية لعدم هدر التكاليف
        if ($post->admin_reply_audio)
            $this->fileUploadService->delete($post->admin_reply_audio);
        if ($post->admin_reply_image)
            $this->fileUploadService->delete($post->admin_reply_image);

        $post->update([
            'admin_reply' => null,
            'admin_reply_audio' => null,
            'admin_reply_image' => null,
            'replied_at' => null,
        ]);

        return ApiResponse::success(null, 'تم مسح الرد وصوره المرفقة بنجاح');
    }

    public function destroy(ForumPost $post)
    {
        // 🚀 التنظيف الشامل للسحابة (صورة الطالب + صور وصوت الإدارة)
        if ($post->image)
            $this->fileUploadService->delete($post->image);
        if ($post->admin_reply_audio)
            $this->fileUploadService->delete($post->admin_reply_audio);
        if ($post->admin_reply_image)
            $this->fileUploadService->delete($post->admin_reply_image);

        $post->delete();

        return ApiResponse::success(null, 'تم حذف المنشور وجميع المرفقات المرتبطة به بنجاح');
    }
}