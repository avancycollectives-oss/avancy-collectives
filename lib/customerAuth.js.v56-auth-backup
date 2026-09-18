import crypto from 'crypto';
import {createCustomer,findCustomerByEmail,getCustomer,createCustomerSession,validCustomerSession,deleteCustomerSession} from './db';
function hash(v){return crypto.createHash('sha256').update(v).digest('hex')}
export function passwordHash(password){return crypto.scryptSync(password,process.env.AUTH_SALT||'avancy-local-salt',32).toString('hex')}
export function passwordMatches(password,stored){return crypto.timingSafeEqual(Buffer.from(passwordHash(password),'hex'),Buffer.from(stored,'hex'))}
export async function registerCustomer(c){return createCustomer({id:crypto.randomUUID(),name:c.name,email:c.email,passwordHash:passwordHash(c.password),phone:c.phone})}
export async function createCustomerLogin(id){const token=crypto.randomBytes(32).toString('hex');await createCustomerSession(hash(token),id,new Date(Date.now()+1000*60*60*24*30));return token}
export async function customerFromToken(token){const id=await validCustomerSession(hash(token||''));return id?getCustomer(id):null}
export async function logoutCustomer(token){if(token)await deleteCustomerSession(hash(token))}
