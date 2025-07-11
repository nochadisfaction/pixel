import type { AuthRole } from '../config/auth.config'
import type {
  AuthResult,
  AuthState,
  AuthUser,
  Provider,
  UserRole,
} from '../types/auth'
import { useCallback, useEffect, useState } from 'react'
import {
  getCurrentUser,
  signInWithEmail,
  signUp as authSignUp,
  signInWithOAuth as authSignInWithOAuth,
  signOut as authSignOut,
  resetPassword as authResetPassword,
  verifyOtp as authVerifyOtp,
  updateProfile as authUpdateProfile,
} from '../services/auth.service'

// Type mapping between AuthRole and UserRole for compatibility
type RoleMapping = Record<AuthRole, UserRole>

// Map AuthRole to UserRole
const roleMap: RoleMapping = {
  admin: 'admin',
  staff: 'admin', // Map staff to admin UserRole
  therapist: 'therapist',
  user: 'client', // Map user to client UserRole
  guest: 'guest',
}

export interface UseAuthReturn extends AuthState {
  error: Error | null
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<AuthResult>
  signOut: () => Promise<void>
  signInWithOAuth: (provider: Provider, redirectTo?: string) => Promise<void>
  resetPassword: (email: string, redirectTo?: string) => Promise<boolean>
  verifyOtp?: (params: {
    token: string
    type?: 'email' | 'sms' | 'recovery' | 'email_change'
    email?: string
    phone?: string
  }) => Promise<AuthResult>
  updateProfile: (profile: {
    fullName?: string
    avatarUrl?: string
    metadata?: Record<string, unknown>
  }) => Promise<void>
}

/**
 * Hook for managing authentication state and operations
 * @returns Authentication state and methods
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  // Check if user has specific role(s)
  const hasRole = useCallback(
    (role: AuthRole | AuthRole[] | UserRole | UserRole[]): boolean => {
      if (!user || !user.roles?.length) {
        return false
      }

      // Handle array of roles
      if (Array.isArray(role)) {
        return role.some((r) => {
          // If r is an AuthRole, map it to UserRole
          const mappedRole =
            (r as AuthRole) in roleMap
              ? roleMap[r as AuthRole]
              : (r as UserRole)

          return user.roles.includes(mappedRole)
        })
      }

      // Handle single role
      // If role is an AuthRole, map it to UserRole
      const mappedRole =
        (role as AuthRole) in roleMap
          ? roleMap[role as AuthRole]
          : (role as UserRole)

      return user.roles.includes(mappedRole)
    },
    [user],
  )

  // Load user on initial mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true)
        const currentUser = await getCurrentUser()
        setUser(currentUser)
      } catch (_error) {
        console.error('Error loading user:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  // Sign in with email and password
  const signIn = async (
    email: string,
    password: string,
  ): Promise<AuthResult> => {
    try {
      setLoading(true)
      const { user, session } = await signInWithEmail(
        email,
        password,
      )
      setUser(user)

      return {
        success: true,
        ...(user && { user }),
        session,
      }
    } catch (_error: unknown) {
      console.error('Sign in error:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Authentication failed'
      return {
        success: false,
        error: errorMessage,
      }
    } finally {
      setLoading(false)
    }
  }

  // Sign up with email and password
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
  ): Promise<AuthResult> => {
    try {
      setLoading(true)
      const { user, session } = await authSignUp(email, password, {
        fullName,
      })
      setUser(user)

      return {
        success: true,
        ...(user && { user }),
        ...(session && { session }),
      }
    } catch (_error: unknown) {
      console.error('Sign up error:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Registration failed'
      return {
        success: false,
        error: errorMessage,
      }
    } finally {
      setLoading(false)
    }
  }

  // Sign in with OAuth provider
  const signInWithOAuth = async (
    provider: Provider,
    redirectTo?: string,
  ): Promise<void> => {
    try {
      setLoading(true)
      await authSignInWithOAuth(provider, redirectTo)
      // Note: OAuth redirects user away from the page, so we don't need to set anything here
    } catch (_error) {
      console.error('OAuth sign in error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Sign out
  const signOut = async (): Promise<void> => {
    try {
      setLoading(true)
      await authSignOut()
      setUser(null)
    } catch (_error) {
      console.error('Sign out error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Reset password
  const resetPassword = async (
    email: string,
    redirectTo?: string,
  ): Promise<boolean> => {
    try {
      setError(null)
      return await authResetPassword(email, redirectTo)
    } catch (_error) {
      console.error('Reset password error:', error)
      throw error
    }
  }

  /**
   * Verify a one-time password
   */
  const verifyOtp = async (params: {
    token: string
    type?: 'email' | 'sms' | 'recovery' | 'email_change'
    email?: string
    phone?: string
  }): Promise<AuthResult> => {
    try {
      setError(null)
      const response = await authVerifyOtp(params)
      
      if (response.success) {
        return {
          success: true,
          ...(response.user && { user: response.user }),
          ...(response.session && { session: response.session }),
        }
      }
      
      return {
        success: false,
        error: response.error instanceof Error ? response.error.message : 'OTP verification failed',
      }
    } catch (err) {
      const error = err as Error
      setError(error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Update user profile
   */
  const updateProfile = async (profile: {
    fullName?: string
    avatarUrl?: string
    metadata?: Record<string, unknown>
  }): Promise<void> => {
    if (!user) {
      throw new Error('No authenticated user')
    }

    try {
      setError(null)
      const result = await authUpdateProfile(user.id as string, profile)

      if (result.error) {
        setError(
          result.error instanceof Error
            ? result.error
            : new Error('Unknown error'),
        )
        throw result.error
      }

      // Update local user state with new profile data
      setUser((prev) => {
        if (!prev) {
          return null
        }

        return {
          ...prev,
          fullName: profile.fullName ?? prev.fullName,
          ...(profile.avatarUrl !== undefined && {
            avatarUrl: profile.avatarUrl,
          }),
          metadata: {
            ...(prev.metadata as Record<string, unknown>),
            ...profile.metadata,
          },
        } as AuthUser
      })
    } catch (_error) {
      console.error('Update profile error:', error)
      throw error
    }
  }

  // Return authentication state and methods
  return {
    user,
    isLoading: loading,
    isAuthenticated: !!user,
    hasRole,
    error,
    signIn,
    signInWithOAuth,
    signUp,
    verifyOtp,
    resetPassword,
    signOut,
    updateProfile,
  }
}
