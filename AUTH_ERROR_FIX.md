# Authentication Error Handling Fix

## Problem
When an unauthorized error (401) occurred, the wallet API was making recursive calls, causing infinite loops and potential performance issues.

## Root Cause
The recursive calls were happening due to:
1. `useZeroDev` hook's `useEffect` auto-reconnecting when user state changed
2. `DashboardSection` component's auto-connect logic triggering on user changes
3. `updateUserWallet` function throwing errors that triggered state changes
4. No proper flags to prevent multiple simultaneous auth error handling

## Solution Implemented

### 1. Auth Context (`src/contexts/auth-context.jsx`)
- Added `isHandlingAuthError` state and `authErrorHandledRef` ref to track auth error handling
- Modified `updateUserWallet` to prevent recursive calls when auth errors are being handled
- Added proper error handling for 401 errors with immediate redirect to login
- Reset auth error flags on successful login

### 2. ZeroDev Hook (`src/hooks/use-zerodev.js`)
- Added `authErrorHandled` state and `authErrorRef` ref to track auth errors
- Modified `useEffect` to prevent auto-reconnect when auth errors are being handled
- Added auth error detection in all wallet operations (connect, sendGaslessTransaction, sendBatchTransaction)
- Reset auth error flags on disconnect

### 3. Dashboard Section (`src/components/dashboard-section.jsx`)
- Added check for `authErrorHandled` before attempting auto-connect
- Prevented showing error toasts for authentication errors
- Added proper dependency array including `authErrorHandled`

### 4. Query Client (`src/lib/queryClient.js`)
- Added global `isHandlingAuthError` flag to prevent recursive auth error handling
- Modified `handleAuthError` function to check for existing auth error handling
- Added `resetAuthErrorHandling` utility function
- Added timeout to ensure state updates are processed before redirect

## Key Features

### Prevention of Recursive Calls
- Multiple layers of protection against recursive API calls
- State flags to track when auth errors are being handled
- Early returns in useEffect hooks when auth errors are detected

### Proper Error Handling
- Immediate redirect to login page on 401 errors
- Clear user data and localStorage on auth failures
- Reset of all auth error flags on successful login

### User Experience
- No infinite loading states
- Clear error messages for non-auth errors
- Smooth redirect to login page
- Prevention of multiple error toasts

## Usage

The fix is automatic and requires no changes to existing code. When a 401 error occurs:

1. The system detects the auth error
2. Sets appropriate flags to prevent recursive calls
3. Clears user data and localStorage
4. Redirects to login page
5. Resets flags on successful login

## Testing

To test the fix:
1. Trigger a 401 error (e.g., by manually clearing cookies)
2. Verify that only one redirect to login occurs
3. Check browser console for "Auth error already being handled" messages
4. Verify that wallet operations are blocked during auth error handling
5. Test successful login to ensure flags are reset properly 