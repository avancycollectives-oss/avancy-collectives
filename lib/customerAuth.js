import crypto from 'crypto';
import {
  createCustomer,
  findCustomerByEmail,
  findCustomerByGoogleSub,
  createGoogleCustomer,
  linkCustomerGoogle,
  getCustomer,
  createCustomerSession,
  validCustomerSession,
  deleteCustomerSession,
  createPasswordReset,
  findPasswordReset,
  consumePasswordReset,
  updateCustomerPassword
} from './db';

function hash(v){
  return crypto.createHash('sha256').update(v).digest('hex');
}

export function passwordHash(password){
  return crypto
    .scryptSync(password,process.env.AUTH_SALT||'avancy-local-salt',32)
    .toString('hex');
}

export function passwordMatches(password,stored){
  if(!stored)return false;

  const a=Buffer.from(passwordHash(password),'hex');
  const b=Buffer.from(stored,'hex');

  if(a.length!==b.length)return false;

  return crypto.timingSafeEqual(a,b);
}

export async function registerCustomer(c){
  return createCustomer({
    id:crypto.randomUUID(),
    name:c.name,
    email:c.email,
    passwordHash:passwordHash(c.password),
    phone:c.phone
  });
}

export async function findOrCreateGoogleCustomer(profile){
  const googleSub=String(profile.sub||'').trim();
  const email=String(profile.email||'').trim().toLowerCase();

  if(!googleSub||!email){
    throw new Error('Google account information is incomplete.');
  }

  if(profile.email_verified!==true){
    throw new Error('Your Google email must be verified.');
  }

  let customer=await findCustomerByGoogleSub(googleSub);

  if(customer)return customer;

  customer=await findCustomerByEmail(email);

  if(customer){
    return (await linkCustomerGoogle(customer.id,googleSub))||customer;
  }

  return createGoogleCustomer({
    id:crypto.randomUUID(),
    name:String(profile.name||email.split('@')[0]).trim(),
    email,
    phone:'',
    googleSub
  });
}

export async function createCustomerLogin(id){
  const token=crypto.randomBytes(32).toString('hex');

  await createCustomerSession(
    hash(token),
    id,
    new Date(Date.now()+1000*60*60*24*30)
  );

  return token;
}

export async function customerFromToken(token){
  const id=await validCustomerSession(hash(token||''));
  return id?getCustomer(id):null;
}

export async function logoutCustomer(token){
  if(token)await deleteCustomerSession(hash(token));
}

export async function createPasswordResetToken(customerId){
  const token=crypto.randomBytes(32).toString('hex');
  const tokenHash=hash(token);

  await createPasswordReset(
    customerId,
    tokenHash,
    new Date(Date.now()+1000*60*30)
  );

  return token;
}

export async function passwordResetFromToken(token){
  if(!token)return null;
  return findPasswordReset(hash(token));
}

export async function completePasswordReset(resetId,customerId,password){
  await updateCustomerPassword(
    customerId,
    passwordHash(password)
  );

  await consumePasswordReset(resetId);
}
