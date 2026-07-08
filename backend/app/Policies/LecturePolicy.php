<?php

namespace App\Policies;

use App\Models\Lecture;
use App\Models\User;

class LecturePolicy
{
    /**
     * تحديد ما إذا كان يحق للمستخدم (طالب) مشاهدة الفيديو (جلب المفتاح والـ URL)
     */
    public function view(User $user, Lecture $lecture): bool
    {
        // 1. إذا كانت المحاضرة مجانية (غير مقفلة)، يحق للجميع المشاهدة
        if (!$lecture->is_locked) {
            return true;
        }

        // 2. إذا كان المستخدم أدمن، يحق له مشاهدة كل شيء
        if ($user->role === 'admin') {
            return true;
        }

        // 🚀 3. الدرع الذكي: الاعتماد كلياً على محرك التدرج التعليمي الذي بنيناه في User Model
        // هذه الدالة ستتحقق من (الشراء، الترتيب الصارم، الامتحانات، الواجبات، والأكواد التراكمية)
        return $user->hasUnlockedLecture($lecture);
    }

    /**
     * تحديد ما إذا كان يحق للمستخدم طلب تذكرة رفع فيديو (Upload Ticket) أو تعديل المحاضرة
     */
    public function update(User $user, Lecture $lecture): bool
    {
        return $user->role === 'admin';
    }

    // (يمكنك إضافة دوال create و delete مستقبلاً وجعلها تعيد نفس شرط الأدمن)
}