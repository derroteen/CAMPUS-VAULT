const fs = require('fs');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const s = line.trim();
  if (!s || s.startsWith('#')) continue;
  const i = s.indexOf('=');
  if (i > -1) env[s.slice(0, i)] = s.slice(i + 1);
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

function base32ToBuffer(secret) {
  const cleaned = (secret || '').replace(/=+$/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const ch of cleaned) {
    const idx = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      bytes.push((value >> bits) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

function generateTotp(secret) {
  let counter = Math.floor(Date.now() / 30000);
  const buffer = Buffer.alloc(8);
  for (let i = 7; i >= 0; i--) {
    buffer[i] = counter & 0xff;
    counter = Math.floor(counter / 256);
  }
  const hmac = crypto.createHmac('sha1', base32ToBuffer(secret)).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary = ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 1000000).padStart(6, '0');
}

function parseSecretFromUri(uri) {
  const match = String(uri || '').match(/[?&]secret=([^&]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

async function main() {
  if (!anonKey) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing');
  const anonClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // This temporary admin account is only created for test setup. The actual RLS assertions below use the anon-key session only.
  const tempAdminEmail = `anonmfa.${Date.now()}@example.com`;
  const tempAdminPassword = 'StrongPass123!';

  const serviceClient = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const created = await serviceClient.auth.admin.createUser({
    email: tempAdminEmail,
    password: tempAdminPassword,
    email_confirm: true,
  });
  if (created.error) throw created.error;

  const adminId = created.data.user.id;
  await serviceClient.from('profiles').update({ is_admin: true }).eq('id', adminId);

  const university = await serviceClient.from('universities').select('id').limit(1).maybeSingle();
  if (university.error) throw university.error;
  const universityId = university.data.id;

  const course = await serviceClient.from('courses').insert({
    university_id: universityId,
    code: `ANONMFA${Date.now()}`,
    name: `Anon MFA Test ${Date.now()}`,
  }).select('id').single();
  if (course.error) throw course.error;

  const courseRequest = await serviceClient.from('course_requests').insert({
    university_id: universityId,
    requested_name: `Anon MFA Request ${Date.now()}`,
    requested_code: `ANONMFA${Date.now()}`,
    requested_by: adminId,
    status: 'pending',
  }).select('id').single();
  if (courseRequest.error) throw courseRequest.error;

  const productRequest = await serviceClient.from('product_requests').insert({
    requested_by: adminId,
    title: `Anon Product ${Date.now()}`,
    description: 'Temp request for anon MFA test',
    status: 'pending',
  }).select('id').single();
  if (productRequest.error) throw productRequest.error;

  const resourceRow = await serviceClient.from('resources').insert({
    title: `Anon Resource ${Date.now()}`,
    storage_path: `anon-mfa/${Date.now()}.txt`,
    resource_type: 'pdf',
    status: 'pending',
    uploader_id: adminId,
    course_id: course.data.id,
  }).select('id').single();
  if (resourceRow.error) throw resourceRow.error;

  const signIn = await anonClient.auth.signInWithPassword({ email: tempAdminEmail, password: tempAdminPassword });
  if (signIn.error) throw signIn.error;

  const userId = signIn.data.user.id;
  const aalBefore = await anonClient.auth.mfa.getAuthenticatorAssuranceLevel();
  const ts = Date.now();

  const beforeWrites = {
    course_request: await anonClient.from('course_requests').update({ status: 'rejected' }).eq('id', courseRequest.data.id).select(),
    product_request: await anonClient.from('product_requests').update({ status: 'rejected' }).eq('id', productRequest.data.id).select(),
    course: await anonClient.from('courses').update({ name: `Blocked before aal2 ${ts}` }).eq('id', course.data.id).select(),
    resource: await anonClient.from('resources').update({ title: `Blocked before aal2 ${ts}` }).eq('id', resourceRow.data.id).select(),
    profile: await anonClient.from('profiles').update({ full_name: `Blocked before aal2 ${ts}` }).eq('id', userId).select(),
  };

  const enroll = await anonClient.auth.mfa.enroll({ factorType: 'totp' });
  if (enroll.error) throw enroll.error;
  const secret = enroll.data.totp?.secret || parseSecretFromUri(enroll.data.totp?.uri);
  const code = generateTotp(secret);
  const verify = await anonClient.auth.mfa.challengeAndVerify({ factorId: enroll.data.id, code });
  if (verify.error) throw verify.error;

  const aalAfter = await anonClient.auth.mfa.getAuthenticatorAssuranceLevel();

  const afterWrites = {
    course_request: await anonClient.from('course_requests').update({ status: 'approved' }).eq('id', courseRequest.data.id).select(),
    product_request: await anonClient.from('product_requests').update({ status: 'approved' }).eq('id', productRequest.data.id).select(),
    course: await anonClient.from('courses').update({ name: `Allowed after aal2 ${Date.now()}` }).eq('id', course.data.id).select(),
    resource: await anonClient.from('resources').update({ title: `Allowed after aal2 ${Date.now()}` }).eq('id', resourceRow.data.id).select(),
    profile: await anonClient.from('profiles').update({ full_name: `Allowed after aal2 ${Date.now()}` }).eq('id', userId).select(),
  };

  function summarize(writes) {
    const out = {};
    for (const [key, result] of Object.entries(writes)) {
      out[key] = { rowsAffected: result.data?.length ?? 0, error: result.error?.message ?? null };
    }
    return out;
  }

  const beforeSummary = summarize(beforeWrites);
  const afterSummary = summarize(afterWrites);

  const payload = {
    clientKey: {
      used: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      value: anonKey.slice(0, 20) + '...' + anonKey.slice(-8),
      serviceRoleKeyUsed: false,
    },
    session: {
      email: tempAdminEmail,
      userId,
      aalBefore,
      aalAfter,
    },
    beforeSummary,
    afterSummary,
  };

  console.log(JSON.stringify(payload, null, 2));

  await serviceClient.from('course_requests').delete().eq('id', courseRequest.data.id);
  await serviceClient.from('product_requests').delete().eq('id', productRequest.data.id);
  await serviceClient.from('resources').delete().eq('id', resourceRow.data.id);
  await serviceClient.from('courses').delete().eq('id', course.data.id);
  await serviceClient.from('profiles').update({ is_admin: false }).eq('id', adminId);
  await serviceClient.auth.admin.deleteUser(adminId);
}

main().catch((error) => {
  console.error('VERIFY_ANON_MFA_ERROR', error);
  process.exit(1);
});
