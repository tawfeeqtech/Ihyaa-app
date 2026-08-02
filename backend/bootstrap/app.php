<?php

use App\Http\Middleware\AdminMiddleware;
use App\Http\Middleware\EnsureEmailVerified;
use App\Http\Middleware\IdeaOwnerMiddleware;
use App\Http\Middleware\InvestorMiddleware;
use App\Http\Middleware\RefreshSanctumToken;
use App\Http\Middleware\SetLocale;
use App\Http\Middleware\TrackRateLimitViolations;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        channels: __DIR__.'/../routes/channels.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // يعمل قبل باقي Middleware في مجموعة api — لترجمة رسائل 429 (Arabic-first)
        $middleware->api(prepend: [SetLocale::class]);

        $middleware->alias([
            'idea-owner' => IdeaOwnerMiddleware::class,
            'investor' => InvestorMiddleware::class,
            'admin' => AdminMiddleware::class,
            'email.verified' => EnsureEmailVerified::class,
            'token.refresh' => RefreshSanctumToken::class,
            'rate.violations' => TrackRateLimitViolations::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );

        // استجابة 429 موحّدة لكل نقاط /api (تغطي أي limiter)
        $exceptions->renderable(function (TooManyRequestsHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                $headers = $e->getHeaders();
                $retryAfter = (int) ($headers['Retry-After'] ?? 60);

                return response()->json([
                    'success' => false,
                    'code' => 'RATE_LIMIT_EXCEEDED',
                    'message' => __('rate_limit.exceeded', ['seconds' => $retryAfter]),
                    'errors' => null,
                    'retry_after' => $retryAfter,
                    'reset_at' => (int) ($headers['X-RateLimit-Reset'] ?? now()->addSeconds($retryAfter)->timestamp),
                ], 429, $headers);
            }
        });

        // 422 موحّدة مع كود VALIDATION_FAILED
        $exceptions->renderable(function (ValidationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'code' => 'VALIDATION_FAILED',
                    'message' => $e->getMessage(),
                    'errors' => $e->errors(),
                ], 422);
            }
        });

        // 401 موحّدة — لا توكن أو منتهٍ
        $exceptions->renderable(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'code' => 'UNAUTHENTICATED',
                    'message' => __('auth.unauthenticated'),
                    'errors' => null,
                ], 401);
            }
        });

        // 404 موحّدة
        $exceptions->renderable(function (ModelNotFoundException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'code' => 'NOT_FOUND',
                    'message' => __('errors.not_found'),
                    'errors' => null,
                ], 404);
            }
        });

        // 403 موحّدة (abort / abort_if — كود FORBIDDEN)
        $exceptions->renderable(function (HttpException $e, Request $request) {
            if ($request->is('api/*') && $e->getStatusCode() === 403) {
                return response()->json([
                    'success' => false,
                    'code' => 'FORBIDDEN',
                    'message' => $e->getMessage() ?: __('errors.forbidden'),
                    'errors' => null,
                ], 403);
            }
        });
    })->create();
