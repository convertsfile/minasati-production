<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class AddBalanceToAdmin extends Command
{
    protected $signature = 'admin:add-balance {amount=1000}';

    protected $description = 'Add balance to admin account';

    public function handle()
    {
        $amount = $this->argument('amount');
        $admin = User::where('email', 'admin@eduplatform.com')->first();

        if (! $admin) {
            $this->error('Admin not found!');

            return 1;
        }

        $admin->wallet_balance += $amount;
        $admin->save();

        $this->info("✅ Added {$amount} points to admin account!");
        $this->info("New balance: {$admin->wallet_balance} points");

        return 0;
    }
}
