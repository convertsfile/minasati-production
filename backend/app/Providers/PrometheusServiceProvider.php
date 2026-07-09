<?php

namespace App\Providers;

use App\Services\Metrics\ApplicationMetrics;
use App\Services\Metrics\MetricsRegistry;
use Illuminate\Support\ServiceProvider;

/**
 * RELIABILITY-MAJOR-02: register the in-process metrics stack.
 *
 * The Laravel app shipped with no metrics endpoint. This provider
 * binds:
 *
 *   MetricsRegistry      — the in-process storage for counters,
 *                          gauges, and histograms. Singleton.
 *   ApplicationMetrics   — the glue that records HTTP / webhook /
 *                          queue / failed-jobs / pending-topups
 *                          metrics. Singleton.
 *
 * The HTTP-facing exporter is a single controller
 * (App\Http\Controllers\MetricsController) registered in
 * routes/api.php at /api/metrics.
 */
class PrometheusServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(MetricsRegistry::class, function () {
            return new MetricsRegistry();
        });

        $this->app->singleton(ApplicationMetrics::class, function ($app) {
            return new ApplicationMetrics($app->make(MetricsRegistry::class));
        });
    }

    public function boot(): void
    {
        //
    }
}
