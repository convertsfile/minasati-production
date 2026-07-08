<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\BaseRequest;

class ResendOtpRequest extends BaseRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // ✅ حماية من استهلاك موارد السيرفر (Rate Limit Optimization)
            'temp_user_id' => ['required', 'string', 'max:255', 'exists:users,temp_user_id'],
        ];
    }
}