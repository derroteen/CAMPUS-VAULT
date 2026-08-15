const fs = require('fs');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const equalsIndex = trimmed.indexOf('=');
  if (equalsIndex > -1) {
    env[trimmed.slice(0, equalsIndex)] = trimmed.slice(equalsIndex + 1);
  }
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

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
  const serviceClient = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const ts = Date.now();
  const adminEmail = `admin.mfa.${ts}@example.com`;
  const regularEmail = `regular.mfa.${ts}@example.com`;
  const adminPassword = 'AdminPass123!';
  const regularPassword = 'RegularPass123!';

  const adminUser = await serviceClient.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  });
  if (adminUser.error) throw adminUser.error;

  const regularUser = await serviceClient.auth.admin.createUser({
    email: regularEmail,
    password: regularPassword,
    email_confirm: true,
  });
  if (regularUser.error) throw regularUser.error;

  const university = await serviceClient.from('universities').select('id').limit(1).maybeSingle();
  if (university.error) throw university.error;
  const universityId = university.data.id;

  const course = await serviceClient.from('courses').insert({
    university_id: universityId,
    code: `MFA-${ts}`,
    name: `MFA Test Course ${ts}`,
  }).select('id').single();
  if (course.error) throw course.error;

  const courseRequest = await serviceClient.from('course_requests').insert({
    university_id: universityId,
    requested_name: `MFA Test Requested Course ${ts}`,
    requested_code: `MFA-${ts}`,
    requested_by: regularUser.data.user.id,
    status: 'pending',
  }).select('id').single();
  if (courseRequest.error) throw courseRequest.error;

  const productRequest = await serviceClient.from('product_requests').insert({
    requested_by: regularUser.data.user.id,
    title: `MFA Test Product ${ts}`,
    description: 'Temporary product request for MFA validation.',
    status: 'pending',
  }).select('id').single();
  if (productRequest.error) throw productRequest.error;

  const resourceRow = await serviceClient.from('resources').insert({
    title: `MFA Test Resource ${ts}`,
    storage_path: `mfa-test/${ts}.txt`,
    resource_type: 'pdf',
    status: 'pending',
    uploader_id: regularUser.data.user.id,
    course_id: course.data.id,
  }).select('id').single();
  if (resourceRow.error) throw resourceRow.error;

  await serviceClient.from('profiles').update({ is_admin: true }).eq('id', adminUser.data.user.id);
  await serviceClient.from('profiles').update({ unlock_expires_at: new Date(Date.now() + 86400000).toISOString() }).eq('id', regularUser.data.user.id);

  const adminClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const adminSignIn = await adminClient.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
  if (adminSignIn.error) throw adminSignIn.error;

  const adminBeforeMfa = await adminClient.rpc('is_admin_with_mfa');

  const noMfaAttempt = {
    courseRequest: await adminClient.from('course_requests').update({ status: 'rejected' }).eq('id', courseRequest.data.id),
    productRequest: await adminClient.from('product_requests').update({ status: 'rejected' }).eq('id', productRequest.data.id),
    course: await adminClient.from('courses').update({ name: `Blocked course ${ts}` }).eq('id', course.data.id),
    resource: await adminClient.from('resources').update({ title: `Blocked resource ${ts}` }).eq('id', resourceRow.data.id),
    profile: await adminClient.from('profiles').update({ full_name: `Blocked admin ${ts}` }).eq('id', regularUser.data.user.id),
  };

  const enroll = await adminClient.auth.mfa.enroll({ factorType: 'totp' });
  if (enroll.error) throw enroll.error;
  const secret = enroll.data.totp?.secret || parseSecretFromUri(enroll.data.totp?.uri);
  const code = generateTotp(secret);
  const challengeVerify = await adminClient.auth.mfa.challengeAndVerify({ factorId: enroll.data.id, code });
  if (challengeVerify.error) throw challengeVerify.error;

  const adminAfterMfa = await adminClient.rpc('is_admin_with_mfa');
  const adminAal = await adminClient.auth.mfa.getAuthenticatorAssuranceLevel();

  const positiveWrites = {
    courseRequest: await adminClient.from('course_requests').update({ status: 'approved' }).eq('id', courseRequest.data.id),
    productRequest: await adminClient.from('product_requests').update({ status: 'approved' }).eq('id', productRequest.data.id),
    course: await adminClient.from('courses').update({ name: `MFA success course ${ts}` }).eq('id', course.data.id),
    resource: await adminClient.from('resources').update({ title: `MFA success resource ${ts}` }).eq('id', resourceRow.data.id),
    profile: await adminClient.from('profiles').update({ full_name: `MFA success profile ${ts}` }).eq('id', regularUser.data.user.id),
  };

  const noMfaClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const noMfaSignIn = await noMfaClient.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
  if (noMfaSignIn.error) throw noMfaSignIn.error;
  const noMfaAal = await noMfaClient.auth.mfa.getAuthenticatorAssuranceLevel();

  const blockedWrites = {
    courseRequest: await noMfaClient.from('course_requests').update({ status: 'rejected' }).eq('id', courseRequest.data.id),
    productRequest: await noMfaClient.from('product_requests').update({ status: 'rejected' }).eq('id', productRequest.data.id),
    course: await noMfaClient.from('courses').update({ name: `No MFA blocked course ${ts}` }).eq('id', course.data.id),
    resource: await noMfaClient.from('resources').update({ title: `No MFA blocked resource ${ts}` }).eq('id', resourceRow.data.id),
    profile: await noMfaClient.from('profiles').update({ full_name: `No MFA blocked profile ${ts}` }).eq('id', regularUser.data.user.id),
  };

  const regularClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const regularSignIn = await regularClient.auth.signInWithPassword({ email: regularEmail, password: regularPassword });
  if (regularSignIn.error) throw regularSignIn.error;

  const regularCanAccessResources = await regularClient.rpc('can_access_resources');
  const resourceStorage = await regularClient.storage.from('resources').createSignedUrl(`mfa-test/${ts}.txt`, 60);

  const cleanup = async () => {
    await serviceClient.from('course_requests').delete().eq('id', courseRequest.data.id);
    await serviceClient.from('product_requests').delete().eq('id', productRequest.data.id);
    await serviceClient.from('resources').delete().eq('id', resourceRow.data.id);
    await serviceClient.from('courses').delete().eq('id', course.data.id);
    await serviceClient.from('profiles').update({ is_admin: false }).eq('id', adminUser.data.user.id);
    await serviceClient.auth.admin.deleteUser(adminUser.data.user.id);
    await serviceClient.auth.admin.deleteUser(regularUser.data.user.id);
  };

  console.log(JSON.stringify({
    admin: { email: adminEmail, id: adminUser.data.user.id },
    regular: { email: regularEmail, id: regularUser.data.user.id },
    adminBeforeMfa,
    noMfaAttempt,
    enroll: { factor: enroll.data, challengeVerify },
    adminAfterMfa,
    adminAal,
    positiveWrites,
    noMfaAal,
    blockedWrites,
    regularCanAccessResources,
    resourceStorage,
  }, null, 2));

  await cleanup();
}

main().catch((error) => {
  console.error('VERIFY_ADMIN_MFA_ERROR', error);
  process.exit(1);
});
