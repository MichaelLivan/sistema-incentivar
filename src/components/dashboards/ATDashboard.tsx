import React, { useState } from 'react';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Footer } from '../ui/Footer';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHeadCell } from '../ui/Table';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { Clock, Calendar, User, AlertCircle, X, Search } from 'lucide-react';
import { formatHours } from '../../utils/formatters';

type Patient = {
  id: string;
  name: string;
  sector: string;
  weeklyHours: number;
  at_id: string;
  // add other fields as needed
};

type Session = {
  id: string;
  patient_id: string;
  at_id: string;
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
  is_launched?: boolean;
  is_approved?: boolean;
  is_substitution?: boolean;
  // add other fields as needed
};

export const ATDashboard: React.FC = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [allSectorPatients, setAllSectorPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionForm, setSessionForm] = useState({
    patientId: '',
    startTime: '',
    endTime: '',
    date: (() => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })(),
    observations: '',
    isSubstitution: false,
  });

  const [showSubstitutionModal, setShowSubstitutionModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        console.log('🔍 CARREGANDO DADOS...');
        const [myPatientsData, allSectorPatientsData, sessionsData] = await Promise.all([
          apiService.getPatients(), // Meus pacientes
          apiService.getPatientsForSubstitution(), // Todos do setor
          apiService.getSessions()
        ]);
        
        console.log('📊 DADOS CARREGADOS:');
        console.log('- Meus pacientes:', myPatientsData.length);
        console.log('- Todos do setor:', allSectorPatientsData.length);
        
        setPatients(myPatientsData);
        setAllSectorPatients(allSectorPatientsData);
        setSessions(sessionsData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // CORREÇÃO: Usar dados corretos para cada contexto
  const myPatients = patients; // Já vem filtrado do backend
  
  // Para substituição: usar todos os pacientes do setor
  const sectorPatients = allSectorPatients;
  
  // LOGS DE DEBUG
  console.log('🔍 DADOS PROCESSADOS:');
  console.log('- Meus pacientes:', myPatients.length);
  console.log('- Pacientes do setor:', sectorPatients.length);
  console.log('- User sector:', user?.sector);

  // Filtrar pacientes baseado na pesquisa
  const filteredSectorPatients = sectorPatients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.sector.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateHours = (start: string, end: string): number => {
  if (!start || !end) return 0;
  
  // Garantir que funciona com HH:MM ou HH:MM:SS
  const startParts = start.split(':');
  const endParts = end.split(':');
  
  const startHour = parseInt(startParts[0]) || 0;
  const startMin = parseInt(startParts[1]) || 0;
  const startSec = parseInt(startParts[2]) || 0;
  
  const endHour = parseInt(endParts[0]) || 0;
  const endMin = parseInt(endParts[1]) || 0;
  const endSec = parseInt(endParts[2]) || 0;
  
  // Calcular em minutos para evitar problemas de precisão com decimais
  const startTotalMinutes = startHour * 60 + startMin + (startSec / 60);
  const endTotalMinutes = endHour * 60 + endMin + (endSec / 60);
  
  // Retornar diferença em horas SEM arredondamento
  const diffMinutes = Math.max(0, endTotalMinutes - startTotalMinutes);
  return diffMinutes / 60;
};

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setSessionForm(prev => {
      const newForm = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };

      // Se marcou substituição, abrir modal e limpar paciente selecionado
      if (name === 'isSubstitution' && checked) {
        setShowSubstitutionModal(true);
        setSearchTerm(''); // Limpar busca
        newForm.patientId = '';
      }
      
      // Se desmarcou substituição, fechar modal
      if (name === 'isSubstitution' && !checked) {
        setShowSubstitutionModal(false);
        setSearchTerm(''); // Limpar busca
        newForm.patientId = '';
      }

      return newForm;
    });
  };

  const handleSubstitutionPatientSelect = (patientId: string) => {
    setSessionForm(prev => ({
      ...prev,
      patientId
    }));
    setShowSubstitutionModal(false);
    setSearchTerm(''); // Limpar busca após seleção
  };

  const handleCloseModal = () => {
    setShowSubstitutionModal(false);
    setSearchTerm(''); // Limpar busca ao fechar
    setSessionForm(prev => ({ ...prev, isSubstitution: false }));
  };

  const handleOpenModal = () => {
    setShowSubstitutionModal(true);
    setSearchTerm(''); // Limpar busca ao abrir
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sessionForm.patientId) {
      alert('Por favor, selecione um paciente');
      return;
    }

    const createSession = async () => {
      try {
        const hours = calculateHours(sessionForm.startTime, sessionForm.endTime);
        await apiService.createSession({
          patient_id: sessionForm.patientId,
          start_time: sessionForm.startTime,
          end_time: sessionForm.endTime,
          date: sessionForm.date,
          observations: sessionForm.observations,
          is_substitution: sessionForm.isSubstitution
        });
        
        // Recarregar sessões
        const sessionsData = await apiService.getSessions();
        setSessions(sessionsData);
        
        // Limpar formulário
        setSessionForm({
          patientId: '',
          startTime: '',
          endTime: '',
          date: new Date().toISOString().split('T')[0],
          observations: '',
          isSubstitution: false,
        });
      } catch (error) {
        console.error('Erro ao criar sessão:', error);
        alert('Erro ao registrar atendimento');
      }
    };

    createSession();
  };

  const currentHours = calculateHours(sessionForm.startTime, sessionForm.endTime);
  const mySessionsThisMonth = sessions.filter(s => 
    s.at_id === user?.id && 
    new Date(s.date).getMonth() === new Date().getMonth()
  );
  const totalHoursThisMonth = mySessionsThisMonth.reduce((sum, s) => sum + s.hours, 0);

  // Encontrar o paciente selecionado para mostrar o nome
  const selectedPatient = allSectorPatients.find(p => p.id === sessionForm.patientId);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <p className="text-lg text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Modal de Substituição */}
      {showSubstitutionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-purple-800">
                Selecionar Paciente para Substituição - Setor {user?.sector?.toUpperCase()}
              </h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCloseModal}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Selecione o paciente que você está substituindo neste atendimento:
              </p>
              
              {/* Campo de Busca */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Buscar paciente por nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {searchTerm && (
                  <p className="text-sm text-gray-500 mt-2">
                    {filteredSectorPatients.length} paciente(s) encontrado(s)
                  </p>
                )}
              </div>
              
              {/* Lista de Pacientes */}
              <div className="overflow-y-auto max-h-[50vh]">
                {filteredSectorPatients.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {filteredSectorPatients.map(patient => {
                      const isMyPatient = myPatients.some(p => p.id === patient.id);
                      return (
                        <div
                          key={patient.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                            isMyPatient 
                              ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                          }`}
                          onClick={() => handleSubstitutionPatientSelect(patient.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-purple-800">
                                {patient.name}
                                {isMyPatient && (
                                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                    Meu Paciente
                                  </span>
                                )}
                              </h4>
                              <p className="text-sm text-gray-600">
                                Setor: {patient.sector.toUpperCase()} • 
                                Carga Semanal: {patient.weeklyHours}h
                              </p>
                            </div>
                            <div className="text-right">
                              <Button size="sm" variant="primary">
                                Selecionar
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm ? (
                      <div>
                        <p>Nenhum paciente encontrado para "{searchTerm}"</p>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSearchTerm('')}
                          className="mt-2"
                        >
                          Limpar busca
                        </Button>
                      </div>
                    ) : (
                      'Nenhum paciente disponível no setor'
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="p-3 bg-teal-100 rounded-lg">
              <Clock className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Horas do Mês</p>
              <p className="text-2xl font-bold text-purple-700">{totalHoursThisMonth}h</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="p-3 bg-pink-100 rounded-lg">
              <User className="w-6 h-6 text-pink-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pacientes</p>
              <p className="text-2xl font-bold text-purple-700">{myPatients.length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Sessões</p>
              <p className="text-2xl font-bold text-purple-700">{mySessionsThisMonth.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Registrar Atendimento */}
      <Card>
        <CardHeader>
          <CardTitle>Registrar Atendimento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-purple-800 mb-2">
                  Paciente
                </label>
                {sessionForm.isSubstitution ? (
                  <div className="space-y-2">
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-5 h-5 text-orange-600" />
                        <span className="text-orange-800 font-medium">Modo Substituição</span>
                      </div>
                      {selectedPatient ? (
                        <div className="mt-2">
                          <p className="text-sm text-orange-700">
                            Paciente selecionado: <strong>{selectedPatient.name}</strong>
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={handleOpenModal}
                            className="mt-2"
                          >
                            Trocar Paciente
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          onClick={handleOpenModal}
                          className="mt-2"
                        >
                          Selecionar Paciente
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <Select
                    name="patientId"
                    value={sessionForm.patientId}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Selecione o paciente</option>
                    {myPatients.map(patient => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name}
                      </option>
                    ))}
                  </Select>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-purple-800 mb-2">
                  Data
                </label>
                <Input
                  type="date"
                  name="date"
                  value={sessionForm.date}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-purple-800 mb-2">
                  Hora Início
                </label>
                <Input
                  type="time"
                  name="startTime"
                  value={sessionForm.startTime}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-purple-800 mb-2">
                  Hora Fim
                </label>
                <Input
                  type="time"
                  name="endTime"
                  value={sessionForm.endTime}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-purple-800 mb-2">
                Observações
              </label>
              <textarea
                name="observations"
                value={sessionForm.observations}
                onChange={handleInputChange}
                rows={3}
                placeholder="Observações sobre o atendimento..."
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-200 bg-white/90"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isSubstitution"
                name="isSubstitution"
                checked={sessionForm.isSubstitution}
                onChange={handleInputChange}
                className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
              />
              <label htmlFor="isSubstitution" className="text-sm font-medium text-purple-800">
                Atendimento de Substituição
              </label>
            </div>

            {currentHours > 0 && (
              <div className="bg-teal-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-teal-600" />
                  <span className="font-semibold text-teal-800">
                    Carga Horária: {formatHours(currentHours)}
                  </span>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full">
              Registrar Atendimento
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Histórico de Atendimentos */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Atendimentos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeadCell>Paciente</TableHeadCell>
                <TableHeadCell>Data</TableHeadCell>
                <TableHeadCell>Início</TableHeadCell>
                <TableHeadCell>Fim</TableHeadCell>
                <TableHeadCell>Horas</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Substituição</TableHeadCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mySessionsThisMonth.map(session => {
                // CORREÇÃO: Buscar paciente tanto nos meus quanto nos do setor
                const patient = patients.find(p => p.id === session.patient_id) || 
                               allSectorPatients.find(p => p.id === session.patient_id);
                return (
                  <TableRow key={session.id}>
                    <TableCell>{patient?.name || 'N/A'}</TableCell>
                    <TableCell>{
                      // CORREÇÃO: Evitar problema de timezone
                      new Date(session.date + 'T00:00:00').toLocaleDateString('pt-BR')
                    }</TableCell>
                    <TableCell>{session.start_time}</TableCell>
                    <TableCell>{session.end_time}</TableCell>
                    <TableCell>{(() => {
  // Recalcular as horas usando os horários reais
  const calculatedHours = calculateHours(session.start_time, session.end_time);
  const totalMinutes = Math.round(calculatedHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
})()}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        session.is_launched 
                          ? 'bg-green-100 text-green-800' 
                          : session.is_approved 
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {session.is_launched ? 'Lançado' : session.is_approved ? 'Aprovado' : 'Pendente'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {session.is_substitution && (
                        <span className="text-orange-600 font-medium">
                          <AlertCircle className="inline w-4 h-4 mr-1" />
                          Sim
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Footer />
    </div>
  );
};