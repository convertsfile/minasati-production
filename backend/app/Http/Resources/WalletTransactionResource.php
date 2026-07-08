<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WalletTransactionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type, // top_up, purchase, refund, withdrawal
            'amount' => $this->amount,
            'balanceBefore' => $this->balance_before,
            'balance_After' => $this->balance_after,
            'reference' => $this->reference,
            'paymentMethod' => $this->payment_method,
            'description' => $this->description,
            'status' => $this->status, // pending, completed, failed, cancelled

            // مصفوفة البيانات الإضافية (مثل كود الكورس المشترى عبر هذه المعاملة)
            'metadata' => $this->metadata,

            // تنسيق التواريخ بشكل موحد للموبايل والويب
            'createdAt' => $this->created_at ? $this->created_at->format('Y-m-d H:i:s') : null,
        ];
    }
}