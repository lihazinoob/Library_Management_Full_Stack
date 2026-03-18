<?php

namespace App\Http\Controllers\Auth;

use App\Models\User;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
  public function __construct()
  {
    $this->middleware('auth:api', ['except' => ['login', 'register']]);
  }

  public function register(Request $request)
  {
    $validator = Validator::make($request->all(), [
      'name' => 'required|string|max:255',
      'email' => 'required|string|email|max:255|unique:users',
      'phone' => 'nullable|string|max:20',
      'password' => 'required|string|min:6|confirmed',
      'role' => 'sometimes|in:admin,member',
    ]);

    if ($validator->fails()) {
      return response()->json([
        'errors' => $validator->errors()
      ], 422);
    }

    $user = User::create([
      'name' => $request->name,
      'email' => $request->email,
      'phone' => $request->phone,
      'password' => Hash::make($request->password),
      'role' => $request->input('role', 'member'),
      'status' => 'active',
    ]);

    $token = auth('api')->login($user);

    return $this->respondWithToken($token);
  }

  public function login(Request $request)
  {
    $credentials = $request->only('email', 'password');

    $validator = Validator::make($credentials, [
      'email' => 'required|email',
      'password' => 'required|string',
    ]);

    if ($validator->fails()) {
      return response()->json([
        'errors' => $validator->errors()
      ], 422);
    }

    $user = User::where('email', $request->email)->first();

    if (!$user || !Hash::check($request->password, $user->password)) {
      return response()->json([
        'error' => 'Invalid email or password'
      ], 401);
    }

    if ($user->status !== 'active') {
      return response()->json([
        'error' => 'Your account is blocked. Please contact the administrator.'
      ], 403);
    }

    if (!$token = auth('api')->attempt($credentials)) {
      return response()->json([
        'error' => 'Unable to log in with the provided credentials'
      ], 401);
    }

    return $this->respondWithToken($token);
  }

  public function me()
  {
    return response()->json(auth('api')->user());
  }

  public function logout()
  {
    auth('api')->logout();

    return response()->json([
      'message' => 'Successfully logged out'
    ]);
  }

  public function refresh()
  {
    return $this->respondWithToken(auth('api')->refresh());
  }

  protected function respondWithToken($token)
  {
    return response()->json([
      'access_token' => $token,
      'token_type' => 'bearer',
      'expires_in' => auth('api')->factory()->getTTL() * 60,
      'user' => auth('api')->user(),
    ]);
  }

}
