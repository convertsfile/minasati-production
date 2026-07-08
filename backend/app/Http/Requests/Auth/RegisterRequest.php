<?php

namespace App\Http\Requests\Auth;

use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Rule;
use App\Http\Requests\BaseRequest;

class RegisterRequest extends BaseRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        // 🚀 خريطة تحويل ذكية لمنع انهيار التسجيل بسبب اختلاف الفرونت إند
        $academicYearMap = [
            'الاول الاعدادي' => 'grade_7',
            'الثاني الاعدادي' => 'grade_8',
            'الثالث الاعدادي' => 'grade_9',
            'الاول الثانوي' => 'grade_10',
            'الثاني الثانوية' => 'grade_11',
            'الثالث الثانوي' => 'grade_12',
        ];

        $this->merge([
            // ✅ تم نقل الـ trim إلى هنا لجميع الحقول النصية (تم حل مشكلة الصورة)
            'full_name' => $this->full_name ? trim($this->full_name) : null,
            'email' => $this->email ? strtolower(trim($this->email)) : null,
            'phone' => $this->phone ? $this->sanitizePhone($this->phone) : null,
            'parent_phone' => $this->parent_phone ? $this->sanitizePhone($this->parent_phone) : null,
            'student_number' => $this->student_number ? trim($this->student_number) : null,
            'school' => $this->school ? trim($this->school) : null,
            'parent_job' => $this->parent_job ? trim($this->parent_job) : null,
            'governorate' => $this->governorate ? trim($this->governorate) : null,

            // ✅ تحويل القيمة القادمة من الفرونت إند لتتطابق مع الداتابيز
            'academic_year' => $this->academic_year && isset($academicYearMap[$this->academic_year])
                ? $academicYearMap[$this->academic_year]
                : $this->academic_year,
        ]);
    }

    public function rules(): array
    {
        return [
            // ✅ تم إزالة 'trim' من هنا
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'regex:/^01[0125][0-9]{8}$/', 'unique:users,phone'],
            'parent_phone' => ['required', 'string', 'regex:/^01[0125][0-9]{8}$/', 'different:phone'],

            // ✅ إضافة 'confirmed' للتأكد من تطابق كلمة المرور مع password_confirmation
            'password' => ['required', 'string', 'confirmed', Password::min(8)->letters()->numbers()],

            'academic_year' => [
                'required',
                'string',
                Rule::in(['grade_7', 'grade_8', 'grade_9', 'grade_10', 'grade_11', 'grade_12', 'other'])
            ],

            'student_number' => ['required', 'string', 'max:50', 'unique:users,student_number'],
            'school' => ['required', 'string', 'max:255'],
            'parent_job' => ['required', 'string', 'max:255'],
            'governorate' => ['required', 'string', 'max:255'],

            // ✅ تم تحويلها إلى required لأن النظام يرفض الحسابات بدون هوية
            'id_image' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ];
    }

    public function messages(): array
    {
        return [
            'parent_phone.different' => 'رقم ولي الأمر يجب أن يكون مختلفاً عن رقم الطالب.',
            'academic_year.in' => 'الصف الدراسي المختار غير صالح.',
            'password.confirmed' => 'كلمتا المرور غير متطابقتين.',
        ];
    }

    private function sanitizePhone(?string $phone): ?string
    {
        if (!$phone)
            return null;
        $arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        $englishNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        $phone = str_replace($arabicNumbers, $englishNumbers, $phone);
        return preg_replace('/[^0-9]/', '', $phone);
    }
}