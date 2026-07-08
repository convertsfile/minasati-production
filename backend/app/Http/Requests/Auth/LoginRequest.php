<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\BaseRequest;

class LoginRequest extends BaseRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('email')) {
            $this->merge(['email' => strtolower(trim($this->email))]);
        }
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string'],
            // 🚀 الـ device_id مطلوب لأنه مُعرف فريد للجهاز لمنع مشاركة الحساب، لكن لا نحتاج الاسم
            'device_id' => ['required', 'string', 'max:255'],
        ];
    }
}