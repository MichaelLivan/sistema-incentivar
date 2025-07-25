export interface User {
  id: string;
  email: string;
  name: string;
  type: UserType;
  sector?: string;
  children?: string[]; // IDs dos filhos para pais
}

export type UserType = 
  | 'financeiro-ats'
  | 'financeiro-pct'
  | 'at-aba'
  | 'at-denver'
  | 'at-grupo'
  | 'at-escolar'
  | 'pais'
  | 'coordenacao-aba'
  | 'coordenacao-denver'
  | 'coordenacao-escolar'
  | 'coordenacao-grupo'
  | 'adm-aba'
  | 'adm-denver'
  | 'adm-grupo'
  | 'adm-escolar'
  | 'adm-geral';

export interface Patient {
  id: string;
  name: string;
  parentId: string;
  atId: string;
  sector: 'aba' | 'denver' | 'grupo' | 'escolar';
  weeklyHours: number;
  hourly_rate: number;
}

export interface AT {
  id: string;
  name: string;
  email: string;
  sector: 'aba' | 'denver' | 'grupo' | 'escolar';
  patients: string[];
  hourly_rate: number;
}

export interface Session {
  id: string;
  patientId: string;
  atId: string;
  startTime: string;
  endTime: string;
  date: string;
  hours: number;
  observations: string;
  isSubstitution: boolean;
  isConfirmed: boolean;
  isApproved: boolean;
  isLaunched: boolean;
}

export interface Supervision {
  id: string;
  atId: string;
  coordinatorId: string;
  startTime: string;
  endTime: string;
  date: string;
  hours: number;
  sector: 'aba' | 'denver' | 'grupo' | 'escolar';
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}