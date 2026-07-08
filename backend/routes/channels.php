<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('lecture.{id}', function ($user, $id) {
    // يمكنك هنا وضع شرط إضافي مثل: return $user->is_admin;
    // ولكن بما أننا في لوحة التحكم والمستخدم مسجل دخوله، فهذا يكفي:
    return $user != null;
});

Broadcast::routes(['middleware' => ['auth:sanctum'], 'prefix' => 'api']);
