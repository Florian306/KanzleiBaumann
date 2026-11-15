/**
 * Cloudflare Pages Function: /api/auth/discord
 * Handles Discord OAuth2 login and verifies the user's Discord ID against ALLOWED_DISCORD_IDS.
 */

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const redirectUri = `${url.origin}/api/auth/discord`;

  if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET) {
    return new Response('Discord OAuth2 ist in Cloudflare noch nicht konfiguriert (DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET fehlen).', { status: 500 });
  }

  // Step 1: Redirect user to Discord OAuth2 authorization
  if (!code) {
    const discordAuthUrl = new URL('https://discord.com/api/oauth2/authorize');
    discordAuthUrl.searchParams.set('client_id', env.DISCORD_CLIENT_ID);
    discordAuthUrl.searchParams.set('redirect_uri', redirectUri);
    discordAuthUrl.searchParams.set('response_type', 'code');
    discordAuthUrl.searchParams.set('scope', 'identify');
    return Response.redirect(discordAuthUrl.toString(), 302);
  }

  // Step 2: Exchange code for access token
  try {
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.DISCORD_CLIENT_ID,
        client_secret: env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });

    if (!tokenRes.ok) {
      return Response.redirect(`${url.origin}/?auth=error`, 302);
    }

    const tokenData = await tokenRes.json();
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    if (!userRes.ok) {
      return Response.redirect(`${url.origin}/?auth=error`, 302);
    }

    const user = await userRes.json();
    const allowedIds = (env.ALLOWED_DISCORD_IDS || '')
      .split(',')
      .map(id => id.trim())
      .filter(Boolean);

    if (!allowedIds.includes(user.id)) {
      return Response.redirect(`${url.origin}/?auth=denied`, 302);
    }

    // Authorized! Redirect back with short-lived success flag
    return Response.redirect(`${url.origin}/?auth=ok&user=${encodeURIComponent(user.username)}`, 302);
  } catch (err) {
    return Response.redirect(`${url.origin}/?auth=error`, 302);
  }
}
