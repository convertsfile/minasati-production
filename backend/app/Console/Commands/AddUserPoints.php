<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\WalletService;
use Illuminate\Console\Command;

class AddUserPoints extends Command
{
    protected $signature = 'user:add-points {email} {amount=1000}';

    protected $description = 'Add wallet points to a user by email';

    public function handle(WalletService $walletService): int
    {
        $email = $this->argument('email');
        $amount = (int) $this->argument('amount');

        $user = User::where('email', $email)->first();

        if (! $user) {
            $this->error("User with email {$email} not found.");

            return 1;
        }

        $transaction = $walletService->topUp(
            $user,
            $amount,
            'manual',
            'MANUAL-'.now()->format('YmdHis'),
            'Manual admin credit'
        );

        $this->info("Added {$amount} points to {$email}.");
        $this->info("New balance: {$user->fresh()->wallet_balance} points.");
        $this->info("Transaction reference: {$transaction->reference}");

        return 0;
    }
}
