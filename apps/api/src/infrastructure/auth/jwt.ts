/** 認証cookie名とtokenの寿命を共有する。値は秒単位で、承認済みのログイン有効期限8時間を表す。 */
export const AUTH_COOKIE_NAME = "miniflow_auth";
export const CSRF_COOKIE_NAME = "miniflow_csrf";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;
