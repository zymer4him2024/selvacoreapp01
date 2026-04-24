import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';

async function pageIsUp() {
  try {
    const res = await fetch(BASE_URL, { redirect: 'manual' });
    return res.status < 500;
  } catch {
    return false;
  }
}

describe('admin page', () => {
  beforeAll(async () => {
    const up = await pageIsUp();
    if (!up) {
      throw new Error(
        `Dev server not reachable at ${BASE_URL}. Start it with \`npm run dev\` before running tests.`
      );
    }
  });

  it('redirects unauthenticated /admin to /login', async () => {
    const res = await fetch(`${BASE_URL}/admin`, { redirect: 'manual' });
    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/login');
    expect(location).toContain('redirect=%2Fadmin');
  });

  it('/login shell loads and its JS chunk contains Google + email/password form markers', async () => {
    const shellRes = await fetch(`${BASE_URL}/login`);
    expect(shellRes.status).toBe(200);
    const html = await shellRes.text();

    // The login page is a client component — SSR renders only the layout shell.
    // Find the login-page JS chunk URL in the shell and verify the form markers live in it.
    const chunkMatch = html.match(/\/_next\/static\/chunks\/app\/login\/page\.js[^"']*/);
    expect(chunkMatch, 'login page JS chunk URL missing from shell HTML').not.toBeNull();

    const chunkUrl = chunkMatch![0];
    const chunkRes = await fetch(`${BASE_URL}${chunkUrl}`);
    expect(chunkRes.status).toBe(200);
    const js = await chunkRes.text();

    expect(js, 'Google sign-in label missing from login chunk').toMatch(/Sign in with Google|signInWithGoogle/);
    expect(js, 'email/password form marker missing').toMatch(/or sign in with email/);
    expect(js, 'sign-in submit label missing').toMatch(/Create account/);
  });

  it('serves /admin shell HTML (client-rendered dashboard or login view)', async () => {
    const res = await fetch(`${BASE_URL}/admin`, {
      redirect: 'manual',
      headers: {
        Cookie: '__session=test-bypass',
      },
    });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toMatch(/<html[\s>]/);
    expect(html).toContain('Selvacore');
  });

  it('/admin JS chunk contains AdminLoginView with email/password form', async () => {
    const shellRes = await fetch(`${BASE_URL}/admin`, {
      redirect: 'manual',
      headers: { Cookie: '__session=test-bypass' },
    });
    const html = await shellRes.text();

    const chunkMatch = html.match(/\/_next\/static\/chunks\/app\/admin\/page\.js[^"']*/);
    expect(chunkMatch, 'admin page JS chunk URL missing from shell HTML').not.toBeNull();

    const chunkRes = await fetch(`${BASE_URL}${chunkMatch![0]}`);
    expect(chunkRes.status).toBe(200);
    const js = await chunkRes.text();

    expect(js, 'AdminLoginView Google label missing').toMatch(/continueWithGoogle|Continue with Google/);
    expect(js, 'email/password form marker missing in admin chunk').toMatch(/or sign in with email/);
    expect(js, 'signInWithEmailAndPassword import missing').toMatch(/signInWithEmailAndPassword/);
  });

  it('sub-admins list page is reachable (after bypass cookie)', async () => {
    const res = await fetch(`${BASE_URL}/admin/sub-admins`, {
      redirect: 'manual',
      headers: { Cookie: '__session=test-bypass' },
    });
    expect(res.status).toBe(200);
  });

  it('sub-admin create page is reachable', async () => {
    const res = await fetch(`${BASE_URL}/admin/sub-admins/new`, {
      redirect: 'manual',
      headers: { Cookie: '__session=test-bypass' },
    });
    expect(res.status).toBe(200);
  });
});
