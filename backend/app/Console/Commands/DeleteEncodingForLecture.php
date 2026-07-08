<?php

namespace App\Console\Commands;

use App\Models\StudentVideoEncoding;
use App\Models\User;
use Illuminate\Console\Command;

class DeleteEncodingForLecture extends Command
{
    protected $signature = 'encoding:delete-for-lecture {lectureId} {email}';

    protected $description = 'Delete encoding record for a specific lecture and user';

    public function handle(): int
    {
        $lectureId = $this->argument('lectureId');
        $email = $this->argument('email');

        $user = User::where('email', $email)->first();
        if (! $user) {
            $this->error("User not found: {$email}");

            return 1;
        }

        $encoding = StudentVideoEncoding::where('user_id', $user->id)
            ->where('lecture_id', $lectureId)
            ->first();

        if (! $encoding) {
            $this->warn("No encoding found for lecture {$lectureId} and user {$email}");

            return 0;
        }

        $encoding->delete();
        $this->info("Deleted encoding record for lecture {$lectureId}");

        return 0;
    }
}
