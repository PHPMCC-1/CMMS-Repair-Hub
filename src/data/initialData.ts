import { UserPersona } from '../types';

export const INITIAL_USER_PERSONAS: UserPersona[] = [
  {
    email: 'maint.commandcenter@gmail.com',
    name: 'Joseph Ramos',
    role: 'admin',
    company: 'PHP Repair Hub Command Center',
    avatarLetter: 'J',
    avatarBg: 'bg-purple-700 text-white',
  },
  {
    email: 'ops@pacificair.com',
    name: 'Sarah Chen (Pacific Air)',
    role: 'client',
    company: 'Pacific Air GSE Fleet',
    avatarLetter: 'P',
    avatarBg: 'bg-blue-600 text-white',
  },
  {
    email: 'logistics@deltacargo.com',
    name: 'Marcus Vance (Delta Cargo)',
    role: 'client',
    company: 'Delta Cargo Logistics',
    avatarLetter: 'D',
    avatarBg: 'bg-emerald-600 text-white',
  },
];
