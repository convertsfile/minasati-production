<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Validation\ValidationException;
use App\Http\Responses\ApiResponse;

class BaseRequest extends FormRequest
{
    protected function failedValidation(Validator $validator)
    {
        // 🚀 إجبار أخطاء التحقق على استخدام ميثاق التواصل الخاص بنا
        $response = ApiResponse::error(
            'بيانات غير صالحة',
            'ERR_VALIDATION',
            422,
            $validator->errors()->toArray()
        );

        throw new ValidationException($validator, $response);
    }
}