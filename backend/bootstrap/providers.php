<?php

use App\Providers\AppServiceProvider;
use App\Providers\PrometheusServiceProvider; // 🚀 RELIABILITY-MAJOR-02: /metrics endpoint
use Laravel\Sanctum\SanctumServiceProvider;

return [
    AppServiceProvider::class,
    PrometheusServiceProvider::class,
    SanctumServiceProvider::class,
];
