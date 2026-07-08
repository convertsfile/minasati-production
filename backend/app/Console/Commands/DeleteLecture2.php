<?php

namespace App\Console\Commands;

use App\Models\Lecture;
use App\Models\StudentVideoEncoding;
use Illuminate\Console\Command;

class DeleteLecture2 extends Command
{
    protected $signature = 'lecture:delete-2';

    protected $description = 'Delete lecture 2 and its encodings';

    public function handle(): int
    {
        $lecture = Lecture::find(2);
        if ($lecture) {
            StudentVideoEncoding::where('lecture_id', 2)->delete();
            $lecture->delete();
            $this->info('Lecture 2 deleted');
        } else {
            $this->warn('Lecture 2 not found');
        }

        return 0;
    }
}
