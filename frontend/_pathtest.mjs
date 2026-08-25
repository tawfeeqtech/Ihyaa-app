function patternToPathRe(p) {
  const escaped = p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*");
  return new RegExp("^/api/" + escaped + "$");
}
const cases = [
  ["notifications", "/api/notifications", "/api/notifications?page=1&per_page=20"],
  ["notifications/recent", "/api/notifications/recent", "/api/notifications"],
  ["notifications/unread-count", "/api/notifications/unread-count?x=1", "/api/notifications/unread-counts"],
  ["notifications/*/read", "/api/notifications/5/read", "/api/notifications/read-all"],
  ["notifications/read-all", "/api/notifications/read-all", "/api/notifications/5/read"],
  ["interests/*", "/api/interests/5", "/api/interests/sent"],
  ["interests/sent", "/api/interests/sent?page=1&per_page=12", "/api/interests/received"],
  ["interests/received", "/api/interests/received?status=pending,accepted", "/api/interests/sent"],
  ["projects", "/api/projects?page=1&per_page=12&sort=created_at", "/api/projects/3/files"],
  ["me", "/api/me", "/api/message"],
  ["auth/google", "/api/auth/google?redirect_to=x", "/api/auth/google/role"],
  ["dashboard/idea-owner", "/api/dashboard/idea-owner", "/api/dashboard/idea-owners"],
];
let ok = true;
for (const [pat, good, bad] of cases) {
  const re = patternToPathRe(pat);
  const g = re.test(new URL("http://x" + good).pathname);
  const b = re.test(new URL("http://x" + bad).pathname);
  const pass = g === true && b === false;
  if (!pass) ok = false;
  console.log((pass ? "PASS" : "FAIL"), pat, "->", re.toString(), "| match:", g, "| reject:", b);
}
console.log(ok ? "ALL PASS" : "SOME FAIL");
