<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\BaseRequest;

class ResubmitRequest extends BaseRequest
{
    public function authorize(): bool
    {
        // التحقق من الصلاحيات يتم عبر الـ Middleware بالفعل
        return true;
    }

    public function rules(): array
    {
        return [
            'id_image' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ];
    }
}