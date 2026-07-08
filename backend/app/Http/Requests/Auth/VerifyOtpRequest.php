<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\BaseRequest;

class VerifyOtpRequest extends BaseRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // ✅ إضافة exists لكي يصد الطلب فوراً إذا كان الـ ID غير موجود بالداتابيز
            'temp_user_id' => ['required', 'string', 'max:255', 'exists:users,temp_user_id'],
            'firebase_token' => ['required', 'string'],
        ];
    }
}