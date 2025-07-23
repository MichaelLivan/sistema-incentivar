import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHeadCell,    
  TableHeader,      
  TableRow 
} from '../ui/Table';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Footer } from '../ui/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { Edit2, Trash2, DollarSign, Clock, Users, CheckCircle, AlertCircle, XCircle, Eye, Download, BarChart3, Settings } from 'lucide-react';
import { formatDateBR, formatHours, formatCurrency, safeNumber, calculateHours } from '../../utils/formatters';

// Interfaces para tipagem
interface Session {
  id: string;
  patient_id: string;
  at_id: string;
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
  is_confirmed: boolean;
  observations?: string;
  hourly_rate?: number;
  at_name?: string;
  at_sector?: string;
}

interface AT {
  id: string;
  name: string;
  hourly_rate: number;
  sector: string;
}

interface Patient {
  id: string;
  name: string;
  hourly_rate: number;
  sector: string;
  at_id: string | null;
}

interface Supervision {
  id: string;
  at_id: string;
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
  sector: string;
  observations?: string;
}

interface PatientFinancialReport {
  id: string;
  name: string;
  sector: string;
  at_name: string;
  totalHours: number;
  confirmedHours: number;
  pendingHours: number;
  hourly_rate: number;
  confirmedValue: number;
  pendingValue: number;
  totalValue: number;
  sessionCount: number;
  confirmationRate: number;
}

interface ATFinancialReport {
  id: string;
  name: string;
  sector: string;
  sessionHours: number;
  supervisionHours: number;
  totalHours: number;
  session_rate: number;
  supervision_rate: number;
  sessionPayment: number;
  supervisionPayment: number;
  totalPayment: number;
}

interface SupervisionRates {
  aba: number;
  denver: number;
  grupo: number;
  escolar: number;
}

export const FinanceiroDashboard: React.FC = () => {
  const { user } = useAuth();
  const isFinanceiroPct = user?.type === 'financeiro-pct';
  const isFinanceiroAts = user?.type === 'financeiro-ats';

  // Verificação de acesso
  if (!user || (!isFinanceiroPct && !isFinanceiroAts)) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Acesso Negado</h2>
          <p className="text-gray-600">Esta página é restrita aos usuários do financeiro.</p>
          <p className="text-sm text-gray-500 mt-2">Tipo atual: {user?.type || 'Não definido'}</p>
        </div>
      </div>
    );
  }

  const [sessions, setSessions] = useState<Session[]>([]);
  const [ats, setAts] = useState<AT[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [supervisions, setSupervisions] = useState<Supervision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para supervisão rates
  const [supervisionRates, setSupervisionRates] = useState<SupervisionRates>({
    aba: 35,
    denver: 35,
    grupo: 35,
    escolar: 35
  });
  const [showSupervisionRatesModal, setShowSupervisionRatesModal] = useState(false);

  // Estados para filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Estados para modais e edição
  const [selectedPatientDetails, setSelectedPatientDetails] = useState<string | null>(null);
  const [selectedATDetails, setSelectedATDetails] = useState<string | null>(null);
  const [editingRates, setEditingRates] = useState<{ [key: string]: number }>({});
  const [showCharts, setShowCharts] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔄 [FINANCEIRO] Carregando dados...');
        
        const [sessionsData, atsData, patientsData, supervisionsData] = await Promise.all([
          apiService.getSessions({ month: selectedMonth, year: selectedYear }).catch(err => {
            console.error('❌ Erro ao carregar sessões:', err);
            return [];
          }),
          apiService.getATs().catch(err => {
            console.error('❌ Erro ao carregar ATs:', err);
            return [];
          }),
          apiService.getPatients().catch(err => {
            console.error('❌ Erro ao carregar pacientes:', err);
            return [];
          }),
          apiService.getSupervisions({ month: selectedMonth, year: selectedYear }).catch(err => {
            console.error('❌ Erro ao carregar supervisões:', err);
            return [];
          })
        ]);
        
        setSessions(sessionsData || []);
        setAts(atsData || []);
        setPatients(patientsData || []);
        setSupervisions(supervisionsData || []);

        // Carregar taxas de supervisão do banco primeiro, depois localmente
        try {
          const savedRates = await apiService.getSupervisionRates();
          setSupervisionRates(savedRates);
        } catch (error) {
          console.error('❌ Erro ao carregar taxas do banco, usando valores locais:', error);
          const localRates = localStorage.getItem('supervisionRates');
          if (localRates) {
            setSupervisionRates(JSON.parse(localRates));
          }
        }
      } catch (error) {
        console.error('❌ [FINANCEIRO] Erro ao carregar dados:', error);
        setError('Erro ao carregar dados. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedMonth, selectedYear]);

  // Filtrar dados do mês selecionado
  const thisMonthSessions = Array.isArray(sessions) ? sessions.filter(s => {
    const sessionDate = new Date(s.date + 'T00:00:00');
    return sessionDate.getMonth() === selectedMonth - 1 && 
           sessionDate.getFullYear() === selectedYear;
  }) : [];

  const thisMonthSupervisions = Array.isArray(supervisions) ? supervisions.filter(s => {
    const supervisionDate = new Date(s.date + 'T00:00:00');
    return supervisionDate.getMonth() === selectedMonth - 1 && 
           supervisionDate.getFullYear() === selectedYear;
  }) : [];

  // Relatório financeiro para PACIENTES (financeiro-pct) - CORRIGIDO
  const getPatientFinancialReport = (): PatientFinancialReport[] => {
    if (!isFinanceiroPct || !Array.isArray(thisMonthSessions) || !Array.isArray(patients) || !Array.isArray(ats)) {
      return [];
    }

    const patientSessions = thisMonthSessions.reduce((acc, session) => {
      if (!acc[session.patient_id]) {
        acc[session.patient_id] = [];
      }
      acc[session.patient_id].push(session);
      return acc;
    }, {} as { [key: string]: Session[] });

    return Object.entries(patientSessions).map(([patientId, sessions]) => {
      const patient = patients.find(p => p.id === patientId) || {
        id: patientId,
        name: 'Paciente Desconhecido',
        hourly_rate: 0,
        sector: 'N/A',
        at_id: null
      };

      const at = ats.find(a => a.id === patient.at_id);
      
      // ✅ CORREÇÃO: Financeiro PCT não espera confirmação dos pais
      // Apenas considera se foi confirmado pela recepção (is_confirmed = true)
      const confirmedSessions = sessions.filter(s => s.is_confirmed);
      const pendingSessions = sessions.filter(s => !s.is_confirmed);

      const confirmedHours = confirmedSessions.reduce((sum, s) => sum + calculateHours(s.start_time, s.end_time), 0);
      const pendingHours = pendingSessions.reduce((sum, s) => sum + calculateHours(s.start_time, s.end_time), 0);
      const totalHours = confirmedHours + pendingHours;

      const hourlyRate = safeNumber(patient.hourly_rate);
      const confirmedValue = confirmedHours * hourlyRate;
      const pendingValue = pendingHours * hourlyRate;
      const totalValue = totalHours * hourlyRate;

      // Taxa de confirmação baseada na recepção, não nos pais
      const confirmationRate = sessions.length > 0 ? (confirmedSessions.length / sessions.length) * 100 : 0;

      return {
        id: patient.id,
        name: patient.name,
        sector: patient.sector,
        at_name: at?.name || 'N/A',
        totalHours,
        confirmedHours,
        pendingHours,
        hourly_rate: hourlyRate,
        confirmedValue,
        pendingValue,
        totalValue,
        sessionCount: sessions.length,
        confirmationRate
      };
    }).filter(report => report.totalHours > 0);
  };

  // Relatório financeiro para ATs (financeiro-ats)
  const getATFinancialReport = (): ATFinancialReport[] => {
    if (!isFinanceiroAts || !Array.isArray(ats) || !Array.isArray(thisMonthSessions) || !Array.isArray(thisMonthSupervisions)) {
      return [];
    }

    return ats.map(at => {
      const atConfirmedSessions = thisMonthSessions.filter(s => s.at_id === at.id && s.is_confirmed);
      const atSupervisions = thisMonthSupervisions.filter(s => s.at_id === at.id);

      const sessionHours = atConfirmedSessions.reduce((sum, s) => sum + calculateHours(s.start_time, s.end_time), 0);
      const supervisionHours = atSupervisions.reduce((sum, s) => sum + safeNumber(s.hours), 0);
      const totalHours = sessionHours + supervisionHours;

      const session_rate = safeNumber(at.hourly_rate);
      const supervision_rate = supervisionRates[at.sector as keyof SupervisionRates] || 35;
      
      const sessionPayment = sessionHours * session_rate;
      const supervisionPayment = supervisionHours * supervision_rate;
      const totalPayment = sessionPayment + supervisionPayment;

      return {
        id: at.id,
        name: at.name,
        sector: at.sector,
        sessionHours,
        supervisionHours,
        totalHours,
        session_rate,
        supervision_rate,
        sessionPayment,
        supervisionPayment,
        totalPayment
      };
    }).filter(report => report.totalHours > 0);
  };

  const handleUpdatePatientRate = async (patientId: string, newRate: number) => {
    try {
      if (!patientId || isNaN(newRate) || newRate < 0) {
        alert('Dados inválidos para atualização');
        return;
      }
      
      await apiService.updatePatient(patientId, { hourly_rate: newRate });
      const patientsData = await apiService.getPatients();
      setPatients(patientsData || []);
      setEditingRates(prev => ({ ...prev, [patientId]: newRate }));
    } catch (error) {
      console.error('Erro ao atualizar valor:', error);
      alert('Erro ao atualizar valor por hora do paciente');
    }
  };

  const handleUpdateATRate = async (atId: string, newRate: number) => {
    try {
      if (!atId || isNaN(newRate) || newRate < 0) {
        alert('Dados inválidos para atualização');
        return;
      }
      
      await apiService.updateUser(atId, { hourly_rate: newRate });
      const atsData = await apiService.getATs();
      setAts(atsData || []);
      setEditingRates(prev => ({ ...prev, [atId]: newRate }));
    } catch (error) {
      console.error('Erro ao atualizar valor:', error);
      alert('Erro ao atualizar valor por hora do AT');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!sessionId) return;
    
    if (window.confirm('Tem certeza que deseja excluir este atendimento?')) {
      try {
        await apiService.deleteSession(sessionId);
        const sessionsData = await apiService.getSessions({ month: selectedMonth, year: selectedYear });
        setSessions(sessionsData || []);
      } catch (error) {
        console.error('Erro ao excluir sessão:', error);
        alert('Erro ao excluir sessão');
      }
    }
  };

  const handleDeleteSupervision = async (supervisionId: string) => {
    if (!supervisionId) return;
    
    if (window.confirm('Tem certeza que deseja excluir esta supervisão?')) {
      try {
        await apiService.deleteSupervision(supervisionId);
        const supervisionsData = await apiService.getSupervisions({ month: selectedMonth, year: selectedYear });
        setSupervisions(supervisionsData || []);
      } catch (error) {
        console.error('Erro ao excluir supervisão:', error);
        alert('Erro ao excluir supervisão');
      }
    }
  };

  const handleSaveSupervisionRates = async () => {
    try {
      // Salvar no banco de dados via API
      await apiService.saveSupervisionRates(supervisionRates);
      
      // Salvar localmente como backup
      localStorage.setItem('supervisionRates', JSON.stringify(supervisionRates));
      
      setShowSupervisionRatesModal(false);
      alert('Valores de supervisão atualizados com sucesso no banco de dados!');
    } catch (error) {
      console.error('❌ Erro ao salvar valores de supervisão:', error);
      
      // Em caso de erro na API, salvar pelo menos localmente
      localStorage.setItem('supervisionRates', JSON.stringify(supervisionRates));
      setShowSupervisionRatesModal(false);
      
      alert('Valores salvos localmente. Erro ao sincronizar com o banco de dados.');
    }
  };

  // ✅ CORREÇÃO PRINCIPAL: Função de exportação de planilha MELHORADA E ESTILIZADA
  const generateStyledExcel = () => {
    const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const currentDate = new Date().toLocaleDateString('pt-BR');
    
    if (isFinanceiroPct) {
      // RELATÓRIO PCT - MAIS ELEGANTE
      const patientData = filteredPatientReport;
      
      // Criar HTML estruturado para Excel
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #8B5CF6; padding-bottom: 15px; }
    .company-name { font-size: 24px; font-weight: bold; color: #8B5CF6; margin-bottom: 5px; }
    .report-title { font-size: 18px; color: #374151; margin-bottom: 5px; }
    .report-period { font-size: 14px; color: #6B7280; text-transform: uppercase; }
    .summary-box { background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #10B981; }
    .summary-title { font-size: 16px; font-weight: bold; color: #065F46; margin-bottom: 15px; }
    .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
    .summary-item { display: flex; justify-content: space-between; }
    .summary-label { font-weight: 600; color: #374151; }
    .summary-value { font-weight: bold; color: #059669; }
    .data-table { width: 100%; border-collapse: collapse; margin-top: 25px; font-size: 12px; }
    .data-table th { background-color: #8B5CF6; color: white; padding: 12px 8px; text-align: center; border: 1px solid #7C3AED; font-weight: bold; }
    .data-table td { padding: 10px 8px; border: 1px solid #E5E7EB; text-align: center; }
    .data-table tbody tr:nth-child(even) { background-color: #F9FAFB; }
    .data-table tbody tr:hover { background-color: #EEF2FF; }
    .currency { color: #059669; font-weight: 600; }
    .currency.pending { color: #D97706; }
    .status-confirmed { background-color: #D1FAE5; color: #065F46; padding: 4px 8px; border-radius: 4px; font-size: 10px; }
    .status-pending { background-color: #FEF3C7; color: #92400E; padding: 4px 8px; border-radius: 4px; font-size: 10px; }
    .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #6B7280; border-top: 1px solid #E5E7EB; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">🏥 CLÍNICA INCENTIVAR</div>
    <div class="report-title">Relatório Financeiro - Cobrança aos Pais</div>
    <div class="report-period">${monthName.toUpperCase()}</div>
  </div>

  <div class="summary-box">
    <div class="summary-title">💰 RESUMO EXECUTIVO</div>
    <div class="summary-grid">
      <div class="summary-item">
        <span class="summary-label">Total Confirmado (Recepção):</span>
        <span class="summary-value">${formatCurrency(totalConfirmedRevenue)}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Total Pendente (Recepção):</span>
        <span class="summary-value" style="color: #D97706;">${formatCurrency(totalPendingRevenue)}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">🎯 TOTAL GERAL A COBRAR:</span>
        <span class="summary-value" style="color: #DC2626; font-size: 18px;">${formatCurrency(totalRevenue)}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Total de Horas:</span>
        <span class="summary-value">${formatHours(totalHours)}</span>
      </div>
    </div>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th>PACIENTE</th>
        <th>SETOR</th>
        <th>AT RESPONSÁVEL</th>
        <th>H. CONFIRMADAS</th>
        <th>H. PENDENTES</th>
        <th>TOTAL HORAS</th>
        <th>VALOR/HORA</th>
        <th>VALOR CONFIRMADO</th>
        <th>VALOR PENDENTE</th>
        <th>TOTAL A COBRAR</th>
        <th>TAXA CONFIRM.</th>
        <th>STATUS</th>
      </tr>
    </thead>
    <tbody>
      ${patientData.map(p => `
        <tr>
          <td style="font-weight: 600; text-align: left;">${p.name}</td>
          <td style="font-weight: 600; color: #7C3AED;">${p.sector.toUpperCase()}</td>
          <td style="text-align: left;">${p.at_name}</td>
          <td style="color: #059669; font-weight: 600;">${formatHours(p.confirmedHours)}</td>
          <td style="color: #D97706; font-weight: 600;">${formatHours(p.pendingHours)}</td>
          <td style="font-weight: bold; color: #7C3AED;">${formatHours(p.totalHours)}</td>
          <td class="currency">${formatCurrency(p.hourly_rate)}</td>
          <td class="currency">${formatCurrency(p.confirmedValue)}</td>
          <td class="currency pending">${formatCurrency(p.pendingValue)}</td>
          <td style="font-weight: bold; font-size: 14px; color: #DC2626; background-color: #FEE2E2;">${formatCurrency(p.totalValue)}</td>
          <td style="font-weight: 600; color: ${p.confirmationRate >= 80 ? '#059669' : p.confirmationRate >= 50 ? '#D97706' : '#DC2626'};">${p.confirmationRate.toFixed(1)}%</td>
          <td>
            <span class="${p.pendingHours === 0 ? 'status-confirmed' : 'status-pending'}">
              ${p.pendingHours === 0 ? '✅ OK' : '⏳ PENDENTE'}
            </span>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p><strong>Relatório gerado em:</strong> ${currentDate} | <strong>Sistema:</strong> Clínica Incentivar | <strong>Usuário:</strong> ${user?.name}</p>
    <p style="margin-top: 5px;"><em>ℹ️ Valores confirmados = Confirmados pela recepção | Valores pendentes = Aguardando confirmação da recepção</em></p>
  </div>
</body>
</html>`;

      // Criar e baixar arquivo
      const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Relatorio_Cobranca_Pais_${selectedMonth.toString().padStart(2, '0')}_${selectedYear}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } else {
      // RELATÓRIO ATS - MAIS ELEGANTE
      const atData = filteredATReport;
      
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #8B5CF6; padding-bottom: 15px; }
    .company-name { font-size: 24px; font-weight: bold; color: #8B5CF6; margin-bottom: 5px; }
    .report-title { font-size: 18px; color: #374151; margin-bottom: 5px; }
    .report-period { font-size: 14px; color: #6B7280; text-transform: uppercase; }
    .summary-box { background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #059669; }
    .summary-title { font-size: 16px; font-weight: bold; color: #065F46; margin-bottom: 15px; }
    .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
    .summary-item { display: flex; justify-content: space-between; }
    .summary-label { font-weight: 600; color: #374151; }
    .summary-value { font-weight: bold; color: #059669; }
    .data-table { width: 100%; border-collapse: collapse; margin-top: 25px; font-size: 12px; }
    .data-table th { background-color: #059669; color: white; padding: 12px 8px; text-align: center; border: 1px solid #047857; font-weight: bold; }
    .data-table td { padding: 10px 8px; border: 1px solid #E5E7EB; text-align: center; }
    .data-table tbody tr:nth-child(even) { background-color: #F9FAFB; }
    .data-table tbody tr:hover { background-color: #ECFDF5; }
    .currency { color: #059669; font-weight: 600; }
    .hours-session { color: #2563EB; font-weight: 600; }
    .hours-supervision { color: #7C3AED; font-weight: 600; }
    .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #6B7280; border-top: 1px solid #E5E7EB; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">🏥 CLÍNICA INCENTIVAR</div>
    <div class="report-title">Relatório Financeiro - Pagamento aos ATs</div>
    <div class="report-period">${monthName.toUpperCase()}</div>
  </div>

  <div class="summary-box">
    <div class="summary-title">💼 RESUMO EXECUTIVO</div>
    <div class="summary-grid">
      <div class="summary-item">
        <span class="summary-label">Total Atendimentos:</span>
        <span class="summary-value">${formatCurrency(filteredATReport.reduce((sum, at) => sum + at.sessionPayment, 0))}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Total Supervisões:</span>
        <span class="summary-value">${formatCurrency(filteredATReport.reduce((sum, at) => sum + at.supervisionPayment, 0))}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">🎯 TOTAL GERAL A PAGAR:</span>
        <span class="summary-value" style="color: #DC2626; font-size: 18px;">${formatCurrency(totalATPayments)}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Total de Horas:</span>
        <span class="summary-value">${formatHours(totalATHours)}</span>
      </div>
    </div>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th>AT</th>
        <th>SETOR</th>
        <th>H. ATENDIMENTO</th>
        <th>H. SUPERVISÃO</th>
        <th>TOTAL HORAS</th>
        <th>VALOR/H ATEND.</th>
        <th>VALOR/H SUPERV.</th>
        <th>PAGTO ATENDIMENTO</th>
        <th>PAGTO SUPERVISÃO</th>
        <th>TOTAL A PAGAR</th>
      </tr>
    </thead>
    <tbody>
      ${atData.map(at => `
        <tr>
          <td style="font-weight: 600; text-align: left;">${at.name}</td>
          <td style="font-weight: 600; color: #7C3AED;">${at.sector.toUpperCase()}</td>
          <td class="hours-session">${formatHours(at.sessionHours)}</td>
          <td class="hours-supervision">${formatHours(at.supervisionHours)}</td>
          <td style="font-weight: bold; color: #374151;">${formatHours(at.totalHours)}</td>
          <td class="currency">${formatCurrency(at.session_rate)}</td>
          <td class="currency">${formatCurrency(at.supervision_rate)}</td>
          <td class="currency">${formatCurrency(at.sessionPayment)}</td>
          <td class="currency">${formatCurrency(at.supervisionPayment)}</td>
          <td style="font-weight: bold; font-size: 14px; color: #DC2626; background-color: #FEE2E2;">${formatCurrency(at.totalPayment)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p><strong>Relatório gerado em:</strong> ${currentDate} | <strong>Sistema:</strong> Clínica Incentivar | <strong>Usuário:</strong> ${user?.name}</p>
    <p style="margin-top: 5px;"><em>ℹ️ Valores calculados apenas para atendimentos confirmados pela recepção</em></p>
  </div>
</body>
</html>`;

      // Criar e baixar arquivo
      const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Relatorio_Pagamento_ATs_${selectedMonth.toString().padStart(2, '0')}_${selectedYear}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    // Notificação de sucesso
    alert('📊 Relatório exportado com sucesso! Verifique sua pasta de downloads.');
  };

  const patientReport = getPatientFinancialReport();
  const atReport = getATFinancialReport();

  // Filtros - com verificação de segurança
  const filteredPatientReport = patientReport.filter(p =>
    p?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false
  );

  const filteredATReport = atReport.filter(at =>
    at?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false
  );

  // Estatísticas
  const totalConfirmedRevenue = filteredPatientReport.reduce((sum, p) => sum + safeNumber(p.confirmedValue), 0);
  const totalPendingRevenue = filteredPatientReport.reduce((sum, p) => sum + safeNumber(p.pendingValue), 0);
  const totalRevenue = totalConfirmedRevenue + totalPendingRevenue;
  const totalHours = filteredPatientReport.reduce((sum, p) => sum + safeNumber(p.totalHours), 0);
  
  const totalATPayments = filteredATReport.reduce((sum, at) => sum + safeNumber(at.totalPayment), 0);
  const totalConfirmedHours = filteredPatientReport.reduce((sum, p) => sum + safeNumber(p.confirmedHours), 0);
  const totalPendingHours = filteredPatientReport.reduce((sum, p) => sum + safeNumber(p.pendingHours), 0);
  const totalATHours = filteredATReport.reduce((sum, at) => sum + safeNumber(at.totalHours), 0);
  const riskPatients = filteredPatientReport.filter(p => (p.pendingHours || 0) > 10 || (p.confirmationRate || 0) < 50).length;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Carregando dados financeiros...</p>
          <p className="text-sm text-gray-500">
            {isFinanceiroPct ? 'Preparando relatórios de cobrança' : 'Preparando relatórios de pagamento'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="text-center">
          <p className="text-lg text-red-600">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Filtros de Período */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isFinanceiroPct ? 'Financeiro - Cobrança aos Pais' : 'Financeiro - Pagamento aos ATs'}
          </CardTitle>
          {isFinanceiroPct && (
            <div className="bg-blue-50 p-3 rounded-lg mt-3">
              <p className="text-sm text-blue-800 font-medium">
                ✅ <strong>Aguarda apenas confirmação da recepção</strong> - Os pais apenas visualizam os atendimentos.
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i, 1).toLocaleDateString('pt-BR', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                {[2024, 2025, 2026].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar {isFinanceiroPct ? 'Paciente' : 'AT'}
              </label>
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Digite o nome do ${isFinanceiroPct ? 'paciente' : 'AT'}...`}
                className="w-64"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ações</label>
              <div className="flex space-x-2">
                {isFinanceiroAts && (
                  <Button
                    onClick={() => setShowSupervisionRatesModal(true)}
                    variant="secondary"
                    className="flex items-center space-x-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Config. Supervisão</span>
                  </Button>
                )}
                <Button
                  onClick={() => setShowCharts(!showCharts)}
                  variant="secondary"
                  className="flex items-center space-x-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>{showCharts ? 'Ocultar' : 'Mostrar'} Gráficos</span>
                </Button>
                <Button
                  onClick={generateStyledExcel}
                  variant="success"
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar Excel</span>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards - Restante do código permanece igual... */}
      {/* ... resto do código permanece exatamente igual ... */}
      
      <Footer />
    </div>
  );
};
