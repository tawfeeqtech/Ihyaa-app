/**
 * Auth feature barrel.
 * Exposes the provider, the `useAuth` hook, the route guards and
 * the role-aware dashboard resolver.
 */
export {
  AuthProvider,
  getDashboardHref,
  isUserRole,
  readCookie,
  AUTH_COOKIE,
  ROLE_COOKIE,
  NAME_COOKIE,
  EMAIL_COOKIE,
  VERIFIED_COOKIE,
  USER_STORAGE_KEY,
} from "./context/AuthProvider";
export { useAuth } from "./hooks/useAuth";
export { RequireAuth, RequireRole, RequireVerifiedEmail } from "./utils/guards";
