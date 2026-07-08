<?php

namespace App\Services;

use App\Models\User;
use App\Models\WalletTopupRequest;
use App\Models\WalletTransaction;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WalletService
{
    public function topUp(User $user, int $amount, string $paymentMethod, ?string $reference = null, ?string $description = null): WalletTransaction
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException('المبلغ يجب أن يكون أكبر من الصفر');
        }

        return DB::transaction(function () use ($user, $amount, $paymentMethod, $reference, $description) {
            $lockedUser = User::where('id', $user->id)->lockForUpdate()->first();

            $balanceBefore = $lockedUser->wallet_balance;
            $lockedUser->wallet_balance += $amount;
            $lockedUser->save();

            $transaction = WalletTransaction::create([
                'user_id' => $lockedUser->id,
                'type' => 'top_up',
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $lockedUser->wallet_balance,
                'reference' => $reference,
                'payment_method' => $paymentMethod,
                'description' => $description ?? "Top up via {$paymentMethod}",
                'status' => 'completed',
            ]);

            Log::info('Wallet top up', [
                'user_id' => $lockedUser->id,
                'amount' => $amount,
                'reference' => $reference,
            ]);

            return $transaction;
        }, 3);
    }

    public function deduct(User $user, int $amount, string $description, ?string $reference = null, ?array $metadata = null): WalletTransaction
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException('المبلغ يجب أن يكون أكبر من الصفر');
        }

        return DB::transaction(function () use ($user, $amount, $description, $reference, $metadata) {
            $lockedUser = User::where('id', $user->id)->lockForUpdate()->first();

            if ($lockedUser->wallet_balance < $amount) {
                throw new \InvalidArgumentException('الرصيد غير كافٍ');
            }

            $balanceBefore = $lockedUser->wallet_balance;
            $lockedUser->wallet_balance -= $amount;
            $lockedUser->save();

            $transaction = WalletTransaction::create([
                'user_id' => $lockedUser->id,
                'type' => 'purchase',
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $lockedUser->wallet_balance,
                'reference' => $reference,
                'payment_method' => 'wallet',
                'description' => $description,
                'status' => 'completed',
                'metadata' => $metadata,
            ]);

            Log::info('Wallet deduction', [
                'user_id' => $lockedUser->id,
                'amount' => $amount,
                'reference' => $reference,
            ]);

            return $transaction;
        }, 3);
    }

    public function refund(User $user, int $amount, string $description, ?string $reference = null): WalletTransaction
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException('المبلغ يجب أن يكون أكبر من الصفر');
        }

        return DB::transaction(function () use ($user, $amount, $description, $reference) {
            $lockedUser = User::where('id', $user->id)->lockForUpdate()->first();

            $balanceBefore = $lockedUser->wallet_balance;
            $lockedUser->wallet_balance += $amount;
            $lockedUser->save();

            $transaction = WalletTransaction::create([
                'user_id' => $lockedUser->id,
                'type' => 'refund',
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $lockedUser->wallet_balance,
                'reference' => $reference,
                'payment_method' => 'system',
                'description' => $description,
                'status' => 'completed',
            ]);

            Log::info('Wallet refund', [
                'user_id' => $lockedUser->id,
                'amount' => $amount,
                'reference' => $reference,
            ]);

            return $transaction;
        }, 3);
    }

    public function getBalance(User $user): int
    {
        return $user->wallet_balance;
    }

    public function getTransactions(User $user, ?int $limit = 20, ?int $offset = 0): Collection
    {
        return WalletTransaction::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->offset($offset)
            ->get();
    }

    public function findByReference(string $reference): ?WalletTransaction
    {
        return WalletTransaction::where('reference', $reference)->first();
    }

    public function createPendingTopUp(User $user, int $amount, string $paymentMethod, ?string $reference = null): WalletTransaction
    {
        return WalletTransaction::create([
            'user_id' => $user->id,
            'type' => 'top_up',
            'amount' => $amount,
            'balance_before' => $user->wallet_balance,
            'balance_after' => $user->wallet_balance,
            'reference' => $reference,
            'payment_method' => $paymentMethod,
            'description' => "Pending top up via {$paymentMethod}",
            'status' => 'pending',
        ]);
    }

    public function completeTopUp(WalletTransaction $transaction): void
    {
        DB::transaction(function () use ($transaction) {
            // 🚀 قفل المعاملة لتجنب اكتمالها مرتين
            $lockedTransaction = WalletTransaction::where('id', $transaction->id)->lockForUpdate()->first();

            if ($lockedTransaction->status !== 'pending') {
                throw new \InvalidArgumentException('المعاملة ليست معلقة أو تم تنفيذها مسبقاً');
            }

            $lockedUser = User::where('id', $lockedTransaction->user_id)->lockForUpdate()->first();
            $balanceBefore = $lockedUser->wallet_balance;
            $lockedUser->wallet_balance += $lockedTransaction->amount;
            $lockedUser->save();

            $lockedTransaction->update([
                'balance_before' => $balanceBefore,
                'balance_after' => $lockedUser->wallet_balance,
                'status' => 'completed',
            ]);

            Log::info('Wallet top up completed', [
                'transaction_id' => $lockedTransaction->id,
                'reference' => $lockedTransaction->reference,
            ]);
        }, 3);
    }

    public function cancelTransaction(WalletTransaction $transaction): void
    {
        if ($transaction->status !== 'pending') {
            throw new \InvalidArgumentException('Only pending transactions can be cancelled');
        }
        $transaction->update(['status' => 'cancelled']);
    }

    public function completeTopupFromRequest(WalletTopupRequest $request): WalletTransaction
    {
        return DB::transaction(function () use ($request) {
            // 🚀 الدرع الأمني: قفل الطلب لمنع الموافقة عليه مرتين بالتزامن
            $lockedRequest = WalletTopupRequest::where('id', $request->id)->lockForUpdate()->first();

            if ($lockedRequest->status !== 'pending') {
                throw new \InvalidArgumentException('هذا الطلب تمت معالجته بالفعل');
            }

            $amount = $lockedRequest->getFinalAmount();
            $reference = "TOPUP-{$lockedRequest->id}-" . now()->format('YmdHis');

            $lockedUser = User::where('id', $lockedRequest->user_id)->lockForUpdate()->first();

            $balanceBefore = $lockedUser->wallet_balance;
            $lockedUser->wallet_balance += $amount;
            $lockedUser->save();

            $transaction = WalletTransaction::create([
                'user_id' => $lockedUser->id,
                'type' => 'top_up',
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $lockedUser->wallet_balance,
                'reference' => $reference,
                'payment_method' => $lockedRequest->payment_method,
                'description' => "Top up via {$lockedRequest->payment_method} (verified)",
                'status' => 'completed',
                'payment_number_id' => $lockedRequest->payment_number_id,
                'topup_request_id' => $lockedRequest->id,
            ]);

            // 🚀 التعديل الأهم: تحديث حالة الطلب لكي لا يظهر للإدارة مرة أخرى
            $lockedRequest->update([
                'status' => 'approved',
                'verified_amount' => $amount
            ]);

            Log::info('Wallet top up from request completed', [
                'request_id' => $lockedRequest->id,
                'user_id' => $lockedUser->id,
                'amount' => $amount,
            ]);

            return $transaction;
        }, 3);
    }
}