<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\PaymentNumber;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache; // 🚀 ضروري لمسح الذاكرة المؤقتة
use Illuminate\Validation\Rule;

class PaymentNumberController extends Controller
{
    public function index()
    {
        $numbers = PaymentNumber::orderBy('display_order', 'asc')->get();

        // 🚀 توحيد ميثاق الـ Frontend (CamelCase)
        $mapped = $numbers->map(fn($n) => [
            'id' => $n->id,
            'number' => $n->number,
            'provider' => $n->provider,
            'displayOrder' => $n->display_order,
            'isActive' => (bool) $n->is_active,
            'createdAt' => $n->created_at->format('Y-m-d H:i:s')
        ]);

        return ApiResponse::success($mapped, 'تم جلب أرقام الدفع بنجاح');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'number' => 'required|string|max:20|unique:payment_numbers,number',
            'provider' => 'required|in:instapay,vodafone_cash',
            'display_order' => 'integer|min:0',
            'is_active' => 'boolean',
        ]);

        $number = PaymentNumber::create($validated);

        // 🚀 السلاح السري: تحديث خوارزمية التوزيع اللحظية للطلاب فوراً!
        $this->clearProviderCache($validated['provider']);

        Log::info("Admin created new payment number: {$number->number} for {$number->provider}");

        return ApiResponse::success([
            'id' => $number->id,
            'number' => $number->number,
            'provider' => $number->provider,
            'displayOrder' => $number->display_order,
            'isActive' => (bool) $number->is_active,
        ], 'تم إضافة رقم الدفع بنجاح', 201);
    }

    public function update(Request $request, PaymentNumber $paymentNumber)
    {
        $validated = $request->validate([
            'number' => ['sometimes', 'string', 'max:20', Rule::unique('payment_numbers')->ignore($paymentNumber->id)],
            'provider' => 'sometimes|in:instapay,vodafone_cash',
            'display_order' => 'sometimes|integer|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        $oldProvider = $paymentNumber->provider;
        $paymentNumber->update($validated);

        // 🚀 مسح كاش المزود القديم والجديد (لو تم تغيير نوع الرقم)
        $this->clearProviderCache($oldProvider);
        if (isset($validated['provider']) && $validated['provider'] !== $oldProvider) {
            $this->clearProviderCache($validated['provider']);
        }

        Log::info("Admin updated payment number ID: {$paymentNumber->id}");

        return ApiResponse::success(null, 'تم تحديث رقم الدفع بنجاح');
    }

    public function destroy(PaymentNumber $paymentNumber)
    {
        // حماية السجلات المالية (نزاهة البيانات)
        if ($paymentNumber->topupRequests()->exists()) {
            return ApiResponse::error('لا يمكن الحذف: هذا الرقم مرتبط بسجل معاملات مالية للطلاب. قم بتعطيله (إخفائه) بدلاً من حذفه.', 'ERR_HAS_HISTORY', 400);
        }

        $provider = $paymentNumber->provider;
        $paymentNumber->delete();

        // 🚀 تحديث الكاش للطلاب
        $this->clearProviderCache($provider);
        Log::warning("Admin deleted payment number ID: {$paymentNumber->id}");

        return ApiResponse::success(null, 'تم حذف رقم الدفع بنجاح');
    }

    /**
     * دالة مساعدة لتنظيف كاش مزود الدفع بعد أي تعديل
     */
    private function clearProviderCache(string $provider)
    {
        Cache::forget("active_payment_numbers_{$provider}");
    }
}