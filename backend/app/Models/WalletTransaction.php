<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WalletTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'type',
        'amount',
        'balance_before',
        'balance_after',
        'reference',
        'payment_method',
        'description',
        'status',
        'metadata',
        'payment_number_id',
        'topup_request_id',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'amount' => 'integer',
            'balance_before' => 'integer',
            'balance_after' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function paymentNumber(): BelongsTo
    {
        return $this->belongsTo(PaymentNumber::class);
    }

    public function topupRequest(): BelongsTo
    {
        return $this->belongsTo(WalletTopupRequest::class, 'topup_request_id');
    }
}
